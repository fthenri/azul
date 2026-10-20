from __future__ import annotations

import logging
import sys
import uuid
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

TOPICS: tuple[str, ...] = ("Atraso", "Cancelamento", "Bagagem", "App", "Atendimento")
TOPIC_WEIGHTS: tuple[float, ...] = (0.40, 0.20, 0.20, 0.10, 0.10)

RATING_RANGES_BY_TOPIC: dict[str, tuple[int, int]] = {
    "Atraso": (1, 3),
    "Cancelamento": (1, 2),
    "Bagagem": (1, 2),
    "App": (2, 4),
    "Atendimento": (4, 5),
}

TEMPLATES_BY_TOPIC: dict[str, tuple[str, ...]] = {
    "Atraso": (
        "Meu vôo teve um atrasso absurdo de mais de 3 horas em Viracopos e perdi minha conexão!",
        "Pessimo gerenciamento de embarque, ficamos dentro da aeronave esperando autorização e o vôo atrasou muito.",
        "Sempre voo com a Azul, mas hoje o atrasso de 2h prejudicou minha reunião de negócios em Confins.",
        "Vôo atrasou quase 4 horas por manutenção não programada e nem deram voucher de alimentação no portão.",
        "Trocaram o portão de embarque três vezes em Campinas e o vôo saiu com 90 minutos de atrasso.",
        "Mais uma vez atraso na decolagem, cheguei de madrugada no destino e perdi a diária do hotel.",
        "Atraso de mais de 1 hora na saída de Recife, informação desencontrada dos atendentes de solo.",
    ),
    "Cancelamento": (
        "Cancelaram meu vôo em cima da hora e só me reacomodaram para o dia seguinte, um descaso total!",
        "Pessimo! Vôo cancelado sem explicação plausível, fila gigantesca no balcão da loja e zero assistência.",
        "Tive o vôo cancelado na véspera do feriado e perdi um compromisso familiar inadiável, nunca mais!",
        "Cancelamento absurdo no trecho doméstico, demoraram horas para liberar o voucher de hotel e translado.",
        "Meu vôo foi cancelado por malha aérea e a reacomodação oferecida tinha duas escalas intermináveis.",
        "Simplesmente cancelaram o vôo noturno e deixaram dezenas de famílias esperando no saguão sem suporte.",
        "Vôo cancelado após já estarmos na sala de embarque, logística de contingência muito fraca.",
    ),
    "Bagagem": (
        "Minha mala chegou com a rodinha quebrada na esteira e o processo para abrir o RIB foi super demorado.",
        "Extraviaram minha bagagem na conexão em Viracopos, estou há dois dias sem minhas roupas de trabalho, pessimo!",
        "Despachei a mala intacta e recebi toda rasgada e amassada no desembarque, falta de cuidado com a bagagem.",
        "Mala extraviada em vôo direto! Como conseguem perder uma bagagem despachada com etiqueta prioritária?",
        "Fiquei mais de 1 hora esperando na esteira para descobrir que minha bagagem ficou no aeroporto de origem.",
        "Bagagem danificada no porão, quebraram o cadeado TSA e ninguém no balcão resolveu de imediato.",
        "Extraviaram o carrinho de bebê da minha filha na conexão, transtorno enorme para toda a família.",
    ),
    "App": (
        "O aplicativo travou na hora de gerar o cartão de embarque e tive que enfrentar a fila do balcão.",
        "Não consegui fazer o check-in pelo app de jeito nenhum, dava erro de reserva não localizada no sistema.",
        "App da Azul fica fechando sozinho quando tento marcar assento ou consultar meu saldo de pontos TudoAzul.",
        "Tentei antecipar meu vôo pelo aplicativo como cliente frequente, mas a tela ficava carregando infinitamente.",
        "O aplicativo é bonito, mas na hora de pagar a bagagem extra deu falha no processamento do cartão.",
        "Check-in digital falhou para os outros passageiros do mesmo PNR, precisei imprimir o bilhete no totem.",
    ),
    "Atendimento": (
        "Atendimento impecável dos comissários de bordo, serviço de bordo com snacks variados e TV ao vivo funcionando!",
        "Vôo super confortável no Embraer E2, espaço excelente para as pernas e equipe de solo muito prestativa.",
        "Adoro voar Azul! Os comissários foram super atenciosos com meus filhos e o pouso foi extremamente suave.",
        "Experiência nota 10 do embarque ao desembarque, internet Wi-Fi grátis a bordo funcionou o vôo inteiro.",
        "Equipe do aeroporto resolveu minha dúvida com muita simpatia e o serviço de bordo continua o melhor do Brasil.",
        "Excelente atendimento no check-in prioritário Diamante, embarque rápido e aeronave muito limpa e nova.",
    ),
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
    np.random.seed(seed)
    rng = np.random.default_rng(seed=seed)

    review_ids = _generate_deterministic_uuids(num_reviews, rng)
    chosen_topics = np.random.choice(TOPICS, size=num_reviews, p=TOPIC_WEIGHTS)

    texts = np.empty(num_reviews, dtype=object)
    ratings = np.empty(num_reviews, dtype=np.int64)

    for topic in TOPICS:
        mask = chosen_topics == topic
        count = int(mask.sum())
        if count > 0:
            texts[mask] = np.random.choice(TEMPLATES_BY_TOPIC[topic], size=count)
            low_score, high_score = RATING_RANGES_BY_TOPIC[topic]
            ratings[mask] = np.random.choice(
                np.arange(low_score, high_score + 1),
                size=count,
            )

    return pd.DataFrame(
        {
            "id_avaliacao": pd.Series(review_ids, dtype="string"),
            "topico": pd.Series(chosen_topics, dtype="string"),
            "texto_avaliacao": pd.Series(texts, dtype="string"),
            "nota_cliente": ratings.astype(np.int64),
        }
    )


def run_reviews_bronze_generation() -> Path:
    bronze_dir = resolve_bronze_dir()
    bronze_dir.mkdir(parents=True, exist_ok=True)
    output_path = bronze_dir / "avaliacoes_bronze.parquet"

    logger.info("Gerando %d avaliações sintéticas determinísticas (seed=%d)...", TOTAL_REVIEWS, DEFAULT_SEED)
    df_reviews = generate_reviews_dataframe(num_reviews=TOTAL_REVIEWS, seed=DEFAULT_SEED)

    topic_dist = (
        df_reviews["topico"].value_counts(normalize=True).mul(100).round(1).to_dict()
    )
    logger.info("Distribuição de tópicos gerada (%%): %s", topic_dist)

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

