# Contrato de API RESTful — Motor de Retenção de Alto Valor (Azul)

Este documento define os endpoints expostos pelo back-end (FastAPI + DuckDB) para consumo pelo front-end (Next.js/TypeScript). A API consome os dados da Camada Gold (arquivos `.parquet`).

---

## ⚙️ Padrões da API 
- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Autenticação:** Não exigida para o MVP (contexto de Hackathon).

---

## 🖥️ Tela 1: Painel de Valor (Visão Executiva)

### 1.1. Obter KPIs Consolidados
Retorna a visão macro e financeira do motor de retenção.

- **Endpoint:** `GET /dashboard/kpis`
- **Resposta (200 OK):**
```json
{
  "valor_protegido": 1250000.00,
  "valor_gerado": 850000.00,
  "custo_total": 150000.00,
  "roi_por_real_gasto": 14.00
}
```

### 1.2. Obter Dados das Personas (Mapa de Bolhas)
Alimenta o Mapa de Personas cruzando CLV Médio, Risco de Evasão e Volume (Efeito Manada).

- **Endpoint:** `GET /dashboard/personas`
- **Resposta (200 OK):**
```json
[
  {
    "persona": "Executivo Frequente",
    "clv_medio": 8500.00,
    "risco_evasao_medio": 0.45,
    "tamanho_bolha": 1200 
  },
  {
    "persona": "Família/Lazer Premium",
    "clv_medio": 4200.00,
    "risco_evasao_medio": 0.25,
    "tamanho_bolha": 3500 
  }
]
```

### 1.3. Obter Curva de Concentração (Pareto)
Retorna os dados para renderizar o gráfico de Pareto demonstrando a concentração de valor.

- **Endpoint:** `GET /dashboard/pareto`
- **Resposta (200 OK):**
```json
[
  {
    "decil_clientes": "Top 10%",
    "valor_acumulado": 5500000.00,
    "percentual_acumulado": 0.65
  }
]
```

---

## ⚡ Tela 2: Central de Decisões (Simulador)

### 2.1. Listar Fila de Momentos
Retorna a lista de eventos detectados prontos para simulação (reativos ou proativos).

- **Endpoint:** `GET /momentos`
- **Resposta (200 OK):**
```json
[
  {
    "id": "mom_789",
    "cliente_id": "cli_123",
    "tipo_simulacao": "Reativa",
    "descricao": "Atraso crítico de 4 horas - Voo AD4321",
    "persona": "Executivo Frequente",
    "clv_previsto": 8500.00,
    "risco_evasao_atual": 0.85
  }
]
```

### 2.2. Executar Motor de Simulação
Aciona o Árbitro Matemático e o Agente LLM para um momento específico, calculando o UPLIFT e gerando a ação recomendada.

- **Endpoint:** `POST /motor/simular`
- **Body:**
```json
{
  "momento_id": "mom_789"
}
```
- **Resposta (200 OK):**
```json
{
  "uplift_status": "Persuadível",
  "ranking_acoes": [
    {
      "acao": "Upgrade de Cabine",
      "custo_acao": 300.00,
      "retorno_liquido": 850.00
    },
    {
      "acao": "Voucher Azul Viagens R$ 150",
      "custo_acao": 150.00,
      "retorno_liquido": 450.00
    }
  ],
  "decisao_final": {
    "acao_vencedora": "Upgrade de Cabine",
    "mensagem_llm": "Olá! Notamos o atraso no seu voo. Sabemos que seu tempo é valioso. Como cortesia e agradecimento por ser um cliente Diamante, garantimos um upgrade para a cabine premium no seu próximo trecho.",
    "regra_rag_consultada": "Clientes Diamante têm prioridade em upgrades mediante disponibilidade. Em casos de falha operacional grave, o benefício pode ser antecipado."
  }
}
```

---

## 🔍 Tela 3: Logs e Explicabilidade (Auditoria)

### 3.1. Listar Histórico de Decisões
Retorna a tabela de auditoria completa, incluindo bloqueios e decisões de "Não agir".

- **Endpoint:** `GET /auditoria/decisoes`
- **Resposta (200 OK):**
```json
[
  {
    "decisao_id": "dec_456",
    "cliente_id": "cli_123",
    "data_decisao": "2026-10-20T14:30:00Z",
    "tipo_simulacao": "Reativa",
    "acao_executada": "Bloqueada pelo Árbitro",
    "motivo_bloqueio": "Janela de silêncio de 72h (Cliente já acionado recentemente)",
    "custo_realizado": 0.00,
    "versao_modelos": {
      "clv": "v1.2",
      "churn": "v2.0",
      "llm": "gpt-4o-mini-rag"
    }
  }
]
```

### 3.2. Obter Explicabilidade SHAP
Retorna os pesos dos fatores que elevaram o limite de dor/risco de evasão de uma decisão específica para plotagem gráfica.

- **Endpoint:** `GET /auditoria/decisoes/{decisao_id}/shap`
- **Parâmetros de Rota:** `decisao_id` (string)
- **Resposta (200 OK):**
```json
{
  "risco_base": 0.20,
  "fatores": [
    {
      "variavel": "Atraso > 60 min recente",
      "impacto": 0.35,
      "direcao": "positivo" 
    },
    {
      "variavel": "Sentimento negativo (Reclame Aqui)",
      "impacto": 0.15,
      "direcao": "positivo"
    },
    {
      "variavel": "Recência de voo < 15 dias",
      "impacto": -0.05,
      "direcao": "negativo"
    }
  ]
}
```