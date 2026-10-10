import { Link, useParams } from 'react-router-dom';
import { ArrowUp, ExternalLink, RefreshCw, Copy, Check, Cpu, Sparkles, ChevronLeft, ArrowRight } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { request } from 'graphql-request';
import { GET_POOL_BY_ID, GET_POOL_SWAPS, SUBGRAPH_ENDPOINT } from '../../../lib/queries';
import { TOKENS } from '../../../config/tokens';
import { HOOKS_DETAILS } from '../../../config/hooksDetail';
import { formatPrice, getDisplayPrice } from '@/utils';
import { createChart, ColorType, LineSeries, LineType } from 'lightweight-charts';
import TokenImage from '../../../components/TokenImage';
import { API_BASE_URL } from '../../../lib/constants';

const getPriceFromSqrt = (sqrtPriceStr: string, token0: any, token1: any) => {
  if (!token0 || !token1 || !sqrtPriceStr) return 0;
  const sqrtPrice = Number(sqrtPriceStr);
  const decimals0 = Number(token0.decimals);
  const decimals1 = Number(token1.decimals);
  
  const t0Price = Math.pow(sqrtPrice / Math.pow(2, 96), 2) * Math.pow(10, decimals0 - decimals1);
  
  const getPriority = (symbol: string) => {
    const sym = symbol.toUpperCase();
    if (sym === 'USDC') return 100;
    if (sym === 'EURC') return 90;
    if (sym === 'MUSDC') return 80;
    if (sym === 'USDT' || sym === 'DAI') return 70;
    if (sym === 'ETH' || sym === 'WETH') return 50;
    return 0;
  };
  
  const p0 = getPriority(token0.symbol);
  const p1 = getPriority(token1.symbol);
  
  if (p0 > p1) {
    return t0Price > 0 ? 1 / t0Price : 0;
  } else {
    return t0Price;
  }
};

export default function PoolDetailsPage() {
  const { id } = useParams();
  const [pool, setPool] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`mlswap:pool:${id?.toLowerCase()}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!pool);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [swapsPage, setSwapsPage] = useState(0);
  const [swapsLoading, setSwapsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [chartSwaps, setChartSwaps] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedHookAddress, setCopiedHookAddress] = useState(false);

  useEffect(() => {
    const handleSwapEvent = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('mlswap:swap_completed', handleSwapEvent);
    return () => {
      window.removeEventListener('mlswap:swap_completed', handleSwapEvent);
    };
  }, []);

  const handleCopyPoolId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyHookAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedHookAddress(true);
    setTimeout(() => setCopiedHookAddress(false), 1500);
  };

  useEffect(() => {
    setSwapsPage(0);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const fetchPool = async () => {
      try {
        if (!pool) setLoading(true);
        // Fast backend query first
        const res = await fetch(`${API_BASE_URL}/api/pools/${id.toLowerCase()}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data?.pool && isMounted) {
            setPool(data.pool);
            try {
              localStorage.setItem(`mlswap:pool:${id.toLowerCase()}`, JSON.stringify(data.pool));
            } catch (_) {}
            setLoading(false);
            return;
          }
        }
        // Fallback to subgraph
        const data: any = await request(SUBGRAPH_ENDPOINT, GET_POOL_BY_ID, { id: id.toLowerCase() }).catch(() => null);
        if (data?.pool && isMounted) {
          setPool(data.pool);
          try {
            localStorage.setItem(`mlswap:pool:${id.toLowerCase()}`, JSON.stringify(data.pool));
          } catch (_) {}
        }
      } catch (error) {
        console.error('Error fetching pool details:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPool();
    const interval = setInterval(fetchPool, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id, refreshTrigger]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const fetchSwaps = async () => {
      try {
        setSwapsLoading(true);
        let fetchedSwaps: any[] = [];
        const res = await fetch(`${API_BASE_URL}/api/pools/${id.toLowerCase()}/swaps?skip=${swapsPage * 6}&first=7`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data?.swaps && Array.isArray(data.swaps)) {
            fetchedSwaps = data.swaps;
          }
        }
        if (fetchedSwaps.length === 0) {
          const data: any = await request(SUBGRAPH_ENDPOINT, GET_POOL_SWAPS, {
            poolId: id.toLowerCase(),
            first: 7,
            skip: swapsPage * 6
          }).catch(() => null);
          fetchedSwaps = data?.swaps || [];
        }

        // Merge local storage recent swaps
        const localRecent = (() => {
          try {
            return JSON.parse(localStorage.getItem('mlswap:recent_swaps') || '[]');
          } catch {
            return [];
          }
        })();

        const poolIdNorm = id.toLowerCase();
        const t0Norm = (pool?.token0?.id || '').toLowerCase();
        const t1Norm = (pool?.token1?.id || '').toLowerCase();

        const matchingLocal = localRecent.filter((s: any) => {
          const pid = (s.pool?.id || s.poolId || '').toLowerCase();
          if (pid && pid === poolIdNorm) return true;
          const f0 = (s.fromToken?.address || '').toLowerCase();
          const f1 = (s.toToken?.address || '').toLowerCase();
          if (t0Norm && t1Norm) {
            return (f0 === t0Norm && f1 === t1Norm) || (f0 === t1Norm && f1 === t0Norm);
          }
          return false;
        }).map((s: any) => ({
          id: s.txHash || s.hash || s.id,
          timestamp: String(s.timestamp || Math.floor(Date.now() / 1000)),
          amount0: s.amount0 || (s.amountIn ? `-${s.amountIn}` : '0'),
          amount1: s.amount1 || s.amountOut || '0',
          amountUSD: s.amountUSD || '1.00',
          transaction: { id: s.txHash || s.hash || s.id }
        }));

        const seen = new Set();
        const combinedSwaps: any[] = [];
        if (swapsPage === 0) {
          matchingLocal.forEach((s: any) => {
            const key = (s.transaction?.id || s.id).toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              combinedSwaps.push(s);
            }
          });
        }
        fetchedSwaps.forEach((s: any) => {
          const key = (s.transaction?.id || s.id).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combinedSwaps.push(s);
          }
        });

        // Strict new-to-old sort
        combinedSwaps.sort((a: any, b: any) => Number(b.timestamp) - Number(a.timestamp));

        if (isMounted) setSwaps(combinedSwaps);
      } catch (error) {
        console.error('Error fetching swaps:', error);
      } finally {
        if (isMounted) setSwapsLoading(false);
      }
    };
    fetchSwaps();
    return () => {
      isMounted = false;
    };
  }, [id, swapsPage, refreshTrigger, pool?.token0?.id, pool?.token1?.id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const fetchChartData = async () => {
      try {
        setChartLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/pools/${id.toLowerCase()}/swaps?skip=0&first=100`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data?.swaps && isMounted) {
            setChartSwaps(data.swaps);
            setChartLoading(false);
            return;
          }
        }
        const data: any = await request(SUBGRAPH_ENDPOINT, GET_POOL_SWAPS, {
          poolId: id.toLowerCase(),
          first: 100,
          skip: 0
        }).catch(() => null);
        if (isMounted) setChartSwaps(data?.swaps || []);
      } catch (error) {
        console.error('Error fetching chart swaps:', error);
      } finally {
        if (isMounted) setChartLoading(false);
      }
    };
    fetchChartData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const reversedSwaps = [...chartSwaps].reverse();
  const pointsData = reversedSwaps.map((swap: any, idx: number) => {
    const price = getPriceFromSqrt(swap.sqrtPriceX96, pool?.token0, pool?.token1);
    const date = new Date(Number(swap.timestamp) * 1000);
    return {
      price,
      timestamp: Number(swap.timestamp),
      date,
      index: idx
    };
  });

  const currentPriceVal = pool ? getPriceFromSqrt(pool.sqrtPrice || '0', pool.token0, pool.token1) : 0;
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || chartSwaps.length === 0 || !pool) return;

    const container = chartContainerRef.current;
    
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.4)',
        fontFamily: 'Outfit, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      rightPriceScale: {
        borderVisible: false,
        textColor: 'rgba(255, 255, 255, 0.4)',
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255,255,255,0.15)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
        horzLine: {
          color: 'rgba(255,255,255,0.15)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
      },
      handleScale: false,
      handleScroll: false,
      width: container.clientWidth || 500,
      height: container.clientHeight || 160,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#FFD217',
      lineWidth: 1,                 // thin line
      lineType: LineType.Simple,    // straight segments between points = zigzag
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      crosshairMarkerBackgroundColor: '#FFD217',
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: 'price',
        precision: 6,
        minMove: 0.000001,
      },
    });

    const chartData: { time: number; value: number }[] = [];
  let lastTime = 0;
  pointsData.forEach((pt) => {
    let currentTime = pt.timestamp;
    if (currentTime <= lastTime) {
      currentTime = lastTime + 1; // times must be strictly ascending
    }
    chartData.push({ time: currentTime, value: pt.price });
    lastTime = currentTime;
  });

  lineSeries.setData(chartData as any);
  chart.timeScale().fitContent();

  chart.subscribeCrosshairMove((param) => {
    if (!param.time) {
      setHoveredPoint(null);
      return;
    }
    const timeVal = Number(param.time);
    const pt = chartData.find((d) => d.time === timeVal);
    if (pt) {
      setHoveredPoint({
        price: pt.value,
        date: new Date(pt.time * 1000),
      });
    } else {
      setHoveredPoint(null);
    }
  });


    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      chart.timeScale().fitContent();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartSwaps, pool]);

  const token0Address = pool?.token0?.id || "0x0000000000000000000000000000000000000000";
  const token1Address = pool?.token1?.id || "0x0000000000000000000000000000000000000000";

  const matchedHook = useMemo(() => {
    if (!pool?.hooks) return null;
    return HOOKS_DETAILS.find(
      h => h.address.toLowerCase() === pool.hooks.toLowerCase()
    ) || null;
  }, [pool]);

  const getCurrencyParam = (address: string) => {
    return (address === "0" || address === "0x0000000000000000000000000000000000000000") ? "NATIVE" : address;
  };



  const formatCurrency = (val: string | number | undefined) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact" }).format(Number(val));
  };

  const currentDayStart = Math.floor(Date.now() / 1000 / 86400) * 86400;
  const latestDay = pool?.poolDayData?.[0];
  const isRecent24h = latestDay && Number(latestDay.date) >= currentDayStart - 86400;

  // Real-time fallbacks using swaps
  const nowSec = Math.floor(Date.now() / 1000);
  const dayAgo = nowSec - 86400;
  const recent24hSwaps = swaps.filter((s: any) => Number(s.timestamp) >= dayAgo);
  const swaps24hVol = recent24hSwaps.reduce((acc: number, s: any) => acc + Number(s.amountUSD || 0), 0);
  const feeRateNum = (Number(pool?.feeTier || 3000)) / 1_000_000;
  const swaps24hFees = recent24hSwaps.reduce((acc: number, s: any) => acc + Number(s.feeUSD || (Number(s.amountUSD || 0) * feeRateNum)), 0);

  const vol24h = swaps24hVol > 0 ? swaps24hVol : (isRecent24h ? Number(latestDay.volumeUSD) : Number(pool?.volumeUSD || 0));
  const fees24h = swaps24hFees > 0 ? swaps24hFees : (isRecent24h ? Number(latestDay.feesUSD) : Number(pool?.feesUSD || 0));

  const t0Price = Number(pool?.token0?.derivedUSDC || 1);
  const t1Price = Number(pool?.token1?.derivedUSDC || 1);
  const tvl0 = Number(pool?.totalValueLockedToken0 || 0);
  const tvl1 = Number(pool?.totalValueLockedToken1 || 0);
  const computedTVL = (tvl0 * t0Price) + (tvl1 * t1Price);
  const finalTVL = Number(pool?.totalValueLockedUSD || 0) > 0 ? Number(pool?.totalValueLockedUSD) : computedTVL;

  const estimatedApr = finalTVL > 0 ? (fees24h * 365 / finalTVL) * 100 : 0;
  const feePercent = pool?.feeTier ? (Number(pool.feeTier) / 10000).toFixed(2) + '%' : '0.00%';

  const addLiquidityPath = `/positions/create/currency0=${getCurrencyParam(token0Address)}&currency1=${getCurrencyParam(token1Address)}&fee=${pool?.feeTier || ''}&tickSpacing=${pool?.tickSpacing || ''}&hooks=${pool?.hooks || '0x0000000000000000000000000000000000000000'}&poolId=${id}`;

  return (
    <div className="pb-32 sm:pb-40 relative z-10 flex flex-col items-center w-full">
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Back Navigation */}
        <Link 
          to="/pools" 
          className="inline-flex items-center gap-1.5 text-xs text-ash hover:text-white transition-colors mb-6 group cursor-pointer"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Pools
        </Link>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex -space-x-3 sm:-space-x-4 shrink-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-black overflow-hidden bg-black flex items-center justify-center relative z-[2]">
                {loading ? (
                  <div className="w-full h-full bg-white/5 animate-pulse" />
                ) : (
                  <TokenImage
                    tokenAddress={token0Address}
                    symbol={pool?.token0?.symbol}
                    className="w-full h-full object-contain"
                    alt={pool?.token0?.symbol || 'token0'}
                  />
                )}
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-black overflow-hidden bg-black flex items-center justify-center relative z-[1]">
                {loading ? (
                  <div className="w-full h-full bg-white/5 animate-pulse" />
                ) : (
                  <TokenImage
                    tokenAddress={token1Address}
                    symbol={pool?.token1?.symbol}
                    className="w-full h-full object-contain"
                    alt={pool?.token1?.symbol || 'token1'}
                  />
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {loading ? (
                  <div className="h-8 sm:h-9 w-40 sm:w-48 bg-white/5 rounded animate-pulse" />
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl tracking-tighter text-white font-medium">
                      {pool?.token0?.symbol} / {pool?.token1?.symbol}
                    </h1>
                    <span className="bg-white/10 px-2.5 py-0.5 text-[11px] sm:text-[12px] text-white/60 rounded-[4px] font-mono">{feePercent} Fee</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2">
                {loading ? (
                  <div className="h-7 sm:h-8 w-24 bg-white/5 rounded animate-pulse" />
                ) : (
                  <span className="text-2xl sm:text-3xl tracking-tighter text-white/60 font-financial">
                     <span>{getDisplayPrice(pool)}</span>
                  </span>
                )}
              </div>
              <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
                <span className="text-[11px] text-white/20">Pool ID:</span>
                <span className="text-[11px] sm:text-[12px] font-mono text-white/40">
                  {id ? `${id.slice(0, 8)}...${id.slice(-6)}` : 'UNKNOWN'}
                </span>
                {id && (
                  <button
                    onClick={handleCopyPoolId}
                    className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer text-white/40 hover:text-white flex items-center justify-center"
                    title="Copy Pool ID"
                  >
                    {copied ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2.5 sm:gap-3 w-full md:w-auto">
            <Link 
              to={`/swap?from=${token0Address}&to=${token1Address}`}
              className="ui-button ui-button-secondary flex-1 md:flex-none !px-5 rounded-[6px] text-xs font-medium flex items-center justify-center !min-h-10"
            >
              Swap
            </Link>
            <Link
              to={addLiquidityPath}
              className="ui-button ui-button-primary flex-1 md:flex-none !px-5 rounded-[6px] text-xs font-medium flex items-center justify-center text-center !min-h-10"
            >
              Add Liquidity
            </Link>
          </div>
        </header>

        {/* Simplified 4-Metric Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="rounded-[6px] p-4 flex flex-col gap-1.5 bg-[#121212] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] transition-all">
            <p className="text-[11px] uppercase tracking-wider text-ash font-medium leading-tight">Total Value Locked</p>
            {loading ? (
              <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-xl font-medium tracking-tight text-bone font-financial">{formatCurrency(finalTVL)}</p>
            )}
          </div>

          <div className="rounded-[6px] p-4 flex flex-col gap-1.5 bg-[#121212] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] transition-all">
            <p className="text-[11px] uppercase tracking-wider text-ash font-medium leading-tight">24h Volume</p>
            {loading ? (
              <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-xl font-medium tracking-tight text-bone font-financial">{formatCurrency(vol24h)}</p>
            )}
          </div>

          <div className="rounded-[6px] p-4 flex flex-col gap-1.5 bg-[#121212] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] transition-all">
            <p className="text-[11px] uppercase tracking-wider text-ash font-medium leading-tight">24h Fees</p>
            {loading ? (
              <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-xl font-medium tracking-tight text-bone font-financial">{formatCurrency(fees24h)}</p>
            )}
          </div>

          <div className="rounded-[6px] p-4 flex flex-col gap-1.5 bg-[#121212] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] transition-all">
            <p className="text-[11px] uppercase tracking-wider text-ash font-medium leading-tight">Fee Tier / APR</p>
            {loading ? (
              <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-medium tracking-tight text-bone font-financial">{feePercent}</span>
                <span className="text-xs font-mono text-emerald-400">
                  {estimatedApr > 0 ? `~${estimatedApr.toFixed(1)}% APR` : '0% APR'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Analytics & Reserves Layout */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          {/* Price Chart Module */}
          <div className="col-span-12 lg:col-span-8 bg-[#121212] border border-[color:var(--border-subtle)] rounded-[6px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-[color:var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ash font-medium uppercase tracking-wider">Price History</span>
                  {chartLoading && <RefreshCw size={12} className="text-ash animate-spin" />}
                </div>
              </div>

              {/* Display Hovered or Current Price */}
              <div className="mb-2">
                <p className="text-3xl tracking-tighter text-white">
                  {hoveredPoint ? (
                    `$${hoveredPoint.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                  ) : currentPriceVal ? (
                    `$${currentPriceVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                  ) : (
                    '...'
                  )}
                </p>
                <p className="text-[12px] text-white/40 font-mono mt-1">
                  {hoveredPoint ? (
                    hoveredPoint.date.toLocaleString()
                  ) : (
                    ''
                  )}
                </p>
              </div>
            </div>

            {/* Chart Container */}
            <div className="relative flex-1 min-h-[160px] flex items-end">
              {chartLoading && chartSwaps.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/20 text-[12px] flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-primary" />
                    Loading Chart...
                  </div>
                </div>
              ) : chartSwaps.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/20 text-[12px]">
                    No swap history available
                  </div>
                </div>
              ) : (
                <div ref={chartContainerRef} className="w-full h-full" />
              )}
            </div>
          </div>

          {/* Pool Balances & Information Card */}
          <div className="col-span-12 lg:col-span-4 bg-[#121212] border border-[color:var(--border-subtle)] rounded-[6px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-[color:var(--border-subtle)] pb-3">
                <span className="text-xs text-ash font-medium uppercase tracking-wider">Pool Balances</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-[6px] bg-[#161616] border border-[color:var(--border-subtle)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full border border-white/10 bg-black flex items-center justify-center overflow-hidden">
                      <TokenImage
                        tokenAddress={token0Address}
                        symbol={pool?.token0?.symbol}
                        className="w-full h-full object-contain"
                        alt={pool?.token0?.symbol || 'token0'}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-bone font-medium block">
                        {loading ? '...' : pool?.token0?.symbol}
                      </span>
                      <span className="text-[10px] text-ash font-mono">
                        ${t0Price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-bone font-medium">
                    {loading ? '...' : Number(pool?.totalValueLockedToken0 || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-[6px] bg-[#161616] border border-[color:var(--border-subtle)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full border border-white/10 bg-black flex items-center justify-center overflow-hidden">
                      <TokenImage
                        tokenAddress={token1Address}
                        symbol={pool?.token1?.symbol}
                        className="w-full h-full object-contain"
                        alt={pool?.token1?.symbol || 'token1'}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-bone font-medium block">
                        {loading ? '...' : pool?.token1?.symbol}
                      </span>
                      <span className="text-[10px] text-ash font-mono">
                        ${t1Price.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-bone font-medium">
                    {loading ? '...' : Number(pool?.totalValueLockedToken1 || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[color:var(--border-subtle)] flex flex-col gap-2">
              <div className="flex justify-between items-center text-[11px] text-ash font-mono">
                <span>Tick Spacing</span>
                <span>{pool?.tickSpacing || '60'}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-ash font-mono">
                <span>Pool Status</span>
                <span className="text-emerald-400">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Hook Banner (if hook exists) */}
        {matchedHook && (
          <div className="bg-[#121212] border border-[color:var(--border-subtle)] rounded-[6px] p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-primary">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-bone font-display">{matchedHook.name}</h4>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-[3px] text-[10px] uppercase font-mono">
                    Incentivized
                  </span>
                </div>
                <p className="text-xs text-ash mt-0.5 leading-relaxed">
                  {matchedHook.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              <div className="flex items-center gap-1.5 bg-[#0c0c0c] border border-[color:var(--border-subtle)] rounded-[4px] px-2.5 py-1 text-[11px] font-mono text-ash">
                <span>{matchedHook.address.slice(0, 6)}...{matchedHook.address.slice(-4)}</span>
                <button
                  onClick={() => handleCopyHookAddress(matchedHook.address)}
                  className="hover:text-white transition-colors cursor-pointer"
                  title="Copy Hook Address"
                >
                  {copiedHookAddress ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
              </div>
              <Link
                to="/campaigns/0"
                className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] flex items-center gap-1"
              >
                Leaderboard
                <ArrowRight size={10} />
              </Link>
            </div>
          </div>
        )}

        {/* Recent Swaps Table */}
        <section className="bg-[#121212] rounded-[6px] border border-[color:var(--border-subtle)] overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b border-[color:var(--border-subtle)] bg-[#151515]">
            <h3 className="text-sm font-medium text-bone">Recent Swaps</h3>
          </div>

          <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-3 text-[11px] uppercase tracking-wider text-ash font-medium border-b border-[color:var(--border-subtle)] bg-[#151515]">
            <div>Time</div>
            <div>Type</div>
            <div>USD</div>
            <div>Token0 Amount</div>
            <div>Token1 Amount</div>
            <div className="text-right">Txn Hash</div>
          </div>

          <div className="divide-y divide-[color:var(--border-subtle)]">
            {loading || swapsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-4 items-center animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-16" />
                  <div className="h-4 bg-white/5 rounded w-32" />
                  <div className="h-4 bg-white/5 rounded w-16" />
                  <div className="h-4 bg-white/5 rounded w-20" />
                  <div className="h-4 bg-white/5 rounded w-20" />
                  <div className="h-4 bg-white/5 rounded w-24 md:ml-auto" />
                </div>
              ))
            ) : swaps && swaps.length > 0 ? (
              swaps.slice(0, 6).map((row: any) => {
                const formattedTime = new Date(Number(row.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isAmt0Neg = Number(row.amount0) < 0;
                const typeText = `Swap ${isAmt0Neg ? `${pool?.token0?.symbol || 'Token0'} for ${pool?.token1?.symbol || 'Token1'}` : `${pool?.token1?.symbol || 'Token1'} for ${pool?.token0?.symbol || 'Token0'}`}`;

                return (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group">
                    <div className="flex md:block justify-between items-center text-[12px] font-mono text-ash">
                      <span className="md:hidden text-[11px] text-ash uppercase">Time</span>
                      {formattedTime}
                    </div>

                    <div className="flex md:block justify-between items-center">
                      <span className="md:hidden text-[11px] text-ash uppercase">Type</span>
                      <p className="text-xs text-bone group-hover:text-white transition-colors">{typeText}</p>
                    </div>

                    <div className="flex md:block justify-between items-center">
                      <span className="md:hidden text-[11px] text-ash uppercase">USD</span>
                      <p className="text-xs text-bone font-mono">{formatCurrency(row.amountUSD)}</p>
                    </div>

                    <div className="flex md:block justify-between items-center">
                      <span className="md:hidden text-[11px] text-ash uppercase">Token0</span>
                      <p className={`text-[12px] font-mono ${Number(row.amount0) < 0 ? 'text-ash' : 'text-emerald-400'}`}>
                        {Number(row.amount0) < 0 ? '' : '+'}{Number(row.amount0).toFixed(4)} {pool?.token0?.symbol}
                      </p>
                    </div>

                    <div className="flex md:block justify-between items-center">
                      <span className="md:hidden text-[11px] text-ash uppercase">Token1</span>
                      <p className={`text-[12px] font-mono ${Number(row.amount1) < 0 ? 'text-ash' : 'text-emerald-400'}`}>
                        {Number(row.amount1) < 0 ? '' : '+'}{Number(row.amount1).toFixed(4)} {pool?.token1?.symbol}
                      </p>
                    </div>

                    <div className="flex md:block justify-between items-center md:text-right">
                      <span className="md:hidden text-[11px] text-ash uppercase">Txn Hash</span>
                      <a
                        href={`https://liteforge.explorer.caldera.xyz/tx/${row.transaction?.id || row.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-mono text-ash hover:text-bone transition-colors flex items-center justify-end gap-1.5"
                      >
                        {(row.transaction?.id || row.id).slice(0, 6)}...{(row.transaction?.id || row.id).slice(-4)}
                        <ExternalLink size={10} className="text-ash shrink-0" />
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-ash text-xs">
                No recent swaps found
              </div>
            )}
          </div>

          <div className="p-4 bg-[#151515] border-t border-[color:var(--border-subtle)] flex items-center justify-between px-6">
            <span className="text-[12px] text-ash font-mono">
              Page {swapsPage + 1}
            </span>
            <div className="flex gap-2">
              <button
                disabled={swapsPage === 0 || swapsLoading}
                onClick={() => setSwapsPage(prev => Math.max(0, prev - 1))}
                className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Prev
              </button>
              <button
                disabled={swaps.length <= 6 || swapsLoading}
                onClick={() => setSwapsPage(prev => prev + 1)}
                className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
