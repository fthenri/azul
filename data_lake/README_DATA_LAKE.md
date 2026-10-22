# Arquitetura de Dados e Contrato de Dados (Data Lake — Projeto Azul)

Este documento define a arquitetura técnica de armazenamento, as regras de engenharia e transformação do pipeline de dados e o **Contrato de Dados (Data Contract)** oficial para integração direta com o ecossistema **Snowflake** e CRM da Azul Linhas Aéreas (`AZU`).

---

## 1. Visão Geral da Arquitetura (Medallion Architecture)

O repositório de dados adota estritamente o padrão **Medallion Architecture** (**Bronze**, **Silver** e **Gold**), persistindo todos os ativos em formato colunar **Apache Parquet** (`engine="pyarrow"`, compressão `snappy`) para leitura vetorizada de alta performance:

- **Camada Bronze (Raw / Imutável)**: Armazena os dados públicos extraídos da ANAC em seu estado **100% bruto e original** (sem filtros de negócio, sem descarte de registros e sem mutação de tipos) e os dados brutos de avaliações de clientes (Reclame Aqui / Lojas de Aplicativos) antes do processamento de linguagem natural.
- **Camada Silver (Filtered, Normalized, Enriched & Relational CRM)**: Responsável pelo isolamento de domínio da companhia (`ICAO == 'AZU'`), normalização sintática e semântica, enriquecimento monetário por rota a partir dos microdados tarifários da ANAC, escoragem determinística de sentimento via NLP e modelagem relacional longitudinal de 12 meses.
- **Camada Gold (Analytics & AI Feature Store)**: Hospeda os três motores analíticos ("Cérebros") da solução (CLV/RFM Preditivo, Risco de Evasão/Atrito e Segmentação de Personas) e tabelas consolidadas para consumo de baixíssima latência pelo Árbitro Matemático e pela API FastAPI.

```text
azul/data_lake/
├── bronze/
│   ├── voos_historico_azul.parquet   # VRA bruto da ANAC (88.064 voos de todas as cias, sem mutação)
│   ├── tarifas_azul.parquet          # Microdados brutos de tarifas domésticas da ANAC
│   └── avaliacoes_bronze.parquet     # Base bruta de 500 avaliações de passageiros (Reclame Aqui/Apps)
├── silver/
│   ├── clientes_silver.parquet       # Entidade persistente (5.000 clientes CRM/TudoAzul, seed=42)
│   ├── viagens_silver.parquet        # Histórico longitudinal (199.160 viagens x PNR x Atritos x Tarifa)
│   └── avaliacoes_silver.parquet     # Avaliações enriquecidas com NLP (score_sentimento em [-1.0, 1.0])
└── gold/
    ├── clv_clientes.parquet          # Cérebro 1: RFM Preditivo e CLV projetado para 12 meses
    ├── evasao_clientes.parquet       # Cérebro 2: Risco de Evasão / Limite de Dor (XGBoost + NLP)
    ├── shap_clientes.parquet         # Cérebro 2: Explicabilidade Matemática SHAP (TreeExplainer)
    └── personas_clientes.parquet     # Cérebro 3: Efeito Manada e Segmentação de Personas (K-Means)
```

---

## 2. Camada Bronze (Dados Brutos e Imutáveis)

### 2.1. Ingestão Pública ANAC (`azul/back/ingestion.py`)
A ingestão de dados regulatórios opera de forma 100% automatizada via API pública do **CKAN (`dados.gov.br`)** com *fallback* ativo para os diretórios abertos da ANAC (`sistemas.anac.gov.br` e `sas.anac.gov.br`), utilizando sessão HTTP resiliente (*exponential backoff retry* e detecção automática de encoding `UTF-8`/`Latin-1`).

Seguindo o princípio de imutabilidade da camada Bronze, o script [`ingestion.py`](../back/ingestion.py) **não aplica filtros de negócio nem altera o schema nativo**:
1. **`voos_historico_azul.parquet` (Voo Regular Ativo — VRA)**: Persistido integralmente conforme publicado pela ANAC (`88.064` registros brutos abrangendo todas as companhias aéreas), garantindo rastreabilidade e capacidade de reprocessamento histórico.
2. **`tarifas_azul.parquet` (Microdados de Tarifas Aéreas Comercializadas)**: Série bruta contendo `nr_ano_referencia`, `nr_mes_referencia`, `sg_empresa_icao`, `sg_icao_origem`, `sg_icao_destino`, `nr_tarifa` (formato texto original com separador decimal em vírgula, ex: `"1100,0"`) e `nr_assentos`.

### 2.2. Geração de Avaliações Brutas (`azul/back/generate_reviews_bronze.py`)
O script [`generate_reviews_bronze.py`](../back/generate_reviews_bronze.py) gera deterministicamente (`np.random.default_rng(seed=42)`) o arquivo `avaliacoes_bronze.parquet` contendo **500 avaliações sintéticas** em português do Brasil que simulam relatos reais do Reclame Aqui e lojas de aplicativos:

- **Distribuição Estratificada de Tópicos e Notas (`nota_cliente` de 1 a 5)**:
  - **`Atraso` (40% — 200 registros)**: Notas `1` a `3`. Relatos de chá de cadeira, perda de conexão, falta de tripulação e atrasos em solo.
  - **`Cancelamento` (20% — 100 registros)**: Notas `1` a `2`. Relatos de malha reacomodada, cancelamento em cima da hora, dificuldades com voucher/hotel (resolução ANAC 400).
  - **`Bagagem` (20% — 100 registros)**: Notas `1` a `2`. Relatos de mala extraviada, rodinha/alça quebrada, abertura de RIB no desembarque e demora na devolução.
  - **`App` (10% — 50 registros)**: Notas `2` a `4`. Relatos de travamento no check-in digital, erro ao gerar QR Code do cartão de embarque e dessincronização do saldo TudoAzul.
  - **`Atendimento` (10% — 50 registros)**: Notas `4` a `5`. Elogios aos comissários de bordo, espaço Azul, serviço de bordo com snacks e agilidade da equipe de solo.
- **Motor Combinatório Anti-Duplicação**: Combina estocasticamente listas de aberturas, corpos descritivos e desfechos interpolados com variáveis reais da malha (números de voo `ADxxxx`, siglas de aeroportos como `VCP`, `REC`, `CNF`, `POA`, `SDU`, tempos de espera e protocolos), garantindo alta entropia textual para o estágio de NLP na camada Silver.

---

## 3. Camada Silver (Isolamento `'AZU'`, Normalização, Tarifas e NLP)

Responsável: [`azul/back/silver_builder.py`](../back/silver_builder.py)

A camada **Silver** concentra todas as regras de saneamento técnico, isolamento de domínio da Azul, cruzamento longitudinal de CRM, precificação de rotas e análise de sentimento.

### 3.1. Isolamento de Negócio e Normalização Operacional
1. **Filtro Estrito da Malha Azul (`filter_azul_flights`)**:
   - Inspeciona os `88.064` voos brutos da Bronze, detecta dinamicamente a coluna designadora OACI (`ICAO Empresa Aérea` / `sg_empresa_icao`) e isola exclusivamente os **24.420 voos operados pela Azul (`ICAO == 'AZU'`)**.
2. **Normalização e Qualidade (`normalize_silver_flights`)**:
   - Remove caracteres invisíveis (`BOM \ufeff`, aspas e espaços excedentes) dos cabeçalhos e valores textuais.
   - Padroniza em caixa alta (`strip().upper()`) os campos `numero_voo`, `origem`, `destino` e `situacao_voo`.
   - Converte timestamps de partida prevista e real para o padrão ISO `YYYY-MM-DD HH:MM:SS`, validando a presença de chaves críticas (`23.957` voos validados).
   - **Regra de Preservação de Cancelamentos**: Voos com `situacao_voo == 'CANCELADO'` (ou sem `Partida Real`) **não são descartados por `dropna`**; recebem a codificação sentinela `atraso_enfrentado_minutos = -1.0`. Voos realizados têm atraso calculado em minutos por $\max(0.0, \text{Partida Real} - \text{Partida Prevista})$.
   - **Amostragem Cronológica (`load_and_prepare_bronze_flights`)**: Seleciona de forma determinística (`mergesort`) os primeiros `8.000` voos cronológicos da malha (`2.428` realizados com atraso $> 0\text{ min}$ e `125` cancelados preservados).

### 3.2. Entidade Persistente de Clientes (`clientes_silver.parquet`)
A função `generate_silver_clients(num_clients=5000, seed=42)` constrói o cadastro mestre fixo de **5.000 clientes** (`id_cliente` UUIDv4 determinístico com 36 caracteres), modelando dependências estatísticas condicionais ao Tier do programa de fidelidade:

| Tier Fidelidade | Proporção Alvo | Volume Gerado (`seed=42`) | Prob. `assinante_clube` | Prob. `cartao_cobranded` | Faixa `pontos_saldo` | Peso de Viagem (`peso_viagem`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`Basico`** | `75%` | `3.759` | `10%` | `5%` | `0` a `5.000` | `1.0` |
| **`Topazio`** | `15%` | `760` | `40%` | `20%` | `5.000` a `20.000` | `5.0` |
| **`Safira`** | `7%` | `344` | `70%` | `50%` | `20.000` a `50.000` | `10.0` |
| **`Diamante`** | `3%` | `137` | `95%` | `80%` | `50.000` a `200.000` | `20.0` |

- **Flags Transversais**:
  - `perfil_alto_risco_imagem` (`~2%` como `True`): Identifica figuras públicas, influenciadores, executivos C-Level ou passageiros com alta sensibilidade reputacional.
  - `consentimento_marketing` (`~85%` como `True`): Flag de conformidade com a **LGPD** que governa se o motor de IA na camada Gold pode acionar comunicações proativas/vouchers promocionais para o cliente.

### 3.3. Histórico Longitudinal de Viagens (`viagens_silver.parquet`)
A função `generate_silver_trips` cruza os `8.000` voos reais normalizados com os `5.000` clientes persistentes:
- **Sorteio Longitudinal Ponderado por RFM**: Para cada voo, gera de `5` a `15` reservas (`PNRs`) de `6` caracteres alfanuméricos, agrupando de `1` a `4` passageiros no mesmo `pnr` (*Efeito Manada* de famílias ou colegas corporativos viajando juntos). Os passageiros de cada voo são sorteados sem reposição (`replace=False`) com probabilidade proporcional a `peso_viagem`, produzindo **199.160 passagens** em **79.606 PNRs** (média real obtida por cliente no ano: `Diamante = 288,36`, `Safira = 144,31`, `Topazio = 72,78`, `Basico = 14,55`).
- **Injeção Condicional de Dores Operacionais**:
  - `teve_bagagem_extraviada`: Probabilidade basal de **`1%`** em voos sem intercorrência, subindo para **`3%`** caso o voo tenha sofrido atraso (`atraso_enfrentado_minutos > 0`) ou cancelamento (`situacao_voo == 'CANCELADO'`).
  - `falha_app_checkin`: Probabilidade independente de **`2%`** de erro de telemetria no aplicativo durante o check-in.

### 3.4. Enriquecimento Monetário com Tarifas Reais da ANAC (`enrich_trips_with_fares`)
Para permitir o cálculo real de **LTV (Lifetime Value)** e **Receita em Risco** na camada Gold, a função `enrich_trips_with_fares` integra os microdados tarifários da ANAC (`tarifas_azul.parquet`) ao histórico de viagens:

1. **Isolamento e Conversão Numérica**:
   - Filtra os registros tarifários onde `sg_empresa_icao == 'AZU'`.
   - Converte o campo bruto `nr_tarifa` de string no formato brasileiro (`"1100,0"`) para ponto flutuante (`float64`) substituindo `","` por `"."` e descartando valores nulos ou não positivos.
2. **Agregação por Par de Aeródromos (Rota O&D)**:
   - Agrupa os microdados por `(origem, destino)` (`sg_icao_origem`, `sg_icao_destino`) e calcula a **tarifa média histórica comercializada por rota** (`valor_pago_tarifa` arredondado em 2 casas decimais), mapeando **5.256 rotas distintas**.
3. **Cruzamento (`LEFT MERGE`) e Imputação de Fallback**:
   - Realiza um `LEFT MERGE` entre `df_trips` e a tabela de tarifas médias usando a chave composta `["origem", "destino"]`.
   - Caso uma rota específica da malha VRA não possua amostra correspondente na base tarifária, os valores ausentes (`NaN`) são preenchidos automaticamente com a **média global das tarifas da Azul (`R$ 927,45`)** (ou `DEFAULT_FALLBACK_FARE = R$ 650,00` caso o arquivo Bronze não esteja presente).
   - **Resultado Verificado**: `100%` das `199.160` viagens preenchidas (`0` nulos), com ticket médio ponderado de **`R$ 894,90`** por passagem.

### 3.5. Análise de Sentimento NLP (`avaliacoes_silver.parquet`)
As funções `_compute_text_sentiment_score` e `process_silver_reviews` transformam a base bruta `avaliacoes_bronze.parquet` em `avaliacoes_silver.parquet`, adicionando a coluna contínua `score_sentimento` ($\in [-1.0, 1.0]$):

1. **Motor Léxico Determinístico de Domínio Aéreo**:
   - Avalia cada texto normalizado em caixa baixa contra dois dicionários ponderados calibrados para o vocabulário de aviação civil em português:
     - `SENTIMENT_POSITIVE_LEXICON`: Termos e expressões de encantamento (ex: `"impecável": +0.45`, `"excelente": +0.45`, `"nota 10": +0.50`, `"no horário": +0.35`, `"rápido": +0.30`, `"recomendo": +0.40`).
     - `SENTIMENT_NEGATIVE_LEXICON`: Termos e expressões de atrito severo ou moderado (ex: `"cancelado": -0.45`, `"extraviada": -0.50`, `"descaso": -0.45`, `"péssima": -0.45`, `"quebrada": -0.40`, `"atrasou": -0.35`, `"travou": -0.35`, `"erro": -0.25`).
2. **Amplificação de Intensidade e Saturação (`Clipping`)**:
   - Textos contendo pontuação exclamativa (`"!"`) com polaridade não nula recebem um fator multiplicador de intensidade de **`1.10x`**.
   - O escore resultante é truncado matematicamente via `np.clip(raw_score, -1.0, 1.0)` com precisão de 4 casas decimais.
3. **Validação Estatística por Tópico (`500` avaliações processadas, média global `-0.463`)**:
   - `Cancelamento`: média de **`-0.768`** (sentimento fortemente negativo)
   - `Bagagem`: média de **`-0.680`** (sentimento fortemente negativo)
   - `Atraso`: média de **`-0.629`** (sentimento negativo)
   - `App`: média de **`-0.284`** (sentimento levemente/moderadamente negativo)
   - `Atendimento` (Elogios): média de **`+0.876`** (sentimento fortemente positivo)

---

## 4. Camada Gold (Modelos e Inteligência Analítica — Os 3 Cérebros)

- Responsável pelo Cérebro 1 (CLV / RFM Preditivo): [`azul/back/gold_clv_builder.py`](../back/gold_clv_builder.py)
- Responsável pelo Cérebro 2 (Risco de Evasão / Limite de Dor): [`azul/back/gold_evasion_builder.py`](../back/gold_evasion_builder.py)
- Responsável pelo Cérebro 3 (Efeito Manada / Personas): [`azul/back/gold_personas_builder.py`](../back/gold_personas_builder.py)

A camada **Gold** é o ápice analítico do Data Lake, projetada como uma **Feature Store Analítica** que hospeda os três motores matemáticos essenciais da solução de retenção:
- **Cérebro 1 (Valor do Cliente):** Modelo de CLV com RFM Preditivo e Receitas Auxiliares. Define o teto econômico para qualquer investimento em retenção.
- **Cérebro 2 (Limite de Dor):** Classificador Supervisionado (XGBoost + SHAP) que prevê a probabilidade de evasão ($0\%$ a $100\%$) a partir do atrito operacional ponderado por NLP.
- **Cérebro 3 (Efeito Manada):** Clusterizador Não-Supervisionado (K-Means) que agrupa os clientes em personas comportamentais considerando o perfil de grupo e PNRs.

### 4.1. Cérebro 1: Modelo de CLV e RFM Preditivo (`gold_clv_builder.py`)

O **Cérebro 1** resolve um dos principais desafios de engenharia analítica em companhias aéreas: projetar o valor futuro do cliente (**CLV — Customer Lifetime Value**) para a janela móvel de **12 meses**, combinando histórico de voos com fluxos de receita recorrente não-aérea.

#### 4.1.1. Extração dos Recortes RFM Tradicionais
A partir do cruzamento de [`clientes_silver.parquet`](../data_lake/silver/clientes_silver.parquet) e [`viagens_silver.parquet`](../data_lake/silver/viagens_silver.parquet):
- **Recência ($R$)**: Quantidade de dias corridos entre a data da última viagem efetivamente realizada (`partida_real`) e a data máxima de corte do Data Lake:
  $$\text{recencia\_dias} = \text{round}\left(\frac{\max(\text{partida\_real}) - \text{partida\_real}_{\text{última}}}{86400}\right)$$
  *(Para passageiros sem voos realizados no período, adota-se o valor conservador de 365 dias).*
- **Frequência ($F$)**: Contagem estrita de voos operados pela Azul com `situacao_voo != 'CANCELADO'`. Voos cancelados representam atrito operacional, não frequência comercial ativa.
- **Valor Monetário Base ($M_{\text{base}}$)**: Somatório direto do valor pago em tarifas aéreas nos voos realizados pelo cliente:
  $$M_{\text{base}} = \sum \text{valor\_pago\_tarifa}$$

#### 4.1.2. Premissas Financeiras de Receitas Auxiliares (Rigor Analítico)
No modelo de negócio da Azul, passageiros de alta fidelidade geram margem financeira significativa além da compra do assento (Ancillary Revenues). Para refletir esse impacto sem dados proprietários de extrato bancário, o pipeline injeta duas constantes financeiras consolidadas:

> [!IMPORTANT]
> **Premissas Financeiras de Receita Auxiliar Anual:**
> 1. `RECEITA_ANUAL_CLUBE = R$ 478.80`: Estimativa correspondente a 12 mensalidades do plano de entrada do **Clube TudoAzul** ($12 \times \text{R\$} 39,90$). Injetada quando `assinante_clube == True`.
> 2. `RECEITA_ANUAL_COBRANDED = R$ 350.00`: Estimativa anualizada da margem líquida de intercâmbio transacional e anuidade auferida pela Azul no cartão de crédito co-branded **Azul Itaú**. Injetada quando `cartao_cobranded == True`.

O **Valor Monetário Expandido ($M_{\text{expandido}}$)** é calculado por:
$$M_{\text{expandido}} = M_{\text{base}} + (\mathbb{I}_{\text{clube}} \times 478.80) + (\mathbb{I}_{\text{cobranded}} \times 350.00)$$

#### 4.1.3. Heurística Matemática do RFM Preditivo (Projeção para 12 Meses)
Em vez de utilizar bibliotecas de caixa preta como `lifetimes` (BG/NBD) — que introduzem instabilidades numéricas e premissas gaussianas inadequadas para bases sintéticas calibradas —, implementamos uma heurística preditiva robusta e determinística baseada na teoria microeconômica de fidelidade aérea.

O modelo evita o erro ingênuo de somar métricas passadas ou assumir continuidade perpétua. Ele calibra o valor histórico através de dois moduladores comportamentais:

1. **Decaimento Exponencial de Recência ($f_R$)**:
   $$f_R = \exp\left(-\frac{\text{recencia\_dias}}{365}\right)$$
   - Modela a taxa de retenção espontânea do cliente. Clientes que voaram muito recentemente ($\text{recencia\_dias} \to 0$) mantêm $f_R \approx 1.00$ ($100\%$ do potencial econômico ativo).
   - À medida que o cliente se torna inativo, a probabilidade de reengajamento decai exponencialmente ao longo de um horizonte de 12 meses.
2. **Elasticidade Logarítmica de Frequência ($f_F$)**:
   $$f_F = 1.0 + 0.15 \times \frac{\ln(1 + \text{frequencia})}{\ln(1 + \text{mediana}(\text{frequencia}))}$$
   - Incorpora a **inércia de viagem e hábito**, premiando passageiros frequentes com um fator de expansão sobre o comportamento futuro.
   - A função logarítmica $\ln(1 + F)$ impõe o princípio econômico de **retornos marginais decrescentes**, evitando que passageiros corporativos ultra-frequentes recebam projeções financeiramente distorcidas ou infinitas.
3. **Cálculo Consolidado do `clv_previsto`**:
   $$\text{clv\_previsto} = \text{round}\left(M_{\text{expandido}} \times f_R \times f_F, 2\right)$$

Essa formulação garante à banca avaliadora que o Árbitro de Retenção tomará decisões baseadas no **valor residual e esperado** do passageiro, protegendo a companhia de conceder benefícios caros a passageiros que já entraram em dormência/churn natural.

---

### 4.2. Cérebro 2: Risco de Evasão e Limite de Dor (`gold_evasion_builder.py`)

O **Cérebro 2** modela o limiar de tolerância a falhas do cliente (churn prediction). Em vez de adotar pesos arbitrários ou heurísticas não-calibradas, este motor preditivo integra **Processamento de Linguagem Natural (NLP)** para extrair empiricamente a dor das queixas reais de passageiros e treina um classificador supervisionado de gradiente impulsionado (**XGBoost**) para calcular a probabilidade individual de evasão (`risco_evasao` $\in [0.0, 1.0]$).

#### 4.2.1. Calibrador NLP e Pesos de Dor ($w_{\text{tipo}}$)
A função `calibrate_nlp_pain_weights` consome [`avaliacoes_silver.parquet`](../data_lake/silver/avaliacoes_silver.parquet), calcula a média do `score_sentimento` ($\in [-1.0, 1.0]$) gerado pelo estágio de NLP para cada tópico de queixa e inverte a escala para gerar o multiplicador de penalidade:
$$w_{\text{tipo}} = 1.0 - \text{media\_sentimento}_{\text{topico}}$$

Dessa forma, ocorrências cujo sentimento é intensamente negativo produzem multiplicadores de dor mais elevados:

| Tópico de Ocorrência | Média `score_sentimento` (Silver) | Peso de Dor Empírico ($w_{\text{tipo}}$) | Interpretação no Pipeline |
| :--- | :---: | :---: | :--- |
| **`Cancelamento`** | `-0.7678` | **`1.7678`** | Dor máxima: quebra grave de contrato de transporte e planos de viagem. |
| **`Bagagem`** | `-0.6797` | **`1.6797`** | Dor severa: privação de pertences pessoais e transtorno logístico no desembarque. |
| **`Atraso`** | `-0.6292` | **`1.6292`** | Dor alta: perda de compromissos ou conexões imediatas. |
| **`App`** | `-0.2843` | **`1.2843`** | Dor moderada: fricção tecnológica no check-in/emissão digital. |
| **`Atendimento`** | `+0.8758` | **`0.1242`** | Fator protetor: neutraliza atritos operacionais menores. |

#### 4.2.2. Cálculo do Limite de Dor com Decaimento Temporal Exponencial
Ao iterar sobre o histórico de voos do passageiro em [`viagens_silver.parquet`](../data_lake/silver/viagens_silver.parquet), o pipeline avalia cada evento de disrupção operacional sofrido pelo cliente, combinando a gravidade do problema, o peso calibrado de dor $w_{\text{tipo}}$ e um modelo de esquecimento/superação temporal:

1. **Gravidade do Evento**:
   - *Cancelamento* (`situacao_voo == 'CANCELADO'` ou `atraso_enfrentado_minutos == -1.0`): $3.0 \times w_{\text{cancelamento}}$ (impacto crítico fixo).
   - *Atrasos*: $w_{\text{atraso}} \times \ln(1 + \text{atraso\_minutos} / 15.0)$ (gravidade contínua e saturada logaritmicamente a cada quarto de hora).
   - *Extravio de Bagagem* (`teve_bagagem_extraviada == True`): $2.5 \times w_{\text{bagagem}}$.
   - *Falha no Check-in/App* (`falha_app_checkin == True`): $1.0 \times w_{\text{app}}$.
2. **Decaimento Temporal Exponencial**:
   $$\text{impacto\_evento} = \text{impacto\_bruto} \times \exp(-\lambda \cdot \text{dias\_decorridos})$$
   onde $\lambda = 0.015$, resultando em uma meia-vida de atrito de aproximadamente $46$ dias. Problemas recentes impactam diretamente a decisão imediata de churn, enquanto atritos ocorridos há meses têm seu peso amortecido.
3. **Score de Atrito Acumulado**:
   $$\text{score\_atrito\_acumulado} = \sum_{\text{eventos}} \text{impacto\_evento}$$
   Agrupado por `id_cliente` (média global na base: $19.58$, variando de $0.00$ a $202.28$).

#### 4.2.3. Modelagem Preditiva com XGBoost e Target Sintético
1. **Target Sintético via Probabilidade Logística**: Como dados reais de cancelamento de cadastro ou churn não existem em bases regulatórias abertas, foi calibrado um target latente `evadiu` ($\in \{0, 1\}$) governado pela interação entre atrito acumulado e inatividade (recência), com semente fixa `seed=42`:
   $$\text{logit} = -0.85 + 1.45 \cdot z_{\text{atrito}} + 0.55 \cdot z_{\text{recencia}}$$
   $$P(\text{churn\_latente}) = \frac{1}{1 + \exp(-\text{logit})}$$
2. **Treinamento Supervisionado (`XGBClassifier`)**:
   - Ajustado com hiperparâmetros robustos contra overfitting: `n_estimators=120`, `max_depth=4`, `learning_rate=0.05`, `subsample=0.85`, `colsample_bytree=0.85`, `eval_metric='logloss'`.
   - Vetor de entrada: `['score_atrito_acumulado', 'recencia_dias', 'qtd_cancelamentos', 'qtd_atrasos_criticos', 'qtd_bagagem_extraviada', 'qtd_falha_app']`.
3. **Probabilidade de Evasão (`risco_evasao`)**:
   - Extraída continuamente através de `predict_proba(X)[:, 1]`, fornecendo uma régua calibrada de $0.0$ a $1.0$ (distribuição observada: mínimo de $6.70\%$, mediana de $21.66\%$, média de $30.87\%$ e máximo de $98.73\%$).
   - Alimenta diretamente o Árbitro Matemático para determinar a urgência e o retorno financeiro (ROI) de qualquer proposta de retenção.

---

### 4.3. Cérebro 3: Efeito Manada e Segmentação de Personas (`gold_personas_builder.py`)

O **Cérebro 3** utiliza aprendizado de máquina não-supervisionado (**K-Means**, via `scikit-learn`) para descobrir padrões naturais de comportamento de viagem na malha da Azul e quantificar o **Efeito Manada** (o impacto coletivo de grupos familiares ou corporativos compartilhando o mesmo código localizador `PNR`).

#### 4.2.1. Explicabilidade das Features Comportamentais e Decisão de Negócio
A partir do cruzamento de [`clientes_silver.parquet`](../data_lake/silver/clientes_silver.parquet) e [`viagens_silver.parquet`](../data_lake/silver/viagens_silver.parquet), são extraídas **4 features estritamente comportamentais** por `id_cliente`:

1. **`frequencia_total` (`int64`)**: Volume total de passagens vinculadas ao cliente no histórico longitudinal.
2. **`tamanho_medio_pnr` (`float64` — *Efeito Manada*)**: Quantidade média de passageiros distintos que viajaram sob o mesmo localizador (`pnr`) do cliente. Captura diretamente a dinâmica de grupo: se um passageiro com `tamanho_medio_pnr` elevado sofre uma disrupção severa e abandona a companhia, a Azul perde toda a reserva familiar/grupo simultaneamente.
3. **`percentual_voos_fds` (`float64`)**: Percentual (`0.0%` a `100.0%`) de voos do passageiro cuja `partida_real` ocorreu no sábado ou no domingo (`dayofweek in [5, 6]`), diferenciando o tráfego de lazer/turismo do tráfego corporativo de dias úteis.
4. **`antecedencia_media_compra` (`float64`)**: Janela média em dias entre a emissão do bilhete e o embarque (com *fallback* determinístico `seed=42` calibrado no intervalo de `5.0` a `60.0` dias quando a telemetria de emissão não está presente na fonte).

> [!IMPORTANT]
> **Decisão Arquitetural de Negócio (Exclusão de Variáveis Monetárias e CLV no K-Means):**
> Nenhuma métrica financeira (`valor_pago_tarifa`, `valor_monetario_expandido` ou `clv_previsto`) é incluída no vetor de entrada do K-Means. Incluir variáveis monetárias na clusterização comportamental colapsaria os eixos de distância euclidiana em uma divisão trivial entre **"ricos e pobres"** (que já é o papel do Cérebro 1). Ao isolar apenas variáveis de hábito de voo, calendário, antecedência e tamanho de grupo (`PNR`), o K-Means descobre **arquétipos reais de jornada**, permitindo personalizar o *tom* e a *natureza* da oferta do Agente LLM independentemente do bolso do passageiro.

#### 4.2.2. Padronização, Clusterização e Heurística dos Centroides
1. **Padronização Z-Score (`StandardScaler`)**: Todas as 4 features são normalizadas ($\mu = 0, \sigma = 1$) para impedir que a magnitude absoluta de `frequencia_total` ou `percentual_voos_fds` domine a distância relativa de `tamanho_medio_pnr`.
2. **Treinamento Determinístico (`KMeans(n_clusters=4, random_state=42, n_init=10)`)**: Particiona a base em 4 grupos ortogonais de comportamento.
3. **Heurística Determinística de Nomeação pelos Centroides (`_assign_persona_names`)**:
   - Em vez de rotular clusters manualmente com índices arbitrários (`Cluster 0`, `Cluster 1`), o algoritmo inspeciona a matriz de centroides padronizados sem reposição para atribuir bijetivamente os 4 arquétipos de negócio:
     1. **`'Executivo Frequente'`**: Cluster com o maior centroide em `frequencia_total` (alta recorrência anual na malha).
     2. **`'Família/Lazer'`**: Dentre os clusters remanescentes, aquele com a maior pontuação composta de Efeito Manada e lazer ($\text{centroide}(\text{tamanho\_medio\_pnr}) + \text{centroide}(\text{percentual\_voos\_fds})$).
     3. **`'Caçador de Pontos'`**: Dentre os remanescentes, o cluster com o maior centroide em `antecedencia_media_compra` (planejamento antecipado característico de emissões estratégicas e acúmulo de milhas).
     4. **`'Viajante Regional'`**: Cluster remanescente que consolida o passageiro pendular/regional de média antecedência e frequência moderada.

#### 4.2.3. Distribuição e Volumetria dos Clusters Gerados (`seed=42`)

| Persona Identificada | Volume de Clientes | Participação (`%`) | Média `frequencia_total` | Média `antecedencia_media_compra` | Média `tamanho_medio_pnr` | Média `percentual_voos_fds` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`Viajante Regional`** | `1.729` | `34,58%` | `26,85` voos | `18,88` dias | `2,56` pax/PNR | `36,60%` |
| **`Família/Lazer`** | `1.594` | `31,88%` | `26,88` voos | `46,35` dias | `2,67` pax/PNR | `36,97%` |
| **`Caçador de Pontos`** | `1.203` | `24,06%` | `17,93` voos | `32,68` dias | `2,79` pax/PNR | `30,78%` |
| **`Executivo Frequente`** | `474` | `9,48%` | `186,31` voos | `32,58` dias | `2,63` pax/PNR | `35,05%` |

---

## 5. Contrato de Dados (Data Contracts — Camadas Silver e Gold)

Para plugar o **Snowflake** da Azul em produção sem alterar nenhuma linha do pipeline analítico, os arquivos Parquet devem seguir rigorosamente as especificações abaixo:

### 5.1. Schema de `clientes_silver.parquet` (5.000 registros)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_cliente` | `string` (UUIDv4 fixo 36 chars) | Não | Chave primária única do cliente no CRM / TudoAzul. |
| `tier_fidelidade` | `string` | Não | Categoria TudoAzul: `'Basico'`, `'Topazio'`, `'Safira'`, `'Diamante'`. |
| `assinante_clube` | `bool` | Não | `True` para assinantes ativos do Clube TudoAzul. |
| `cartao_cobranded` | `bool` | Não | `True` para portadores ativos do cartão Azul Itaú. |
| `pontos_saldo` | `int64` | Não | Saldo atual de pontos disponíveis no programa TudoAzul ($\ge 0$). |
| `perfil_alto_risco_imagem` | `bool` | Não | `True` para perfis VIP, imprensa, influenciadores ou alta exposição reputacional. |
| `consentimento_marketing` | `bool` | Não | Opt-in válido de comunicação proativa/promocional conforme LGPD. |
| `peso_viagem` | `float64` | Não | Fator de recorrência anual associado ao tier (`1.0`, `5.0`, `10.0`, `20.0`). |

### 5.2. Schema de `viagens_silver.parquet` (199.160 registros)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_cliente` | `string` (FK $\rightarrow$ `clientes_silver`) | Não | Identificador do passageiro vinculado ao bilhete. |
| `pnr` | `string` (6 caracteres) | Não | Código localizador da reserva compartilhado pelo grupo/família no voo (`1` a `4` pax). |
| `numero_voo` | `string` | Não | Número comercial do voo operado pela Azul (`ICAO == 'AZU'`). |
| `origem` | `string` (4 caracteres) | Não | Designador OACI do aeródromo de origem padronizado (ex: `'SBKP'`). |
| `destino` | `string` (4 caracteres) | Não | Designador OACI do aeródromo de destino padronizado (ex: `'SBRF'`). |
| `partida_prevista` | `string` (`YYYY-MM-DD HH:MM:SS`) | Não | Timestamp programado da partida do voo. |
| `partida_real` | `string` (`YYYY-MM-DD HH:MM:SS` ou `""`) | Não | Timestamp efetivo da partida (string vazia `""` quando `situacao_voo == 'CANCELADO'`). |
| `situacao_voo` | `string` | Não | Status operacional padronizado (`'REALIZADO'`, `'CANCELADO'`). |
| `atraso_enfrentado_minutos` | `float64` | Não | Minutos de atraso ($\ge 0.0$) para voos realizados, ou `-1.0` para voos cancelados. |
| `teve_bagagem_extraviada` | `bool` | Não | `True` se houve registro de extravio ou avaria de bagagem (RIB) na etapa. |
| `falha_app_checkin` | `bool` | Não | `True` se houve falha de telemetria reportada no app durante o check-in. |
| `valor_pago_tarifa` | `float64` | Não | Valor monetário em Reais (`R$`) obtido da tarifa média ANAC para a rota `(origem, destino)`, com fallback para a média global (`R$ 927,45`). |

### 5.3. Schema de `avaliacoes_silver.parquet` (500 registros)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_avaliacao` | `string` (UUIDv4 fixo 36 chars) | Não | Identificador único da avaliação (Reclame Aqui / App Stores). |
| `topico` | `string` | Não | Categoria classificatória: `'Atraso'`, `'Cancelamento'`, `'Bagagem'`, `'App'`, `'Atendimento'`. |
| `texto_avaliacao` | `string` | Não | Texto integral em português relatado pelo passageiro. |
| `nota_cliente` | `int64` | Não | Nota discreta atribuída pelo passageiro no canal de origem (`1` a `5`). |
| `score_sentimento` | `float64` | Não | Polaridade contínua calculada via NLP no intervalo `[-1.0, 1.0]` (`-1.0` = extremamente negativo, `+1.0` = extremamente positivo). |

### 5.4. Schema de `clv_clientes.parquet` (Camada Gold — Cérebro 1 — 5.000 registros)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_cliente` | `string` (FK $\rightarrow$ `clientes_silver`) | Não | Identificador único persistente do cliente no CRM / TudoAzul. |
| `recencia_dias` | `int64` | Não | Dias decorridos desde o último voo realizado até a data de referência da base. |
| `frequencia` | `int64` | Não | Total acumulado de voos realizados pelo cliente (exclui voos cancelados). |
| `valor_monetario_base` | `float64` | Não | Somatório do valor pago em tarifas aéreas ANAC nos voos realizados (`R$`). |
| `valor_monetario_expandido` | `float64` | Não | Valor monetário base acrescido das receitas anuais projetadas do Clube e Cartão Co-branded (`R$`). |
| `clv_previsto` | `float64` | Não | Valor econômico futuro estimado do cliente para os próximos 12 meses via RFM Preditivo (`R$`). |
| `clv_acumulado_perc` | `float64` | Não | Percentual acumulado do CLV no dataset na ordenação decrescente de valor (Curva de Pareto). |
| `faixa_pareto` | `string` | Não | Segmento de concentração de receita: `'Top 10% Receita'`, `'Top 20% Receita'`, `'Top 50% Receita'`, `'Cauda Longa'`. |

### 5.5. Schema de `evasao_clientes.parquet` (Camada Gold — Cérebro 2 — 5.000 registros)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_cliente` | `string` (FK $\rightarrow$ `clientes_silver`) | Não | Identificador único persistente do cliente no CRM / TudoAzul. |
| `score_atrito_acumulado` | `float64` | Não | Pontuação contínua de dor operacional acumulada pelo passageiro, calibrada por NLP e amortecida por decaimento temporal exponencial. |
| `risco_evasao` | `float64` | Não | Probabilidade contínua estimada de evasão / churn ($0.0$ a $1.0$) calculada via `XGBClassifier`. |

### 5.6. Schema de `shap_clientes.parquet` (Camada Gold — Cérebro 2 / Explicabilidade — 5.000 registros)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_cliente` | `string` (FK $\rightarrow$ `clientes_silver`) | Não | Identificador único persistente do cliente no CRM / TudoAzul. |
| `shap_base_value` | `float64` | Não | Valor esperado base do modelo XGBoost (`explainer.expected_value`) para o gráfico em cascata (*waterfall*). |
| `shap_score_atrito_acumulado` | `float64` | Não | Contribuição marginal SHAP do score de atrito acumulado na probabilidade de churn. |
| `shap_recencia_dias` | `float64` | Não | Contribuição marginal SHAP da inatividade (recência de voo). |
| `shap_qtd_cancelamentos` | `float64` | Não | Contribuição marginal SHAP do volume histórico de cancelamentos enfrentados. |
| `shap_qtd_atrasos_criticos` | `float64` | Não | Contribuição marginal SHAP de atrasos superiores a 15 minutos. |
| `shap_qtd_bagagem_extraviada` | `float64` | Não | Contribuição marginal SHAP de ocorrências de bagagem extraviada/danificada. |
| `shap_qtd_falha_app` | `float64` | Não | Contribuição marginal SHAP de falhas no check-in digital via aplicativo. |

### 5.7. Schema de `personas_clientes.parquet` (Camada Gold — Cérebro 3 — 5.000 registros)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_cliente` | `string` (FK $\rightarrow$ `clientes_silver`) | Não | Identificador único persistente do cliente no CRM / TudoAzul. |
| `frequencia_total` | `int64` | Não | Contagem total de voos do passageiro na malha histórica. |
| `antecedencia_media_compra` | `float64` | Não | Antecedência média estimada de compra em dias (`5.0` a `60.0` dias). |
| `tamanho_medio_pnr` | `float64` | Não | Média de passageiros únicos compartilhando o mesmo `pnr` do cliente (*Efeito Manada*). |
| `percentual_voos_fds` | `float64` | Não | Percentual (`0.0` a `100.0`) de voos realizados aos sábados e domingos. |
| `persona` | `string` | Não | Arquétipo atribuído via K-Means: `'Executivo Frequente'`, `'Família/Lazer'`, `'Caçador de Pontos'`, `'Viajante Regional'`. |

---

## 6. Ordem de Execução do Pipeline (Bronze $\rightarrow$ Silver $\rightarrow$ Gold)

```bash
# 1. Ingestão de dados públicos brutos da ANAC (VRA e Tarifas) na Camada Bronze
.venv/bin/python -u back/ingestion.py

# 2. Geração determinística de avaliações brutas de passageiros na Camada Bronze
.venv/bin/python -u back/generate_reviews_bronze.py

# 3. Construção da Camada Silver (Filtro AZU, Normalização, Clientes, Viagens+Tarifas e NLP de Avaliações)
.venv/bin/python -u back/silver_builder.py

# 4. Construção da Camada Gold — Cérebro 1 (Modelo de CLV e RFM Preditivo)
.venv/bin/python -u back/gold_clv_builder.py

# 5. Construção da Camada Gold — Cérebro 2 (Risco de Evasão e Limite de Dor via XGBoost + NLP)
.venv/bin/python -u back/gold_evasion_builder.py

# 6. Construção da Camada Gold — Cérebro 3 (Segmentação de Personas e Efeito Manada via K-Means)
.venv/bin/python -u back/gold_personas_builder.py
```

---

## 7. Braço Executor (Árbitro de Decisão e RAG-LLM)

Responsável: [`azul/back/executor_decisao.py`](../back/executor_decisao.py)  
Base de Conhecimento RAG: [`azul/regras_azul_fidelidade.md`](../regras_azul_fidelidade.md)

### 7.1. Visão Geral (Inferência *Just-in-Time* no Modo Reativo)
Diferentemente dos scripts construtores das camadas Bronze, Silver e Gold — que operam em lote (*batch processing*) gerando arquivos Parquet —, o script [`executor_decisao.py`](../back/executor_decisao.py) atua como o **motor de decisão transacional (*Just-in-Time*)** da arquitetura.

Quando um evento de atrito ocorre na malha, o Braço Executor realiza leitura seletiva (*predicate pushdown* via `filters=[("id_cliente", "==", id_cliente)]`) nos 3 artefatos da Camada Gold (`clv_clientes.parquet`, `evasao_clientes.parquet` e `personas_clientes.parquet`) e na entidade de clientes da Silver (`clientes_silver.parquet`), consolidando instantaneamente o estado 360º do passageiro para arbitrar a melhor resposta financeira e comunicacional.

### 7.2. Árbitro Matemático e Lógica de Uplift
O **Árbitro Matemático** garante disciplina financeira estrita: nenhuma ação de retenção é disparada sem comprovação de Retorno Líquido positivo. Para cada ação candidata $a$ do catálogo, avalia-se a equação de **Uplift Econômico**:

$$\text{Retorno Líquido}(a) = \left(\text{CLV}_{\text{Previsto}} \times \text{Risco}_{\text{Evasão}} \times \text{Eficácia}(a)\right) - \text{Custo}(a)$$

Onde $\text{CLV}_{\text{Previsto}} \times \text{Risco}_{\text{Evasão}}$ representa o **Valor Esperado em Risco** (perda financeira iminente caso a Azul não intervenha), e $\text{Eficácia}(a)$ representa a probabilidade de a ação neutralizar o churn.

#### Catálogo Homologado de Ações, Custos Fixos e Eficácia (`CATALOGO_ACOES`)

| Código da Ação | Custo Fixo Interno (`R$`) | Taxa de Eficácia ($\text{Eficácia}_a$) | Escopo Operacional e Regra de Negócio |
| :--- | :---: | :---: | :--- |
| **`UPGRADE_EXECUTIVA`** | `R$ 1.500,00` | `90%` (`0.90`) | Voucher de upgrade para a **Classe Executiva** em voos internacionais (clientes de altíssimo CLV). |
| **`ACESSO_LOUNGE_VCP`** | `R$ 120,00` | `70%` (`0.70`) | Acesso ao **Lounge Azul** em Viracopos (`VCP`), Lisboa, Orlando ou Fort Lauderdale. |
| **`BONUS_5000_PONTOS`** | `R$ 150,00` | `60%` (`0.60`) | Crédito de `5.000` pontos no **Azul Fidelidade** (custo interno de `R$ 30,00` por milheiro). |
| **`ISENCAO_BAGAGEM_EXTRA`** | `R$ 100,00` | `50%` (`0.50`) | Franquia de `1` bagagem despachada extra de `23kg`. **Bloqueado para Diamante.** |
| **`CORTESIA_ESPACO_AZUL`** | `R$ 50,00` | `40%` (`0.40`) | Assento com maior espaço em voo doméstico. **Bloqueado para Diamante.** |
| **`MENSAGEM_EXECUTIVA_VIP`** | `R$ 1,00` | `20%` (`0.20`) | Pedido formal de desculpas assinado pela Diretoria, sem custo de benefício físico. |
| **`NAO_FAZER_NADA`** | `R$ 0,00` | `0%` (`0.00`) | Acionado obrigatoriamente quando todas as ações apresentam $\text{Retorno Líquido} \le 0$. |

> [!WARNING]
> **Trava de Regras de Negócio (*Hard-Block* — Categoria Diamante):**
> Conforme estipulado no contrato do programa **Azul Fidelidade** ([`regras_azul_fidelidade.md`](../regras_azul_fidelidade.md)), clientes da categoria **`Diamante`** já possuem por direito cortesias ilimitadas no **Espaço Azul** em voos nacionais e franquia máxima de **3 bagagens de 23kg grátis**. O Árbitro aplica um *hard-block* determinístico que impede o teste e a oferta de `CORTESIA_ESPACO_AZUL` e `ISENCAO_BAGAGEM_EXTRA` para clientes `Diamante`, prevenindo ofertas redundantes que gerariam frustração reputacional.

### 7.3. Agente LLM Simulado com RAG (`gerar_mensagem_llm`)
Após a seleção matemática da ação vencedora pelo Árbitro, o Agente gera a comunicação personalizada ancorada no arquivo [`regras_azul_fidelidade.md`](../regras_azul_fidelidade.md) carregado em memória como contexto estrito de **RAG (*Retrieval-Augmented Generation*)**:

1. **Prevenção de Alucinações Operacionais**:
   - O Agente respeita rigorosamente a infraestrutura física da companhia: **nunca** promete "Primeira Classe" (inexistente na frota da Azul), ofertando exclusivamente a **Classe Executiva** em voos internacionais, o **Espaço Azul** em voos nacionais e o **Lounge Azul** nos aeroportos homologados (`Viracopos/VCP`, `Lisboa`, `Orlando` e `Fort Lauderdale`).
2. **Adaptação de Tom de Voz por Persona (Cérebro 3)**:
   - **`Executivo Frequente`**: Tom executivo, direto e focado em pontualidade, produtividade a bordo e respeito à agenda corporativa.
   - **`Família/Lazer`**: Tom acolhedor e empático, reconhecendo o impacto coletivo do contratempo sobre o grupo familiar (`PNR`).
   - **`Caçador de Pontos`**: Tom estratégico, valorizando o acúmulo e a maximização de benefícios no programa **Azul Fidelidade**.
   - **`Viajante Regional`**: Tom próximo e cordial, destacando a conectividade da malha regional brasileira da Azul.
3. **Silêncio Inteligente (`NAO_FAZER_NADA`)**:
   - Quando nenhuma ação atinge ROI positivo, nenhuma mensagem externa é disparada ao passageiro, registrando-se apenas a decisão interna de preservação de caixa.

### 7.4. Comando de Teste e Simulação Local
Para executar a simulação determinística (`seed=42`) do Braço Executor avaliando três perfis contrastantes da Camada Gold (**CLV Muito Alto**, **CLV Médio** e **CLV Baixo**):

```bash
.venv/bin/python -u back/executor_decisao.py
```

---

## 8. Execução "Plug and Play" e Script de Auditoria Técnica

### 8.1. Subida Rápida via Docker Compose (Solução Pronta)
O ecossistema foi projetado para inicialização imediata (*Plug and Play*), consumindo os arquivos colunares `.parquet` já persistidos no Data Lake, sem processar a esteira analítica no momento da subida dos containers:

```bash
docker compose up -d
```
- **Backend (FastAPI + DuckDB)**: `http://localhost:8000` (Swagger UI: `http://localhost:8000/docs`)
- **Frontend (Next.js)**: `http://localhost:3000`

### 8.2. Script de Auditoria Técnica (`./regenerar_dados.sh`)
Para fins de auditoria técnica da banca avaliadora, a esteira completa da Arquitetura Medallion pode ser reexecutada a qualquer momento de forma determinística através do script raiz:

```bash
./regenerar_dados.sh
```

A sequência orquestrada reprocessa:
1. **Bronze**: Validação das avaliações e dados públicos ANAC.
2. **Silver**: Normalização, saneamento e modelagem relacional de clientes e viagens com injeção de variância log-normal.
3. **Gold (Cérebro 1)**: Modelo RFM e projeção de CLV com classificação da Curva de Pareto.
4. **Gold (Cérebro 3)**: Clusterização K-Means de Personas com mapeamento de comportamento.
5. **Gold (Cérebro 2)**: Classificador XGBoost de Churn e cálculo da explicabilidade matemática local SHAP (`shap_clientes.parquet`).
