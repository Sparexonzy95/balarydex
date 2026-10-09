import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { fetchSubgraph, GET_POSITIONS_BY_OWNER } from '@/lib/queries';
import { POSITION_MANAGER_ADDRESS, API_BASE_URL } from '@/lib/constants';
import { tickToPrice } from '@/utils/liquidityMath/liquidityAmounts';
import { TOKENS } from '@/config/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubgraphPosition {
  id: string;
  tokenId: string;
  owner: string;
  origin: string;
  createdAtTimestamp: string;
}

interface PoolKey {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

/** Unpacked from PositionInfo uint256 */
function unpackPositionInfo(info: bigint): { tickLower: number; tickUpper: number; hasSubscriber: boolean } {
  const tickLowerRaw = (info >> 8n) & 0xffffffn;
  const tickUpperRaw = (info >> 32n) & 0xffffffn;

  const signExtend24 = (v: bigint): number =>
    (v & 0x800000n) !== 0n ? Number(v - 0x1000000n) : Number(v);

  return {
    hasSubscriber: (info & 1n) === 1n,
    tickLower: signExtend24(tickLowerRaw),
    tickUpper: signExtend24(tickUpperRaw),
  };
}

/** Lookup token metadata (name, symbol, decimals, logo) from our config, or fall back to address */
function resolveToken(address: string) {
  const lc = address.toLowerCase();
  return (
    TOKENS.find((t) => t.address.toLowerCase() === lc) ?? {
      address: address as `0x${string}`,
      symbol: `${address.slice(0, 6)}…`,
      name: 'Unknown',
      decimals: 18,
      logo: '',
    }
  );
}

export interface UserPosition {
  tokenId: string;
  subgraphId: string;
  createdAtTimestamp: number;

  // Pool info
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;           // raw fee e.g. 3000
  feePct: string;        // human "0.3%"
  tickSpacing: number;
  hooks: `0x${string}`;

  // Ticks + prices
  tickLower: number;
  tickUpper: number;
  priceLower: number;    // token1 per token0 at tickLower
  priceUpper: number;    // token1 per token0 at tickUpper

  // Token metadata resolved from config
  token0: ReturnType<typeof resolveToken>;
  token1: ReturnType<typeof resolveToken>;
}

// ─── ABI snippet ──────────────────────────────────────────────────────────────

const GET_POOL_AND_POSITION_INFO_ABI = [
  {
    type: 'function',
    name: 'getPoolAndPositionInfo',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: 'poolKey',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      { name: 'info', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUserPositions() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress || !publicClient) {
      setPositions([]);
      return;
    }

    let cancelled = false;

    const fetchPositions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Try fast backend indexer API first
        try {
          const res = await fetch(`${API_BASE_URL}/api/positions?owner=${userAddress.toLowerCase()}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.positions && Array.isArray(data.positions)) {
              if (cancelled) return;
              const formatted: UserPosition[] = data.positions.map((p: any) => ({
                tokenId: String(p.tokenId),
                subgraphId: String(p.tokenId),
                createdAtTimestamp: Number(p.createdAtTimestamp || Date.now() / 1000),
                currency0: p.currency0 as `0x${string}`,
                currency1: p.currency1 as `0x${string}`,
                fee: Number(p.fee),
                feePct: p.feePct || `${(Number(p.fee) / 10000).toFixed(2)}%`,
                tickSpacing: Number(p.tickSpacing || 60),
                hooks: p.hooks as `0x${string}`,
                tickLower: Number(p.tickLower),
                tickUpper: Number(p.tickUpper),
                priceLower: Number(p.priceLower || 0),
                priceUpper: Number(p.priceUpper || 0),
                token0: resolveToken(p.currency0),
                token1: resolveToken(p.currency1),
              }));
              formatted.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
              setPositions(formatted);
              setIsLoading(false);
              return;
            }
          }
        } catch (_) {}

        // 2. Direct on-chain fallback: read PositionManager
        const pmAbi = [
          { type: 'function', name: 'nextTokenId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
          { type: 'function', name: 'ownerOf', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view' },
          GET_POOL_AND_POSITION_INFO_ABI[0]
        ] as const;

        const nextId = await publicClient.readContract({
          address: POSITION_MANAGER_ADDRESS as `0x${string}`,
          abi: pmAbi,
          functionName: 'nextTokenId',
        }).catch(() => 0n);

        const onChainPositions: UserPosition[] = [];
        const count = Number(nextId);

        for (let id = 1; id < count; id++) {
          try {
            const owner = await publicClient.readContract({
              address: POSITION_MANAGER_ADDRESS as `0x${string}`,
              abi: pmAbi,
              functionName: 'ownerOf',
              args: [BigInt(id)],
            });

            if (owner.toLowerCase() === userAddress.toLowerCase()) {
              const [poolKey, info] = (await publicClient.readContract({
                address: POSITION_MANAGER_ADDRESS as `0x${string}`,
                abi: GET_POOL_AND_POSITION_INFO_ABI,
                functionName: 'getPoolAndPositionInfo',
                args: [BigInt(id)],
              })) as [PoolKey, bigint];

              const { tickLower, tickUpper } = unpackPositionInfo(info);
              const token0 = resolveToken(poolKey.currency0);
              const token1 = resolveToken(poolKey.currency1);
              const priceLower = tickToPrice(tickLower, token0.decimals, token1.decimals);
              const priceUpper = tickToPrice(tickUpper, token0.decimals, token1.decimals);
              const feePct = `${(poolKey.fee / 10000).toFixed(poolKey.fee % 10000 === 0 ? 0 : 2)}%`;

              onChainPositions.push({
                tokenId: String(id),
                subgraphId: String(id),
                createdAtTimestamp: Math.floor(Date.now() / 1000) - (count - id) * 1000,
                currency0: poolKey.currency0,
                currency1: poolKey.currency1,
                fee: poolKey.fee,
                feePct,
                tickSpacing: poolKey.tickSpacing,
                hooks: poolKey.hooks,
                tickLower,
                tickUpper,
                priceLower,
                priceUpper,
                token0,
                token1,
              });
            }
          } catch (_) {}
        }

        if (cancelled) return;
        onChainPositions.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
        setPositions(onChainPositions);
      } catch (e: any) {
        console.error('useUserPositions error:', e);
        setError(e?.message ?? 'Failed to load positions');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchPositions();
    return () => { cancelled = true; };
  }, [userAddress, publicClient]);

  return { positions, isLoading, error };
}
