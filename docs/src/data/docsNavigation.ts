export interface DocItem {
  id: string;
  title: string;
  description: string;
  category: string;
}

export interface DocCategory {
  title: string;
  items: DocItem[];
}

export const DOCS_NAVIGATION: DocCategory[] = [
  {
    title: 'Getting Started',
    items: [
      {
        id: 'intro',
        title: 'Introduction',
        description: 'What is Balary DEX? Core capabilities and ecosystem overview.',
        category: 'Getting Started',
      },
      {
        id: 'architecture',
        title: 'Architecture & LitVM',
        description: 'Uniswap v4 singleton design, transient storage, and LitVM rollups.',
        category: 'Getting Started',
      },
      {
        id: 'quickstart',
        title: 'Quickstart Guide',
        description: 'How to connect, claim testnet tokens, and execute your first swap.',
        category: 'Getting Started',
      },
    ],
  },
  {
    title: 'Trading & Swaps',
    items: [
      {
        id: 'swaps',
        title: 'Executing Swaps',
        description: 'AMM mechanics, exact-in vs exact-out, and Universal Router execution.',
        category: 'Trading & Swaps',
      },
      {
        id: 'slippage',
        title: 'Slippage & Routing',
        description: 'Protecting against frontrunning, price impact, and custom tolerances.',
        category: 'Trading & Swaps',
      },
    ],
  },
  {
    title: 'Liquidity Pools',
    items: [
      {
        id: 'concentrated-liquidity',
        title: 'Concentrated Liquidity',
        description: 'Tick ranges, capital efficiency, and earning swap fees.',
        category: 'Liquidity Pools',
      },
      {
        id: 'fee-tiers',
        title: 'Fee Tiers & Tick Spacing',
        description: '0.05%, 0.30%, and 1.00% fee tiers with corresponding tick intervals.',
        category: 'Liquidity Pools',
      },
      {
        id: 'position-manager',
        title: 'Position NFT Manager',
        description: 'ERC-721 positions, modifying liquidity, and collecting fees.',
        category: 'Liquidity Pools',
      },
    ],
  },
  {
    title: 'Hooks & Campaigns',
    items: [
      {
        id: 'hooks-overview',
        title: 'Uniswap v4 Hooks',
        description: 'Custom pool callbacks and the hook permission flags system.',
        category: 'Hooks & Campaigns',
      },
      {
        id: 'points-hook',
        title: 'PointsHook & Loyalty',
        description: 'ERC-1155 tokenized points, campaign lifecycles, and caps.',
        category: 'Hooks & Campaigns',
      },
      {
        id: 'campaigns',
        title: 'Campaign Leaderboard',
        description: 'Points calculation, active campaigns, and prize distributions.',
        category: 'Hooks & Campaigns',
      },
    ],
  },
  {
    title: 'Ecosystem & Faucet',
    items: [
      {
        id: 'faucet',
        title: 'MultiToken Faucet',
        description: 'Claiming testnet zkLTC, BAL, USDC, WLTC, SOFT, and MONKE tokens.',
        category: 'Ecosystem & Faucet',
      },
      {
        id: 'tokens',
        title: 'Official Token Specs',
        description: 'Decimals, symbols, and tokenomics across Balary ecosystem assets.',
        category: 'Ecosystem & Faucet',
      },
    ],
  },
  {
    title: 'Developers & Contracts',
    items: [
      {
        id: 'deployments',
        title: 'Contract Deployments',
        description: 'Verified smart contract addresses on LitVM LiteForge (Chain ID 4441).',
        category: 'Developers & Contracts',
      },
      {
        id: 'integrations',
        title: 'Smart Contract Integrations',
        description: 'Code examples in Solidity and ethers/viem for calling Balary contracts.',
        category: 'Developers & Contracts',
      },
      {
        id: 'security',
        title: 'Security & Audits',
        description: 'Defensive architecture, audited patches, and non-custodial invariants.',
        category: 'Developers & Contracts',
      },
    ],
  },
];
