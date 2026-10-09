import { POINTSHOOK_ADDRESS } from '../lib/constants';

// ─── Types shared between Pools pages and Campaigns pages ────────────────────

export interface HookConfig {
  address: `0x${string}`;
  name: string;
  description: string;
  rewardType: string;
}

/** Used by /pools and /pools/[id] to badge active hooks on pool rows */
export const HOOKS_DETAILS: HookConfig[] = [
  {
    address: (POINTSHOOK_ADDRESS || "0x7267CD4fF7f0e9Ba3bf1Ec8f1b8A7D14b16C4040") as `0x${string}`,
    name: "PointsHook",
    description: "Swap & Accumulate Points.\n\nEvery swap you make in this pool earns you Points equivalent to some portion of your swap volume! Points are unique to this specific pool and are minted directly to your wallet as collectible ERC1155 tokens. Use them to track your rank and unlock future reward campaigns.",
    rewardType: "ERC-1155 Tokens",
  },
];

// ─── Campaigns ───────────────────────────────────────────────────────────────

export interface PoolKey {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

/**
 * A campaign is a hook with one or more pools attached.
 * Each pool in poolKeys gets its own leaderboard section on the detail page.
 */
export interface HookCampaign extends HookConfig {
  id?: number | string;
  tagline?: string;
  rewardRate?: string;
  distribution?: string;
  active: boolean;
  poolKeys: PoolKey[];
  durationDays?: number;
  createdAt?: number;
  endsAt?: number;
  endedAt?: number;
}

/**
 * Add new campaigns here. Each element is one campaign card on /campaigns.
 * Starts on a clean slate.
 */
export const campaigns: HookCampaign[] = [];
