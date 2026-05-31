FROM node:22-slim

# better-sqlite3 requires build tools for native compilation
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (separate layer for caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY . .

CMD ["node", "server/index.js"]
