import { useState, useEffect } from 'react';
import { ExternalLink, Users, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { request } from 'graphql-request';
import { 
  GET_GLOBAL_DATA, 
  GET_SWAPS, 
  GET_GLOBAL_TRANSACTIONS, 
  GET_GLOBAL_MODIFY_LIQUIDITIES, 
  SUBGRAPH_ENDPOINT,
  POINTSHOOK_SUBGRAPH_ENDPOINT
} from '../../lib/queries';
import { API_BASE_URL } from '../../lib/constants';


const GET_ALL_SWAPS = `
  query GetSwaps($lastTimestamp: BigInt!) {
    swaps(first: 1000, where: { timestamp_gt: $lastTimestamp }, orderBy: timestamp, orderDirection: asc) {
      timestamp
      sender
      origin
    }
  }
`;

const GET_ALL_MODIFY_LIQUIDITIES = `
  query GetModifyLiquidities($lastTimestamp: BigInt!) {
    modifyLiquidities(first: 1000, where: { timestamp_gt: $lastTimestamp }, orderBy: timestamp, orderDirection: asc) {
      timestamp
      sender
      origin
    }
  }
`;

const GET_ALL_POSITIONS = `
  query GetPositions($lastTimestamp: BigInt!) {
    positions(first: 1000, where: { createdAtTimestamp_gt: $lastTimestamp }, orderBy: createdAtTimestamp, orderDirection: asc) {
      createdAtTimestamp
      owner
      origin
    }
  }
`;

const GET_ALL_POINTS_BALANCES = `
  query GetPointsBalances($lastId: ID!) {
    pointsBalances(first: 1000, where: { id_gt: $lastId }, orderBy: id, orderDirection: asc) {
      id
      owner
    }
  }
`;

interface ActivityItem {
  id: string;
  hash: string;
  timestamp: number;
  type: string;
  usd: number | string;
  token0Amount?: string;
  token1Amount?: string;
  isToken0Negative?: boolean;
  isToken1Negative?: boolean;
}

const formatLargeCurrency = (val: string | number | undefined) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact" }).format(Number(val));
};

const formatCurrency = (val: string | number | undefined) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
};

const formatNumber = (val: string | number | undefined) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '0';
  return new Intl.NumberFormat('en-US').format(Number(val));
};

const getRelativeTime = (timestamp: number) => {
  const now = Math.floor(Date.now() / 1000);
  const difference = now - timestamp;
  if (difference < 60) return 'Just now';
  const minutes = Math.floor(difference / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const mapSwap = (swap: any, txHash: string, timestamp: number): ActivityItem => {
  const isAmount0Negative = Number(swap.amount0) < 0;
  const isAmount1Negative = Number(swap.amount1) < 0;
  
  const token0Symbol = swap.token0?.symbol || 'Token0';
  const token1Symbol = swap.token1?.symbol || 'Token1';
  
  const typeText = `Swap ${isAmount0Negative ? `${token0Symbol} for ${token1Symbol}` : `${token1Symbol} for ${token0Symbol}`}`;
  const amount0Formatted = `${isAmount0Negative ? '' : '+'}${Number(swap.amount0).toFixed(4)} ${token0Symbol}`;
  const amount1Formatted = `${isAmount1Negative ? '' : '+'}${Number(swap.amount1).toFixed(4)} ${token1Symbol}`;
  
  return {
    id: swap.id,
    hash: txHash,
    timestamp: timestamp,
    type: typeText,
    usd: swap.amountUSD,
    token0Amount: amount0Formatted,
    token1Amount: amount1Formatted,
    isToken0Negative: isAmount0Negative,
    isToken1Negative: isAmount1Negative
  };
};

const mapModifyLiquidity = (ml: any, txHash: string, timestamp: number): ActivityItem => {
  const amount = Number(ml.amount);
  
  const token0Symbol = ml.token0?.symbol || 'Token0';
  const token1Symbol = ml.token1?.symbol || 'Token1';
  
  let typeText = '';
  let isAmt0Neg = false;
  let isAmt1Neg = false;
  
  if (amount === 0) {
    typeText = `Collected Fees (${token0Symbol}/${token1Symbol})`;
    isAmt0Neg = true;//
    isAmt1Neg = true;//
  } else if (amount > 0) {
    typeText = `Added Liquidity (${token0Symbol}/${token1Symbol})`;
    isAmt0Neg = false;//
    isAmt1Neg = false;//
  } else {
    typeText = `Removed Liquidity (${token0Symbol}/${token1Symbol})`;
    isAmt0Neg = true;//
    isAmt1Neg = true;//
  }
  
  const amt0Val = Math.abs(Number(ml.amount0));
  const amt1Val = Math.abs(Number(ml.amount1));
  
  const amount0Formatted = `${isAmt0Neg ? '-' : '+'}${amt0Val.toFixed(4)} ${token0Symbol}`;
  const amount1Formatted = `${isAmt1Neg ? '-' : '+'}${amt1Val.toFixed(4)} ${token1Symbol}`;
  
  return {
    id: ml.id,
    hash: txHash,
    timestamp: timestamp,
    type: typeText,
    // usd: ml.amountUSD || 0,
    usd: Math.abs(Number(ml.amountUSD || 0)),
    token0Amount: amount0Formatted,
    token1Amount: amount1Formatted,
    isToken0Negative: isAmt0Neg,
    isToken1Negative: isAmt1Neg
  };
};


export default function ActivityPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('All time');
  const [filterType, setFilterType] = useState('All types');
  const [globalData, setGlobalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [swaps, setSwaps] = useState<ActivityItem[]>([]);
  const [swapsPage, setSwapsPage] = useState(0);
  const [swapsLoading, setSwapsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Unique Users Stats States
  const [showUniqueUsers, setShowUniqueUsers] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [userStats, setUserStats] = useState<{
    uniqueCount: number;
    swappersCount: number;
    lpCount: number;
    positionOwnersCount: number;
    pointsCount: number;
    addresses: string[];
  } | null>(null);
  const [addressSearch, setAddressSearch] = useState('');
  const [showAddressList, setShowAddressList] = useState(false);

  const handleFetchUniqueUsers = async () => {
    if (userStats) {
      setShowUniqueUsers(!showUniqueUsers);
      return;
    }

    try {
      setFetchingUsers(true);
      setShowUniqueUsers(true);

      // Fast backend API call
      const res = await fetch(`${API_BASE_URL}/api/users/stats`);
      if (res.ok) {
        const data = await res.json();
        setUserStats({
          uniqueCount: data.uniqueCount || 1,
          swappersCount: data.swappersCount || 1,
          lpCount: data.lpCount || 1,
          positionOwnersCount: data.positionOwnersCount || 1,
          pointsCount: data.pointsCount || 1,
          addresses: data.addresses || [],
        });
        return;
      }
    } catch (error) {
      console.warn("Backend user stats unavailable, trying fallback:", error);
    } finally {
      setFetchingUsers(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchGlobalData = async () => {
      try {
        if (!globalData) setLoading(true);

        // 1. Fast local indexer API
        const res = await fetch(`${API_BASE_URL}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          if (data && isMounted) {
            setGlobalData(data);
            setLoading(false);
            return;
          }
        }

        // 2. Fallback to subgraph
        const subData = await request(SUBGRAPH_ENDPOINT, GET_GLOBAL_DATA).catch(() => null);
        if (subData && isMounted) {
          setGlobalData(subData);
        }
      } catch (error) {
        console.error('Error fetching global data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleSwapEvent = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('mlswap:swap_completed', handleSwapEvent);
    return () => {
      window.removeEventListener('mlswap:swap_completed', handleSwapEvent);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setSwapsLoading(true);
        let mappedItems: ActivityItem[] = [];
        let hasNext = false;
        
        const limit = 7;
        const skip = swapsPage * 6;

        // 1. Fast local indexer API
        try {
          const params = new URLSearchParams({
            type: filterType,
            timeRange,
            limit: String(limit),
            skip: String(skip)
          });

          const res = await fetch(`${API_BASE_URL}/api/activity?${params.toString()}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.activity && Array.isArray(json.activity)) {
              // Read local recent swaps
              const localRecent = (() => {
                try {
                  const b = localStorage.getItem('balary:recent_swaps');
                  const m = localStorage.getItem('mlswap:recent_swaps');
                  return JSON.parse(b || m || '[]');
                } catch {
                  return [];
                }
              })();

              const mappedLocal: ActivityItem[] = localRecent.map((s: any) => {
                const sym0 = s.fromToken?.symbol || 'Token0';
                const sym1 = s.toToken?.symbol || 'Token1';
                const txHash = s.txHash || s.hash || s.id;
                const amtIn = Number(s.amountIn || 0);
                const amtOut = Number(s.amountOut || 0);
                const p0 = Number(s.fromToken?.priceUSD || 1);
                const p1 = Number(s.toToken?.priceUSD || 1);
                const usd = Number(s.amountUSD || Math.max(amtIn * p0, amtOut * p1) || 1);
                return {
                  id: txHash,
                  hash: txHash,
                  timestamp: Number(s.timestamp || Math.floor(Date.now() / 1000)),
                  type: `Swap ${sym0} for ${sym1}`,
                  usd: usd > 0 ? usd : 1.0,
                  token0Amount: `-${amtIn.toFixed(4)} ${sym0}`,
                  token1Amount: `+${amtOut.toFixed(4)} ${sym1}`,
                  isToken0Negative: true,
                  isToken1Negative: false
                };
              });

              const seen = new Set();
              const combined: ActivityItem[] = [];

              if (swapsPage === 0 && (filterType === 'All types' || filterType === 'Swaps')) {
                mappedLocal.forEach(item => {
                  const key = (item.hash || item.id).toLowerCase();
                  if (!seen.has(key)) {
                    seen.add(key);
                    combined.push(item);
                  }
                });
              }

              json.activity.forEach((item: any) => {
                const key = (item.hash || item.id).toLowerCase();
                if (!seen.has(key)) {
                  seen.add(key);
                  combined.push(item);
                }
              });

              // Strict sort from new to old
              combined.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

              if (isMounted) {
                setSwaps(combined.slice(0, 6));
                setHasNextPage(combined.length > 6 || json.hasNext);
                setSwapsLoading(false);
              }
              return;
            }
          }
        } catch (_) {}

        // 2. Subgraph Fallback
        const now = Math.floor(Date.now() / 1000);
        let minTimestamp = 0;
        if (timeRange === '1h') minTimestamp = now - 3600;
        else if (timeRange === '24h') minTimestamp = now - 86400;
        else if (timeRange === '7d') minTimestamp = now - 86400 * 7;
        else if (timeRange === '30d') minTimestamp = now - 86400 * 30;
        
        if (filterType === 'All types') {
          const whereClause: any = {};
          if (minTimestamp > 0) whereClause.timestamp_gte = minTimestamp.toString();
          
          const data: any = await request(SUBGRAPH_ENDPOINT, GET_GLOBAL_TRANSACTIONS, {
            first: limit,
            skip: skip,
            where: whereClause
          }).catch(() => ({ transactions: [] }));
          
          const txs = data.transactions || [];
          hasNext = txs.length > 6;
          const displayTxs = txs.slice(0, 6);
          
          displayTxs.forEach((tx: any) => {
            const txHash = tx.id;
            const timestamp = Number(tx.timestamp);
            if (tx.swaps) {
              tx.swaps.forEach((s: any) => mappedItems.push(mapSwap(s, txHash, timestamp)));
            }
            if (tx.modifyLiquiditys) {
              tx.modifyLiquiditys.forEach((ml: any) => {
                if (ml.amount !== "0") mappedItems.push(mapModifyLiquidity(ml, txHash, timestamp));
              });
            }
          });
          mappedItems.sort((a, b) => b.timestamp - a.timestamp);
        } else if (filterType === 'Swaps') {
          const whereClause: any = {};
          if (minTimestamp > 0) whereClause.timestamp_gte = minTimestamp.toString();
          const data: any = await request(SUBGRAPH_ENDPOINT, GET_SWAPS, {
            first: limit,
            skip: skip,
            where: whereClause
          }).catch(() => ({ swaps: [] }));
          const swapsList = data.swaps || [];
          hasNext = swapsList.length > 6;
          swapsList.slice(0, 6).forEach((s: any) => {
            mappedItems.push(mapSwap(s, s.transaction?.id || s.id, Number(s.timestamp)));
          });
        } else if (filterType === 'Added Liquidity') {
          const whereClause: any = { amount_gt: "0" };
          if (minTimestamp > 0) whereClause.timestamp_gte = minTimestamp.toString();
          const data: any = await request(SUBGRAPH_ENDPOINT, GET_GLOBAL_MODIFY_LIQUIDITIES, {
            first: limit,
            skip: skip,
            where: whereClause
          }).catch(() => ({ modifyLiquidities: [] }));
          const mlList = data.modifyLiquidities || [];
          hasNext = mlList.length > 6;
          mlList.slice(0, 6).forEach((ml: any) => {
            mappedItems.push(mapModifyLiquidity(ml, ml.transaction?.id || ml.id, Number(ml.timestamp)));
          });
        } else if (filterType === 'Remove Liquidity') {
          const whereClause: any = { amount_lt: "0" };
          if (minTimestamp > 0) whereClause.timestamp_gte = minTimestamp.toString();
          const data: any = await request(SUBGRAPH_ENDPOINT, GET_GLOBAL_MODIFY_LIQUIDITIES, {
            first: limit,
            skip: skip,
            where: whereClause
          }).catch(() => ({ modifyLiquidities: [] }));
          const mlList = data.modifyLiquidities || [];
          hasNext = mlList.length > 6;
          mlList.slice(0, 6).forEach((ml: any) => {
            mappedItems.push(mapModifyLiquidity(ml, ml.transaction?.id || ml.id, Number(ml.timestamp)));
          });
        }
        
        mappedItems.sort((a, b) => b.timestamp - a.timestamp);
        if (isMounted) {
          setSwaps(mappedItems);
          setHasNextPage(hasNext);
        }
      } catch (error) {
        console.error('Error fetching activity items:', error);
      } finally {
        if (isMounted) setSwapsLoading(false);
      }
    };
    
    fetchData();
    return () => { isMounted = false; };
  }, [swapsPage, filterType, timeRange, refreshTrigger]);

  // Reset pagination if filters are modified
  useEffect(() => {
    setSwapsPage(0);
  }, [filterType, timeRange]);

  const currentDayTimestamp = Math.floor(Date.now() / 1000 / 86400) * 86400;
  const latestDay = globalData?.uniswapDayDatas?.[0];
  const dayTimestamp = Number(latestDay?.date || 0);
  const isRecent24h = dayTimestamp >= currentDayTimestamp - 86400;
  const globalVol1d = isRecent24h 
    ? (latestDay?.volumeUSD || 0) 
    : (globalData?.poolManagers?.[0]?.totalVolumeUSD || 0);
  const globalFees1d = isRecent24h 
    ? (latestDay?.feesUSD || 0) 
    : (globalData?.poolManagers?.[0]?.totalFeesUSD || 0);

  const totalTxCount = Number(globalData?.poolManagers?.[0]?.txCount || 0);

  const filteredSwaps = swaps;

  const hasPrevPage = swapsPage > 0;

  const statCards = [
    {
      label: 'Total TVL',
      value: loading ? null : formatLargeCurrency(globalData?.poolManagers?.[0]?.totalValueLockedUSD),
      accent: false,
    },
    {
      label: '1D Volume',
      value: loading ? null : formatLargeCurrency(globalVol1d),
      accent: false,
    },
    {
      label: 'All Time Volume',
      value: loading ? null : formatLargeCurrency(globalData?.poolManagers?.[0]?.totalVolumeUSD),
      accent: false,
    },
    {
      label: 'All Time Fees',
      value: loading ? null : formatLargeCurrency(globalData?.poolManagers?.[0]?.totalFeesUSD),
      accent: false,
    },
    {
      label: 'Total Pools',
      value: loading ? null : formatNumber(globalData?.poolManagers?.[0]?.poolCount),
      accent: false,
    },
    {
      label: 'Total Txns',
      value: loading ? null : formatNumber(globalData?.poolManagers?.[0]?.txCount),
      accent: false,
    },
  ];

  return (
    <div className="pb-40 relative z-10 w-full">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-[6px] p-3.5 flex flex-col gap-2 overflow-hidden bg-[#121212] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)] transition-colors"
          >
            <p className="text-[10px] tracking-[0.08em] text-ash uppercase font-medium">
              {card.label}
            </p>

            {loading ? (
              <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-[17px] font-financial font-medium text-bone">
                {card.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Tabs & Actions */}
      <div className="flex justify-between items-center border-b border-[color:var(--border-subtle)] mb-8">
        <div className="flex gap-8">
          <button className="pb-3 text-white border-b-2 border-white text-[13px] font-medium flex items-center gap-2">
            Activity Feed
            <span className="bg-white/[0.08] text-white text-[11px] px-2 py-0.5 rounded-[4px] font-mono">
              {totalTxCount || filteredSwaps.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-[#121212] p-4 rounded-[6px] border border-[color:var(--border-default)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wider text-ash">Filter by type</label>
            <div className="relative">
              <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center justify-between gap-6 bg-[#181818] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)] px-4 py-2 rounded-[6px] text-[13px] font-medium transition-colors min-w-[190px] text-bone cursor-pointer"
              >
                <span>{filterType}</span>
                <ChevronDown size={14} className={`text-ash transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {filterOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-full bg-[#151515] border border-[color:var(--border-default)] rounded-[6px] shadow-2xl z-20 py-1 overflow-hidden">
                  {['All types', 'Swaps', 'Added Liquidity', 'Remove Liquidity'].map(type => (
                    <button 
                      key={type}
                      onClick={() => {
                        setFilterType(type);
                        setFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${filterType === type ? 'text-white bg-white/[0.08]' : 'text-ash hover:bg-white/[0.04] hover:text-white'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-[11px] uppercase tracking-wider text-ash">Time Range</label>
          <div className="flex bg-[#181818] rounded-[4px] p-0.5 border border-[color:var(--border-subtle)]">
            {['1h', '24h', '7d', '30d', 'All Time'].map(range => (
              <button 
                key={range}
                onClick={() => setTimeRange(range)}
                className={`flex-1 md:px-3 py-1 text-[11px] font-medium rounded-[3px] transition-colors whitespace-nowrap ${timeRange === range ? 'bg-white text-[#111]' : 'text-ash hover:text-white cursor-pointer'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List Table */}
      <div className="rounded-[8px] border border-[color:var(--border-default)] overflow-hidden bg-[#121212]">
        <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-3.5 text-[11px] uppercase tracking-wider text-ash font-medium border-b border-[color:var(--border-subtle)] bg-[#151515]">
          <div>Time</div>
          <div>Type</div>
          <div>USD</div>
          <div>Token0 Amount</div>
          <div>Token1 Amount</div>
          <div className="text-right">Txn Hash</div>
        </div>
        <div className="divide-y divide-white/5">
          {swapsLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-8 py-7 items-center border-b border-white/5 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-16" />
                <div className="h-4 bg-white/5 rounded w-32" />
                <div className="h-4 bg-white/5 rounded w-16" />
                <div className="h-4 bg-white/5 rounded w-20" />
                <div className="h-4 bg-white/5 rounded w-20" />
                <div className="h-4 bg-white/5 rounded w-24 md:ml-auto" />
              </div>
            ))
          ) : filteredSwaps && filteredSwaps.length > 0 ? (
            filteredSwaps.map((row: any) => {
              const formattedTime = getRelativeTime(row.timestamp);

              return (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-2.5 sm:gap-4 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 items-center hover:bg-white/[0.03] transition-all group cursor-pointer">
                  <div className="flex md:block justify-between items-center text-[12px] tracking-tight text-white/50">
                     <span className="md:hidden text-[11px] text-white/20">Time</span>
                     {formattedTime}
                  </div>

                  <div className="flex md:block justify-between items-center">
                    <span className="md:hidden text-[11px]  text-white/20">Type</span>
                    <p className=" text-xs text-white group-hover:text-primary transition-colors tracking-widest">{row.type}</p>
                  </div>

                  <div className="flex md:block justify-between items-center">
                    <span className="md:hidden text-[11px]  text-white/20">USD</span>
                    <p className=" text-xs text-white">
                      {row.usd === '-' ? '-' : formatCurrency(row.usd)}
                    </p>
                  </div>

                  <div className="flex md:block justify-between items-center">
                    <span className="md:hidden text-[11px]  text-white/20">Token0 Amount</span>
                    <p className={` text-[13px] tracking-tight ${row.isToken0Negative ? 'text-white/60' : 'text-primary/90'}`}>
                      {row.token0Amount}
                    </p>
                  </div>

                  <div className="flex md:block justify-between items-center">
                    <span className="md:hidden text-[11px]  text-white/20">Token1 Amount</span>
                    <p className={` text-[13px] tracking-tight ${row.isToken1Negative ? 'text-white/60' : 'text-primary/90'}`}>
                      {row.token1Amount || '-'}
                    </p>
                  </div>

                  <div className="flex md:block justify-between items-center md:text-right">
                    <span className="md:hidden text-[11px]  text-white/20">Txn Hash</span>
                    <a 
                      href={`https://liteforge.explorer.caldera.xyz/tx/${row.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-mono text-white/30 hover:text-primary transition-colors flex items-center justify-end gap-1.5 group/hash"
                    >
                      {row.hash.slice(0, 6)}...{row.hash.slice(-4)}
                      <ExternalLink size={10} className="text-primary/60 shrink-0" />
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-white/20 uppercase text-xs opacity-50">
              No transactions found
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="p-4 bg-[#151515] border border-[color:var(--border-subtle)] rounded-b-[6px] -mt-px flex items-center justify-between px-6">
        <span className="text-[12px] text-ash font-mono">
          Page {swapsPage + 1}
        </span>
        <div className="flex gap-2">
          <button 
            disabled={!hasPrevPage || swapsLoading}
            onClick={() => setSwapsPage(prev => Math.max(0, prev - 1))}
            className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            Prev
          </button>
          <button 
            disabled={!hasNextPage || swapsLoading}
            onClick={() => setSwapsPage(prev => prev + 1)}
            className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}