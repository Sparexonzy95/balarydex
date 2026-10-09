# Balary DEX 🥞⚡

> **Next-Generation Concentrated Liquidity AMM with PointsHook Gamification on LitVM**

[![Chain: LitVM](https://img.shields.io/badge/Network-LitVM%20(4441)-0052FF?style=flat-square)](https://litvm.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![Vite](https://img.shields.io/badge/Frontend-Vite%20%2B%20React-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Backend-Docker%20%7C%20PM2-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## 📖 Overview

**Balary DEX** is a decentralized exchange and liquidity protocol designed for the **LitVM** blockchain (Chain ID `4441`). Built upon the Uniswap v4 architecture, Balary pairs concentrated liquidity pools with an innovative **PointsHook** incentive mechanism that rewards liquidity providers and traders based on pool participation and active campaigns.

The repository contains the complete end-to-end stack:
1. **Smart Contracts (`/contracts`)**: Foundry-based Uniswap v4 core, periphery, Universal Router, PointsHook, and LitVM deployment automation.
2. **Web Frontend (`/frontend`)**: Production React SPA with Vite, Wagmi v2, RainbowKit, and custom charts for swaps, pools, and campaigns.
3. **Documentation Portal (`/docs`)**: Interactive developer documentation covering architecture, mathematical models, hooks, and integration guides.
4. **Backend Indexer & API (`/backend`)**: High-performance Node.js service indexing pool events, swap volumes, campaign points, and serving REST endpoints with persistent storage.

---

## 📂 Repository Structure

```text
balarydex/
├── contracts/               # Smart contract suite (Foundry)
│   ├── src/                 # Uniswap v4 PoolManager, UniversalRouter, PointsHook
│   ├── script/              # Deployment & pool seeding scripts
│   ├── test/                # Unit & integration tests
│   ├── deploy_litvm.ps1     # 1-click deployment orchestrator for LitVM
│   └── foundry.toml         # Foundry configuration
│
├── frontend/                # Balary DEX Web Application
│   ├── src/                 # Application code (Swap, Pools, Campaigns)
│   ├── vercel.json          # Vercel SPA routing configuration
│   └── package.json
│
├── docs/                    # Balary Documentation Portal
│   ├── src/                 # Docs pages, search, interactive code samples
│   ├── vercel.json          # Vercel SPA routing configuration
│   └── package.json
│
└── backend/                 # Blockchain Indexer & REST API
    ├── storage/             # Pre-seeded JSON database files
    ├── indexer.cjs          # Fastify / Express indexer daemon
    ├── Dockerfile           # Alpine container image
    ├── docker-compose.yml   # 1-command container orchestrator
    ├── ecosystem.config.cjs # PM2 process manager configuration
    └── nginx.conf           # Reverse proxy configuration template
```

---

## 🚀 Quick Start & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ or v20+
- [Foundry](https://getfoundry.sh/) (`forge`, `cast`)
- [Git](https://git-scm.com/)

### 1. Run Backend Indexer
```bash
cd backend
npm install
node indexer.cjs
# Indexer and REST API running at http://localhost:3102
```

### 2. Run Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend running at http://localhost:3000
```

### 3. Run Documentation Portal
```bash
cd docs
npm install
npm run dev
# Docs portal running at http://localhost:3005
```

---

## 🌐 Deployment Architecture

### 1. Backend on VPS (Docker or PM2)

#### Option A: Docker Compose (Recommended)
```bash
cd backend
docker compose up -d --build
```
The API is now live on port `3102` with persistent volume storage at `./storage`.

#### Option B: PM2 Process Manager
```bash
cd backend
npm install
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 2. DEX Frontend on Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Configure Environment Variables:
   - `VITE_API_BASE_URL`: `https://api.yourdomain.com` (or `http://YOUR_VPS_IP:3102`)
   - `VITE_WALLETCONNECT_PROJECT_ID`: Your WalletConnect project ID.
5. Deploy.

### 3. Docs Portal on Vercel
1. Import the same repository as a new project on [Vercel](https://vercel.com).
2. Set **Root Directory** to `docs`.
3. Set **Framework Preset** to `Vite`.
4. Deploy (zero environment variables required).

---

## ⛓️ LitVM Network Details

| Parameter | Value |
|---|---|
| **Network Name** | LitVM Testnet |
| **RPC URL** | `https://rpc.litvm.org` |
| **Chain ID** | `4441` |
| **Currency Symbol** | `zkLTC` |
| **Block Explorer** | `https://explorer.litvm.org` |

---

## 🔒 Security & Safe Practice

- Never commit private keys or mnemonic seed phrases. All `.env` files and Foundry `broadcast/` outputs are strictly ignored in `.gitignore`.
- Use separate deployer and treasury addresses in production.
- Review and audit hook permissions before configuring pool fee tiers.

---

## 📄 License
Released under the [MIT License](LICENSE).
