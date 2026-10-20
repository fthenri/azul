# Contexto do Negócio: Motor de Retenção Azul (Hackathon Avanade 2026)

## O Desafio
Identificar clientes de alto valor da Azul Linhas Aéreas, prever o risco de evasão (churn) e propor a melhor ação de retenção usando IA, garantindo que o retorno financeiro compense o custo da ação. Como não há dados reais de clientes, usamos uma base sintética calibrada com dados públicos da ANAC.

## Os 3 Cérebros (Pilares Matemáticos)
1. **Valor do Cliente (CLV com RFM Preditivo):** O teto máximo de gasto. Baseado na recência, frequência e valor monetário. Usa as tarifas médias da ANAC e injeta premissas explícitas de receitas auxiliares (assinatura do Clube Azul e Cartão Co-branded Itaú).
2. **Limite de Dor (Risco de Evasão):** Previsão (0% a 100%) usando XGBoost + SHAP. Avalia o histórico de atritos operacionais (atrasos críticos, cancelamentos) ponderados pelo sentimento (NLP) extraído de avaliações públicas.
3. **Efeito Manada (Personas):** Clusterização (K-Means) baseada no comportamento e na quantidade de pessoas no mesmo localizador (PNR).

## O Braço Executor (Árbitro + Agente LLM com RAG)
Usa a lógica de Uplift. O Árbitro Matemático exige que o catálogo de ações tenha custos pré-fixados no banco de dados. O sistema só age se: `(CLV Preservado - Custo da Ação) > 0`. Se aprovado, o Agente LLM utiliza RAG (Retrieval-Augmented Generation) com as regras do Azul Fidelidade embutidas para redigir a mensagem sem alucinar benefícios.