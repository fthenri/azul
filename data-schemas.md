# Contratos de Dados (Camada Silver)
Qualquer modelo de IA na camada Gold DEVE consumir exclusivamente as tabelas abaixo, localizadas em `azul/data_lake/silver/`.

## 1. clientes_silver.parquet
- `id_cliente` (string/UUID): Chave primária.
- `tier_fidelidade` (string): 'Basico', 'Topazio', 'Safira', 'Diamante'.
- `assinante_clube` (bool)
- `cartao_cobranded` (bool)
- `pontos_saldo` (int64)
- `perfil_alto_risco_imagem` (bool)
- `consentimento_marketing` (bool)

## 2. viagens_silver.parquet
- `id_cliente` (string): FK para clientes_silver.
- `pnr` (string): Código localizador (6 caracteres).
- `numero_voo`, `origem`, `destino` (string).
- `partida_prevista`, `partida_real` (string ISO Timestamp).
- `situacao_voo` (string): 'REALIZADO' ou 'CANCELADO'.
- `atraso_enfrentado_minutos` (float64): >= 0.0 (se realizado) ou -1.0 (se cancelado).
- `teve_bagagem_extraviada` (bool)
- `falha_app_checkin` (bool)
- `valor_pago_tarifa` (float64): Ticket médio pago no trecho.

## 3. avaliacoes_silver.parquet
- `id_avaliacao` (string/UUID)
- `topico` (string): 'Atraso', 'Cancelamento', 'Bagagem', 'App', 'Atendimento'.
- `texto_avaliacao` (string)
- `nota_cliente` (int64): 1 a 5.
- `score_sentimento` (float64): -1.0 a 1.0 (gerado por NLP).