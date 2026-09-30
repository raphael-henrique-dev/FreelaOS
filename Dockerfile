FROM python:3.12-slim

WORKDIR /app

# Instala dependências de sistema necessárias para o Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Copia os requisitos
COPY requirements.txt .

# Instala pacotes Python
RUN pip install --no-cache-dir -r requirements.txt

# Instala binários do Chromium e as bibliotecas do SO exigidas por ele
RUN playwright install chromium --with-deps

# Copia o código fonte do backend
COPY backend/ ./backend/

# Garante que o diretório de sessões do Playwright exista
RUN mkdir -p /app/playwright_sessions

# Expõe a porta do FastAPI
EXPOSE 8000

# Inicia o servidor Uvicorn
CMD ["uvicorn", "backend.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
