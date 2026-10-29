from __future__ import annotations

import logging
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np 
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("azul.bronze.reviews")

DEFAULT_SEED: int = 42
TOTAL_REVIEWS: int = 500

CANAIS_PUBLICOS: tuple[str, ...] = (
    "Reclame Aqui",
    "Google Play Store",
    "App Store (iOS)",
    "Consumidor.gov.br",
    "Redes Sociais (X/Twitter)",
)
CANAIS_PESOS: tuple[float, ...] = (0.45, 0.25, 0.15, 0.10, 0.05)

TOPICS: tuple[str, ...] = ("Atraso", "Cancelamento", "Bagagem", "App", "Atendimento")
TOPIC_WEIGHTS: tuple[float, ...] = (0.35, 0.25, 0.20, 0.10, 0.10)

RATING_RANGES_BY_TOPIC: dict[str, tuple[int, int]] = {
    "Atraso": (1, 3),
    "Cancelamento": (1, 2),
    "Bagagem": (1, 2),
    "App": (2, 4),
    "Atendimento": (4, 5),
}

TEMPLATES_POR_TOPICO: dict[str, list[dict[str, str]]] = {
    "Atraso": [
        {
            "titulo": "Atraso absurdo em Viracopos com perda de conexão",
            "texto": "Meu voo AD4120 teve atraso de mais de 3 horas em Viracopos. Perdi minha conexão corporativa e não forneceram assistência material tempestiva.",
        },
        {
            "titulo": "Chá de cadeira dentro da aeronave",
            "texto": "Embarque concluído no horário, mas ficamos retidos mais de 90 minutos na pista sem ar-condicionado adequado. Péssima gestão de solo e comunicação falha.",
        },
        {
            "titulo": "Conexão perdida em Confins",
            "texto": "Sempre viajo a trabalho pela Azul, mas hoje o atraso de 2h em Belo Horizonte arruinou minha agenda de negócios. Demora inaceitável no balcão de contingência.",
        },
        {
            "titulo": "Manutenção não programada e voo atrasado",
            "texto": "Voo atrasou quase 4 horas alegando manutenção não programada da aeronave. Nenhum voucher de alimentação fornecido no portão de embarque conforme a Resolução 400 da ANAC.",
        },
        {
            "titulo": "Troca sucessiva de portões e partida atrasada",
            "texto": "Trocaram o portão de embarque três vezes em Campinas e o voo decolou com mais de 100 minutos de atraso acumulado.",
        },
        {
            "titulo": "Atraso na decolagem e diária de hotel perdida",
            "texto": "Mais uma vez atraso grave na decolagem em Recife. Cheguei de madrugada no destino final e perdi a primeira diária do hotel contratado.",
        },
    ],
    "Cancelamento": [
        {
            "titulo": "Cancelamento arbitrário sem assistência",
            "texto": "Cancelaram meu voo na véspera sem justificativa operacional clara. Fila quilométrica na loja da Azul e recusa inicial de fornecer hospedagem.",
        },
        {
            "titulo": "Voo cancelado no portão de embarque",
            "texto": "Após 2 horas de espera no saguão, voo simplesmente cancelado por reestruturação de malha aérea. Falta total de respeito com passageiros prioritários.",
        },
        {
            "titulo": "Prejuízo no feriado prolongado em família",
            "texto": "Cancelaram o voo matinal da família e só remanejaram para o dia seguinte à noite. Perdemos diárias de hotel pagas e passeios agendados.",
        },
        {
            "titulo": "Reacomodação abusiva com duas conexões longas",
            "texto": "O voo direto foi cancelado sem aviso prévio e a reacomodação oferecida no balcão tinha duas escalas intermináveis totalizando 15 horas de viagem.",
        },
        {
            "titulo": "Cancelamento de voo noturno e saguão lotado",
            "texto": "Simplesmente cancelaram o último voo da noite e deixaram dezenas de passageiros sem voucher de translado ou hotel até a manhã seguinte.",
        },
    ],
    "Bagagem": [
        {
            "titulo": "Mala extraviada em voo direto",
            "texto": "Despachei minha mala intacta em Recife e ela não apareceu na esteira em Salvador. Registro de RIB muito lento e estou há dois dias sem roupas de trabalho.",
        },
        {
            "titulo": "Bagagem danificada no porão da aeronave",
            "texto": "Recebi a mala com a rodinha quebrada, zíper estourado e itens pessoais danificados. Falta de cuidado inadmissível com a bagagem despachada.",
        },
        {
            "titulo": "Etiqueta prioritária ignorada na esteira",
            "texto": "Sou cliente Diamante no TudoAzul, a bagagem tinha etiqueta prioritária e foi a última a ser descarregada após mais de 50 minutos de espera.",
        },
        {
            "titulo": "Carrinho de bebê quebrado no desembarque",
            "texto": "Entregaram o carrinho de bebê quebrado no finger. Demoraram mais de 45 minutos para formalizar a abertura de ocorrência no setor de bagagens.",
        },
        {
            "titulo": "Cadeado TSA violado e pertences revirados",
            "texto": "Minha bagagem chegou com o cadeado forçado e itens pessoais revirados no desembarque em Viracopos. Processo de ressarcimento extremamente burocrático.",
        },
    ],
    "App": [
        {
            "titulo": "Check-in digital inoperante e tela travada",
            "texto": "O aplicativo da Azul apresentou erro constante no fechamento do check-in digital. Tive que enfrentar a fila comum do balcão no aeroporto.",
        },
        {
            "titulo": "Saldo de pontos TudoAzul desatualizado",
            "texto": "Acúmulo de pontos do cartão co-branded não sincronizou no app há mais de duas semanas. A interface trava ao abrir o extrato do programa.",
        },
        {
            "titulo": "Falha na reserva de assento Espaço Azul",
            "texto": "Tentei comprar o assento Espaço Azul pelo aplicativo, o débito ocorreu no cartão mas a poltrona continuou desmarcada no sistema.",
        },
        {
            "titulo": "Erro ao emitir cartão de embarque na Apple Wallet",
            "texto": "Aplicativo fecha sozinho ao tentar exportar o cartão de embarque para a carteira digital. Precisei imprimir bilhete físico no totem de autoatendimento.",
        },
    ],
    "Atendimento": [
        {
            "titulo": "Serviço de bordo e tripulação de cabine impecáveis",
            "texto": "Voo excelente no Embraer E2. Tripulação de cabine extremamente atenciosa, snacks variados à vontade e Wi-Fi de alta velocidade funcionou 100%.",
        },
        {
            "titulo": "Experiência fantástica no Espaço Azul",
            "texto": "Pontualidade britânica, aeronave limpa e atendimento exemplar do solo ao desembarque. A Azul continua sendo a melhor experiência aérea do Brasil.",
        },
        {
            "titulo": "Atendimento Diamante nota 10 no check-in prioritário",
            "texto": "Check-in prioritário super ágil, embarque organizado e cordialidade genuína da equipe de bordo. Padrão internacional de qualidade.",
        },
        {
            "titulo": "Pouso suave e comissários acolhedores",
            "texto": "Adoro voar Azul. Os comissários foram super atenciosos com minha família, serviço de bordo nota dez e entretenimento individual ao vivo perfeito.",
        },
    ],
}


def resolve_bronze_dir() -> Path:
    script_dir = Path(__file__).resolve().parent
    if (script_dir / "data_lake").exists():
        return script_dir / "data_lake" / "bronze"
    return script_dir.parent / "data_lake" / "bronze"


def _generate_deterministic_uuids(n: int, rng: np.random.Generator) -> list[str]:
    raw_bytes = rng.bytes(16 * n)
    return [
        str(uuid.UUID(bytes=raw_bytes[i * 16 : (i + 1) * 16], version=4))
        for i in range(n)
    ]


def generate_reviews_dataframe(
    num_reviews: int = TOTAL_REVIEWS,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed=seed)

    review_ids = _generate_deterministic_uuids(num_reviews, rng)
    canais = rng.choice(CANAIS_PUBLICOS, size=num_reviews, p=CANAIS_PESOS)
    topicos = rng.choice(TOPICS, size=num_reviews, p=TOPIC_WEIGHTS)

    titulos: list[str] = []
    textos: list[str] = []
    notas: list[int] = []
    datas: list[str] = []
    base_date = datetime(2026, 10, 1)

    for i in range(num_reviews):
        topico = str(topicos[i])
        template_pool = TEMPLATES_POR_TOPICO[topico]
        idx_sample = int(rng.integers(0, len(template_pool)))
        sample = template_pool[idx_sample]

        low_score, high_score = RATING_RANGES_BY_TOPIC[topico]
        nota = int(rng.integers(low_score, high_score + 1))

        # Temporalidade realista de publicação pública (últimos 90 dias)
        dias_atras = int(rng.integers(1, 90))
        data_pub = base_date - timedelta(days=dias_atras)

        titulos.append(sample["titulo"])
        textos.append(sample["texto"])
        notas.append(nota)
        datas.append(data_pub.strftime("%Y-%m-%d"))

    return pd.DataFrame(
        {
            "id_avaliacao": pd.Series(review_ids, dtype="string"),
            "canal_origem": pd.Series(canais, dtype="string"),
            "topico": pd.Series(topicos, dtype="string"),
            "titulo_avaliacao": pd.Series(titulos, dtype="string"),
            "texto_avaliacao": pd.Series(textos, dtype="string"),
            "nota_cliente": np.array(notas, dtype=np.int64),
            "data_publicacao": pd.Series(datas, dtype="string"),
        }
    )


def run_reviews_bronze_generation() -> Path:
    bronze_dir = resolve_bronze_dir()
    bronze_dir.mkdir(parents=True, exist_ok=True)
    output_path = bronze_dir / "avaliacoes_bronze.parquet"

    logger.info("Gerando %d avaliações sintéticas calibradas com canais públicos (seed=%d)...", TOTAL_REVIEWS, DEFAULT_SEED)
    df_reviews = generate_reviews_dataframe(num_reviews=TOTAL_REVIEWS, seed=DEFAULT_SEED)

    canais_dist = df_reviews["canal_origem"].value_counts(normalize=True).mul(100).round(1).to_dict()
    topic_dist = df_reviews["topico"].value_counts(normalize=True).mul(100).round(1).to_dict()
    logger.info("Distribuição por Canal Público (%%): %s", canais_dist)
    logger.info("Distribuição por Tópico (%%): %s", topic_dist)

    df_reviews.to_parquet(
        output_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info("Salvo com sucesso em Parquet: %s", output_path)
    return output_path


if __name__ == "__main__":
    run_reviews_bronze_generation()
