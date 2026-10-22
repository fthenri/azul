FROM python:3.12-slim

# Evita criação de bytecode e garante flush do buffer de logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/back

WORKDIR /app

# Instala dependências mínimas do sistema operacional
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências Python com cache de camadas
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia os arquivos do backend para /app/back
COPY . /app/back

# Expõe a porta HTTP da API
EXPOSE 8000

# Inicializa o servidor FastAPI com Uvicorn
CMD ["uvicorn", "back.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
