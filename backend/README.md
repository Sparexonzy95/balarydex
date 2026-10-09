# Balary Indexer & REST API Backend

Production-ready blockchain indexer and high-performance REST API for Balary DEX on LitVM (LiteForge Testnet).

---

## Quick VPS Deployment (Option 1: Docker Compose) — Recommended

### Prerequisites
- Any Linux VPS (Ubuntu 22.04 / 24.04, Debian, etc.)
- Docker & Docker Compose installed:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

### 1. Clone repository on VPS
```bash
git clone https://github.com/Sparexonzy95/balarydex.git
cd balarydex/backend
```

### 2. Start container
```bash
docker compose up -d --build
```

### 3. Check logs & verify
```bash
docker compose logs -f
# Test API
curl http://localhost:3102/api/pools
```

---

## Quick VPS Deployment (Option 2: PM2 & Node.js)

### Prerequisites
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 1. Install dependencies
```bash
cd balarydex/backend
npm install --production
```

### 2. Run with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## Set Up Nginx & SSL Domain (Optional but Recommended)

1. Copy `nginx.conf` to Nginx:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/api.balary.xyz
   sudo ln -s /etc/nginx/sites-available/api.balary.xyz /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. Issue free SSL with Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.balary.xyz
   ```
