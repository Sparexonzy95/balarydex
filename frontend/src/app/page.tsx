"use client";

import { useState, useEffect, useMemo } from 'react';
import { ArrowDown, Copy, Check, Loader2, Cpu, Sparkles, ChevronDown } from 'lucide-react';
import TokenSelector, { Token } from '@/components/TokenSelector';
import Toast from '@/components/Toast';
import SwapConfirmationModal from '@/components/SwapConfirmationModal';
import { TOKENS } from '@/config/tokens';
import { HOOKS_DETAILS } from '@/config/hooksDetail';
import { useAccount, useGasPrice, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useTokenBalance } from '@/hooks/shared/useTokenBalance';
import { useTokenMetadata } from '@/hooks/shared/useTokenMetadata';
import { fetchSubgraph, GET_POOLS, SUBGRAPH_ENDPOINT } from '@/lib/queries';
import { useSwapQuote } from '@/hooks/swap/useSwapQuote';
import { useSwap } from '@/hooks/swap/useSwap';
import { ethers } from 'ethers';
import { useSearchParams } from 'react-router-dom';
import { POOLMANAGER_ADDRESS, API_BASE_URL } from '@/lib/constants';

interface SubgraphPool {
  id: string;
  token0: { id: string; symbol: string; name: string; decimals: string; derivedUSDC: string };
  token1: { id: string; symbol: string; name: string; decimals: string; derivedUSDC: string };
  feeTier: string;
  tickSpacing: string;
  hooks: string;
  liquidity: string;
  sqrtPrice: string;
  totalValueLockedUSD: string;
}

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: gasPrice } = useGasPrice();
  const { open } = useAppKit();

  const [slippage, setSlippage] = useState('0.5');
  const [isAutoSlippage, setIsAutoSlippage] = useState(true);
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const [fromToken, setFromToken] = useState<Token | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');
      if (from) {
        const found = TOKENS.find(t => t.address.toLowerCase() === from.toLowerCase());
        if (found) return found;
        return { address: from as `0x${string}`, name: 'Loading...', symbol: '...', decimals: 18, logo: '' };
      }
    }
    return TOKENS[0];
  });

  const [toToken, setToToken] = useState<Token | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const to = params.get('to');
      if (to) {
        const found = TOKENS.find(t => t.address.toLowerCase() === to.toLowerCase());
        if (found) return found;
        return { address: to as `0x${string}`, name: 'Loading...', symbol: '...', decimals: 18, logo: '' };
      }
    }
    return TOKENS[1];
  });

  const fromTokenAddress = fromToken?.address || '';
  const toTokenAddress = toToken?.address || '';

  const { metadata: fromMetadata } = useTokenMetadata(
    fromToken && !TOKENS.find(t => t.address.toLowerCase() === fromToken.address.toLowerCase()) ? fromTokenAddress : undefined
  );
  const { metadata: toMetadata } = useTokenMetadata(
    toToken && !TOKENS.find(t => t.address.toLowerCase() === toToken.address.toLowerCase()) ? toTokenAddress : undefined
  );

  useEffect(() => {
    if (fromMetadata && fromToken && !TOKENS.find(t => t.address.toLowerCase() === fromToken.address.toLowerCase())) {
      if (fromToken.name !== fromMetadata.name || fromToken.symbol !== fromMetadata.symbol || fromToken.decimals !== fromMetadata.decimals) {
        setFromToken(prev => prev ? { ...prev, name: fromMetadata.name, symbol: fromMetadata.symbol, decimals: fromMetadata.decimals } : prev);
      }
    }
  }, [fromMetadata, fromToken]);

  useEffect(() => {
    if (toMetadata && toToken && !TOKENS.find(t => t.address.toLowerCase() === toToken.address.toLowerCase())) {
      if (toToken.name !== toMetadata.name || toToken.symbol !== toMetadata.symbol || toToken.decimals !== toMetadata.decimals) {
        setToToken(prev => prev ? { ...prev, name: toMetadata.name, symbol: toMetadata.symbol, decimals: toMetadata.decimals } : prev);
      }
    }
  }, [toMetadata, toToken]);

  useEffect(() => {
    if (fromParam) {
      const found = TOKENS.find(t => t.address.toLowerCase() === fromParam.toLowerCase());
      if (found) {
        setFromToken(found);
      } else if (fromParam === 'NATIVE') {
        setFromToken(TOKENS.find(t => t.address === '0x0000000000000000000000000000000000000000') || null);
      } else {
        setFromToken({ address: fromParam as `0x${string}`, name: 'Loading...', symbol: '...', decimals: 18, logo: '' });
      }
    }
    if (toParam) {
      const found = TOKENS.find(t => t.address.toLowerCase() === toParam.toLowerCase());
      if (found) {
        setToToken(found);
      } else if (toParam === 'NATIVE') {
        setToToken(TOKENS.find(t => t.address === '0x0000000000000000000000000000000000000000') || null);
      } else {
        setToToken({ address: toParam as `0x${string}`, name: 'Loading...', symbol: '...', decimals: 18, logo: '' });
      }
    }
  }, [fromParam, toParam]);

  // Pool lookup state
  const [allPools, setAllPools] = useState<SubgraphPool[]>(() => {
    try {
      localStorage.removeItem('mlswap:pools');
      const saved = localStorage.getItem('balary:pools');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [poolsLoading, setPoolsLoading] = useState(allPools.length === 0);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExactInput, setIsExactInput] = useState(true);
  const [showHookDetails, setShowHookDetails] = useState(false);

  const { formattedBalance: fromBalance } = useTokenBalance({ token: fromToken ?? undefined, address });
  const { formattedBalance: toBalance } = useTokenBalance({ token: toToken ?? undefined, address });

  // Fetch all pools on mount (with fast backend indexer first)
  useEffect(() => {
    let isMounted = true;
    const fetchPools = async () => {
      try {
        if (allPools.length === 0) setPoolsLoading(true);

        // 1. Fast local indexer fetch (Balary architecture)
        const apiRes = await fetch(`${API_BASE_URL}/api/pools`).then(r => r.ok ? r.json() : null).catch(() => null);
        if (apiRes && Array.isArray(apiRes.pools) && isMounted) {
          setAllPools(apiRes.pools);
          try {
            localStorage.setItem('balary:pools', JSON.stringify(apiRes.pools));
            localStorage.removeItem('mlswap:pools');
          } catch (_) {}
          setPoolsLoading(false);
          return;
        }

        // 2. Fallback only if backend indexer was unreachable
        if (!apiRes) {
          let fetchedPools: SubgraphPool[] = [];
          try {
            const res = await fetchSubgraph<{ pools: SubgraphPool[] }>(GET_POOLS);
            if (res?.pools && res.pools.length > 0) {
              fetchedPools = res.pools;
            }
          } catch (subgraphErr) {
            console.warn('Subgraph unavailable:', subgraphErr);
          }

          if (isMounted) {
            setAllPools(fetchedPools);
            if (fetchedPools.length > 0) {
              try {
                localStorage.setItem('balary:pools', JSON.stringify(fetchedPools));
              } catch (_) {}
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch pools:', e);
      } finally {
        if (isMounted) setPoolsLoading(false);
      }
    };
    fetchPools();
    return () => {
      isMounted = false;
    };
  }, []);


  // Compute pool ID from pool key
  const computePoolId = (pool: SubgraphPool) => {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [
        pool.token0.id,
        pool.token1.id,
        parseInt(pool.feeTier),
        parseInt(pool.tickSpacing),
        pool.hooks,
      ]
    );
    return ethers.keccak256(encoded);
  };

  // Fallback default pool if not yet indexed or query in progress
  const fallbackPool = useMemo<SubgraphPool | null>(() => {
    if (!fromToken || !toToken) return null;
    const isT0First = fromToken.address.toLowerCase() < toToken.address.toLowerCase();
    const t0 = isT0First ? fromToken : toToken;
    const t1 = isT0First ? toToken : fromToken;
    return {
      id: '',
      token0: { id: t0.address, symbol: t0.symbol, name: t0.name, decimals: String(t0.decimals), derivedUSDC: '0' },
      token1: { id: t1.address, symbol: t1.symbol, name: t1.name, decimals: String(t1.decimals), derivedUSDC: '0' },
      feeTier: '3000',
      tickSpacing: '60',
      hooks: '0x0000000000000000000000000000000000000000',
      liquidity: '0',
      sqrtPrice: '0',
      totalValueLockedUSD: '0',
    };
  }, [fromToken, toToken]);

  // Filter pools to those containing both selected tokens
  const matchingPools = useMemo(() => {
    if (!fromToken || !toToken) return [];
    const fromAddr = fromToken.address.toLowerCase();
    const toAddr = toToken.address.toLowerCase();

    return allPools
      .filter((pool) => {
        const t0 = pool.token0.id.toLowerCase();
        const t1 = pool.token1.id.toLowerCase();
        return (
          (t0 === fromAddr && t1 === toAddr) ||
          (t0 === toAddr && t1 === fromAddr)
        );
      })
      .map((pool) => ({
        ...pool,
        computedId: computePoolId(pool),
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken, toToken, allPools]);

  // Auto-select first matching pool (or clear selection, prioritizing searchParams poolId/hooks)
  useEffect(() => {
    if (matchingPools.length > 0) {
      const targetPoolId = searchParams.get('poolId')?.toLowerCase();
      const targetHooks = searchParams.get('hooks')?.toLowerCase();

      if (targetPoolId) {
        const found = matchingPools.find(p => p.computedId.toLowerCase() === targetPoolId);
        if (found) {
          setSelectedPoolId(found.computedId);
          return;
        }
      }

      if (targetHooks) {
        const found = matchingPools.find(p => (p.hooks || '').toLowerCase() === targetHooks);
        if (found) {
          setSelectedPoolId(found.computedId);
          return;
        }
      }

      // Keep current selection if still valid
      const stillValid = matchingPools.some((p) => p.computedId === selectedPoolId);
      if (!stillValid) {
        setSelectedPoolId(matchingPools[0].computedId);
      }
    } else if (fallbackPool) {
      setSelectedPoolId(computePoolId(fallbackPool));
    } else {
      setSelectedPoolId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingPools, fallbackPool, searchParams]);

  const selectedPool = useMemo(() => {
    if (matchingPools.length > 0) {
      return matchingPools.find(p => p.computedId === selectedPoolId) || matchingPools[0];
    }
    return fallbackPool;
  }, [matchingPools, selectedPoolId, fallbackPool]);

  const matchedHook = useMemo(() => {
    if (!selectedPool) return null;
    return HOOKS_DETAILS.find(
      h => h.address.toLowerCase() === (selectedPool.hooks || '').toLowerCase()
    ) || null;
  }, [selectedPool]);

  const effectiveFromToken = fromToken || { address: (fromParam || '0x0000000000000000000000000000000000000000') as `0x${string}`, name: 'Unknown', symbol: '???', decimals: 18, logo: '' };
  const effectiveToToken = toToken || { address: (toParam || '0x0000000000000000000000000000000000000000') as `0x${string}`, name: 'Unknown', symbol: '???', decimals: 18, logo: '' };

  // Swap Quote Hook integration
  const {
    inputAmount,
    outputAmount,
    gas,
    isLoading: quoteLoading,
    error: quoteError,
    onInputChange,
    onOutputChange,
    setInputAmount,
    setOutputAmount,
    retriggerQuote,
  } = useSwapQuote({
    token0: effectiveFromToken,
    token1: effectiveToToken,
    poolFee: selectedPool ? parseInt(selectedPool.feeTier) : 3000,
    tickSpacing: selectedPool ? parseInt(selectedPool.tickSpacing) : 60,
    hooksAddress: selectedPool ? selectedPool.hooks : '0x0000000000000000000000000000000000000000',
    sqrtPriceX96: selectedPool ? selectedPool.sqrtPrice : '0',
  });

  // Re-quote when token decimals resolve/change (e.g. unknown token metadata loaded).
  useEffect(() => {
    retriggerQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFromToken.decimals, effectiveToToken.decimals]);

  // Swap transaction hook
  const {
    executeSwap,
    toast: swapToast,
    dismissToast: dismissSwapToast,
    isSwapping,
    txnGas,
    clearTxnGas
  } = useSwap();

  // Load initial quote of '1' once selected pool is resolved
  useEffect(() => {
    if (selectedPoolId && !inputAmount) {
      onInputChange('1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoolId]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedHookAddress, setCopiedHookAddress] = useState(false);

  const truncateId = (id: string) => `${id.slice(0, 10)}…${id.slice(-6)}`;

  const handleCopyPoolId = (e: React.MouseEvent, fullId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullId);
    setCopiedId(fullId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyHookAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedHookAddress(true);
    setTimeout(() => setCopiedHookAddress(false), 1500);
  };

  const handleSwapClick = () => {
    if (!inputAmount || Number(inputAmount) <= 0) return;
    if (!outputAmount || Number(outputAmount) <= 0 || quoteError) return;
    setShowConfirmModal(true);
  };

  const handleFlipTokens = () => {
    const prevFrom = fromToken;
    const prevTo = toToken;
    const prevInput = inputAmount;
    const prevOutput = outputAmount;
    setFromToken(prevTo);
    setToToken(prevFrom);
    // Swap amounts and keep direction: exact input stays exact input
    setInputAmount(prevOutput);
    setOutputAmount(prevInput);
    setIsExactInput(true);
  };

  const handleConfirmSwap = async () => {
    const poolToUse = selectedPool || fallbackPool;
    if (!poolToUse || !fromToken || !toToken) {
      console.warn("Swap cannot proceed: missing pool or tokens", { selectedPool, fallbackPool, fromToken, toToken });
      return;
    }

    const parsedSlippage = parseFloat(slippage);
    const finalSlippage = parsedSlippage > 0 ? parsedSlippage : 0.5;
    await executeSwap({
      fromToken,
      toToken,
      poolFee: parseInt(poolToUse.feeTier),
      tickSpacing: parseInt(poolToUse.tickSpacing),
      hooksAddress: poolToUse.hooks,
      amountIn: inputAmount,
      amountOut: outputAmount,
      slippagePct: finalSlippage,
      isExactInput,
    });
    setShowConfirmModal(false);
    clearTxnGas();
  };

  const formatGasFee = (gasBigint: bigint | null) => {
    if (!gasBigint) return '< 0.0001 zkLTC';
    const currentGasPrice = gasPrice ?? 20000000000n; // default to 20 gwei in wei

    const totalWei = gasBigint * currentGasPrice;
    const nativeAmount = Number(totalWei) / 1e18;
    console.log("current gasfee:", nativeAmount.toFixed(6));
    return `${nativeAmount.toFixed(5)} zkLTC`;
  };

  const rateText = useMemo(() => {
    if (!inputAmount || !outputAmount || Number(inputAmount) === 0) return '';
    const rate = Number(outputAmount) / Number(inputAmount);
    return `1 ${effectiveFromToken.symbol} = ${rate.toFixed(4)} ${effectiveToToken.symbol}`;
  }, [inputAmount, outputAmount, effectiveFromToken, effectiveToToken]);

  const reverseRateText = useMemo(() => {
    if (!inputAmount || !outputAmount || Number(outputAmount) === 0) return '';
    const rate = Number(inputAmount) / Number(outputAmount);
    return `1 ${effectiveToToken.symbol} = ${rate.toFixed(4)} ${effectiveFromToken.symbol}`;
  }, [inputAmount, outputAmount, effectiveFromToken, effectiveToToken]);



  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full relative">
      <div className="w-full max-w-[480px] mx-auto">

        {/* Hook Banner */}
        {matchedHook && (
          <div className="mb-3.5 rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] p-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-white/10 bg-white/[0.04] shrink-0">
                  <Sparkles size={13} className="text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-white truncate">{matchedHook.name}</p>
                  <p className="text-[10px] text-ash truncate font-mono">Hook: {matchedHook.rewardType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-[4px] border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono text-emerald-400 shrink-0">
                  Active
                </span>
                <button
                  type="button"
                  onClick={() => setShowHookDetails(!showHookDetails)}
                  className="text-ash hover:text-white p-1 transition-colors"
                  title="Toggle Hook Details"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${showHookDetails ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>
            {showHookDetails && (
              <div className="mt-3 pt-3 border-t border-[color:var(--border-subtle)] space-y-2 text-[11px]">
                <div className="flex items-center justify-between bg-black/40 border border-white/[0.05] rounded-[4px] px-2.5 py-1.5 font-mono">
                  <span className="text-ash truncate mr-2">{truncateId(matchedHook.address)}</span>
                  <button
                    onClick={() => handleCopyHookAddress(matchedHook.address)}
                    className="text-ash hover:text-white transition-colors"
                    title="Copy Hook Address"
                  >
                    {copiedHookAddress ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                </div>
                <p className="text-ash/80 leading-relaxed text-[11px]">
                  {matchedHook.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pool Selector */}
        <div className="mb-3">
          {poolsLoading ? (
            <div className="flex items-center gap-2 px-1">
              <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-[11px] uppercase tracking-wider text-ash">Loading pools…</span>
            </div>
          ) : matchingPools.length === 0 && !selectedPool ? (
            <div className="px-4 py-3 rounded-[6px] border border-red-500/20 bg-red-500/[0.04]">
              <span className="text-[12px] uppercase tracking-wider text-red-400">No pool found</span>
            </div>
          ) : matchingPools.length === 0 && selectedPool ? (
            <div className="px-4 py-3 rounded-[6px] border border-[color:var(--border-subtle)] bg-[#151515] flex items-center justify-between text-[11px] uppercase tracking-wider text-ash">
              <span className="font-mono">Standard LitVM Pool</span>
              <span className="opacity-80 font-mono">{(parseInt(selectedPool.feeTier) / 10000).toFixed(2)}% fee</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {matchingPools.map((pool) => {
                const isSelected = selectedPoolId === pool.computedId;
                const feePercent = (parseInt(pool.feeTier) / 10000).toFixed(2);
                return (
                  <button
                    key={pool.computedId}
                    onClick={() => setSelectedPoolId(pool.computedId)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[6px] border text-[11px] uppercase tracking-wider transition-colors duration-150 ${
                      isSelected
                        ? 'border-[color:var(--border-hover)] bg-[#1a1a1a] text-white'
                        : 'border-[color:var(--border-subtle)] bg-[#151515] text-ash hover:border-[color:var(--border-default)] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono truncate">{truncateId(pool.computedId)}</span>
                      <button
                        onClick={(e) => handleCopyPoolId(e, pool.computedId)}
                        className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                        title="Copy Pool ID"
                      >
                        {copiedId === pool.computedId ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <Copy size={11} className="opacity-50 hover:opacity-100" />
                        )}
                      </button>
                    </div>
                    <span className="ml-2 shrink-0 opacity-75">{feePercent}% fee</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="ui-surface rounded-[8px] sm:rounded-[10px] border border-[color:var(--border-default)] !bg-[#121212] p-4 sm:p-6 shadow-2xl relative">
          <div className="space-y-2.5">
            {/* From Token */}
            <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#181818] p-3.5 sm:p-4 transition-colors hover:border-[color:var(--border-default)] text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] uppercase tracking-wider text-ash">You Pay</span>
                <span className="text-[11px] sm:text-[12px] text-ash font-mono truncate max-w-[200px]">Balance: {fromBalance} {effectiveFromToken.symbol}</span>
              </div>
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 w-full min-w-0">
                  <input 
                    type="text" 
                    value={inputAmount}
                    onChange={(e) => {
                      setIsExactInput(true);
                      onInputChange(e.target.value);
                    }}
                    className={`bg-transparent border-none p-0 text-2xl sm:text-3xl font-financial focus:ring-0 focus:outline-none w-full placeholder:text-white/10 ${
                      isExactInput ? 'text-white font-medium' : 'text-ash'
                    }`}
                    placeholder="0.00"
                  />
                  {quoteLoading && !isExactInput && (
                    <Loader2 size={18} className="animate-spin text-ash shrink-0" />
                  )}
                </div>
                <TokenSelector 
                  selectedToken={fromToken}
                  onSelect={setFromToken}
                  tokens={TOKENS}
                  excludeToken={toToken}
                  className="shrink-0"
                />
              </div>
            </div>

            {/* Interchange Arrow */}
            <div className="flex justify-center -my-3.5 relative z-10">
              <button
                onClick={handleFlipTokens}
                className="h-8 w-8 rounded-[6px] border border-[color:var(--border-default)] bg-[#121212] flex items-center justify-center text-ash hover:text-white hover:bg-[#1a1a1a] transition-all cursor-pointer shadow-md"
              >
                <ArrowDown size={15} />
              </button>
            </div>

            {/* To Token */}
            <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#181818] p-3.5 sm:p-4 transition-colors hover:border-[color:var(--border-default)] text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] uppercase tracking-wider text-ash">You Receive (est.)</span>
                <span className="text-[11px] sm:text-[12px] text-ash font-mono truncate max-w-[200px]">Balance: {toBalance} {effectiveToToken.symbol}</span>
              </div>
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 w-full min-w-0">
                  <input 
                    type="text" 
                    value={outputAmount}
                    onChange={(e) => {
                      setIsExactInput(false);
                      onOutputChange(e.target.value);
                    }}
                    className={`bg-transparent border-none p-0 text-2xl sm:text-3xl font-financial focus:ring-0 focus:outline-none w-full placeholder:text-white/10 ${
                      !isExactInput ? 'text-white font-medium' : 'text-ash'
                    }`}
                    placeholder="0.00"
                  />
                  {quoteLoading && isExactInput && (
                    <Loader2 size={18} className="animate-spin text-ash shrink-0" />
                  )}
                </div>
                <TokenSelector 
                  selectedToken={toToken}
                  onSelect={setToToken}
                  tokens={TOKENS}
                  excludeToken={fromToken}
                  className="shrink-0"
                />
              </div>
            </div>
          </div>

          {quoteError && (
            <div className="mt-4 px-4 py-2.5 bg-red-500/[0.04] border border-red-500/10 text-red-400 text-[12px] uppercase tracking-wider text-center rounded-[6px] font-mono">
              {quoteError}
            </div>
          )}

          {/* Swap Button */}
          {!isConnected ? (
            <button 
              onClick={() => open()}
              className="ui-button ui-button-primary w-full !min-h-12 !text-[14px] font-medium mt-5"
            >
              Connect Wallet
            </button>
          ) : (
            <button 
              onClick={handleSwapClick}
              disabled={quoteLoading || !!quoteError || !inputAmount || Number(inputAmount) <= 0 || !outputAmount || Number(outputAmount) <= 0}
              className="ui-button ui-button-primary w-full !min-h-12 !text-[14px] font-medium mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Swap
            </button>
          )}
        </div>

        {/* Swap Details Box */}
        {(rateText || isConnected) && (
          <div className="mt-3.5 rounded-[6px] border border-[color:var(--border-default)] bg-[#121212] overflow-hidden text-[13px]">

            {/* Rate rows */}
            {rateText && (
              <>
                <div className="flex justify-between items-center px-4 py-2.5 border-b border-[color:var(--border-subtle)]">
                  <span className="text-[11px] uppercase tracking-wider text-ash">Exchange Rate</span>
                  <span className="font-financial font-medium text-bone">{rateText}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2 border-b border-[color:var(--border-subtle)] text-ash">
                  <span className="text-[11px] uppercase tracking-wider text-ash/60">Inverse</span>
                  <span className="font-financial text-ash/80">{reverseRateText}</span>
                </div>
              </>
            )}

            {/* Slippage row */}
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-[11px] uppercase tracking-wider text-ash">Max Slippage</span>
              <div className="flex items-center gap-1.5">
                {/* Preset pills */}
                <div className="flex items-center gap-1 bg-[#181818] border border-[color:var(--border-subtle)] rounded-[4px] p-0.5">
                  {['0.1', '0.5', '1.0'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => { setSlippage(preset); setIsAutoSlippage(preset === '0.5'); }}
                      className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium transition-colors cursor-pointer ${
                        slippage === preset && isAutoSlippage === (preset === '0.5')
                          ? 'bg-white text-[#111]'
                          : 'text-ash hover:text-white'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
                {/* Custom input */}
                <div className={`flex items-center bg-[#181818] border rounded-[4px] px-2.5 py-0.5 transition-colors ${!isAutoSlippage && !['0.1','0.5','1.0'].includes(slippage) ? 'border-white' : 'border-[color:var(--border-subtle)]'}`}>
                  <input
                    type="text"
                    value={slippage}
                    onChange={(e) => { setSlippage(e.target.value); setIsAutoSlippage(false); }}
                    className="bg-transparent border-none p-0 text-[11px] text-white focus:ring-0 focus:outline-none w-7 text-right"
                  />
                  <span className="text-[11px] ml-0.5 text-ash">%</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Swap Confirmation Modal */}
        <SwapConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          fromToken={effectiveFromToken}
          toToken={effectiveToToken}
          amountIn={inputAmount}
          amountOut={outputAmount}
          gasFeeUsd={txnGas || "-"}
          slippagePct={parseFloat(slippage) > 0 ? parseFloat(slippage) : 0.5}
          rateText={rateText}
          onConfirm={handleConfirmSwap}
          isSwapping={isSwapping}
          userAddress={address}
        />

        {/* Toast Notification Layer */}
        {swapToast.show && (
          <div className="fixed top-15 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
            <Toast 
              type={swapToast.type}
              title={swapToast.title}
              message={swapToast.message}
              txHash={swapToast.txHash}
              onClose={dismissSwapToast}
            />
          </div>
        )}
      </div>
    </div>
  );
}
