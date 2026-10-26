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

---

# Contratos de Dados (Camada Gold)
Tabelas analíticas e prescritivas geradas a partir dos modelos estatísticos, de Machine Learning (CLV, Evasão/Churn, K-Means de Personas, SHAP values) e do Batch AI Pipeline (RAG + LLM). Localizadas em `azul/data_lake/gold/`.

## 1. contexto_passageiro.parquet
Alimenta os módulos operacionais de Bordo (Comissária) e Retenção CRM (Off-Board). Cada registro consolida o histórico de atrito, códigos SSR/SAC, a melhor ação arbitrada e as mensagens geradas por IA.
- `id_cliente` (string): Identificador do cliente.
- `pnr` (string): Código localizador da reserva.
- `numero_voo` (string): Número do voo.
- `tem_alerta_bagagem` (bool): Flag de ocorrência com bagagem (WorldTracer).
- `bagagem_codigo_rastreio` (string): Código de rastreamento da bagagem.
- `bagagem_status` (string): Status da bagagem no WorldTracer.
- `tem_ssr` (bool): Flag de serviço especial (Special Service Request).
- `ssr_codigo` (string): Código do SSR (ex: WCHR, PETC).
- `ssr_descricao` (string): Descrição da necessidade especial.
- `tem_sac` (bool): Flag de protocolo de atendimento recente.
- `sac_protocolo` (string): Número do protocolo de atendimento.
- `sac_motivo` (string): Motivo registrado no SAC.
- `sac_status` (string): Status do chamado.
- `contexto_narrativo_llm` (string): Resumo narrativo gerado para alimentação do RAG.
- `acao_vencedora` (string): Ação de retenção recomendada pelo Árbitro Contextual.
- `custo_acao` (float64): Custo financeiro estimado da ação concedida.
- `llm_mensagem_comissaria` (string): Instrução tática contextualizada para a tripulação a bordo.
- `mensagem_llm_offboard` (string): Mensagem empática e direta pronta para disparo via WhatsApp/e-mail para o cliente final.
- `data_atualizacao` (timestamp): Timestamp de processamento pelo batch pipeline.

## 2. clv_clientes.parquet
Projeção de Customer Lifetime Value por modelo probabilístico (Beta-Geo/NBD + Gamma-Gamma).
- `id_cliente` (string): Identificador do cliente.
- `recencia_dias` (int64): Dias desde a última viagem.
- `frequencia` (int64): Total de viagens históricas.
- `valor_monetario_base` (float64): Média histórica de gastos por transação.
- `valor_monetario_expandido` (float64): Gasto total acumulado.
- `clv_previsto` (float64): Valor monetário projetado para os próximos 12 meses.
- `clv_acumulado_perc` (float64): Percentual acumulado para curva de Pareto.
- `faixa_pareto` (string): 'Top 10%', '10-30%', '30-50%', 'Cauda Longa'.

## 3. evasao_clientes.parquet
Score de risco de churn baseado em modelos preditivos e atrito acumulado.
- `id_cliente` (string): Identificador do cliente.
- `score_atrito_acumulado` (float64): Índice ponderado de fricção recente (atrasos, cancelamentos, extravios).
- `risco_evasao` (float64): Probabilidade de churn calculada (0.0 a 1.0).

## 4. personas_clientes.parquet
Segmentação não-supervisionada (K-Means) em 4 quadrantes operacionais.
- `id_cliente` (string): Identificador do cliente.
- `persona` (string): Código da persona ('GESTOR_CORPORATIVO', 'VIAJANTE_CONECTADO', 'EXPLORADOR_LAZER', 'AVENTUREIRO_FLEXIVEL').
- `persona_nome` (string): Nome amigável ('Gestor Corporativo', 'Viajante Conectado', 'Explorador de Lazer', 'Aventureiro Flexível').
- `score_influencia` (float64): Score de relevância e valor da rede do cliente.
- `clv_previsto` (float64): Projeção de CLV associada.
- `frequencia_total` (int64): Frequência total de viagens.
- `antecedencia_media_compra` (float64): Média de dias de antecedência na compra de passagens.
- `tamanho_medio_pnr` (float64): Média de passageiros por reserva.
- `percentual_voos_fds` (float64): Percentual de viagens em fins de semana.

## 5. shap_clientes.parquet
Explicabilidade (XAI) com valores SHAP individuais para cada passageiro.
- `id_cliente` (string): Identificador do cliente.
- `shap_base_value` (float64): Valor base do modelo preditivo.
- `shap_score_atrito_acumulado` (float64): Contribuição do atrito no risco.
- `shap_recencia_dias` (float64): Contribuição do tempo desde a última viagem.
- `shap_qtd_cancelamentos` (float64): Contribuição de voos cancelados.
- `shap_qtd_atrasos_criticos` (float64): Contribuição de atrasos graves.
- `shap_qtd_bagagem_extraviada` (float64): Contribuição de extravio de bagagem.
- `shap_qtd_falha_app` (float64): Contribuição de instabilidades no app/check-in.

