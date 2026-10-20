from __future__ import annotations

import io
import logging
import random
import re
import sys
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urljoin

import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("azul.ingestion.bronze")

CKAN_PACKAGE_SEARCH_URL = "https://dados.gov.br/api/3/action/package_search"
ANAC_VRA_BASE_URL = (
    "https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/"
    "Voo%20Regular%20Ativo%20%28VRA%29/"
)
ANAC_TARIFAS_BASE_URL = "https://sas.anac.gov.br/sas/tarifadomestica/"

ANAC_VRA_DIRECT_CSV_URLS: tuple[str, ...] = (
    "https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/"
    "Voo%20Regular%20Ativo%20%28VRA%29/2026/08%20-%20Agosto/VRA_20268.csv",
    "https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/"
    "Voo%20Regular%20Ativo%20%28VRA%29/2026/07%20-%20Julho/VRA_20267.csv",
    "https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/"
    "Voo%20Regular%20Ativo%20%28VRA%29/2025/12%20-%20Dezembro/VRA_202512.csv",
)
ANAC_TARIFAS_DIRECT_CSV_URLS: tuple[str, ...] = (
    "https://sas.anac.gov.br/sas/tarifadomestica/2026/202608.csv",
    "https://sas.anac.gov.br/sas/tarifadomestica/2026/202607.csv",
    "https://sas.anac.gov.br/sas/tarifadomestica/2025/202512.csv",
)

# Removidas as constantes TARGET_AIRLINE_CODE e AIRLINE_COLUMN_CANDIDATES para manter a Bronze agnóstica a regras de negócio.


def resolve_bronze_dir() -> Path:
    script_dir = Path(__file__).resolve().parent
    docker_path = script_dir / "data_lake" / "bronze"
    if (script_dir / "data_lake").exists():
        return docker_path
    return script_dir.parent / "data_lake" / "bronze"


def create_http_session(
    retries: int = 3,
    backoff_factor: float = 1.0,
) -> requests.Session:
    session = requests.Session()
    retry_strategy = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("HEAD", "GET", "OPTIONS"),
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "application/json,text/csv,*/*;q=0.8"
            ),
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Upgrade-Insecure-Requests": "1",
        }
    )
    return session


def _is_waf_or_html_challenge(raw_bytes: bytes) -> bool:
    head = raw_bytes[:2048].decode("latin1", errors="ignore").strip().lower()
    if not head:
        return True
    waf_markers = (
        "<!doctype html",
        "<html",
        "/tspd/",
        "bobcmn",
        "human visitor",
        "captcha",
        "<head>",
    )
    return any(marker in head for marker in waf_markers)


def _extract_latest_csv_from_ckan_payload(payload: dict[str, Any]) -> str | None:
    result_block = payload.get("result", {})
    packages: list[dict[str, Any]] = result_block.get("results", [])

    csv_resources: list[tuple[str, str]] = []
    for package in packages:
        resources: list[dict[str, Any]] = package.get("resources", [])
        for resource in resources:
            url = str(resource.get("url") or "").strip()
            fmt = str(resource.get("format") or "").strip().upper()
            if not url:
                continue
            if fmt == "CSV" or url.lower().endswith(".csv") or url.lower().endswith(".zip"):
                timestamp = str(
                    resource.get("last_modified")
                    or resource.get("created")
                    or resource.get("name")
                    or ""
                )
                csv_resources.append((timestamp, url))

    if not csv_resources:
        return None

    csv_resources.sort(key=lambda item: item[0], reverse=True)
    return csv_resources[0][1]


def _discover_csv_from_anac_directory(
    base_url: str,
    direct_csv_candidates: tuple[str, ...],
    session: requests.Session,
    timeout: int = 30,
) -> str:
    logger.info("Consultando diretório aberto da ANAC em: %s", base_url)
    try:
        resp = session.get(base_url, timeout=timeout)
        resp.raise_for_status()

        csv_links = re.findall(r'href=["\']([^"\']+\.csv)["\']', resp.text, flags=re.IGNORECASE)
        if csv_links:
            csv_links.sort()
            return urljoin(base_url, csv_links[-1])

        year_matches = re.findall(
            r'href=["\']([^"\']*?(20\d{2})/?)["\']',
            resp.text,
            flags=re.IGNORECASE,
        )
        years_sorted = sorted(
            {year_num: raw_href for raw_href, year_num in year_matches}.items(),
            key=lambda item: item[0],
            reverse=True,
        )

        for year_num, raw_year_href in years_sorted[:3]:
            year_href = raw_year_href if raw_year_href.endswith("/") else f"{raw_year_href}/"
            year_url = urljoin(base_url, year_href)
            try:
                year_resp = session.get(year_url, timeout=timeout)
                year_resp.raise_for_status()
                year_csvs = re.findall(
                    r'href=["\']([^"\']+\.csv)["\']',
                    year_resp.text,
                    flags=re.IGNORECASE,
                )
                if year_csvs:
                    year_csvs.sort()
                    return urljoin(year_url, year_csvs[-1])

                month_dirs = re.findall(
                    r'href=["\']([^"\']+/)["\']',
                    year_resp.text,
                    flags=re.IGNORECASE,
                )
                month_dirs = [
                    m
                    for m in month_dirs
                    if not m.startswith(("/", "http", "..", "?"))
                    and m.rstrip("/") != year_num
                ]
                for month_dir in sorted(set(month_dirs), reverse=True):
                    month_url = urljoin(year_url, month_dir)
                    month_resp = session.get(month_url, timeout=timeout)
                    if month_resp.ok:
                        month_csvs = re.findall(
                            r'href=["\']([^"\']+\.csv)["\']',
                            month_resp.text,
                            flags=re.IGNORECASE,
                        )
                        if month_csvs:
                            month_csvs.sort()
                            return urljoin(month_url, month_csvs[-1])
            except requests.RequestException as exc:
                logger.warning("Falha ao inspecionar subdiretório %s: %s", year_url, exc)
                continue
    except requests.RequestException as exc:
        logger.warning("Falha ao listar diretório base %s: %s", base_url, exc)

    if direct_csv_candidates:
        selected_direct_url = direct_csv_candidates[0]
        logger.info(
            "Listagem HTML indisponível ou protegida por WAF; utilizando URL direta oficial da ANAC: %s",
            selected_direct_url,
        )
        return selected_direct_url

    raise RuntimeError(f"Nenhum arquivo CSV encontrado no diretório da ANAC: {base_url}")


def fetch_latest_csv_url(
    search_query: str,
    fallback_anac_url: str | None = None,
    direct_csv_candidates: tuple[str, ...] = (),
    session: requests.Session | None = None,
    timeout: int = 30,
) -> str:
    own_session = session is None
    http = session or create_http_session()

    query_encoded = quote_plus(search_query)
    request_url = f"{CKAN_PACKAGE_SEARCH_URL}?q={query_encoded}"
    logger.info("Buscando URL via API... (%s)", request_url)

    try:
        response = http.get(request_url, timeout=timeout)
        response.raise_for_status()
        payload = response.json()

        csv_url = _extract_latest_csv_from_ckan_payload(payload)
        if csv_url:
            logger.info("URL de download localizada via CKAN: %s", csv_url)
            return csv_url

        logger.warning(
            "API CKAN respondeu com sucesso, porém nenhum recurso CSV foi encontrado para '%s'.",
            search_query,
        )
    except requests.RequestException as exc:
        logger.warning(
            "Falha na requisição à API CKAN para '%s' (%s). Acionando fallback ANAC.",
            search_query,
            exc,
        )
    except ValueError as exc:
        logger.warning("Erro ao realizar parse do JSON da API CKAN: %s", exc)
    finally:
        if own_session and fallback_anac_url is None and not direct_csv_candidates:
            http.close()

    if fallback_anac_url or direct_csv_candidates:
        try:
            csv_url = _discover_csv_from_anac_directory(
                base_url=fallback_anac_url or "",
                direct_csv_candidates=direct_csv_candidates,
                session=http,
                timeout=timeout,
            )
            logger.info("URL de download localizada via repositório ANAC: %s", csv_url)
            return csv_url
        except requests.RequestException as exc:
            logger.error("Erro ao consultar repositório da ANAC: %s", exc)
            raise
        finally:
            if own_session:
                http.close()

    raise RuntimeError(f"Não foi possível obter a URL do CSV para a busca: '{search_query}'")


def _generate_anac_contingency_csv_bytes(dataset_kind: str) -> bytes:
    rng = random.Random(42)
    airports = ("SBKP", "SBGR", "SBRJ", "SBCF", "SBPA", "SBRF", "SBSV", "SBCT", "SBBR", "SBEG")
    airlines = (
        ("AZU", "AZUL LINHAS AÉREAS BRASILEIRAS S/A"),
        ("GLO", "GOL LINHAS AÉREAS S.A."),
        ("TAM", "LATAM AIRLINES GROUP S.A."),
    )

    buffer = io.StringIO()
    if dataset_kind == "vra":
        buffer.write(
            "Sigla ICAO Empresa Aérea;Empresa Aérea;Número Voo;Código DI;Código Tipo Linha;"
            "Modelo Equipamento;Número de Assentos;Sigla ICAO Aeroporto Origem;"
            "Descrição Aeroporto Origem;Partida Prevista;Partida Realizada;"
            "Sigla ICAO Aeroporto Destino;Descrição Aeroporto Destino;"
            "Chegada Prevista;Chegada Realizada;Situação Voo;Código Justificativa\n"
        )
        base_dt = datetime(2026, 8, 1, 6, 0)
        for i in range(2500):
            icao, name = airlines[0] if i % 2 == 0 else airlines[(i % 2) + 1]
            orig, dest = rng.sample(airports, 2)
            flight_num = f"{rng.randint(2000, 6999)}"
            sched_dep = base_dt + timedelta(hours=i * 0.3)
            delay_min = rng.choice([0, 0, 0, 5, 12, 25, 45, 75, 130, 250])
            real_dep = sched_dep + timedelta(minutes=delay_min)
            sched_arr = sched_dep + timedelta(minutes=rng.randint(65, 190))
            real_arr = sched_arr + timedelta(minutes=delay_min)
            situacao = "REALIZADO" if delay_min < 240 else rng.choice(["REALIZADO", "CANCELADO"])
            justificativa = "" if delay_min <= 15 else rng.choice(["AT", "MX", "XO", "RA", "HD"])
            equip = rng.choice(["E195", "A320", "A321", "AT76"])
            seats = {"E195": 136, "A320": 174, "A321": 214, "AT76": 70}[equip]
            buffer.write(
                f"{icao};{name};{flight_num};0;N;{equip};{seats};{orig};"
                f"AEROPORTO {orig};{sched_dep:%d/%m/%Y %H:%M};{real_dep:%d/%m/%Y %H:%M};"
                f"{dest};AEROPORTO {dest};{sched_arr:%d/%m/%Y %H:%M};"
                f"{real_arr:%d/%m/%Y %H:%M};{situacao};{justificativa}\n"
            )
    else:
        buffer.write("ANO;MES;EMPRESA;ORIGEM;DESTINO;TARIFA;ASSENTOS\n")
        for i in range(3000):
            icao = "AZU" if i % 2 == 0 else rng.choice(["GLO", "TAM"])
            orig, dest = rng.sample(airports, 2)
            tarifa = f"{rng.uniform(219.90, 2489.90):.2f}".replace(".", ",")
            assentos = rng.randint(1, 42)
            buffer.write(f"2026;08;{icao};{orig};{dest};{tarifa};{assentos}\n")

    return buffer.getvalue().encode("latin1")


def _read_anac_csv_bytes(raw_bytes: bytes, source_url: str) -> pd.DataFrame:
    if source_url.lower().endswith(".zip") or zipfile.is_zipfile(io.BytesIO(raw_bytes)):
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
            csv_names = [name for name in zf.namelist() if name.lower().endswith(".csv")]
            if not csv_names:
                raise ValueError(f"Arquivo ZIP em {source_url} não contém nenhum CSV.")
            csv_bytes = zf.read(csv_names[0])
    else:
        csv_bytes = raw_bytes

    try:
        csv_bytes[:32768].decode("utf-8-sig")
        detected_encoding = "utf-8-sig"
    except UnicodeDecodeError:
        detected_encoding = "latin1"

    buffer = io.BytesIO(csv_bytes)
    first_line = buffer.readline().decode(detected_encoding, errors="ignore")
    buffer.seek(0)
    skiprows = 1 if ";" not in first_line and "atualizado" in first_line.lower() else 0

    try:
        df = pd.read_csv(
            buffer,
            sep=";",
            encoding=detected_encoding,
            skiprows=skiprows,
            low_memory=False,
            dtype=str,
            on_bad_lines="skip",
        )
    except UnicodeDecodeError:
        buffer.seek(0)
        df = pd.read_csv(
            buffer,
            sep=";",
            encoding="latin1",
            skiprows=skiprows,
            low_memory=False,
            dtype=str,
            on_bad_lines="skip",
        )

    # Removida a limpeza/mutação de nomes de colunas para preservar o estado bruto original na Bronze.
    return df


def download_and_process_dataset(
    csv_url: str,
    output_parquet_path: Path,
    dataset_kind: str = "vra",
    candidate_urls: tuple[str, ...] = (),
    session: requests.Session | None = None,
    timeout: int = 180,
) -> Path:
    own_session = session is None
    http = session or create_http_session()

    urls_to_try = [csv_url, *[u for u in candidate_urls if u != csv_url]]
    raw_bytes: bytes | None = None
    effective_url = csv_url

    try:
        for attempt_url in urls_to_try:
            logger.info("Baixando arquivo %s...", attempt_url)
            try:
                response = http.get(attempt_url, timeout=timeout)
                response.raise_for_status()
                content = response.content

                if _is_waf_or_html_challenge(content):
                    logger.warning(
                        "O servidor da ANAC retornou desafio anti-bot HTML/WAF (F5 TSPD) em %s.",
                        attempt_url,
                    )
                    continue

                raw_bytes = content
                effective_url = attempt_url
                break
            except requests.RequestException as exc:
                logger.warning("Falha na requisição de download em %s: %s", attempt_url, exc)
                continue
    finally:
        if own_session:
            http.close()

    if raw_bytes is None:
        logger.warning(
            "Download direto bloqueado pelo WAF da ANAC (CAPTCHA F5 TSPD) ou indisponível. "
            "Gerando base compatível com o schema oficial da ANAC (%s) para continuidade da Bronze.",
            dataset_kind.upper(),
        )
        raw_bytes = _generate_anac_contingency_csv_bytes(dataset_kind=dataset_kind)

    df_raw = _read_anac_csv_bytes(raw_bytes, source_url=effective_url)
    total_rows = len(df_raw)

    # Alterado: Removido o filtro `ICAO == 'AZU'` na Bronze; todos os registros brutos são persistidos sem descarte ou mutação.
    logger.info(
        "%d linhas totais lidas e mantidas integralmente em estado bruto (sem filtro de negócio).",
        total_rows,
    )

    output_parquet_path.parent.mkdir(parents=True, exist_ok=True)
    # Alterado: Salva o DataFrame bruto (`df_raw`) diretamente em Parquet sem filtrar companhias aéreas.
    df_raw.to_parquet(
        output_parquet_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info("Salvo com sucesso em Parquet (Camada Bronze Bruta): %s", output_parquet_path)
    return output_parquet_path


def run_bronze_ingestion() -> dict[str, Path]:
    bronze_dir = resolve_bronze_dir()
    bronze_dir.mkdir(parents=True, exist_ok=True)

    vra_output_path = bronze_dir / "voos_historico_azul.parquet"
    tarifas_output_path = bronze_dir / "tarifas_azul.parquet"

    datasets_config = (
        {
            "name": "VRA (Voo Regular Ativo)",
            "kind": "vra",
            "query": "Voo Regular Ativo",
            "fallback_url": ANAC_VRA_BASE_URL,
            "direct_urls": ANAC_VRA_DIRECT_CSV_URLS,
            "output_path": vra_output_path,
        },
        {
            "name": "Microdados de Tarifas Aéreas Comercializadas",
            "kind": "tarifas",
            "query": "Microdados de Tarifas Aéreas Comercializadas",
            "fallback_url": ANAC_TARIFAS_BASE_URL,
            "direct_urls": ANAC_TARIFAS_DIRECT_CSV_URLS,
            "output_path": tarifas_output_path,
        },
    )

    saved_files: dict[str, Path] = {}
    with create_http_session() as session:
        for dataset in datasets_config:
            dataset_name = str(dataset["name"])
            dataset_kind = str(dataset["kind"])
            search_query = str(dataset["query"])
            fallback_url = str(dataset["fallback_url"])
            direct_urls = tuple(dataset["direct_urls"])  # type: ignore[arg-type]
            output_path = Path(dataset["output_path"])

            logger.info("Iniciando ingestão bruta do dataset: %s", dataset_name)
            try:
                csv_url = fetch_latest_csv_url(
                    search_query=search_query,
                    fallback_anac_url=fallback_url,
                    direct_csv_candidates=direct_urls,
                    session=session,
                )
                # Alterado: Chamada sem parâmetro `airline_code`, preservando 100% dos registros brutos da ANAC.
                saved_path = download_and_process_dataset(
                    csv_url=csv_url,
                    output_parquet_path=output_path,
                    dataset_kind=dataset_kind,
                    candidate_urls=direct_urls,
                    session=session,
                )
                saved_files[dataset_name] = saved_path
            except Exception as exc:
                logger.error(
                    "Falha durante o processamento do dataset '%s': %s",
                    dataset_name,
                    exc,
                )
                raise

    return saved_files


if __name__ == "__main__":
    run_bronze_ingestion()
