# ✈️ Motor de Retenção de Alto Valor — Azul Fidelidade

Solução desenvolvida para o Hackathon Azul / Avanade com foco na retenção proativa e reativa de clientes de alto valor, combinando Engenharia de Dados (**Medallion Architecture** em Parquet), **3 Cérebros de Inteligência Artificial**, **Árbitro Matemático de Uplift**, **Agente RAG-LLM com Guardrails** e **Interface Gerencial em Next.js**.

---

## 🚀 1. Execução Rápida ("Plug and Play")

O sistema é 100% **Plug and Play**: os containers sobem em segundos consumindo diretamente os arquivos `.parquet` já persistidos nas camadas Bronze, Silver e Gold, **sem executar pipelines de dados no startup**.

### Subindo os Serviços:
```bash
docker compose up -d
```
*(ou `docker-compose up -d`)*

### Acessos Disponíveis:
- **Painel Front-end (Next.js)**: [http://localhost:3000](http://localhost:3000)
- **API Backend (FastAPI + DuckDB)**: [http://localhost:8000](http://localhost:8000)
- **Documentação Interativa (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

Para encerrar os serviços:
```bash
docker compose down
```

---

## 🤖 2. Ativando a Inteligência Artificial (Agente LLM)

O sistema opera de forma autônoma e resiliente com fallbacks padronizados baseados em regras caso nenhuma chave externa seja informada. Para ativar chamadas reais ao modelo generativo do **Google Gemini** para geração personalizada de drafts de CRM e instruções da tripulação:

1. **Criar chave gratuita no Google AI Studio**:
   Acesse o [Google AI Studio](https://aistudio.google.com/) e gere uma chave de API gratuita.
2. **Criar arquivo `.env` na raiz**:
   Crie o arquivo `.env` na raiz do projeto (ou copie de `.env.example`).
3. **Inserir a chave de API**:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```
   *(Nota: Opcionalmente, o sistema também oferece compatibilidade nativa com `OPENAI_API_KEY=sua_chave`).*

---

## 🛠️ 3. Script de Auditoria Técnica da Esteira de Dados

Para auditar e reexecutar a esteira completa da **Arquitetura Medallion**, disponibilizamos o script executável na raiz do projeto:

```bash
./regenerar_dados.sh
```

### O script orquestra sequencialmente:
1. **Camada Bronze** (`back/generate_reviews_bronze.py` e dados ANAC): Geração determinística de avaliações e verificação dos microdados públicos.
2. **Camada Silver** (`back/silver_builder.py`): Limpeza, saneamento, cruzamento relacional e injeção de variância natural log-normal em voos e atrasos.
3. **Camada Gold — Cérebro 1** (`back/gold_clv_builder.py`): Modelo preditivo de CLV (RFM) e ordenação de Pareto (*Top 10%*, *Top 20%*, *Top 50%* e *Cauda Longa*).
4. **Camada Gold — Cérebro 3** (`back/gold_personas_builder.py`): Clusterização K-Means de personas comportamentais.
5. **Camada Gold — Cérebro 2** (`back/gold_evasion_builder.py`): Treinamento do XGBClassifier de Churn com NLP de dor e explicabilidade matemática **SHAP** (`shap_clientes.parquet`).

---

## 🧪 4. Testes Automatizados da API e Regras de Negócio

Para validar a integridade de todos os contratos e regras de Uplift:

```bash
# Ativar o ambiente virtual:
source .venv/bin/activate

# Executar a suíte de testes (40 testes):
pytest back/tests/ -v
```

---

## 📁 5. Estrutura do Repositório

```text
azul/
├── back/                      # Backend FastAPI, DuckDB e scripts analíticos
│   ├── app/                   # Arquitetura limpa modular (endpoints, schemas, domain)
│   ├── executor_decisao.py    # Árbitro Matemático de Uplift e Agente LLM
│   ├── silver_builder.py      # Construtor da Camada Silver
│   ├── gold_clv_builder.py    # Cérebro 1 (CLV & Pareto)
│   ├── gold_evasion_builder.py# Cérebro 2 (Risco & SHAP)
│   ├── gold_personas_builder.py# Cérebro 3 (Personas K-Means)
│   └── Dockerfile             # Container FastAPI otimizado
├── front/                     # Frontend Next.js 14, TailwindCSS, Recharts
│   ├── src/                   # Telas: Visão Executiva, Central de Decisões, Auditoria
│   └── Dockerfile             # Container Next.js
├── data_lake/                 # Medallion Lakehouse em Apache Parquet
│   ├── bronze/                # Dados brutos imutáveis
│   ├── silver/                # Dados saneados e relacionais
│   └── gold/                  # Feature store analítica e SHAP
├── docker-compose.yml         # Orquestração dos serviços (backend + frontend)
├── regenerar_dados.sh         # Script executável de auditoria técnica da esteira
├── contract.md                # Contrato formal de API RESTful
└── regras_azul_fidelidade.md  # Base de conhecimento RAG para guardrails do LLM
```

