import { useAccount, usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';
import { TOKENS, type TokenConfig } from '@/config/tokens';
import { formatUnits } from 'viem';
import { fetchSubgraph, GET_TOKEN_PRICES_BY_IDS } from '@/lib/queries';
import { API_BASE_URL } from '@/lib/constants';

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export interface TokenBalance {
  token: TokenConfig;
  raw: bigint;
  formatted: string;        // human-readable amount, e.g. "1,234.56"
  usdPrice: number | null;  // null if no pool / not in subgraph
  usdValue: number | null;  // null if price unavailable
}

interface SubgraphTokenPrice {
  id: string;      // lowercased address
  symbol: string;
  derivedUSDC: string;
}

function formatTokenAmount(raw: bigint, decimals: number): string {
  if (raw === 0n) return '0';
  const float = parseFloat(formatUnits(raw, decimals));
  if (float === 0) return '0';
  if (float < 0.0001) return '<0.0001';
  if (float < 1) return float.toFixed(4);
  if (float < 1000) return float.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return float.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function useTokenBalances() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalUsdValue, setTotalUsdValue] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refetch = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    if (!userAddress || !publicClient) {
      setBalances([]);
      setTotalUsdValue(0);
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch on-chain balances for all tokens in parallel
        const rawBalances = await Promise.all(
          TOKENS.map(async (token) => {
            try {
              const raw = await publicClient.readContract({
                address: token.address,
                abi: ERC20_BALANCE_ABI,
                functionName: 'balanceOf',
                args: [userAddress],
              });
              return { token, raw };
            } catch {
              return { token, raw: 0n };
            }
          })
        );

        // 2. Fetch token prices from backend indexer API (with instant defaults)
        let priceMap = new Map<string, number>();

        // Default prices for our DEX tokens on LitVM
        const DEFAULT_PRICES: Record<string, number> = {
          '0x13206907a6bc3fff71700764f11ad6c303958a7c': 100.0,  // WLTC
          '0x82b22b6fc22522f7106ca59905e465fecec700e0': 1.0,    // USDC
          '0x7a527f1b72fabb717b2d3693854e270ba1798d04': 0.10,   // BAL
          '0x3854db1bdabcb694afc1c0f8d31406ead44b99c3': 0.10,   // SOFT
          '0xa796c1870203e86d35709cc4937ecb788dc7cf24': 0.001,  // MONKE
        };
        Object.entries(DEFAULT_PRICES).forEach(([addr, p]) => priceMap.set(addr, p));

        try {
          const res = await fetch(`${API_BASE_URL}/api/tokens`);
          if (res.ok) {
            const data = await res.json();
            if (data?.tokens) {
              for (const t of data.tokens) {
                const p = parseFloat(t.derivedUSDC || t.priceUSD);
                if (!isNaN(p) && p > 0) {
                  priceMap.set(t.id?.toLowerCase() || t.address?.toLowerCase(), p);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Using default token prices:', e);
        }

        if (cancelled) return;

        // 3. Combine balances + prices
        let total = 0;
        const combined: TokenBalance[] = rawBalances.map(({ token, raw }) => {
          const formatted = formatTokenAmount(raw, token.decimals);
          const usdPrice = priceMap.get(token.address.toLowerCase()) ?? null;
          let usdValue: number | null = null;

          if (usdPrice !== null && raw > 0n) {
            const floatBalance = parseFloat(formatUnits(raw, token.decimals));
            usdValue = floatBalance * usdPrice;
            total += usdValue;
          }

          return { token, raw, formatted, usdPrice, usdValue };
        });

        setBalances(combined);
        setTotalUsdValue(total);
      } catch (e) {
        console.error('useTokenBalances error:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [userAddress, publicClient, refreshTrigger]);

  return { balances, isLoading, totalUsdValue, refetch };
}
