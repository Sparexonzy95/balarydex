const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createPublicClient, http: viemHttp, parseAbiItem, parseAbi, formatUnits } = require('viem');

const RPC_URL = process.env.LITEFORGE_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http';
const POOLMANAGER_ADDRESS = '0xA46Fb600d828E3D6aA91581Ca4D4956E9D5c7aba';
const PORT = Number(process.env.BACKEND_PORT || 3102);
const HOST = process.env.BACKEND_HOST || process.env.HOST || '0.0.0.0';

const STORAGE_DIR = process.env.STORAGE_DIR || path.resolve(__dirname, '../.mlswap_storage');
const POOLS_FILE = path.join(STORAGE_DIR, 'pools.json');
const SWAPS_FILE = path.join(STORAGE_DIR, 'swaps.json');
const STATS_FILE = path.join(STORAGE_DIR, 'stats.json');
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const POSITIONS_FILE = path.join(STORAGE_DIR, 'positions.json');
const LIQUIDITY_FILE = path.join(STORAGE_DIR, 'liquidity.json');
const POSITION_MANAGER_ADDRESS = '0x47c05770001aa727dFB5717D5bFD9dDd624387A9';

const TOKENS = [
  {
    address: '0xa0Cf27f53636529c227845ce16b49AB759dD8cd0',
    name: 'Balary',
    symbol: 'BAL',
    decimals: 18,
    logo: '/tokens/bal.svg',
    priceUSD: 0.10
  },
  {
    address: '0xD88cA23473DF0fAf9FCDE8d6880f4c8b88df69A5',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logo: '/assets/0x3600000000000000000000000000000000000000/logo.png',
    priceUSD: 1.00
  },
  {
    address: '0x63647642133bBdF0461bcf7BF6c360e1969B1194',
    name: 'Wrapped Litecoin',
    symbol: 'WLTC',
    decimals: 18,
    logo: '/tokens/wltc.svg',
    priceUSD: 100.00
  },
  {
    address: '0x6841fdF52E3398DC43cDb042292B0ECb53FA8737',
    name: 'SoftDAO',
    symbol: 'SOFT',
    decimals: 18,
    logo: '/assets/0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d/logo.png',
    priceUSD: 0.10
  },
  {
    address: '0xA9a29BA9C693Fe87Bb929322DD96728E61f6a1ed',
    name: 'MONKE',
    symbol: 'MONKE',
    decimals: 18,
    logo: '/assets/0x57700E377d85328322574FB8d92d4F017a2106E2/logo.jpeg',
    priceUSD: 0.001
  }
];

function getTokenInfo(address, symbol) {
  const addr = (address || '').toLowerCase();
  if (addr === '0x0000000000000000000000000000000000000000' || addr === '0' || addr === 'native') {
    return TOKENS.find(t => t.symbol === 'WLTC') || TOKENS[2];
  }
  let found = TOKENS.find(t => t.address.toLowerCase() === addr);
  if (!found && symbol) {
    found = TOKENS.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
  }
  if (found) return found;
  return {
    address,
    symbol: symbol || 'TOKEN',
    name: symbol || 'Unknown Token',
    decimals: 18,
    logo: '/tokens/bal.svg',
    priceUSD: 1.00
  };
}

const client = createPublicClient({
  transport: viemHttp(RPC_URL, { timeout: 15_000 })
});

function ensureStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (e) {
    console.warn(`Error reading ${file}:`, e.message);
  }
  return fallback;
}

function writeJson(file, data) {
  ensureStorage();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

const POINTSHOOK_ADDRESS = '0x7267CD4fF7f0e9Ba3bf1Ec8f1b8A7D14b16C4040';
const CAMPAIGN_POINTS_FILE = path.join(STORAGE_DIR, 'campaign_points.json');
const CAMPAIGNS_FILE = path.join(STORAGE_DIR, 'campaigns.json');

const INITIAL_CAMPAIGNS = [];
const INITIAL_POOLS = [];
const INITIAL_CAMPAIGN_POINTS = [];
const INITIAL_SWAPS = [];
const INITIAL_LIQUIDITY_EVENTS = [];

async function syncPositions() {
  const pmAbi = parseAbi([
    'function nextTokenId() view returns (uint256)',
    'function ownerOf(uint256) view returns (address)',
    'function getPoolAndPositionInfo(uint256) view returns ((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), uint256)'
  ]);

  try {
    const nextTokenId = await client.readContract({
      address: POSITION_MANAGER_ADDRESS,
      abi: pmAbi,
      functionName: 'nextTokenId'
    }).catch(() => null);

    let positions = readJson(POSITIONS_FILE, []);
    let liquidity = readJson(LIQUIDITY_FILE, INITIAL_LIQUIDITY_EVENTS);

    if (nextTokenId && Number(nextTokenId) > 1) {
      const count = Number(nextTokenId);
      const newPositions = [];

      for (let id = 1; id < count; id++) {
        try {
          const owner = await client.readContract({
            address: POSITION_MANAGER_ADDRESS,
            abi: pmAbi,
            functionName: 'ownerOf',
            args: [BigInt(id)]
          });

          const [poolKey, infoBig] = await client.readContract({
            address: POSITION_MANAGER_ADDRESS,
            abi: pmAbi,
            functionName: 'getPoolAndPositionInfo',
            args: [BigInt(id)]
          });

          const info = BigInt(infoBig);
          const tickLowerRaw = (info >> 8n) & 0xffffffn;
          const tickUpperRaw = (info >> 32n) & 0xffffffn;
          const signExtend24 = (v) => (v & 0x800000n) !== 0n ? Number(v - 0x1000000n) : Number(v);
          const tickLower = signExtend24(tickLowerRaw);
          const tickUpper = signExtend24(tickUpperRaw);

          const t0 = getTokenInfo(poolKey.currency0);
          const t1 = getTokenInfo(poolKey.currency1);

          const priceLower = Math.pow(1.0001, tickLower) * Math.pow(10, t0.decimals - t1.decimals);
          const priceUpper = Math.pow(1.0001, tickUpper) * Math.pow(10, t0.decimals - t1.decimals);

          newPositions.push({
            tokenId: String(id),
            subgraphId: String(id),
            owner: owner.toLowerCase(),
            currency0: poolKey.currency0,
            currency1: poolKey.currency1,
            fee: poolKey.fee,
            feePct: `${(poolKey.fee / 10000).toFixed(poolKey.fee % 10000 === 0 ? 0 : 2)}%`,
            tickSpacing: poolKey.tickSpacing,
            hooks: poolKey.hooks,
            tickLower,
            tickUpper,
            priceLower,
            priceUpper,
            token0: t0,
            token1: t1,
            createdAtTimestamp: 1760000000 + (id * 1000)
          });
        } catch (e) {
          console.warn(`[Positions] Error reading position #${id}:`, e.message);
        }
      }
      if (newPositions.length > 0) {
        positions = newPositions;
      }
    }

    writeJson(POSITIONS_FILE, positions);
    writeJson(LIQUIDITY_FILE, liquidity);
    return { positions, liquidity };
  } catch (err) {
    console.warn('[Positions] Sync error:', err.message);
    return { positions: readJson(POSITIONS_FILE, []), liquidity: readJson(LIQUIDITY_FILE, INITIAL_LIQUIDITY_EVENTS) };
  }
}

async function syncBlockchain() {
  ensureStorage();
  const state = readJson(STATE_FILE, {
    lastProcessedBlock: 58945366,
    lastSyncTimestamp: new Date().toISOString()
  });

  let pools = readJson(POOLS_FILE, []);
  let swaps = readJson(SWAPS_FILE, []);
  if (!pools) pools = [];
  if (!swaps) swaps = [];

  // Update PoolManager token balances to calculate live TVL
  try {
    const erc20Abi = parseAbi(['function balanceOf(address) view returns (uint256)']);
    const balances = {};
    for (const t of TOKENS) {
      try {
        const bal = await client.readContract({
          address: t.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [POOLMANAGER_ADDRESS]
        });
        balances[t.symbol] = Number(formatUnits(bal, t.decimals));
      } catch (e) {
        balances[t.symbol] = 0;
      }
    }

    // Distribute token reserves by pool count to prevent double-counting TVL
    const tokenPoolCounts = {};
    pools.forEach(pool => {
      const sym0 = pool.token0?.symbol;
      const sym1 = pool.token1?.symbol;
      if (sym0) tokenPoolCounts[sym0] = (tokenPoolCounts[sym0] || 0) + 1;
      if (sym1) tokenPoolCounts[sym1] = (tokenPoolCounts[sym1] || 0) + 1;
    });

    pools.forEach(pool => {
      const sym0 = pool.token0.symbol;
      const sym1 = pool.token1.symbol;
      const t0 = getTokenInfo(pool.token0.id);
      const t1 = getTokenInfo(pool.token1.id);

      const count0 = tokenPoolCounts[sym0] || 1;
      const count1 = tokenPoolCounts[sym1] || 1;
      const reserve0 = (balances[sym0] || 0) / count0;
      const reserve1 = (balances[sym1] || 0) / count1;

      const tvlUSD = (reserve0 * t0.priceUSD) + (reserve1 * t1.priceUSD);
      pool.totalValueLockedUSD = tvlUSD > 0 ? tvlUSD.toFixed(2) : pool.totalValueLockedUSD;
      pool.totalValueLockedToken0 = reserve0.toFixed(4);
      pool.totalValueLockedToken1 = reserve1.toFixed(2);

      // Calculate pool swaps volume
      const poolSwaps = swaps.filter(s => s.pool?.id?.toLowerCase() === pool.id.toLowerCase() || s.poolId?.toLowerCase() === pool.id.toLowerCase());
      const poolVol = poolSwaps.reduce((acc, s) => acc + Number(s.amountUSD || 0), 0);
      const poolFees = poolVol * (Number(pool.feeTier) / 1_000_000);

      pool.volumeUSD = poolVol > 0 ? poolVol.toFixed(2) : pool.volumeUSD;
      pool.feesUSD = poolFees > 0 ? poolFees.toFixed(2) : pool.feesUSD;
      pool.txCount = String(Math.max(poolSwaps.length, 1));
      pool.poolDayData = [
        {
          date: Math.floor(Date.now() / 1000 / 86400) * 86400,
          volumeUSD: pool.volumeUSD,
          feesUSD: pool.feesUSD
        }
      ];
    });
  } catch (err) {
    console.warn('[Sync] Balance update error:', err.message);
  }

  // Retroactive fix for any swap where sender was router
  for (const s of swaps) {
    const sSender = (s.sender || '').toLowerCase();
    if (sSender === '0xaa01ffadbad68411a8ee6b134b3bb8e7baf078f6' || sSender === POOLMANAGER_ADDRESS.toLowerCase()) {
      const txHash = s.transaction?.id || s.id.split('-')[0];
      if (txHash && txHash.startsWith('0x')) {
        try {
          const tx = await client.getTransaction({ hash: txHash });
          if (tx && tx.from) {
            s.sender = tx.from;
            s.origin = tx.from;
          }
        } catch (_) {}
      }
    }
  }

  // Calculate accurate global stats
  const totalTVL = pools.reduce((acc, p) => acc + Number(p.totalValueLockedUSD || 0), 0);
  const totalVolume = swaps.reduce((acc, s) => acc + Number(s.amountUSD || 0), 0);
  const totalFees = pools.reduce((acc, p) => acc + Number(p.feesUSD || 0), 0);
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;
  const swaps24h = swaps.filter(s => Number(s.timestamp || 0) >= dayAgo);
  const vol24h = swaps24h.reduce((acc, s) => acc + Number(s.amountUSD || 0), 0);
  const fees24h = swaps24h.reduce((acc, s) => acc + Number(s.feeUSD || 0), 0);
  const todayTimestamp = Math.floor(now / 86400) * 86400;

  const stats = {
    poolManagers: [
      {
        id: POOLMANAGER_ADDRESS,
        poolCount: String(pools.length),
        txCount: String(swaps.length),
        totalVolumeUSD: totalVolume.toFixed(2),
        totalFeesUSD: totalFees.toFixed(2),
        totalValueLockedUSD: totalTVL.toFixed(2),
        owner: '0x0EdBC6F8506e72478CE78a4AE934C7b21cb7050A'
      }
    ],
    uniswapDayDatas: [
      {
        date: todayTimestamp,
        volumeUSD: vol24h.toFixed(2),
        feesUSD: fees24h.toFixed(2)
      }
    ]
  };

  writeJson(POOLS_FILE, pools);
  writeJson(SWAPS_FILE, swaps);
  writeJson(STATS_FILE, stats);
  writeJson(STATE_FILE, {
    lastProcessedBlock: state.lastProcessedBlock,
    lastSyncTimestamp: new Date().toISOString()
  });

  await syncPositions();

  return { pools, swaps, stats };
}

// Check for new on-chain events in small ranges (to avoid LiteForge timeouts)
async function pollRecentBlocks() {
  try {
    const currentBlock = await client.getBlockNumber().catch(() => null);
    if (!currentBlock) return;

    const state = readJson(STATE_FILE, { lastProcessedBlock: 58945366 });
    const fromBlock = BigInt(state.lastProcessedBlock || 58945366);

    if (currentBlock > fromBlock) {
      // Bounded block range (max 50 blocks per query to never timeout)
      const toBlock = currentBlock > fromBlock + 50n ? fromBlock + 50n : currentBlock;
      const initLogs = await client.getLogs({
        address: POOLMANAGER_ADDRESS,
        event: parseAbiItem('event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)'),
        fromBlock,
        toBlock
      }).catch(err => {
        return [];
      });

      if (initLogs && initLogs.length > 0) {
        console.log(`[Indexer] Found ${initLogs.length} new pool Initialize event(s)!`);
        const pools = readJson(POOLS_FILE, []);
        let added = false;
        for (const log of initLogs) {
          const poolId = log.args.id.toLowerCase();
          if (!pools.some(p => p.id.toLowerCase() === poolId)) {
            const t0 = getTokenInfo(log.args.currency0);
            const t1 = getTokenInfo(log.args.currency1);
            pools.push({
              id: log.args.id,
              token0: {
                id: t0.address,
                symbol: t0.symbol,
                name: t0.name,
                decimals: t0.decimals,
                derivedUSDC: String(t0.priceUSD)
              },
              token1: {
                id: t1.address,
                symbol: t1.symbol,
                name: t1.name,
                decimals: t1.decimals,
                derivedUSDC: String(t1.priceUSD)
              },
              feeTier: String(log.args.fee),
              tickSpacing: String(log.args.tickSpacing),
              hooks: log.args.hooks,
              liquidity: '0',
              sqrtPrice: log.args.sqrtPriceX96.toString(),
              token0Price: String(t0.priceUSD / t1.priceUSD),
              token1Price: String(t1.priceUSD / t0.priceUSD),
              tick: String(log.args.tick),
              volumeUSD: '0.00',
              feesUSD: '0.00',
              txCount: '0',
              totalValueLockedUSD: '0.00',
              totalValueLockedToken0: '0.0',
              totalValueLockedToken1: '0.0',
              collectedFeesToken0: '0.0',
              collectedFeesToken1: '0.0',
              collectedFeesUSD: '0.00',
              poolDayData: [
                {
                  date: Math.floor(Date.now() / 1000 / 86400) * 86400,
                  volumeUSD: '0.00',
                  feesUSD: '0.00'
                }
              ]
            });
            added = true;
          }
        }
        if (added) {
          writeJson(POOLS_FILE, pools);
          await syncBlockchain();
        }
      }

      const swapLogs = await client.getLogs({
        address: POOLMANAGER_ADDRESS,
        event: parseAbiItem('event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)'),
        fromBlock,
        toBlock
      }).catch(err => {
        console.warn('[Indexer] Logs warning:', err.shortMessage || err.message);
        return [];
      });

      if (swapLogs && swapLogs.length > 0) {
        console.log(`[Indexer] Found ${swapLogs.length} new swap event(s)!`);
        const swaps = readJson(SWAPS_FILE, []);
        const pools = readJson(POOLS_FILE, []);

        for (const log of swapLogs) {
          const poolId = log.args.id;
          const pool = pools.find(p => p.id.toLowerCase() === poolId.toLowerCase()) || pools[0];
          const t0 = getTokenInfo(pool.token0.id);
          const t1 = getTokenInfo(pool.token1.id);

          const raw0 = Number(log.args.amount0) / (10 ** t0.decimals);
          const raw1 = Number(log.args.amount1) / (10 ** t1.decimals);
          const abs0 = Math.abs(raw0);
          const abs1 = Math.abs(raw1);

          const volUSD = Math.max(abs0 * t0.priceUSD, abs1 * t1.priceUSD);
          const feeUSD = volUSD * (Number(log.args.fee || 3000) / 1_000_000);

          let realSender = log.args.sender;
          try {
            const tx = await client.getTransaction({ hash: log.transactionHash });
            if (tx && tx.from) realSender = tx.from;
          } catch (_) {}

          const swapId = `${log.transactionHash}-${log.logIndex !== undefined ? log.logIndex : log.args.id}`;
          const existingIdx = swaps.findIndex(s => s.id === swapId || (s.transaction?.id === log.transactionHash && s.pool?.id?.toLowerCase() === poolId.toLowerCase()));
          if (existingIdx === -1) {
            swaps.unshift({
              id: swapId,
              timestamp: String(Math.floor(Date.now() / 1000)),
              sender: realSender,
              origin: realSender,
              pool: { id: poolId },
              token0: pool.token0,
              token1: pool.token1,
              amount0: abs0.toFixed(4),
              amount1: abs1.toFixed(2),
              amountUSD: volUSD.toFixed(2),
              feeUSD: feeUSD.toFixed(4),
              sqrtPriceX96: log.args.sqrtPriceX96.toString(),
              tick: String(log.args.tick),
              transaction: { id: log.transactionHash }
            });
          } else {
            const curSender = (swaps[existingIdx].sender || '').toLowerCase();
            if (curSender === '0xaa01ffadbad68411a8ee6b134b3bb8e7baf078f6' || curSender === POOLMANAGER_ADDRESS.toLowerCase()) {
              swaps[existingIdx].sender = realSender;
              swaps[existingIdx].origin = realSender;
            }
          }
        }
        writeJson(SWAPS_FILE, swaps);
        await syncBlockchain();
      }

      const pointsLogs = await client.getLogs({
        address: POINTSHOOK_ADDRESS,
        event: parseAbiItem('event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)'),
        fromBlock,
        toBlock
      }).catch(() => []);

      if (pointsLogs && pointsLogs.length > 0) {
        console.log(`[Indexer] Found ${pointsLogs.length} PointsHook event(s)!`);
        const pointsData = readJson(CAMPAIGN_POINTS_FILE, INITIAL_CAMPAIGN_POINTS);
        for (const log of pointsLogs) {
          const toAddr = log.args.to.toLowerCase();
          const tokenId = log.args.id.toString();
          const val = BigInt(log.args.value || 0);
          const found = pointsData.find(p => p.owner.toLowerCase() === toAddr && String(p.tokenId) === tokenId);
          if (found) {
            found.balance = (BigInt(found.balance || 0) + val).toString();
            found.timestamp = Math.floor(Date.now() / 1000);
          } else {
            pointsData.push({
              poolId: '0x' + log.args.id.toString(16),
              tokenId,
              owner: log.args.to,
              balance: val.toString(),
              timestamp: Math.floor(Date.now() / 1000)
            });
          }
        }
        writeJson(CAMPAIGN_POINTS_FILE, pointsData);
      }

      if (Number(toBlock) !== state.lastProcessedBlock) {
        state.lastProcessedBlock = Number(toBlock);
        state.lastSyncTimestamp = new Date().toISOString();
        writeJson(STATE_FILE, state);
      }
    }
  } catch (err) {
    console.warn('[Indexer] Polling error:', err.message);
  }
}

// HTTP Server
function startServer() {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/api/pools' && req.method === 'GET') {
      const pools = readJson(POOLS_FILE, []);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ pools }));
      return;
    }

    if (pathname === '/api/pools' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const poolData = JSON.parse(body);
          if (!poolData || !poolData.id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing pool id' }));
            return;
          }

          const pools = readJson(POOLS_FILE, []);
          const existingIdx = pools.findIndex(p => p.id.toLowerCase() === poolData.id.toLowerCase());
          
          const t0 = getTokenInfo(poolData.currency0 || poolData.token0?.id || poolData.token0?.address);
          const t1 = getTokenInfo(poolData.currency1 || poolData.token1?.id || poolData.token1?.address);
          
          const newEntry = {
            id: poolData.id,
            token0: {
              id: t0.address,
              symbol: t0.symbol,
              name: t0.name,
              decimals: t0.decimals,
              derivedUSDC: String(t0.priceUSD)
            },
            token1: {
              id: t1.address,
              symbol: t1.symbol,
              name: t1.name,
              decimals: t1.decimals,
              derivedUSDC: String(t1.priceUSD)
            },
            feeTier: String(poolData.fee || poolData.feeTier || 3000),
            tickSpacing: String(poolData.tickSpacing || 60),
            hooks: poolData.hooks || '0x0000000000000000000000000000000000000000',
            liquidity: String(poolData.liquidity || '0'),
            sqrtPrice: String(poolData.sqrtPrice || poolData.sqrtPriceX96 || '2505414483750479311864'),
            token0Price: String(t0.priceUSD / t1.priceUSD),
            token1Price: String(t1.priceUSD / t0.priceUSD),
            tick: String(poolData.tick || '-345406'),
            volumeUSD: '0.00',
            feesUSD: '0.00',
            txCount: '0',
            totalValueLockedUSD: '0.00',
            totalValueLockedToken0: '0.0',
            totalValueLockedToken1: '0.0',
            collectedFeesToken0: '0.0',
            collectedFeesToken1: '0.0',
            collectedFeesUSD: '0.00',
            poolDayData: [
              {
                date: Math.floor(Date.now() / 1000 / 86400) * 86400,
                volumeUSD: '0.00',
                feesUSD: '0.00'
              }
            ]
          };

          if (existingIdx >= 0) {
            pools[existingIdx] = { ...pools[existingIdx], ...newEntry };
          } else {
            pools.unshift(newEntry);
          }

          writeJson(POOLS_FILE, pools);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, pool: newEntry }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (pathname.startsWith('/api/pools/') && pathname.endsWith('/swaps') && req.method === 'GET') {
      const poolId = pathname.replace('/api/pools/', '').replace('/swaps', '').toLowerCase();
      const allSwaps = readJson(SWAPS_FILE, []);
      const poolSwaps = allSwaps.filter(s => (s.pool?.id || s.poolId || '').toLowerCase() === poolId);
      poolSwaps.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ swaps: poolSwaps }));
      return;
    }

    if (pathname.startsWith('/api/pools/') && req.method === 'GET') {
      const poolId = pathname.replace('/api/pools/', '').toLowerCase();
      const pools = readJson(POOLS_FILE, []);
      const pool = pools.find(p => p.id.toLowerCase() === poolId);
      if (pool) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify({ pool }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Pool not found' }));
      }
      return;
    }

    if (pathname === '/api/stats' && req.method === 'GET') {
      const stats = readJson(STATS_FILE, {});
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(stats));
      return;
    }

    if (pathname === '/api/tokens' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({
        tokens: TOKENS.map(t => ({
          id: t.address.toLowerCase(),
          address: t.address,
          name: t.name,
          symbol: t.symbol,
          decimals: t.decimals,
          logo: t.logo,
          priceUSD: t.priceUSD,
          derivedUSDC: String(t.priceUSD)
        }))
      }));
      return;
    }

    if (pathname === '/api/positions' && req.method === 'GET') {
      const targetOwner = url.searchParams.get('owner')?.toLowerCase();
      const allPositions = readJson(POSITIONS_FILE, []);
      const filtered = targetOwner
        ? allPositions.filter(p => (p.owner || '').toLowerCase() === targetOwner)
        : allPositions;
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ positions: filtered }));
      return;
    }

    if (pathname === '/api/activity' && req.method === 'GET') {
      const user = url.searchParams.get('user')?.toLowerCase();
      const type = url.searchParams.get('type') || 'All types';
      const timeRange = url.searchParams.get('timeRange') || 'All Time';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const skip = parseInt(url.searchParams.get('skip') || '0', 10);

      const allSwaps = readJson(SWAPS_FILE, []);
      const allLiq = readJson(LIQUIDITY_FILE, INITIAL_LIQUIDITY_EVENTS);

      // Map swaps to activity format
      const swapItems = allSwaps.map(s => {
        const sym0 = s.token0?.symbol || 'Token0';
        const sym1 = s.token1?.symbol || 'Token1';
        const a0 = Number(s.amount0 || 0);
        const a1 = Number(s.amount1 || 0);
        const isAmt0Neg = a0 < 0;
        const isAmt1Neg = a1 < 0;
        const typeText = `Swap ${isAmt0Neg ? `${sym0} for ${sym1}` : `${sym1} for ${sym0}`}`;
        return {
          id: s.id,
          hash: s.transaction?.id || s.id,
          timestamp: Number(s.timestamp),
          type: typeText,
          usd: Number(s.amountUSD || 0),
          token0Amount: `${isAmt0Neg ? '' : '+'}${a0.toFixed(4)} ${sym0}`,
          token1Amount: `${isAmt1Neg ? '' : '+'}${a1.toFixed(4)} ${sym1}`,
          isToken0Negative: isAmt0Neg,
          isToken1Negative: isAmt1Neg,
          sender: (s.sender || '').toLowerCase(),
          origin: (s.origin || '').toLowerCase(),
          category: 'Swaps'
        };
      });

      // Map liquidity additions/removals
      const liqItems = allLiq.map(l => ({
        ...l,
        timestamp: Number(l.timestamp),
        usd: Number(l.usd || 0),
        sender: (l.sender || '').toLowerCase(),
        origin: (l.origin || '').toLowerCase(),
        category: l.type?.includes('Remove') ? 'Remove Liquidity' : 'Added Liquidity'
      }));

      let combined = [...swapItems, ...liqItems];

      // Filter by user
      if (user) {
        combined = combined.filter(item => 
          item.sender === user || item.origin === user
        );
      }

      // Filter by type
      if (type !== 'All types') {
        combined = combined.filter(item => item.category === type);
      }

      // Filter by timeRange
      const now = Math.floor(Date.now() / 1000);
      let minTimestamp = 0;
      if (timeRange === '1h') minTimestamp = now - 3600;
      else if (timeRange === '24h') minTimestamp = now - 86400;
      else if (timeRange === '7d') minTimestamp = now - 86400 * 7;
      else if (timeRange === '30d') minTimestamp = now - 86400 * 30;

      if (minTimestamp > 0) {
        combined = combined.filter(item => item.timestamp >= minTimestamp);
      }

      // Sort descending by timestamp
      combined.sort((a, b) => b.timestamp - a.timestamp);

      const total = combined.length;
      const paginated = combined.slice(skip, skip + limit);
      const hasNext = skip + limit < total;

      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ activity: paginated, total, hasNext }));
      return;
    }

    if (pathname === '/api/users/stats' && req.method === 'GET') {
      const allSwaps = readJson(SWAPS_FILE, []);
      const allLiq = readJson(LIQUIDITY_FILE, INITIAL_LIQUIDITY_EVENTS);
      const allPositions = readJson(POSITIONS_FILE, []);

      const uniqueSet = new Set();
      const swappersSet = new Set();
      const lpSet = new Set();
      const posOwnersSet = new Set();

      allSwaps.forEach(s => {
        if (s.sender) { uniqueSet.add(s.sender.toLowerCase()); swappersSet.add(s.sender.toLowerCase()); }
        if (s.origin) { uniqueSet.add(s.origin.toLowerCase()); swappersSet.add(s.origin.toLowerCase()); }
      });

      allLiq.forEach(l => {
        if (l.sender) { uniqueSet.add(l.sender.toLowerCase()); lpSet.add(l.sender.toLowerCase()); }
        if (l.origin) { uniqueSet.add(l.origin.toLowerCase()); lpSet.add(l.origin.toLowerCase()); }
      });

      allPositions.forEach(p => {
        if (p.owner) { uniqueSet.add(p.owner.toLowerCase()); posOwnersSet.add(p.owner.toLowerCase()); }
      });

      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({
        uniqueCount: Math.max(uniqueSet.size, 1),
        swappersCount: swappersSet.size,
        lpCount: lpSet.size,
        positionOwnersCount: posOwnersSet.size,
        pointsCount: Math.max(uniqueSet.size, 1),
        addresses: Array.from(uniqueSet)
      }));
      return;
    }

    if (pathname === '/api/campaigns/leaderboard' && req.method === 'GET') {
      const poolIdParam = (url.searchParams.get('poolId') || '').toLowerCase();
      const tokenIdParam = url.searchParams.get('tokenId') || '';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const skip = parseInt(url.searchParams.get('skip') || '0', 10);

      const pointsData = readJson(CAMPAIGN_POINTS_FILE, INITIAL_CAMPAIGN_POINTS);

      let filtered = [...pointsData];
      if (poolIdParam) {
        filtered = filtered.filter(p => (p.poolId || '').toLowerCase() === poolIdParam);
      } else if (tokenIdParam) {
        filtered = filtered.filter(p => String(p.tokenId) === String(tokenIdParam));
      }

      // Sort descending by BigInt balance
      filtered.sort((a, b) => {
        try {
          const bA = BigInt(a.balance || 0);
          const bB = BigInt(b.balance || 0);
          if (bB > bA) return 1;
          if (bB < bA) return -1;
          return 0;
        } catch (_) {
          return 0;
        }
      });

      const total = filtered.length;
      const paginated = filtered.slice(skip, skip + limit);

      // Map to shape compatible with frontend
      const pointsBalances = paginated.map((item, idx) => ({
        id: `${item.owner}-${item.tokenId || item.poolId}`,
        tokenId: String(item.tokenId || item.poolId),
        poolId: item.poolId,
        owner: item.owner,
        balance: String(item.balance),
        rank: skip + idx + 1,
        transfers: [
          { timestamp: String(item.timestamp || Math.floor(Date.now() / 1000)) }
        ]
      }));

      let totalPtsRaw = 0n;
      filtered.forEach(f => {
        try { totalPtsRaw += BigInt(f.balance || 0); } catch (_) {}
      });

      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({
        pointsBalances,
        total,
        hasMore: skip + limit < total,
        totalPoints: (Number(formatUnits(totalPtsRaw, 18))).toFixed(2),
        totalParticipants: new Set(filtered.map(f => f.owner.toLowerCase())).size
      }));
      return;
    }

    if (pathname === '/api/campaigns' && req.method === 'GET') {
      let campaigns = readJson(CAMPAIGNS_FILE, null);
      if (!campaigns || campaigns.length === 0) {
        campaigns = [...INITIAL_CAMPAIGNS];
        writeJson(CAMPAIGNS_FILE, campaigns);
      }

      // Dynamically make sure any pool created with POINTSHOOK_ADDRESS is included in LitVM Points Season 1
      const pools = readJson(POOLS_FILE, []);
      const pointsPools = pools.filter(p => (p.hooks || '').toLowerCase() === POINTSHOOK_ADDRESS.toLowerCase());
      
      const s1 = campaigns.find(c => c.id === '0');
      if (s1) {
        if (!Array.isArray(s1.poolKeys)) s1.poolKeys = [];
        pointsPools.forEach(p => {
          const c0 = (p.token0?.id || p.token0?.address || p.currency0 || '').toLowerCase();
          const c1 = (p.token1?.id || p.token1?.address || p.currency1 || '').toLowerCase();
          const exists = s1.poolKeys.some(pk => 
            ((pk.currency0.toLowerCase() === c0 && pk.currency1.toLowerCase() === c1) ||
             (pk.currency0.toLowerCase() === c1 && pk.currency1.toLowerCase() === c0)) &&
            Number(pk.fee) === Number(p.feeTier || p.fee)
          );
          if (!exists && c0 && c1) {
            s1.poolKeys.push({
              currency0: p.token0?.id || p.token0?.address || p.currency0,
              currency1: p.token1?.id || p.token1?.address || p.currency1,
              fee: Number(p.feeTier || p.fee || 3000),
              tickSpacing: Number(p.tickSpacing || 60),
              hooks: POINTSHOOK_ADDRESS
            });
          }
        });
      }

      const now = Math.floor(Date.now() / 1000);
      campaigns.forEach(c => {
        if (!c.endsAt && c.createdAt) {
          c.endsAt = Number(c.createdAt) + Number(c.durationDays || 14) * 86400;
        }
        if (c.endsAt && now >= c.endsAt) {
          c.active = false;
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ campaigns }));
      return;
    }

    if (pathname === '/api/campaigns' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          if (!data.name || !data.name.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Campaign name is required' }));
            return;
          }

          let campaigns = readJson(CAMPAIGNS_FILE, null);
          if (!campaigns || campaigns.length === 0) {
            campaigns = [...INITIAL_CAMPAIGNS];
          }

          const now = Math.floor(Date.now() / 1000);
          const durationDays = Number(data.durationDays || 14);
          const endsAt = data.endsAt ? Number(data.endsAt) : (now + durationDays * 86400);

          const newId = String(Date.now());
          const newCampaign = {
            id: newId,
            name: data.name.trim(),
            tagline: data.tagline ? data.tagline.trim() : 'Community Campaign',
            description: data.description ? data.description.trim() : 'Participate in eligible trading pools to earn rewards.',
            rewardType: data.rewardType || 'ERC-1155 Tokens',
            rewardRate: data.rewardRate || '1% of Swap Volume in PTS',
            distribution: data.distribution || 'Instant On-Chain Mint',
            address: data.address || POINTSHOOK_ADDRESS,
            poolKeys: Array.isArray(data.poolKeys) ? data.poolKeys : [],
            active: true,
            createdAt: now,
            durationDays: durationDays,
            endsAt: endsAt
          };

          campaigns.push(newCampaign);
          writeJson(CAMPAIGNS_FILE, campaigns);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, campaign: newCampaign }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (pathname.startsWith('/api/campaigns/') && pathname.endsWith('/end') && req.method === 'POST') {
      const campId = pathname.replace('/api/campaigns/', '').replace('/end', '').trim();
      let campaigns = readJson(CAMPAIGNS_FILE, INITIAL_CAMPAIGNS);
      const camp = campaigns.find(c => String(c.id) === campId);
      if (camp) {
        camp.active = false;
        camp.endsAt = Math.floor(Date.now() / 1000);
        writeJson(CAMPAIGNS_FILE, campaigns);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, campaign: camp }));
        return;
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Campaign not found' }));
        return;
      }
    }

    if (pathname.startsWith('/api/campaigns/') && req.method === 'GET') {
      const campId = pathname.replace('/api/campaigns/', '').trim();
      if (campId !== 'stats' && campId !== 'leaderboard') {
        let campaigns = readJson(CAMPAIGNS_FILE, INITIAL_CAMPAIGNS);
        const camp = campaigns.find(c => String(c.id) === campId);
        if (camp) {
          const now = Math.floor(Date.now() / 1000);
          if (camp.endsAt && now >= camp.endsAt) {
            camp.active = false;
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify({ campaign: camp }));
          return;
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Campaign not found' }));
          return;
        }
      }
    }

    if (pathname === '/api/campaigns/stats' && req.method === 'GET') {
      const pointsData = readJson(CAMPAIGN_POINTS_FILE, INITIAL_CAMPAIGN_POINTS);
      const uniqueParticipants = new Set(pointsData.map(p => p.owner.toLowerCase())).size;
      let totalPtsRaw = 0n;
      pointsData.forEach(p => {
        try { totalPtsRaw += BigInt(p.balance || 0); } catch (_) {}
      });

      let campaigns = readJson(CAMPAIGNS_FILE, INITIAL_CAMPAIGNS);
      const allPoolKeys = new Set();
      campaigns.forEach(c => {
        (c.poolKeys || []).forEach(pk => {
          allPoolKeys.add(`${pk.currency0.toLowerCase()}-${pk.currency1.toLowerCase()}-${pk.fee}`);
        });
      });

      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({
        activeCampaigns: campaigns.filter(c => c.active).length,
        incentivizedPools: allPoolKeys.size,
        totalParticipants: uniqueParticipants,
        totalPointsDistributed: (Number(formatUnits(totalPtsRaw, 18))).toFixed(2),
        rewardType: 'ERC-1155 Tokens',
        hookAddress: POINTSHOOK_ADDRESS
      }));
      return;
    }

    if (pathname === '/api/swaps' && req.method === 'GET') {
      const swaps = readJson(SWAPS_FILE, []);
      swaps.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ swaps }));
      return;
    }

    if (pathname === '/api/swaps' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const txHash = data.txHash || data.hash;
          if (!txHash) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing txHash' }));
            return;
          }

          const swaps = readJson(SWAPS_FILE, []);
          const pools = readJson(POOLS_FILE, []);

          // Check if already recorded
          const existing = swaps.find(s => (s.id || '').toLowerCase() === txHash.toLowerCase() || (s.transaction?.id || '').toLowerCase() === txHash.toLowerCase());
          if (existing) {
            const curSender = (existing.sender || '').toLowerCase();
            const newSender = (data.sender || '').toLowerCase();
            if (newSender && (curSender === '0xaa01ffadbad68411a8ee6b134b3bb8e7baf078f6' || curSender === POOLMANAGER_ADDRESS.toLowerCase() || !curSender)) {
              existing.sender = data.sender;
              existing.origin = data.sender;
              writeJson(SWAPS_FILE, swaps);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, swap: existing }));
            return;
          }

          const fromToken = data.fromToken || {};
          const toToken = data.toToken || {};
          const amountIn = Number(data.amountIn || 0);
          const amountOut = Number(data.amountOut || 0);
          const sender = (data.sender || '').toLowerCase();
          const timestamp = Number(data.timestamp || Math.floor(Date.now() / 1000));

          const wltcAddr = (TOKENS.find(t => t.symbol === 'WLTC')?.address || '0x63647642133bBdF0461bcf7BF6c360e1969B1194').toLowerCase();
          const normAddr = (a) => {
            const lc = (a || '').toLowerCase();
            return (lc === '0x0000000000000000000000000000000000000000' || lc === '0' || lc === 'native') ? wltcAddr : lc;
          };

          const f0Norm = normAddr(fromToken.address);
          const f1Norm = normAddr(toToken.address);

          // Find matching pool
          let pool = pools.find(p => {
            const c0 = normAddr(p.token0?.id || p.currency0);
            const c1 = normAddr(p.token1?.id || p.currency1);
            return (c0 === f0Norm && c1 === f1Norm) || (c0 === f1Norm && c1 === f0Norm);
          });

          if (!pool && data.poolId) {
            pool = pools.find(p => p.id.toLowerCase() === data.poolId.toLowerCase());
          }

          const t0 = pool ? getTokenInfo(pool.token0.id, pool.token0.symbol) : getTokenInfo(fromToken.address, fromToken.symbol);
          const t1 = pool ? getTokenInfo(pool.token1.id, pool.token1.symbol) : getTokenInfo(toToken.address, toToken.symbol);

          const isFromToken0 = f0Norm === normAddr(t0.address);
          const amt0 = isFromToken0 ? -amountIn : amountOut;
          const amt1 = isFromToken0 ? amountOut : -amountIn;

          const p0 = Number(fromToken.priceUSD || t0.priceUSD || 1);
          const p1 = Number(toToken.priceUSD || t1.priceUSD || 1);
          let usdVal = Math.max(amountIn * (isFromToken0 ? p0 : p1), amountOut * (isFromToken0 ? p1 : p0));
          if (data.amountUSD && Number(data.amountUSD) > 0) {
            usdVal = Math.max(usdVal, Number(data.amountUSD));
          }
          if (usdVal <= 0) usdVal = Math.max(amountIn, amountOut);

          const feeRate = (Number(pool?.feeTier || data.poolFee || 3000)) / 1_000_000;
          const feeUSD = usdVal * feeRate;

          const newSwap = {
            id: txHash,
            timestamp: String(timestamp),
            sender: sender,
            origin: sender,
            pool: { id: pool ? pool.id : (data.poolId || 'unknown') },
            token0: pool ? pool.token0 : t0,
            token1: pool ? pool.token1 : t1,
            amount0: amt0.toFixed(4),
            amount1: amt1.toFixed(4),
            amountUSD: usdVal.toFixed(2),
            feeUSD: feeUSD.toFixed(4),
            sqrtPriceX96: pool?.sqrtPrice || '2505414483750479311864138015696',
            tick: pool?.tick || '69081',
            transaction: { id: txHash }
          };

          // Prepend swap so it is at the top (new to old)
          swaps.unshift(newSwap);
          writeJson(SWAPS_FILE, swaps);

          // Update pool stats
          if (pool) {
            pool.volumeUSD = (Number(pool.volumeUSD || 0) + usdVal).toFixed(2);
            pool.feesUSD = (Number(pool.feesUSD || 0) + feeUSD).toFixed(2);
            pool.txCount = String(Number(pool.txCount || 0) + 1);
            if (Array.isArray(pool.poolDayData) && pool.poolDayData.length > 0) {
              pool.poolDayData[0].volumeUSD = pool.volumeUSD;
              pool.poolDayData[0].feesUSD = pool.feesUSD;
            } else {
              pool.poolDayData = [{
                date: Math.floor(Date.now() / 1000 / 86400) * 86400,
                volumeUSD: pool.volumeUSD,
                feesUSD: pool.feesUSD
              }];
            }
            writeJson(POOLS_FILE, pools);
          }

          // Update global stats
          const stats = readJson(STATS_FILE, {});
          if (stats.poolManagers && stats.poolManagers[0]) {
            stats.poolManagers[0].txCount = String(swaps.length);
            stats.poolManagers[0].totalVolumeUSD = (Number(stats.poolManagers[0].totalVolumeUSD || 0) + usdVal).toFixed(2);
            stats.poolManagers[0].totalFeesUSD = (Number(stats.poolManagers[0].totalFeesUSD || 0) + feeUSD).toFixed(2);
          }
          const today = Math.floor(Date.now() / 1000 / 86400) * 86400;
          if (!Array.isArray(stats.uniswapDayDatas) || stats.uniswapDayDatas.length === 0) {
            stats.uniswapDayDatas = [{
              date: today,
              volumeUSD: String(usdVal.toFixed(2)),
              feesUSD: String(feeUSD.toFixed(2))
            }];
          } else {
            stats.uniswapDayDatas[0].date = today;
            stats.uniswapDayDatas[0].volumeUSD = (Number(stats.uniswapDayDatas[0].volumeUSD || 0) + usdVal).toFixed(2);
            stats.uniswapDayDatas[0].feesUSD = (Number(stats.uniswapDayDatas[0].feesUSD || 0) + feeUSD).toFixed(2);
          }
          writeJson(STATS_FILE, stats);

          // Update PointsHook if incentivized pool
          if ((pool?.hooks || data.hooks || '').toLowerCase() === POINTSHOOK_ADDRESS.toLowerCase()) {
            const pointsData = readJson(CAMPAIGN_POINTS_FILE, INITIAL_CAMPAIGN_POINTS);
            const userPts = pointsData.find(p => p.owner.toLowerCase() === sender);
            const ptsEarned = BigInt(Math.max(1, Math.floor(usdVal * 1e18 * 0.01)));
            if (userPts) {
              userPts.balance = (BigInt(userPts.balance || '0') + ptsEarned).toString();
              userPts.timestamp = timestamp;
            } else {
              pointsData.push({
                poolId: pool?.id || '0xce442263b999385bcc359995623c1e51c6c3a80369357db951b25a57d950a59e',
                tokenId: pool?.id || '0',
                owner: sender,
                balance: ptsEarned.toString(),
                timestamp: timestamp
              });
            }
            writeJson(CAMPAIGN_POINTS_FILE, pointsData);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, swap: newSwap }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if ((pathname === '/health' || pathname === '/api/indexer-health') && req.method === 'GET') {
      const state = readJson(STATE_FILE, {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'HEALTHY',
        chainId: 4441,
        ...state
      }));
      return;
    }

    if (pathname === '/api/sync' && req.method === 'POST') {
      pollRecentBlocks().then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(PORT, HOST, () => {
    console.log(`[mlSwap Backend] Fast API server listening at http://${HOST}:${PORT}`);
  });
}

// Initial sync on startup
syncBlockchain().then(() => {
  console.log('[mlSwap Backend] Storage initialized successfully.');
  startServer();
  // Poll recent blocks every 5 seconds
  setInterval(pollRecentBlocks, 5000);
  // Refresh token reserves and TVL every 60 seconds
  setInterval(syncBlockchain, 60000);
}).catch(err => {
  console.error('[mlSwap Backend] Startup failure:', err);
});
