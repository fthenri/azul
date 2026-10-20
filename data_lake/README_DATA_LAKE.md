# Arquitetura de Dados e Contrato de Dados (Data Lake — Projeto Azul)

Este documento define a arquitetura técnica de armazenamento, as regras de engenharia e transformação do pipeline de dados e o **Contrato de Dados (Data Contract)** oficial para integração direta com o ecossistema **Snowflake** e CRM da Azul Linhas Aéreas (`AZU`).

---

## 1. Visão Geral da Arquitetura (Medallion Architecture)

O repositório de dados adota estritamente o padrão **Medallion Architecture** (**Bronze**, **Silver** e **Gold**), persistindo todos os ativos em formato colunar **Apache Parquet** (`engine="pyarrow"`, compressão `snappy`) para leitura vetorizada de alta performance:

- **Camada Bronze (Raw / Imutável)**: Armazena os dados públicos extraídos da ANAC em seu estado **100% bruto e original** (sem filtros de negócio, sem descarte de registros e sem mutação de tipos) e os dados brutos de avaliações de clientes (Reclame Aqui / Lojas de Aplicativos) antes do processamento de linguagem natural.
- **Camada Silver (Filtered, Normalized, Enriched & Relational CRM)**: Responsável pelo isolamento de domínio da companhia (`ICAO == 'AZU'`), normalização sintática e semântica, enriquecimento monetário por rota a partir dos microdados tarifários da ANAC, escoragem determinística de sentimento via NLP e modelagem relacional longitudinal de 12 meses.
- **Camada Gold (Analytics & AI Feature Store)**: Tabelas analíticas agregadas (visão 360º do cliente, RFM, LTV e escoragem de risco de Churn/Atrito) prontas para consumo por modelos de Machine Learning e pela API FastAPI.

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
    └── ...                           # Tabelas analíticas e Feature Store para modelos de IA e API
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

## 4. Contrato de Dados (Data Contract — Camada Silver)

Para substituir os dados gerados pelo `silver_builder.py` por extrações produtivas do **Snowflake** da Azul sem alterar nenhuma linha do pipeline Gold/ML/API, os três arquivos Parquet abaixo devem respeitar rigorosamente os schemas a seguir em `azul/data_lake/silver/`:

### 4.1. Schema de `clientes_silver.parquet` (5.000 registros)

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

### 4.2. Schema de `viagens_silver.parquet` (199.160 registros)

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

### 4.3. Schema de `avaliacoes_silver.parquet` (500 registros)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_avaliacao` | `string` (UUIDv4 fixo 36 chars) | Não | Identificador único da avaliação (Reclame Aqui / App Stores). |
| `topico` | `string` | Não | Categoria classificatória: `'Atraso'`, `'Cancelamento'`, `'Bagagem'`, `'App'`, `'Atendimento'`. |
| `texto_avaliacao` | `string` | Não | Texto integral em português relatado pelo passageiro. |
| `nota_cliente` | `int64` | Não | Nota discreta atribuída pelo passageiro no canal de origem (`1` a `5`). |
| `score_sentimento` | `float64` | Não | Polaridade contínua calculada via NLP no intervalo `[-1.0, 1.0]` (`-1.0` = extremamente negativo, `+1.0` = extremamente positivo). |

---

## 5. Ordem de Execução do Pipeline (Bronze $\rightarrow$ Silver)

```bash
# 1. Ingestão de dados públicos brutos da ANAC (VRA e Tarifas) na Bronze
.venv/bin/python -u back/ingestion.py

# 2. Geração determinística de avaliações brutas de passageiros na Bronze
.venv/bin/python -u back/generate_reviews_bronze.py

# 3. Construção da Camada Silver (Filtro AZU, Normalização, Clientes, Viagens+Tarifas e NLP de Avaliações)
.venv/bin/python -u back/silver_builder.py
```
