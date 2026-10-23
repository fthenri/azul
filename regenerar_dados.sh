#!/bin/bash
set -e

# Garante execução a partir da raiz do repositório
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Identifica o interpretador Python (.venv local ou do sistema)
if [ -f "$PROJECT_ROOT/.venv/bin/python" ]; then
    PYTHON_CMD="$PROJECT_ROOT/.venv/bin/python"
elif [ -f "$PROJECT_ROOT/back/.venv/bin/python" ]; then
    PYTHON_CMD="$PROJECT_ROOT/back/.venv/bin/python"
elif command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

echo "=========================================================================="
echo "  ESTEIRA DE AUDITORIA & ENGENHARIA DE DADOS — PROJETO AZUL FIDELIDADE   "
echo "  Arquitetura Medallion: Camada Bronze -> Camada Silver -> Camada Gold   "
echo "=========================================================================="
echo "Interpretador Python selecionado: $PYTHON_CMD"
echo ""

# 1. Camada Bronze: Ingestão de voos e tarifas ANAC + avaliações sintéticas
echo "--------------------------------------------------------------------------"
echo ">> [1/5] Processando Camada Bronze (Bruta)..."
echo "--------------------------------------------------------------------------"
if [ "$1" == "--force-anac" ] || [ ! -f "data_lake/bronze/voos_historico_azul.parquet" ]; then
    echo "Executando download de microdados abertos da ANAC (back/ingestion.py)..."
    $PYTHON_CMD back/ingestion.py || echo "Aviso: Download ANAC indisponível no momento. Mantendo dados brutos em cache."
else
    echo "Microdados ANAC já presentes em data_lake/bronze/ (use --force-anac para rebaixar)."
fi

echo "Gerando avaliações sintéticas padronizadas (back/generate_reviews_bronze.py)..."
$PYTHON_CMD back/generate_reviews_bronze.py

echo "Ingerindo microdados de tarifas da ANAC (back/ingestao_anac_bronze.py)..."
$PYTHON_CMD back/ingestao_anac_bronze.py

# 2. Camada Silver: Limpeza, normalização e relacionamento clientes/viagens
echo ""
echo "--------------------------------------------------------------------------"
echo ">> [2/5] Construindo Camada Silver (Clientes & Histórico de Viagens)..."
echo "--------------------------------------------------------------------------"
$PYTHON_CMD back/silver_builder.py

# 3. Camada Gold - Cérebro 1: Preditivo CLV & Curva de Pareto
echo ""
echo "--------------------------------------------------------------------------"
echo ">> [3/5] Construindo Camada Gold — Cérebro 1: CLV Preditivo & Curva de Pareto..."
echo "--------------------------------------------------------------------------"
$PYTHON_CMD back/gold_clv_builder.py

# 4. Camada Gold - Cérebro 3: Segmentação de Personas (K-Means)
echo ""
echo "--------------------------------------------------------------------------"
echo ">> [4/5] Construindo Camada Gold — Cérebro 3: Personas K-Means..."
echo "--------------------------------------------------------------------------"
$PYTHON_CMD back/gold_personas_builder.py

# 5. Camada Gold - Cérebro 2: Risco de Evasão (XGBoost) & Explicabilidade SHAP
echo ""
echo "--------------------------------------------------------------------------"
echo ">> [5/5] Construindo Camada Gold — Cérebro 2: Risco de Evasão & SHAP..."
echo "--------------------------------------------------------------------------"
$PYTHON_CMD back/gold_evasion_builder.py

echo ""
echo "=========================================================================="
echo "  ✓ Esteira Medallion regenerada com sucesso! Todos os .parquet atualizados."
echo "=========================================================================="

