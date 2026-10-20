# Arquitetura do Sistema e Stack Tecnológico

## Princípios
- **Zero Refactoring:** A arquitetura de dados permite plugar o Snowflake real da Azul no futuro sem reescrever os modelos de ML.
- **Data Lake Medallion:** Dados fluem da Bronze (Bruta) para Silver (Normalizada) para Gold (Feature Store/Modelos).

## Stack Permitido
- **Linguagem:** Python 3.x
- **Processamento e Armazenamento:** Pandas, PyArrow, Parquet (compressão snappy). NUNCA use CSV para persistência interna.
- **Machine Learning (Camada Gold):** Scikit-Learn (K-Means, RFM Preditivo), XGBoost (Risco de Evasão), SHAP (Explicabilidade). NÂO utilizar a biblioteca lifetimes (BG/NBD) para manter a aderência ao MVP sintético.
- **Backend/API:** FastAPI.
- **LLM:** Integração via API (OpenAI/Anthropic/Gemini) utilizando pipeline de RAG (Retrieval-Augmented Generation) para regras de fidelidade.

## Regras de Código (Vibe Coding)
- Comente APENAS as linhas que forem alteradas ou adicionadas, e as premissas matemáticas assumidas (ex: ticket médio auxiliar). Não polua o código com comentários óbvios.
- Mantenha a semente aleatória `seed=42` em todas as gerações e divisões de treino/teste para garantir a reprodutibilidade exigida pela banca.