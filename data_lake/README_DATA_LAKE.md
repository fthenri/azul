# Arquitetura de Dados e Contrato de Dados (Data Lake — Projeto Azul)

Este documento define a arquitetura técnica de armazenamento, as regras de transformação do pipeline de dados e o **Contrato de Dados (Data Contract)** oficial para integração direta com o **Snowflake** da Azul Linhas Aéreas (`AZU`).

---

## 1. Visão Geral da Arquitetura (Data Lake em Camadas)

O repositório de dados adota o padrão **Medallion Architecture** (**Bronze**, **Silver** e **Gold**), persistindo todos os ativos em formato colunar **Apache Parquet** (`engine="pyarrow"`, compressão `snappy`). Essa decisão arquitetural garante:

- **Alta Performance de I/O e Compressão**: Leitura vetorizada com *predicate pushdown* e *column pruning*, reduzindo drasticamente a pegada de memória e o tempo de inferência/consulta pela API e pelos modelos de Machine Learning.
- **Tipagem Estrita e Imutabilidade**: Preservação nativa de tipos (`string`, `bool`, `float64`) entre os estágios do pipeline sem ambiguidades de serialização textual.
- **Desacoplamento e Integração Fluida**: A separação física em camadas (`azul/data_lake/{bronze,silver,gold}/`) permite substituir a geração sintética de CRM por extrações produtivas do **Snowflake** sem alterar uma única linha do motor de IA, escoragem de risco ou backend FastAPI.

```text
azul/data_lake/
├── bronze/
│   ├── voos_historico_azul.parquet   # Malha real ANAC (VRA) filtrada para 'AZU'
│   └── tarifas_azul.parquet          # Microdados reais de tarifas ANAC filtrados para 'AZU'
├── silver/
│   └── passageiros_silver.parquet    # Base consolidada CRM (Clientes + PNR) x Operação de Voo
└── gold/
    └── ...                           # Tabelas analíticas enriquecidas para consumo de IA e API
```

---

## 2. Camada Bronze (Dados Públicos Reais)

Responsável: [`azul/back/ingestion.py`](../back/ingestion.py)

A camada **Bronze** realiza a ingestão 100% automatizada de dados públicos oficiais da **ANAC** a partir da API pública do **CKAN (`dados.gov.br`)** e dos repositórios abertos da agência (`sistemas.anac.gov.br` e `sas.anac.gov.br`), com sessão HTTP resiliente (*exponential backoff retry* e detecção automática de encoding `UTF-8`/`Latin-1`).

### Ativos Ingeridos
1. **Voo Regular Ativo (`voos_historico_azul.parquet`)**: Histórico operacional de voos contendo horários previstos e realizados de partida/chegada, aeródromos OACI de origem/destino, situação do voo e códigos de justificativa.
2. **Microdados de Tarifas Aéreas Comercializadas (`tarifas_azul.parquet`)**: Série histórica de tarifas domésticas comercializadas e quantidade de assentos vendidos por par de origem/destino (`O&D`).

### Filtro Crítico de Negócio (`ICAO == 'AZU'`)
Logo após a leitura em memória, o pipeline aplica o isolamento estrito pela sigla OACI **`AZU`**. Registros de congêneres são descartados antes da escrita na Bronze, garantindo que todas as distribuições de atraso, pontualidade, malha de hubs (ex: `SBKP`, `SBCF`, `SBRF`) e curvas tarifárias reflitam exclusivamente a operação real da Azul.

---

## 3. Camada Silver (Simulação de CRM e Cruzamento Operacional)

Responsável: [`azul/back/silver_builder.py`](../back/silver_builder.py)

Na ausência de acesso direto ao ambiente produtivo do **Snowflake** da Azul durante o desenvolvimento externo, o módulo `silver_builder.py` atua como um gerador determinístico de CRM que cruza perfis de passageiros com uma amostragem estratificada de **voos reais da camada Bronze** (`voos_historico_azul.parquet`).

### Regras de Negócio e Engenharia Aplicadas na Silver
- **Cálculo Real de Atraso Operacional (`atraso_enfrentado_minutos`)**: Calculado diretamente a partir dos timestamps oficiais da ANAC (`Partida Real - Partida Prevista`, convertido para minutos, com truncamento inferior em `0.0` para voos adiantados).
- **Agrupamento por Localizador (`pnr`) — "Efeito Manada"**: Geração de códigos alfanuméricos de 6 caracteres padrão da aviação agrupando aleatoriamente de **1 a 4 passageiros no mesmo PNR e voo**. Essa modelagem captura o risco de contágio de insatisfação em famílias ou grupos corporativos que sofrem a mesma disrupção operacional.
- **Distribuição Estatística de Fidelidade (`tier_fidelidade`)**: Calibrada de acordo com a pirâmide típica de programas de fidelidade aéreo:
  - `Basico`: **75%**
  - `Topazio`: **15%**
  - `Safira`: **7%**
  - `Diamante`: **3%**
- **Recorrência de Receita (`assinante_clube`)**: Flag booleana que identifica membros ativos do clube de assinatura de pontos, indicador direto de retenção e *Lifetime Value* (LTV).
- **Exposição Reputacional (`perfil_alto_risco_imagem`)**: Injeção controlada de **2% (`True`)** representando passageiros com alto potencial de amplificação crítica ou urgência operacional (figuras públicas, imprensa, médicos em deslocamento cirúrgico ou executivos C-Level).

---

## 4. Contrato de Dados (Como Plugar o Snowflake da Azul)

A arquitetura foi projetada sob o princípio de **Zero Refactoring**: a equipe de Engenharia de Dados da Azul **não precisa reescrever o pipeline de Machine Learning nem a API de decisão**.

Para substituir a base simulada pelos dados produtivos da companhia, basta executar uma query no **Snowflake** (unindo as tabelas de *CRM/TudoAzul*, *Reservas/PNR* e *Malha/Operações*) e exportar o resultado diretamente para:

```text
azul/data_lake/silver/passageiros_silver.parquet
```

### Especificação de Schema Obrigatório (`passageiros_silver.parquet`)

| Coluna | Tipo Físico (Parquet / Pandas) | Nulável | Regra de Domínio / Descrição Técnica |
| :--- | :--- | :---: | :--- |
| `id_cliente` | `string` (UUID / Hash) | Não | Identificador único do passageiro no CRM/TudoAzul (ex: UUID v4 ou ID mascarado LGPD). |
| `pnr` | `string` (6 caracteres) | Não | Código localizador da reserva (*Passenger Name Record*). Passageiros da mesma família/grupo no voo compartilham o mesmo `pnr`. |
| `tier_fidelidade` | `string` | Não | Categoria vigente do cliente. Valores aceitos: `'Basico'`, `'Topazio'`, `'Safira'`, `'Diamante'`. |
| `assinante_clube` | `bool` | Não | `True` se o passageiro possui assinatura ativa do Clube; `False` caso contrário. |
| `perfil_alto_risco_imagem` | `bool` | Não | `True` para passageiros classificados no CRM/VIP Desk com sensibilidade reputacional ou criticidade profissional; `False` caso contrário. |
| `atraso_enfrentado_minutos` | `float64` (Numérico $\ge 0$) | Não | Atraso real de partida enfrentado pelo passageiro em minutos: $\max(0, \text{Partida Real} - \text{Partida Prevista})$. |
| `numero_voo` | `string` | Não | Número comercial do voo operado pela Azul (ex: `'2033'`, `'4554'`). |
| `origem` | `string` (4 caracteres) | Não | Designador OACI do aeródromo de origem (ex: `'SBKP'`, `'SBCF'`). |
| `destino` | `string` (4 caracteres) | Não | Designador OACI do aeródromo de destino (ex: `'SBEG'`, `'SBRF'`). |
| `partida_prevista` | `string` (ISO Timestamp) | Não | Data/hora programada da partida no formato `'YYYY-MM-DD HH:MM:SS'`. |
| `partida_real` | `string` (ISO Timestamp) | Não | Data/hora efetiva da partida no formato `'YYYY-MM-DD HH:MM:SS'`. |
| `situacao_voo` | `string` | Não | Status operacional consolidado do voo (ex: `'REALIZADO'`, `'CANCELADO'`). |

### Exemplo de Query de Extração no Snowflake da Azul

```sql
COPY INTO @azul_datalake_stage/silver/passageiros_silver.parquet
FROM (
    SELECT
        CAST(c.customer_uuid AS VARCHAR)                                                    AS id_cliente,
        CAST(r.pnr_locator AS VARCHAR(6))                                                   AS pnr,
        CAST(c.loyalty_tier AS VARCHAR)                                                     AS tier_fidelidade,
        CAST(c.is_club_subscriber AS BOOLEAN)                                               AS assinante_clube,
        CAST(COALESCE(c.is_vip_high_exposure, FALSE) AS BOOLEAN)                            AS perfil_alto_risco_imagem,
        CAST(GREATEST(0, DATEDIFF('minute', f.scheduled_departure, f.actual_departure)) AS DOUBLE) AS atraso_enfrentado_minutos,
        CAST(f.flight_number AS VARCHAR)                                                    AS numero_voo,
        CAST(f.origin_icao AS VARCHAR(4))                                                   AS origem,
        CAST(f.destination_icao AS VARCHAR(4))                                              AS destino,
        TO_VARCHAR(f.scheduled_departure, 'YYYY-MM-DD HH24:MI:SS')                          AS partida_prevista,
        TO_VARCHAR(f.actual_departure, 'YYYY-MM-DD HH24:MI:SS')                             AS partida_real,
        CAST(f.flight_status AS VARCHAR)                                                    AS situacao_voo
    FROM prod_crm.dim_customers c
    INNER JOIN prod_booking.fact_pnr_passengers r
        ON c.customer_id = r.customer_id
    INNER JOIN prod_ops.fact_flights_azu f
        ON r.flight_key = f.flight_key
)
FILE_FORMAT = (TYPE = PARQUET COMPRESSION = SNAPPY)
HEADER = TRUE
OVERWRITE = TRUE
SINGLE = TRUE;
```

