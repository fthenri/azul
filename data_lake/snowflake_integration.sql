-- ============================================================================
-- PROJETO AZUL CRM DE ALTO VALOR — BLUEPRINT DE GOVERNANÇA E MIGRAÇÃO SNOWFLAKE
-- Compatibilidade: Medallion Data Lake Parquet -> Snowflake Native Data Cloud
-- Empresa Parceira: Azul Linhas Aéreas Brasileiras / Avanade Brasil (Hackathon Rec'n'Play 2026)
-- ============================================================================

-- 1. Contexto de Database e Warehouse
CREATE DATABASE IF NOT EXISTS AZUL_DATA_LAKE;
USE DATABASE AZUL_DATA_LAKE;

-- 2. Schemas da Arquitetura Medallion
CREATE SCHEMA IF NOT EXISTS BRONZE COMMENT = 'Dados regulatórios brutos e imutáveis da ANAC e avaliações';
CREATE SCHEMA IF NOT EXISTS SILVER COMMENT = 'Entidades relacionais saneadas, enriquecidas com tarifas e NLP';
CREATE SCHEMA IF NOT EXISTS GOLD   COMMENT = 'Feature stores dos 3 motores analíticos (CLV, Evasão/SHAP, Personas)';

-- 3. File Format para Ingestão Colunar Vetorizada Parquet
CREATE OR REPLACE FILE FORMAT GOLD.PARQUET_SNAPPY_FORMAT
    TYPE = 'PARQUET'
    COMPRESSION = 'SNAPPY'
    BINARY_AS_TEXT = FALSE
    COMMENT = 'Formato colunar de alta performance para o Data Lake Medallion da Azul';

-- 4. Storage Integration & External Stage
-- Configuração do bucket S3 (AWS) ou Azure Blob Storage institucional da Azul
-- Exemplo: s3://azul-datalake-prod/crm_alto_valor/
CREATE OR REPLACE STAGE GOLD.AZUL_LAKE_STAGE
    URL = 's3://azul-datalake-prod/'
    FILE_FORMAT = GOLD.PARQUET_SNAPPY_FORMAT
    COMMENT = 'Stage externo conectado ao storage corporativo de Data Lakehouse da Azul';

-- ============================================================================
-- 5. Camada Silver: External Tables (Mapeamento Vetorizado Zero-Copy)
-- ============================================================================

-- 5.1. Clientes Silver (com flag de Salvaguarda de Consentimento LGPD)
CREATE OR REPLACE EXTERNAL TABLE SILVER.EXT_CLIENTES (
    id_cliente VARCHAR AS (VALUE:id_cliente::VARCHAR),
    tier_fidelidade VARCHAR AS (VALUE:tier_fidelidade::VARCHAR),
    assinante_clube BOOLEAN AS (VALUE:assinante_clube::BOOLEAN),
    cartao_cobranded BOOLEAN AS (VALUE:cartao_cobranded::BOOLEAN),
    pontos_saldo INT AS (VALUE:pontos_saldo::INT),
    perfil_alto_risco_imagem BOOLEAN AS (VALUE:perfil_alto_risco_imagem::BOOLEAN),
    consentimento_marketing BOOLEAN AS (VALUE:consentimento_marketing::BOOLEAN),
    peso_viagem FLOAT AS (VALUE:peso_viagem::FLOAT)
)
LOCATION = @GOLD.AZUL_LAKE_STAGE/silver/
FILE_FORMAT = GOLD.PARQUET_SNAPPY_FORMAT
PATTERN = '.*clientes_silver.*[.]parquet';

-- 5.2. Viagens Silver (Histórico longitudinal com atritos operacionais)
CREATE OR REPLACE EXTERNAL TABLE SILVER.EXT_VIAGENS (
    pnr VARCHAR AS (VALUE:pnr::VARCHAR),
    id_cliente VARCHAR AS (VALUE:id_cliente::VARCHAR),
    numero_voo VARCHAR AS (VALUE:numero_voo::VARCHAR),
    origem VARCHAR AS (VALUE:origem::VARCHAR),
    destino VARCHAR AS (VALUE:destino::VARCHAR),
    partida_prevista TIMESTAMP AS (VALUE:partida_prevista::TIMESTAMP),
    partida_real TIMESTAMP AS (VALUE:partida_real::TIMESTAMP),
    situacao_voo VARCHAR AS (VALUE:situacao_voo::VARCHAR),
    atraso_enfrentado_minutos FLOAT AS (VALUE:atraso_enfrentado_minutos::FLOAT),
    teve_bagagem_extraviada BOOLEAN AS (VALUE:teve_bagagem_extraviada::BOOLEAN),
    teve_falha_checkin_app BOOLEAN AS (VALUE:teve_falha_checkin_app::BOOLEAN),
    valor_pago_tarifa FLOAT AS (VALUE:valor_pago_tarifa::FLOAT)
)
LOCATION = @GOLD.AZUL_LAKE_STAGE/silver/
FILE_FORMAT = GOLD.PARQUET_SNAPPY_FORMAT
PATTERN = '.*viagens_silver.*[.]parquet';

-- 5.3. Avaliações Públicas com NLP (Reclame Aqui, Google Play, App Store)
CREATE OR REPLACE EXTERNAL TABLE SILVER.EXT_AVALIACOES (
    id_avaliacao VARCHAR AS (VALUE:id_avaliacao::VARCHAR),
    canal_origem VARCHAR AS (VALUE:canal_origem::VARCHAR),
    topico VARCHAR AS (VALUE:topico::VARCHAR),
    titulo_avaliacao VARCHAR AS (VALUE:titulo_avaliacao::VARCHAR),
    texto_avaliacao VARCHAR AS (VALUE:texto_avaliacao::VARCHAR),
    nota_cliente INT AS (VALUE:nota_cliente::INT),
    data_publicacao DATE AS (VALUE:data_publicacao::DATE),
    score_sentimento FLOAT AS (VALUE:score_sentimento::FLOAT),
    classificacao_sentimento VARCHAR AS (VALUE:classificacao_sentimento::VARCHAR)
)
LOCATION = @GOLD.AZUL_LAKE_STAGE/silver/
FILE_FORMAT = GOLD.PARQUET_SNAPPY_FORMAT
PATTERN = '.*avaliacoes_silver.*[.]parquet';

-- ============================================================================
-- 6. Camada Gold: Feature Stores dos Motores de IA
-- ============================================================================

-- 6.1. Cérebro 1: CLV Preditivo e Faixa de Pareto
CREATE OR REPLACE EXTERNAL TABLE GOLD.EXT_CLV_CLIENTES (
    id_cliente VARCHAR AS (VALUE:id_cliente::VARCHAR),
    recencia_dias INT AS (VALUE:recencia_dias::INT),
    frequencia INT AS (VALUE:frequencia::INT),
    valor_monetario_base FLOAT AS (VALUE:valor_monetario_base::FLOAT),
    valor_monetario_expandido FLOAT AS (VALUE:valor_monetario_expandido::FLOAT),
    clv_previsto FLOAT AS (VALUE:clv_previsto::FLOAT),
    clv_acumulado_perc FLOAT AS (VALUE:clv_acumulado_perc::FLOAT),
    faixa_pareto VARCHAR AS (VALUE:faixa_pareto::VARCHAR)
)
LOCATION = @GOLD.AZUL_LAKE_STAGE/gold/
FILE_FORMAT = GOLD.PARQUET_SNAPPY_FORMAT
PATTERN = '.*clv_clientes.*[.]parquet';

-- 6.2. Cérebro 2: Risco de Evasão (XGBoost + Calibração NLP)
CREATE OR REPLACE EXTERNAL TABLE GOLD.EXT_EVASAO_CLIENTES (
    id_cliente VARCHAR AS (VALUE:id_cliente::VARCHAR),
    score_atrito_acumulado FLOAT AS (VALUE:score_atrito_acumulado::FLOAT),
    risco_evasao FLOAT AS (VALUE:risco_evasao::FLOAT)
)
LOCATION = @GOLD.AZUL_LAKE_STAGE/gold/
FILE_FORMAT = GOLD.PARQUET_SNAPPY_FORMAT
PATTERN = '.*evasao_clientes.*[.]parquet';

-- 6.3. Cérebro 2: Explicabilidade Matemática SHAP
CREATE OR REPLACE EXTERNAL TABLE GOLD.EXT_SHAP_CLIENTES (
    id_cliente VARCHAR AS (VALUE:id_cliente::VARCHAR),
    shap_base_value FLOAT AS (VALUE:shap_base_value::FLOAT),
    shap_score_atrito_acumulado FLOAT AS (VALUE:shap_score_atrito_acumulado::FLOAT),
    shap_recencia_dias FLOAT AS (VALUE:shap_recencia_dias::FLOAT),
    shap_qtd_cancelamentos FLOAT AS (VALUE:shap_qtd_cancelamentos::FLOAT),
    shap_qtd_atrasos_criticos FLOAT AS (VALUE:shap_qtd_atrasos_criticos::FLOAT),
    shap_qtd_bagagem_extraviada FLOAT AS (VALUE:shap_qtd_bagagem_extraviada::FLOAT),
    shap_qtd_falha_app FLOAT AS (VALUE:shap_qtd_falha_app::FLOAT)
)
LOCATION = @GOLD.AZUL_LAKE_STAGE/gold/
FILE_FORMAT = GOLD.PARQUET_SNAPPY_FORMAT
PATTERN = '.*shap_clientes.*[.]parquet';

-- 6.4. Cérebro 3: Segmentação de Personas (K-Means Normalizado)
CREATE OR REPLACE EXTERNAL TABLE GOLD.EXT_PERSONAS_CLIENTES (
    id_cliente VARCHAR AS (VALUE:id_cliente::VARCHAR),
    frequencia_total INT AS (VALUE:frequencia_total::INT),
    antecedencia_media_compra FLOAT AS (VALUE:antecedencia_media_compra::FLOAT),
    tamanho_medio_pnr FLOAT AS (VALUE:tamanho_medio_pnr::FLOAT),
    percentual_voos_fds FLOAT AS (VALUE:percentual_voos_fds::FLOAT),
    persona VARCHAR AS (VALUE:persona::VARCHAR)
)
LOCATION = @GOLD.AZUL_LAKE_STAGE/gold/
FILE_FORMAT = GOLD.PARQUET_SNAPPY_FORMAT
PATTERN = '.*personas_clientes.*[.]parquet';

-- ============================================================================
-- 7. Views Analíticas para Tomada de Decisão Executiva
-- ============================================================================

-- 7.1. Prova Matemática: Reter Top 20% vs Evasão / CAC
CREATE OR REPLACE VIEW GOLD.VW_PARETO_RETENCAO_ROI AS
SELECT 
    c.faixa_pareto,
    COUNT(*) AS total_clientes,
    ROUND(AVG(c.clv_previsto), 2) AS clv_medio,
    ROUND(AVG(e.risco_evasao), 4) AS risco_evasao_medio,
    ROUND(SUM(c.clv_previsto * e.risco_evasao), 2) AS total_receita_em_risco,
    ROUND(AVG(c.clv_previsto * e.risco_evasao), 2) AS perda_media_por_cliente,
    ROUND(AVG(c.clv_previsto * e.risco_evasao) / 120.0, 1) AS roi_retencao_multiplicador
FROM GOLD.EXT_CLV_CLIENTES c
JOIN GOLD.EXT_EVASAO_CLIENTES e ON c.id_cliente = e.id_cliente
GROUP BY c.faixa_pareto;

-- 7.2. Monitoramento de Atritos por Canal Público (Reclame Aqui / Apps)
CREATE OR REPLACE VIEW SILVER.VW_MONITORAMENTO_SENTIMENTO AS
SELECT 
    canal_origem,
    topico,
    COUNT(*) AS volume_manifestacoes,
    ROUND(AVG(score_sentimento), 4) AS score_sentimento_medio,
    ROUND(AVG(nota_cliente), 2) AS nota_media,
    COUNT(CASE WHEN classificacao_sentimento = 'NEGATIVO' THEN 1 END) AS qtd_detratores,
    COUNT(CASE WHEN classificacao_sentimento = 'POSITIVO' THEN 1 END) AS qtd_promotores
FROM SILVER.EXT_AVALIACOES
GROUP BY canal_origem, topico;

-- ============================================================================
-- 8. Snowpipe de Ingestão Contínua de Decisões Auditadas do CRM
-- ============================================================================
CREATE TABLE IF NOT EXISTS GOLD.DECISOES_AUDITADAS (
    decisao_id VARCHAR PRIMARY KEY,
    cliente_id VARCHAR,
    tipo_simulacao VARCHAR,
    acao_executada VARCHAR,
    motivo_bloqueio VARCHAR,
    custo_realizado FLOAT,
    data_decisao TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

CREATE OR REPLACE PIPE GOLD.PIPE_DECISOES_CRM
AUTO_INGEST = TRUE
AS
COPY INTO GOLD.DECISOES_AUDITADAS
FROM @GOLD.AZUL_LAKE_STAGE/audit_logs/
FILE_FORMAT = (TYPE = 'JSON');

