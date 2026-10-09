import React from 'react';
import { ShieldCheck, Zap, Sparkles, Layers } from 'lucide-react';

export interface DocArticle {
  title: string;
  category: string;
  description: string;
  content: React.ReactNode;
}

export const DOCS_ARTICLES: Record<string, DocArticle> = {
  intro: {
    title: 'Introduction to Balary DEX',
    category: 'Getting Started',
    description: 'Next-generation automated market maker & concentrated liquidity protocol on LitVM.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          <strong>Balary</strong> is a gamified, concentrated-liquidity decentralized exchange built on <strong>Uniswap v4</strong> architecture and deployed on the high-performance <strong>LitVM LiteForge</strong> execution environment (Chain ID <code>4441</code>).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/5 border border-white/10 mb-3">
              <Zap size={16} className="text-amber-400" />
            </div>
            <h4 className="font-display font-semibold text-white text-[15px] mb-1">Sub-Second Execution</h4>
            <p className="text-[13px] text-ash leading-relaxed">
              LitVM rollup ensures near-instant transaction settlement with low gas fees paid in native zkLTC.
            </p>
          </div>

          <div className="rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/5 border border-white/10 mb-3">
              <Layers size={16} className="text-emerald-400" />
            </div>
            <h4 className="font-display font-semibold text-white text-[15px] mb-1">Singleton V4 Core</h4>
            <p className="text-[13px] text-ash leading-relaxed">
              All pools live in a single <code>PoolManager</code> contract with Flash Accounting, slashing multi-hop gas costs by up to 99%.
            </p>
          </div>

          <div className="rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/5 border border-white/10 mb-3">
              <Sparkles size={16} className="text-purple-400" />
            </div>
            <h4 className="font-display font-semibold text-white text-[15px] mb-1">Gamified Hooks</h4>
            <p className="text-[13px] text-ash leading-relaxed">
              Smart contract hooks like <code>PointsHook</code> mint on-chain ERC-1155 points on swaps to power leaderboards and incentive campaigns.
            </p>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white pt-4">Core Pillars</h3>
        <ul className="list-disc list-inside space-y-2 text-[14px] text-bone/80 pl-2">
          <li><strong>Concentrated Liquidity</strong>: Custom tick ranges for LPs to maximize capital efficiency and fee capture.</li>
          <li><strong>Dynamic Universal Routing</strong>: Seamless multi-hop trades, Permit2 allowance management, and unified execution.</li>
          <li><strong>Non-Custodial Security</strong>: Fully decentralized smart contract operations with audited access boundaries.</li>
        </ul>
      </div>
    ),
  },

  architecture: {
    title: 'Architecture & LitVM Rollup',
    category: 'Getting Started',
    description: 'Deep dive into Uniswap v4 Singleton design, Flash Accounting, and LitVM network primitives.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          Balary represents a generational leap in DEX architecture by moving away from Uniswap v2/v3 factory-and-pair models to the <strong>Uniswap v4 Singleton pattern</strong>.
        </p>

        <h3 className="text-lg font-bold text-white">The Singleton Architecture</h3>
        <p className="text-[14px] leading-relaxed text-ash">
          In Uniswap v2 and v3, each token pair is deployed as an individual contract. In Balary, all pools reside inside a single contract: <code>PoolManager.sol</code>. This eliminates the gas cost of deploying contracts for new pools and drastically reduces cross-pool token transfers.
        </p>

        <div className="rounded-[8px] border border-[color:var(--border-subtle)] bg-[#151515] p-4 font-mono text-[12px] space-y-2">
          <div className="text-ash">// Network Parameters</div>
          <div>Network: <span className="text-emerald-400">LitVM LiteForge Testnet</span></div>
          <div>Chain ID: <span className="text-white">4441</span></div>
          <div>Native Currency: <span className="text-amber-400">zkLTC (18 decimals)</span></div>
          <div>RPC Endpoint: <span className="text-white">https://liteforge.rpc.caldera.xyz/http</span></div>
          <div>Block Explorer: <span className="text-white">https://liteforge.explorer.caldera.xyz</span></div>
        </div>

        <h3 className="text-lg font-bold text-white pt-2">Flash Accounting & Transient Storage</h3>
        <p className="text-[14px] leading-relaxed text-ash">
          Balary uses <em>Flash Accounting</em> (EIP-1153 transient storage). Instead of transferring tokens into and out of pools on every intermediate step of a trade, the <code>PoolManager</code> tracks net balance deltas in transient storage. Tokens are only transferred at the very beginning and end of the transaction.
        </p>
      </div>
    ),
  },

  quickstart: {
    title: 'Quickstart Guide',
    category: 'Getting Started',
    description: 'Get started in under 2 minutes: connect your wallet, get faucet tokens, and make your first swap.',
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex gap-4 p-4 rounded-[8px] border border-[color:var(--border-default)] bg-[#121212]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white font-mono text-xs shrink-0">1</div>
            <div>
              <h4 className="font-semibold text-white text-[15px]">Add LitVM LiteForge to Your Wallet</h4>
              <p className="text-[13px] text-ash mt-1">
                Configure your Web3 wallet (MetaMask, Rabby, Rainbow) with Chain ID <code>4441</code> and RPC <code>https://liteforge.rpc.caldera.xyz/http</code>.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-[8px] border border-[color:var(--border-default)] bg-[#121212]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white font-mono text-xs shrink-0">2</div>
            <div>
              <h4 className="font-semibold text-white text-[15px]">Claim Free Testnet Tokens from the Faucet</h4>
              <p className="text-[13px] text-ash mt-1">
                Head to the <strong>Faucet</strong> tab in the Balary app. Click "Claim Faucet" to receive 500 BAL, 500 USDC, 500 WLTC, 500 SOFT, and 500 MONKE.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-[8px] border border-[color:var(--border-default)] bg-[#121212]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white font-mono text-xs shrink-0">3</div>
            <div>
              <h4 className="font-semibold text-white text-[15px]">Execute Your First Swap</h4>
              <p className="text-[13px] text-ash mt-1">
                Go to the <strong>Trade</strong> tab. Select your tokens (e.g., WLTC to USDC), enter an amount, approve Permit2 if prompted, and click "Swap".
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  swaps: {
    title: 'Executing Swaps & Routing',
    category: 'Trading & Swaps',
    description: 'Understanding swap execution, Universal Router batching, and pricing mathematics.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          All swaps on Balary are executed via the <code>UniversalRouter</code> contract, which leverages <code>Permit2</code> for gasless allowance signatures and atomic token settlements.
        </p>

        <h3 className="text-lg font-bold text-white">Swap Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-[8px] border border-[color:var(--border-default)] bg-[#121212]">
            <h4 className="font-semibold text-white text-[14px]">Exact Input (<code>SWAP_EXACT_IN_SINGLE</code>)</h4>
            <p className="text-[13px] text-ash mt-1">
              You specify the exact amount of input tokens to spend. The contract computes the maximum output received based on the pool tick state.
            </p>
          </div>
          <div className="p-4 rounded-[8px] border border-[color:var(--border-default)] bg-[#121212]">
            <h4 className="font-semibold text-white text-[14px]">Exact Output (<code>SWAP_EXACT_OUT_SINGLE</code>)</h4>
            <p className="text-[13px] text-ash mt-1">
              You specify the exact amount of output tokens you want to receive. The router calculates the required input amount plus maximum slippage.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  slippage: {
    title: 'Slippage Protection & Tolerances',
    category: 'Trading & Swaps',
    description: 'Configure maximum slippage limits to protect against MEV and market volatility.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          Slippage represents the difference between the expected price of a trade and the executed price when the transaction is mined on-chain.
        </p>
        <div className="p-4 rounded-[8px] border border-amber-500/20 bg-amber-500/5 text-[13px] text-amber-200/90 leading-relaxed">
          <strong>Tip</strong>: For high-liquidity pools (such as WLTC/USDC), a slippage tolerance of <strong>0.5%</strong> is standard. For volatile or low-liquidity pairs, <strong>1.0%</strong> prevents unexpected reverts due to tick movements.
        </div>
      </div>
    ),
  },

  'concentrated-liquidity': {
    title: 'Concentrated Liquidity Pools',
    category: 'Liquidity Pools',
    description: 'Allocate liquidity within specific price intervals to multiply fee revenue.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          Unlike Uniswap v2 where liquidity is spread uniformly from price 0 to infinity, Balary concentrated liquidity allows liquidity providers (LPs) to allocate capital within discrete price ticks [P_lower, P_upper].
        </p>
        <h3 className="text-lg font-bold text-white">Benefits of Concentration</h3>
        <ul className="list-disc list-inside space-y-2 text-[14px] text-ash pl-2">
          <li><strong>Higher Capital Efficiency</strong>: Up to 4000x greater capital utilization compared to standard v2 pools.</li>
          <li><strong>Maximized Fee Returns</strong>: 100% of your liquidity earns fees whenever the current market price trades within your selected range.</li>
          <li><strong>Active vs Inactive States</strong>: If price moves outside your specified tick range, your position automatically converts to the single asset and ceases earning fees until price re-enters the interval.</li>
        </ul>
      </div>
    ),
  },

  'fee-tiers': {
    title: 'Fee Tiers & Tick Spacing',
    category: 'Liquidity Pools',
    description: 'Understanding pool fee tiers and corresponding tick interval spacings.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          Every pool in Balary is initialized with a specific fee tier and tick spacing:
        </p>
        <div className="overflow-x-auto rounded-[8px] border border-[color:var(--border-default)]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#151515] text-ash uppercase font-mono text-[11px] border-b border-white/5">
              <tr>
                <th className="p-3">Fee Tier</th>
                <th className="p-3">Percentage</th>
                <th className="p-3">Tick Spacing</th>
                <th className="p-3">Ideal Asset Pairs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#121212]">
              <tr>
                <td className="p-3 font-mono text-white">500</td>
                <td className="p-3 font-mono text-emerald-400">0.05%</td>
                <td className="p-3 font-mono">10</td>
                <td className="p-3 text-bone/80">Correlated / Stablecoin pairs (e.g. USDC/USDT)</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-white">3000</td>
                <td className="p-3 font-mono text-amber-400">0.30%</td>
                <td className="p-3 font-mono">60</td>
                <td className="p-3 text-bone/80">Standard asset pairs (e.g. WLTC/USDC, BAL/USDC)</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-white">10000</td>
                <td className="p-3 font-mono text-purple-400">1.00%</td>
                <td className="p-3 font-mono">200</td>
                <td className="p-3 text-bone/80">Exotic or highly volatile pairs (e.g. MONKE/SOFT)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },

  'position-manager': {
    title: 'Position NFT Manager',
    category: 'Liquidity Pools',
    description: 'Managing liquidity positions as ERC-721 NFTs with PositionManager.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          Liquidity positions on Balary are minted as unique ERC-721 non-fungible tokens managed by the <code>PositionManager</code> contract.
        </p>
        <p className="text-[14px] leading-relaxed text-ash">
          Each NFT represents:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[14px] text-bone/80 pl-2">
          <li>Pool identification (token0, token1, fee, tickSpacing, hooks)</li>
          <li>Tick boundaries (<code>tickLower</code> and <code>tickUpper</code>)</li>
          <li>Position liquidity share</li>
          <li>Uncollected fee balances</li>
        </ul>
      </div>
    ),
  },

  'hooks-overview': {
    title: 'Uniswap v4 Hooks Architecture',
    category: 'Hooks & Campaigns',
    description: 'How hooks extend pool functionality with custom callbacks throughout the pool lifecycle.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          Hooks are external contracts that execute custom code at specific lifecycle stages of a pool operation:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px] text-ash">
          <div className="p-2.5 rounded border border-white/5 bg-[#121212]">beforeInitialize</div>
          <div className="p-2.5 rounded border border-white/5 bg-[#121212]">afterInitialize</div>
          <div className="p-2.5 rounded border border-white/5 bg-[#121212]">beforeSwap</div>
          <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-500/5 text-emerald-400">afterSwap (Active)</div>
          <div className="p-2.5 rounded border border-white/5 bg-[#121212]">beforeAddLiquidity</div>
          <div className="p-2.5 rounded border border-white/5 bg-[#121212]">afterAddLiquidity</div>
          <div className="p-2.5 rounded border border-white/5 bg-[#121212]">beforeDonate</div>
          <div className="p-2.5 rounded border border-white/5 bg-[#121212]">afterDonate</div>
        </div>
      </div>
    ),
  },

  'points-hook': {
    title: 'PointsHook & Loyalty Rewards',
    category: 'Hooks & Campaigns',
    description: 'Tokenized ERC-1155 points system with campaign caps and lifecycle management.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          The <code>PointsHook.sol</code> contract intercepts the <code>afterSwap</code> callback to calculate and mint ERC-1155 points to traders:
        </p>
        <div className="rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] p-4 space-y-3">
          <h4 className="font-semibold text-white text-[14px]">Security & Anti-Abuse Rules:</h4>
          <ul className="list-disc list-inside space-y-2 text-[13px] text-ash pl-2">
            <li><strong>Length-Guarded Calldata</strong>: Validates <code>hookData.length &gt;= 32</code> to prevent third-party router reverts.</li>
            <li><strong>Input Delta Only</strong>: Measures only the net input token value (<code>inputDelta / 100</code>) to prevent double counting.</li>
            <li><strong>Per-Swap Cap</strong>: Admin-configurable <code>maxPointsPerSwap</code> ceiling prevents flash loan point draining.</li>
            <li><strong>Expiration Control</strong>: On-chain <code>endTime</code> stops point minting once campaigns conclude.</li>
          </ul>
        </div>
      </div>
    ),
  },

  campaigns: {
    title: 'Incentive Campaigns & Leaderboard',
    category: 'Hooks & Campaigns',
    description: 'Compete on trading leaderboards, track rankings, and claim loyalty rewards.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          Balary campaigns distribute rewards based on on-chain point accumulation. Each incentive pool has its own distinct token ID in the <code>PointsHook</code> ERC-1155 contract.
        </p>
        <p className="text-[14px] leading-relaxed text-ash">
          The leaderboard updates in real-time by indexing swap transactions and listening to on-chain <code>PointsAwarded</code> events.
        </p>
      </div>
    ),
  },

  faucet: {
    title: 'MultiToken Faucet Guide',
    category: 'Ecosystem & Faucet',
    description: 'How to claim testnet tokens with MultiTokenFaucet and manage cooldown intervals.',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          The <code>MultiTokenFaucet.sol</code> contract provides a single-click mechanism to claim all 5 core testnet tokens at once:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono text-ash block">Token</span>
            <span className="font-bold text-white text-base">500 BAL</span>
          </div>
          <div className="p-3 rounded border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono text-ash block">Token</span>
            <span className="font-bold text-white text-base">500 USDC</span>
          </div>
          <div className="p-3 rounded border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono text-ash block">Token</span>
            <span className="font-bold text-white text-base">500 WLTC</span>
          </div>
          <div className="p-3 rounded border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono text-ash block">Token</span>
            <span className="font-bold text-white text-base">500 SOFT</span>
          </div>
          <div className="p-3 rounded border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono text-ash block">Token</span>
            <span className="font-bold text-white text-base">500 MONKE</span>
          </div>
          <div className="p-3 rounded border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono text-ash block">Cooldown</span>
            <span className="font-bold text-emerald-400 text-base">3 Minutes</span>
          </div>
        </div>
      </div>
    ),
  },

  tokens: {
    title: 'Official Token Specifications',
    category: 'Ecosystem & Faucet',
    description: 'Technical specifications, decimals, and supply parameters of all tokens.',
    content: (
      <div className="space-y-6">
        <div className="overflow-x-auto rounded-[8px] border border-[color:var(--border-default)]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#151515] text-ash uppercase font-mono text-[11px] border-b border-white/5">
              <tr>
                <th className="p-3">Symbol</th>
                <th className="p-3">Name</th>
                <th className="p-3">Decimals</th>
                <th className="p-3">Max Supply</th>
                <th className="p-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#121212]">
              <tr>
                <td className="p-3 font-mono font-bold text-white">BAL</td>
                <td className="p-3 text-bone/90">Balary</td>
                <td className="p-3 font-mono">18</td>
                <td className="p-3 font-mono text-ash">10,000,000,000</td>
                <td className="p-3 text-emerald-400">Governance & Ecosystem Token</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-white">USDC</td>
                <td className="p-3 text-bone/90">USD Coin</td>
                <td className="p-3 font-mono">6</td>
                <td className="p-3 font-mono text-ash">10,000,000,000</td>
                <td className="p-3 text-amber-400">Settlement Stablecoin</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-white">WLTC</td>
                <td className="p-3 text-bone/90">Wrapped Litecoin</td>
                <td className="p-3 font-mono">18</td>
                <td className="p-3 font-mono text-ash">10,000,000,000</td>
                <td className="p-3 text-purple-400">Primary Base Asset</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-white">SOFT</td>
                <td className="p-3 text-bone/90">SoftDAO</td>
                <td className="p-3 font-mono">18</td>
                <td className="p-3 font-mono text-ash">10,000,000,000</td>
                <td className="p-3 text-blue-400">DeFi Ecosystem Token</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-white">MONKE</td>
                <td className="p-3 text-bone/90">MONKE</td>
                <td className="p-3 font-mono">18</td>
                <td className="p-3 font-mono text-ash">10,000,000,000</td>
                <td className="p-3 text-pink-400">Community Meme Asset</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },

  deployments: {
    title: 'Smart Contract Deployments',
    category: 'Developers & Contracts',
    description: 'Verified smart contract addresses on LitVM LiteForge (Chain ID 4441).',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-bone/90">
          The official Balary smart contract suite on LitVM LiteForge Testnet:
        </p>
        <div className="space-y-2.5 font-mono text-[12px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">PoolManager (v4 Core)</span>
            <span className="text-white break-all">0xA46Fb600d828E3D6aA91581Ca4D4956E9D5c7aba</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">UniversalRouter</span>
            <span className="text-white break-all">0xaA01FFaDBad68411a8eE6b134B3BB8E7BAf078F6</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">PositionManager</span>
            <span className="text-white break-all">0x47c05770001aa727dFB5717D5bFD9dDd624387A9</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">StateView</span>
            <span className="text-white break-all">0xc7d465387134B649aF813b7Ab447F54e532ae794</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">V4Quoter</span>
            <span className="text-white break-all">0xdCb8e637cFef33c308A756aDf40b944F943db99E</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">Permit2</span>
            <span className="text-white break-all">0x8F17F13156511B368115125F327FfA7335778746</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">MultiTokenFaucet</span>
            <span className="text-white break-all">0x62e6E1d8e42F804C2691A5CA4e670d9c13d8f261</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">PointsHook</span>
            <span className="text-white break-all">0x7267CD4fF7f0e9Ba3bf1Ec8f1b8A7D14b16C4040</span>
          </div>
        </div>

        <h3 className="text-base font-bold text-white mt-6 mb-2">Verified Balary Tokens</h3>
        <div className="space-y-2.5 font-mono text-[12px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">BAL (Balary)</span>
            <span className="text-white break-all">0xa0Cf27f53636529c227845ce16b49AB759dD8cd0</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">USDC (USD Coin)</span>
            <span className="text-white break-all">0xD88cA23473DF0fAf9FCDE8d6880f4c8b88df69A5</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">WLTC (Wrapped LTC)</span>
            <span className="text-white break-all">0x63647642133bBdF0461bcf7BF6c360e1969B1194</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">SOFT (SoftDAO)</span>
            <span className="text-white break-all">0x6841fdF52E3398DC43cDb042292B0ECb53FA8737</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] border border-white/5 bg-[#121212] gap-1">
            <span className="text-ash font-sans">MONKE</span>
            <span className="text-white break-all">0xA9a29BA9C693Fe87Bb929322DD96728E61f6a1ed</span>
          </div>
        </div>
      </div>
    ),
  },

  integrations: {
    title: 'Smart Contract Integrations',
    category: 'Developers & Contracts',
    description: 'Code examples for interacting with Balary contracts via Solidity and JavaScript/TypeScript.',
    content: (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white">Calling Swaps via UniversalRouter (Solidity)</h3>
        <pre className="p-4 rounded-[8px] border border-[color:var(--border-subtle)] bg-[#121212] text-[12px] font-mono text-bone/90 overflow-x-auto leading-relaxed">
{`// 1. Approve Permit2 to spend tokens
IERC20(tokenIn).approve(PERMIT2_ADDRESS, amountIn);

// 2. Authorize UniversalRouter via Permit2
IPermit2(PERMIT2_ADDRESS).approve(
    tokenIn,
    UNIVERSAL_ROUTER,
    amountIn,
    uint48(block.timestamp + 1 hours)
);

// 3. Execute V4 Swap Command
bytes memory commands = abi.encodePacked(uint8(Commands.V4_SWAP));
bytes memory actions = abi.encodePacked(
    uint8(Actions.SWAP_EXACT_IN_SINGLE),
    uint8(Actions.SETTLE_ALL),
    uint8(Actions.TAKE_ALL)
);
router.execute(commands, inputs, block.timestamp + 60);`}
        </pre>
      </div>
    ),
  },

  security: {
    title: 'Security Architecture & Audited Fixes',
    category: 'Developers & Contracts',
    description: 'Security protections, verified contract invariants, and non-custodial principles.',
    content: (
      <div className="space-y-6">
        <div className="p-4 rounded-[8px] border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[13px] text-emerald-200/90 leading-relaxed">
            All Balary smart contracts adhere to strict non-custodial standards. User funds can never be locked, paused, or withdrawn by any protocol administrator.
          </div>
        </div>

        <h3 className="text-lg font-bold text-white">Audited Vulnerabilities & Remediations:</h3>
        <div className="space-y-3">
          <div className="p-3.5 rounded-[8px] border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
              [Patched] HookData Guard & Length Validation
            </span>
            <p className="text-[13px] text-ash">
              Enforced strict <code>hookData.length &gt;= 32</code> validation in <code>PointsHook.sol</code>, preventing decode reverts and Denial of Service across third-party aggregators.
            </p>
          </div>

          <div className="p-3.5 rounded-[8px] border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
              [Patched] Per-Swap Points Ceiling
            </span>
            <p className="text-[13px] text-ash">
              Integrated an on-chain <code>maxPointsPerSwap</code> cap to mitigate wash-trading and flash loan reward draining.
            </p>
          </div>

          <div className="p-3.5 rounded-[8px] border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
              [Patched] MockERC20 Minter Access Control
            </span>
            <p className="text-[13px] text-ash">
              Removed the contradictory <code>totalSupply() == 0</code> mint block, added OpenZeppelin <code>Ownable</code>, and created a role-based <code>setMinter</code> mechanism.
            </p>
          </div>

          <div className="p-3.5 rounded-[8px] border border-white/5 bg-[#121212]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
              [Patched] MultiTokenFaucet SafeERC20 & Token Removal
            </span>
            <p className="text-[13px] text-ash">
              Adopted <code>SafeERC20.safeTransfer</code> and added <code>removeToken()</code> to prevent single-token failures from breaking global claims.
            </p>
          </div>
        </div>
      </div>
    ),
  },
};
