import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function mlswapStoragePlugin(): Plugin {
  return {
    name: 'mlswap-storage-middleware',
    configureServer(server) {
      // Auto-start backend indexer if not running
      fetch('http://127.0.0.1:3102/health', { signal: AbortSignal.timeout(500) }).catch(() => {
        try {
          const indexerProc = spawn('node', [path.resolve(__dirname, './server/indexer.cjs')], {
            detached: true,
            stdio: 'ignore'
          });
          indexerProc.unref();
        } catch (_) {}
      });

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        if (!url.pathname.startsWith('/api/')) return next();

        // First attempt to proxy to local backend if running
        fetch(`http://127.0.0.1:3102${req.url}`, {
          method: req.method,
          headers: req.headers as any,
          signal: AbortSignal.timeout(800)
        }).then(async (backendRes) => {
          res.writeHead(backendRes.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          const text = await backendRes.text();
          res.end(text);
        }).catch(() => {
          // Fallback directly to .mlswap_storage JSON files
          const storageDir = path.resolve(__dirname, './.mlswap_storage');
          const pathname = url.pathname;

          if (pathname === '/api/pools') {
            const pools = fs.existsSync(path.join(storageDir, 'pools.json'))
              ? JSON.parse(fs.readFileSync(path.join(storageDir, 'pools.json'), 'utf-8'))
              : [];
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ pools }));
            return;
          }

          if (pathname === '/api/stats') {
            const stats = fs.existsSync(path.join(storageDir, 'stats.json'))
              ? JSON.parse(fs.readFileSync(path.join(storageDir, 'stats.json'), 'utf-8'))
              : {};
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(stats));
            return;
          }

          if (pathname.startsWith('/api/pools/') && pathname.endsWith('/swaps')) {
            const poolId = pathname.replace('/api/pools/', '').replace('/swaps', '').toLowerCase();
            const swaps = fs.existsSync(path.join(storageDir, 'swaps.json'))
              ? JSON.parse(fs.readFileSync(path.join(storageDir, 'swaps.json'), 'utf-8'))
              : [];
            const poolSwaps = swaps.filter((s: any) => (s.pool?.id || s.poolId || '').toLowerCase() === poolId);
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ swaps: poolSwaps }));
            return;
          }

          if (pathname.startsWith('/api/pools/')) {
            const poolId = pathname.replace('/api/pools/', '').toLowerCase();
            const pools = fs.existsSync(path.join(storageDir, 'pools.json'))
              ? JSON.parse(fs.readFileSync(path.join(storageDir, 'pools.json'), 'utf-8'))
              : [];
            const pool = pools.find((p: any) => p.id.toLowerCase() === poolId);
            if (pool) {
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ pool }));
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: 'Pool not found' }));
            }
            return;
          }

          if (pathname === '/api/positions') {
            const positions = fs.existsSync(path.join(storageDir, 'positions.json'))
              ? JSON.parse(fs.readFileSync(path.join(storageDir, 'positions.json'), 'utf-8'))
              : [];
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ positions }));
            return;
          }

          if (pathname === '/api/tokens') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({
              tokens: [
                { id: '0x13206907a6bc3fff71700764f11ad6c303958a7c', symbol: 'WLTC', name: 'Wrapped Litecoin', priceUSD: 100.0, derivedUSDC: '100.0', logo: '/tokens/wltc.svg' },
                { id: '0x82b22b6fc22522f7106ca59905e465fecec700e0', symbol: 'USDC', name: 'USD Coin', priceUSD: 1.0, derivedUSDC: '1.0', logo: '/assets/0x3600000000000000000000000000000000000000/logo.png' },
                { id: '0x7a527f1b72fabb717b2d3693854e270ba1798d04', symbol: 'BAL', name: 'Balary', priceUSD: 0.10, derivedUSDC: '0.10', logo: '/tokens/bal.svg' },
                { id: '0x3854db1bdabcb694afc1c0f8d31406ead44b99c3', symbol: 'SOFT', name: 'SoftDAO', priceUSD: 0.10, derivedUSDC: '0.10', logo: '/assets/0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d/logo.png' },
                { id: '0xa796c1870203e86d35709cc4937ecb788dc7cf24', symbol: 'MONKE', name: 'MONKE', priceUSD: 0.001, derivedUSDC: '0.001', logo: '/assets/0x57700E377d85328322574FB8d92d4F017a2106E2/logo.jpeg' }
              ]
            }));
            return;
          }

          next();
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), mlswapStoragePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    watch: {
      ignored: [
        '**/.mlswap_storage/**',
        '**/server/**',
        '**/.git/**',
      ],
    },
  },
});
