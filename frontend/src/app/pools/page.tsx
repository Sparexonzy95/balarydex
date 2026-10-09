import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { request } from 'graphql-request';
import { GET_POOLS, GET_GLOBAL_DATA, SUBGRAPH_ENDPOINT } from '../../lib/queries';
import { TOKENS } from '../../config/tokens';
import { HOOKS_DETAILS } from '../../config/hooksDetail';
import { redis } from '../../lib/redis';
import TokenImage from '../../components/TokenImage';
import { API_BASE_URL } from '../../lib/constants';

const formatLargeCurrency = (val: string | number | undefined) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact" }).format(Number(val));
};

const formatNumber = (val: string | number | undefined) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '0';
  return new Intl.NumberFormat('en-US').format(Number(val));
};

const PoolRowSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-[2fr_0.7fr_1fr_1fr_1fr_auto] p-6 items-center border-b border-white/[0.05] animate-pulse">
    {/* Pool */}
    <div className="flex items-center gap-6">
      <div className="flex -space-x-4">
        <div className="w-12 h-12 rounded-full border-[3px] border-black bg-white/5 relative z-[2]" />
        <div className="w-12 h-12 rounded-full border-[3px] border-black bg-white/5 relative z-[1]" />
      </div>
      <div className="h-5 w-24 bg-white/5 rounded" />
    </div>
    {/* Fee Tier */}
    <div className="flex md:block justify-between items-center mt-6 md:mt-0">
      <span className="md:hidden text-[12px] text-white/10 uppercase">Fee Tier</span>
      <div className="h-7 w-14 bg-white/5 rounded float-right" />
    </div>
    {/* Liquidity */}
    <div className="flex md:block justify-between items-center mt-2 md:mt-0">
      <span className="md:hidden text-[12px] text-white/10 uppercase">Liquidity</span>
      <div className="h-5 w-20 bg-white/5 rounded md:ml-auto" />
    </div>
    {/* 1D Vol */}
    <div className="flex md:block justify-between items-center mt-2 md:mt-0">
      <span className="md:hidden text-[12px] text-white/10 uppercase">1D Vol</span>
      <div className="h-5 w-20 bg-white/5 rounded md:ml-auto" />
    </div>
    {/* 1D Fees */}
    <div className="flex md:block justify-between items-center mt-2 md:mt-0">
      <span className="md:hidden text-[14px] text-white/10 uppercase">1D Fees</span>
      <div className="h-5 w-20 bg-white/5 rounded md:ml-auto" />
    </div>
    {/* Action */}
    <div className="flex md:block justify-end items-center mt-2 md:mt-0 ml-4">
      <div className="h-8 w-24 bg-white/5 rounded md:ml-auto" />
    </div>
  </div>
);

export default function PoolsPage() {
  const navigate = useNavigate();
  const [addressSearch, setAddressSearch] = useState('');
  const [pools, setPools] = useState<any[]>(() => {
    try {
      localStorage.removeItem('mlswap:pools');
      const saved = localStorage.getItem('balary:pools');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [globalData, setGlobalData] = useState<any>(() => {
    try {
      localStorage.removeItem('mlswap:stats');
      const saved = localStorage.getItem('balary:stats');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(pools.length === 0);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        if (pools.length === 0) setLoading(true);

        // 1. Instant local indexer fetch (Balary architecture)
        const [poolsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/pools`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE_URL}/api/stats`).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (poolsRes && Array.isArray(poolsRes.pools) && isMounted) {
          setPools(poolsRes.pools);
          try {
            localStorage.setItem('balary:pools', JSON.stringify(poolsRes.pools));
            localStorage.removeItem('mlswap:pools');
          } catch (_) {}
        }

        if (statsRes && isMounted) {
          setGlobalData(statsRes);
          try {
            localStorage.setItem('balary:stats', JSON.stringify(statsRes));
            localStorage.removeItem('mlswap:stats');
          } catch (_) {}
        }

        // 2. Fallback only if local indexer was completely unreachable (null response)
        if (!poolsRes) {
          const subPoolsRes = await request(SUBGRAPH_ENDPOINT, GET_POOLS).catch(() => null);
          const subGlobalRes = await request(SUBGRAPH_ENDPOINT, GET_GLOBAL_DATA).catch(() => null);

          let fetchedPools: any[] = subPoolsRes?.pools || [];
          if (fetchedPools.length > 0 && isMounted) {
            setPools(fetchedPools);
          }
          if (subGlobalRes && isMounted) {
            setGlobalData(subGlobalRes);
          }
        }
      } catch (error) {
        console.error('Error fetching pools data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    // Poll every 10 seconds to keep stats synchronized
    const interval = setInterval(fetchData, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const computePoolId = (poolKey: { currency0: string; currency1: string; fee: number; tickSpacing: number; hooks: string }) => {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks,
      ]
    );
    return ethers.keccak256(encoded);
  };

  const POOLS_PER_PAGE = 6;
  const [poolsPage, setPoolsPage] = useState(1);

  const filteredPools = pools.filter(pool =>
    !addressSearch ||
    pool.token0.id.toLowerCase().includes(addressSearch.toLowerCase()) ||
    pool.token1.id.toLowerCase().includes(addressSearch.toLowerCase()) ||
    pool.token0.symbol.toLowerCase().includes(addressSearch.toLowerCase()) ||
    pool.token1.symbol.toLowerCase().includes(addressSearch.toLowerCase())
  );

  const sortedPools = [...filteredPools].sort((a, b) => {
    return Number(b.blockNumber || b.createdAt || 0) - Number(a.blockNumber || a.createdAt || 0);
  });

  const totalPoolPages = Math.ceil(sortedPools.length / POOLS_PER_PAGE) || 1;
  const paginatedPools = sortedPools.slice((poolsPage - 1) * POOLS_PER_PAGE, poolsPage * POOLS_PER_PAGE);

  const currentDayTimestamp = Math.floor(Date.now() / 1000 / 86400) * 86400;
  const latestDay = globalData?.uniswapDayDatas?.[0];
  const dayTimestamp = Number(latestDay?.date || 0);
  const isRecent24h = dayTimestamp >= currentDayTimestamp - 86400;
  const globalVol1d = isRecent24h ? (latestDay?.volumeUSD ?? 0) : (globalData?.poolManagers?.[0]?.totalVolumeUSD ?? 0);
  const globalFees1d = isRecent24h ? (latestDay?.feesUSD ?? 0) : (globalData?.poolManagers?.[0]?.totalFeesUSD ?? 0);

  return (
    <div className="pb-40 relative z-10 w-full">

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 mb-10">
        {[
          { label: 'Total TVL', value: formatLargeCurrency(globalData?.poolManagers?.[0]?.totalValueLockedUSD ?? globalData?.totalValueLockedUSD) },
          { label: '1D Volume', value: formatLargeCurrency(globalVol1d) },
          { label: 'All Time Vol', value: formatLargeCurrency(globalData?.poolManagers?.[0]?.totalVolumeUSD ?? globalData?.totalVolumeUSD) },
          { label: '1D Fees', value: formatLargeCurrency(globalFees1d) },
          { label: 'All Time Fees', value: formatLargeCurrency(globalData?.poolManagers?.[0]?.totalFeesUSD ?? globalData?.totalFeesUSD) },
          { label: 'Total Pools', value: formatNumber(globalData?.poolManagers?.[0]?.poolCount ?? globalData?.poolCount ?? pools.length) },
          { label: 'Total Txns', value: formatNumber(globalData?.poolManagers?.[0]?.txCount ?? globalData?.txCount) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[6px] p-3.5 flex flex-col gap-2 overflow-hidden bg-[#121212] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)] transition-colors"
          >
            <p className="text-[10px] tracking-[0.08em] text-ash uppercase font-medium">
              {card.label}
            </p>
            {loading && pools.length === 0 ? (
              <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-[17px] font-financial font-medium text-bone">
                {card.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Search Filter & Actions */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative group w-full max-w-md">
          <input
            type="text"
            placeholder="Search by token address..."
            value={addressSearch}
            onChange={(e) => {
              setAddressSearch(e.target.value);
              setPoolsPage(1);
            }}
            className="w-full bg-[#121212] border border-[color:var(--border-default)] rounded-[6px] pl-10 pr-4 py-2.5 text-sm text-bone placeholder:text-ash/60 focus:outline-none focus:border-[color:var(--border-hover)] transition-colors"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link to="/pools/create" className="ui-button ui-button-primary !min-h-10 !px-5 text-[13px] w-full md:w-auto">
            <Plus size={15} />
            Create Pool
          </Link>
        </div>
      </div>


      {/* Pools Table */}
      <div className="rounded-[8px] border border-[color:var(--border-default)] overflow-hidden bg-[#121212]">

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[32px_2fr_1fr_1fr_1fr_140px] gap-4 px-6 py-3.5 border-b border-[color:var(--border-subtle)] bg-[#151515]">
          <div className="text-[10px] text-ash uppercase tracking-wider font-medium">#</div>
          <div className="text-[10px] text-ash uppercase tracking-wider font-medium">Pool</div>
          <div className="text-[10px] text-ash uppercase tracking-wider font-medium text-right">TVL</div>
          <div className="text-[10px] text-ash uppercase tracking-wider font-medium text-right">1D Vol</div>
          <div className="text-[10px] text-ash uppercase tracking-wider font-medium text-right">1D Fees</div>
          <div />
        </div>

        {/* Pool Rows */}
        {loading && pools.length === 0 ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="grid grid-cols-[32px_2fr_1fr_1fr_1fr_140px] gap-4 px-6 py-5 border-b border-white/[0.04] animate-pulse last:border-0">
              <div className="h-4 w-4 bg-white/5 rounded" />
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 border-2 border-black" />
                  <div className="w-9 h-9 rounded-full bg-white/5 border-2 border-black" />
                </div>
                <div className="h-4 w-24 bg-white/10 rounded" />
              </div>
              <div className="h-4 w-16 bg-white/5 rounded ml-auto" />
              <div className="h-4 w-16 bg-white/5 rounded ml-auto" />
              <div className="h-4 w-16 bg-white/5 rounded ml-auto" />
              <div className="h-8 w-28 bg-white/5 rounded-full ml-auto" />
            </div>
          ))
        ) : (
          paginatedPools.map((pool, index) => {
            const computedId = computePoolId({
              currency0: pool.token0.id,
              currency1: pool.token1.id,
              fee: parseInt(pool.feeTier),
              tickSpacing: parseInt(pool.tickSpacing),
              hooks: pool.hooks
            });

            const formatCurrency = (val: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(Number(val));

            const tvlFormatted = formatCurrency(pool.totalValueLockedUSD);
            const poolLatestDay = pool.poolDayData?.[0];
            const vol1d = poolLatestDay?.volumeUSD ? formatCurrency(poolLatestDay.volumeUSD) : formatCurrency(pool.volumeUSD || 0);
            const fee1d = poolLatestDay?.feesUSD ? formatCurrency(poolLatestDay.feesUSD) : formatCurrency(pool.feesUSD || 0);
            const feePercent = (parseInt(pool.feeTier) / 10000).toFixed(2) + '%';

            const getCurrencyParam = (address: string) =>
              (address === '0' || address === '0x0000000000000000000000000000000000000000') ? 'NATIVE' : address;

            const addLiquidityPath = `/positions/create/currency0=${getCurrencyParam(pool.token0.id)}&currency1=${getCurrencyParam(pool.token1.id)}&fee=${pool.feeTier || ''}&tickSpacing=${pool.tickSpacing || ''}&hooks=${pool.hooks || '0x0000000000000000000000000000000000000000'}&poolId=${computedId}&sqrtPrice=${pool.sqrtPrice || '0'}`;

            const matchedHook = HOOKS_DETAILS.find(
              h => h.address.toLowerCase() === (pool.hooks || '').toLowerCase()
            );

            const itemRank = (poolsPage - 1) * POOLS_PER_PAGE + index + 1;

            return (
              <div
                key={pool.id}
                onClick={() => navigate(`/pools/${computedId}`)}
                className="group relative hidden md:grid grid-cols-[32px_2fr_1fr_1fr_1fr_140px] gap-4 px-6 py-4 items-center border-b border-white/[0.04] hover:bg-white/[0.03] transition-all duration-200 last:border-0 cursor-pointer"
              >
                {/* Rank */}
                <span className="text-[12px] text-white/20 font-mono">{itemRank}</span>

                {/* Pool identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex -space-x-3 shrink-0">
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-black overflow-hidden">
                      <TokenImage
                        tokenAddress={pool.token0.id}
                        symbol={pool.token0.symbol}
                        className="w-full h-full object-contain"
                        alt={pool.token0.symbol || 'token0'}
                      />
                    </div>
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-black overflow-hidden">
                      <TokenImage
                        tokenAddress={pool.token1.id}
                        symbol={pool.token1.symbol}
                        className="w-full h-full object-contain"
                        alt={pool.token1.symbol || 'token1'}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-white tracking-tight truncate">
                      {pool.token0.symbol} / {pool.token1.symbol}
                    </span>
                    <span className="shrink-0 text-[10px] bg-white/[0.06] border border-white/10 text-white/40 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {feePercent}
                    </span>
                    {matchedHook && (
                      <span 
                        title={matchedHook.name}
                        className="shrink-0 text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold max-w-[180px] truncate"
                      >
                        {matchedHook.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* TVL */}
                <div className="text-right">
                  <span className="text-sm text-white font-mono tracking-tight">{tvlFormatted}</span>
                </div>

                {/* 1D Vol */}
                <div className="text-right">
                  <span className="text-sm text-white/70 font-mono tracking-tight">{vol1d}</span>
                </div>

                {/* 1D Fees */}
                <div className="text-right">
                  <span className="text-sm text-white/50 font-mono tracking-tight">{fee1d}</span>
                </div>

                {/* Action */}
                <div className="flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(addLiquidityPath); }}
                    className="ui-button ui-button-secondary !min-h-8 !px-3 rounded-[4px] text-[12px] hover:!bg-white hover:!text-black"
                  >
                    + Liquidity
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile cards */}
        {!loading && paginatedPools.map((pool, index) => {
          const computedId = computePoolId({
            currency0: pool.token0.id,
            currency1: pool.token1.id,
            fee: parseInt(pool.feeTier),
            tickSpacing: parseInt(pool.tickSpacing),
            hooks: pool.hooks
          });
          const formatCurrency = (val: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(Number(val));
          const tvlFormatted = formatCurrency(pool.totalValueLockedUSD);
          const poolLatestDay = pool.poolDayData?.[0];
          const vol1d = poolLatestDay?.volumeUSD ? formatCurrency(poolLatestDay.volumeUSD) : formatCurrency(pool.volumeUSD || 0);
          const fee1d = poolLatestDay?.feesUSD ? formatCurrency(poolLatestDay.feesUSD) : formatCurrency(pool.feesUSD || 0);
          const feePercent = (parseInt(pool.feeTier) / 10000).toFixed(2) + '%';
          const getCurrencyParam = (address: string) =>
            (address === '0' || address === '0x0000000000000000000000000000000000000000') ? 'NATIVE' : address;
          const addLiquidityPath = `/positions/create/currency0=${getCurrencyParam(pool.token0.id)}&currency1=${getCurrencyParam(pool.token1.id)}&fee=${pool.feeTier || ''}&tickSpacing=${pool.tickSpacing || ''}&hooks=${pool.hooks || '0x0000000000000000000000000000000000000000'}&poolId=${computedId}&sqrtPrice=${pool.sqrtPrice || '0'}`;

          const matchedHook = HOOKS_DETAILS.find(
            h => h.address.toLowerCase() === (pool.hooks || '').toLowerCase()
          );

          const itemRank = (poolsPage - 1) * POOLS_PER_PAGE + index + 1;

          return (
            <div
              key={`m-${pool.id}`}
              onClick={() => navigate(`/pools/${computedId}`)}
              className="md:hidden flex flex-col gap-4 px-5 py-5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all last:border-0 cursor-pointer"
            >
              {/* Top row: logos + name + fee */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3 shrink-0">
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-black overflow-hidden">
                      <TokenImage
                        tokenAddress={pool.token0.id}
                        symbol={pool.token0.symbol}
                        className="w-full h-full object-contain"
                        alt={pool.token0.symbol || 'token0'}
                      />
                    </div>
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-black overflow-hidden">
                      <TokenImage
                        tokenAddress={pool.token1.id}
                        symbol={pool.token1.symbol}
                        className="w-full h-full object-contain"
                        alt={pool.token1.symbol || 'token1'}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{pool.token0.symbol} / {pool.token1.symbol}</span>
                    <span className="text-[10px] bg-white/[0.06] border border-white/10 text-white/40 px-2 py-0.5 rounded-full">{feePercent}</span>
                    {matchedHook && (
                      <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold max-w-[120px] truncate">
                        {matchedHook.name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-white/20 font-mono">#{itemRank}</span>
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[['TVL', tvlFormatted], ['1D Vol', vol1d], ['1D Fees', fee1d]].map(([label, val]) => (
                  <div key={label} className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">{label}</p>
                    <p className="text-sm font-mono text-white/80">{val}</p>
                  </div>
                ))}
              </div>
              {/* Action */}
              <button
                onClick={(e) => { e.stopPropagation(); navigate(addLiquidityPath); }}
                className="ui-button ui-button-secondary w-full !min-h-9 rounded-[4px] text-[12px] hover:!bg-white hover:!text-black"
              >
                + Add Liquidity
              </button>
            </div>
          );
        })}

        {!loading && filteredPools.length === 0 && (
          <div className="py-20 text-center text-white/20 uppercase text-xs tracking-widest">
            No pools found
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && filteredPools.length > 0 && (
          <div className="p-4 border-t border-[color:var(--border-subtle)] flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#151515]">
            <p className="text-[12px] text-ash">
              Showing {(poolsPage - 1) * POOLS_PER_PAGE + 1}–{Math.min(poolsPage * POOLS_PER_PAGE, filteredPools.length)} of {filteredPools.length} pools
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={poolsPage <= 1}
                onClick={() => setPoolsPage(p => Math.max(1, p - 1))}
                className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Prev
              </button>
              <span className="text-[11px] font-mono text-ash px-2">
                Page {poolsPage} of {totalPoolPages}
              </span>
              <button
                disabled={poolsPage >= totalPoolPages}
                onClick={() => setPoolsPage(p => p + 1)}
                className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
