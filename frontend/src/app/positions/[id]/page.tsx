import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw, ChevronDown, Flame, ArrowUpCircle, ArrowDownCircle, X, AlertTriangle, Wallet } from 'lucide-react';
import { useAccount, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { parseUnits, maxUint256 } from 'viem';

import TokenSelector, { Token } from '@/components/TokenSelector';
import Toast from '@/components/Toast';
import { usePositionDetails } from '@/hooks/liquidity/usePositions';
import { usePositionActions } from '@/hooks/liquidity/usePositionActions';
import { useApproval } from '@/hooks/shared/useApproval';
import { POSITION_MANAGER_ADDRESS } from '@/lib/constants';
import { LiquidityAmounts, getSqrtRatioAtTick } from '@/utils/liquidityMath/liquidityAmounts';
import { fetchSubgraph, GET_POSITION_OWNER, GET_POSITION_TRANSACTIONS } from '@/lib/queries';

const getTokenLogo = (token: any) => {
  if (token.logo) return token.logo;
  if (token.symbol === 'ETH') return 'https://cryptologos.cc/logos/ethereum-eth-logo.png';
  if (token.symbol === 'USDC') return 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png';
  if (token.symbol === 'USDT') return 'https://cryptologos.cc/logos/tether-usdt-logo.png';
  if (token.symbol === 'WBTC') return 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png';
  return 'https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/info/logo.png';
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

export default function PositionDetailsPage() {
  const { id } = useParams();
  const { address: userAddress, isConnected } = useAccount();
  const { open } = useAppKit();
  const publicClient = usePublicClient();

  const { details, isLoading, error, refetch } = usePositionDetails(id);
  const {
    collectFees,
    decreaseLiquidity,
    burnPosition,
    increaseLiquidity,
    isPending,
    toast,
    dismissToast,
    showToast,
  } = usePositionActions();

  const { checkAllowance, approveTokenWithPermit2 } = useApproval();

  const [manageOpen, setManageOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'increase' | 'decrease' | 'burn' | null>(null);
  const [activeModal, setActiveModal] = useState<'increase' | 'decrease' | 'burn' | 'collect' | null>(null);
  
  const [decreasePercent, setDecreasePercent] = useState(50);
  const [decreaseInputFocused, setDecreaseInputFocused] = useState<'token0' | 'token1' | null>(null);
  const [amount0RemoveInput, setAmount0RemoveInput] = useState('');
  const [amount1RemoveInput, setAmount1RemoveInput] = useState('');
  const [amount0Input, setAmount0Input] = useState('');
  const [amount1Input, setAmount1Input] = useState('');

  const [increasePercent0, setIncreasePercent0] = useState<number | null>(null);
  const [increasePercent1, setIncreasePercent1] = useState<number | null>(null);

  // Sync token selector states when details load
  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 6;

  useEffect(() => {
    if (!details || !id) return;

    let cancelled = false;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        let origin = userAddress?.toLowerCase();
        try {
          const ownerData = await fetchSubgraph<{ position: { origin: string } | null }>(
            GET_POSITION_OWNER,
            { tokenId: id }
          );
          if (ownerData?.position?.origin) {
            origin = ownerData.position.origin.toLowerCase();
          }
        } catch (ownerErr) {
          console.warn('Failed to fetch position owner/origin from subgraph:', ownerErr);
        }

        if (cancelled) return;
        if (!origin) {
          setHistoryItems([]);
          setHistoryLoading(false);
          return;
        }

        const data = await fetchSubgraph<{ modifyLiquidities: any[] }>(
          GET_POSITION_TRANSACTIONS,
          {
            poolId: details.poolId.toLowerCase(),
            tickLower: details.tickLower,
            tickUpper: details.tickUpper,
            origin: origin
          }
        );

        if (cancelled) return;

        const items = (data.modifyLiquidities || [])
          .filter((ml: any) => BigInt(ml.amount) !== 0n)
          .map((ml: any) => {
          const amount = BigInt(ml.amount);
            
          let type = '';
          if (amount === 0n) {
            type = 'Collect Fees';
          } else if (amount > 0n) {
            type = 'Add Liquidity';
          } else {
            type = 'Remove Liquidity';
          }

          const amt0Val = Number(ml.amount0);
          const amt1Val = Number(ml.amount1);

          let amt0Str = '';
          let amt1Str = '';

          const formatAmt = (val: number) => {
            const absVal = Math.abs(val);
            if (absVal === 0) return '0.0000';
            return absVal.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
          };

          const isNeg0 = amt0Val < 0;
          const isNeg1 = amt1Val < 0;

          const prefix0 = amount === 0n ? '+' : (isNeg0 ? '-' : '+');
          const prefix1 = amount === 0n ? '+' : (isNeg1 ? '-' : '+');

          amt0Str = `${prefix0}${formatAmt(amt0Val)}`;
          amt1Str = `${prefix1}${formatAmt(amt1Val)}`;

          return {
            id: ml.id,
            hash: ml.transaction.id,
            timestamp: Number(ml.timestamp),
            type,
            token0Amount: amt0Str,
            token1Amount: amt1Str,
            amount: ml.amount
          };
        });

        items.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setHistoryItems(items);
      } catch (err) {
        console.error('Failed to fetch position history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [details, id, userAddress]);

  // Fetch real on-chain balances for token0 and token1
  useEffect(() => {
    if (!details || !userAddress || !publicClient) {
      if (details) {
        setToken0(details.token0 as Token);
        setToken1(details.token1 as Token);
      }
      return;
    }

    let cancelled = false;

    const fetchBalances = async () => {
      try {
        const ERC20_BAL_ABI = [
          {
            type: 'function',
            name: 'balanceOf',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
          },
        ] as const;

        const [bal0, bal1] = await Promise.all([
          details.token0.address === '0x0000000000000000000000000000000000000000'
            ? publicClient.getBalance({ address: userAddress })
            : publicClient.readContract({
                address: details.token0.address,
                abi: ERC20_BAL_ABI,
                functionName: 'balanceOf',
                args: [userAddress],
              }).catch(() => 0n),
          details.token1.address === '0x0000000000000000000000000000000000000000'
            ? publicClient.getBalance({ address: userAddress })
            : publicClient.readContract({
                address: details.token1.address,
                abi: ERC20_BAL_ABI,
                functionName: 'balanceOf',
                args: [userAddress],
              }).catch(() => 0n),
        ]);

        if (cancelled) return;

        // format using decimals without exponential notation
        const formatted0 = (Number(bal0) / 10 ** details.token0.decimals).toLocaleString('en-US', {
          useGrouping: false,
          maximumFractionDigits: details.token0.decimals,
        });
        const formatted1 = (Number(bal1) / 10 ** details.token1.decimals).toLocaleString('en-US', {
          useGrouping: false,
          maximumFractionDigits: details.token1.decimals,
        });

        setToken0({
          ...(details.token0 as Token),
          balance: formatted0,
        });
        setToken1({
          ...(details.token1 as Token),
          balance: formatted1,
        });
      } catch (err) {
        console.error('Error fetching position token balances:', err);
        if (!cancelled) {
          setToken0(details.token0 as Token);
          setToken1(details.token1 as Token);
        }
      }
    };

    fetchBalances();
    return () => { cancelled = true; };
  }, [details, userAddress, publicClient]);

  // Calculate dynamic USD values
  const getUSDValues = () => {
    if (!details) return { amount0USD: 0, amount1USD: 0, totalUSD: 0, fees0USD: 0, fees1USD: 0, totalFeesUSD: 0 };
    
    let price0 = details.token0.derivedusdc ?? 0;
    let price1 = details.token1.derivedusdc ?? 0;

    // If derived USDC prices are unavailable, fall back to relative pricing
    if (price0 === 0 && price1 === 0) {
      const sym0 = details.token0.symbol;
      const sym1 = details.token1.symbol;
      price0 = 1;
      price1 = 1;
      if (sym0 === 'ETH' || sym0 === 'WETH') {
        price0 = details.currentPrice;
        price1 = 1;
      } else if (sym1 === 'ETH' || sym1 === 'WETH') {
        price0 = 1;
        price1 = details.currentPrice;
      }
    }

    const amount0USD = details.amount0Human * price0;
    const amount1USD = details.amount1Human * price1;
    const totalUSD = amount0USD + amount1USD;
    console.log({currentPrice: details.currentPrice, totalUSD, amount0USD, amount1USD, price0, price1})

    const fees0USD = details.fees0Human * price0;
    const fees1USD = details.fees1Human * price1;
    const totalFeesUSD = fees0USD + fees1USD;

    return {
      amount0USD,
      amount1USD,
      totalUSD,
      fees0USD,
      fees1USD,
      totalFeesUSD,
    };
  };

  const usd = getUSDValues();

  // Progress Bar styling
  const getProgressStyles = () => {
    if (!details) return { rangeLeft: '25%', rangeRight: '25%', cursorLeft: '50%' };
    const min = details.priceLower;
    const max = details.priceUpper;
    const curr = details.currentPrice;
    
    let pct = 50;
    if (max > min) {
      pct = ((curr - min) / (max - min)) * 100;
    }
    const clampedPct = Math.max(0, Math.min(100, pct));
    const cursorLeft = 25 + (clampedPct / 100) * 50;

    return {
      rangeLeft: '25%',
      rangeRight: '25%',
      cursorLeft: `${cursorLeft}%`,
    };
  };

  const progress = getProgressStyles();

  const handlePercent0Click = (pct: number) => {
    if (!token0 || !token0.balance || isNaN(Number(token0.balance)) || !details) return;
    setIncreasePercent0(pct);
    setIncreasePercent1(null);
    const balanceNum = Number(token0.balance);
    const targetVal = balanceNum * (pct / 100);
    const formattedVal = targetVal.toLocaleString('en-US', {
      useGrouping: false,
      maximumFractionDigits: details.token0.decimals,
    });
    handleAmount0Change(formattedVal, true);
  };

  const handlePercent1Click = (pct: number) => {
    if (!token1 || !token1.balance || isNaN(Number(token1.balance)) || !details) return;
    setIncreasePercent1(pct);
    setIncreasePercent0(null);
    const balanceNum = Number(token1.balance);
    const targetVal = balanceNum * (pct / 100);
    const formattedVal = targetVal.toLocaleString('en-US', {
      useGrouping: false,
      maximumFractionDigits: details.token1.decimals,
    });
    handleAmount1Change(formattedVal, true);
  };

  // Handle Increase input changes
  const handleAmount0Change = (valStr: string, isPct = false) => {
    setAmount0Input(valStr);
    if (!isPct) setIncreasePercent0(null);
    if (!valStr || isNaN(Number(valStr)) || !details) {
      setAmount1Input('');
      return;
    }
    try {
      const val0 = parseUnits(valStr, details.token0.decimals);
      const sqrtPriceX96 = details.currentSqrtPriceX96;
      const sqrtPriceLowerX96 = getSqrtRatioAtTick(details.tickLower);
      const sqrtPriceUpperX96 = getSqrtRatioAtTick(details.tickUpper);
      
      if (sqrtPriceX96 <= sqrtPriceLowerX96) {
        setAmount1Input('0');
      } else if (sqrtPriceX96 >= sqrtPriceUpperX96) {
        setAmount1Input('');
      } else {
        const L = LiquidityAmounts.getLiquidityForAmount0(sqrtPriceX96, sqrtPriceUpperX96, val0);
        const val1 = LiquidityAmounts.getAmount1ForLiquidity(sqrtPriceLowerX96, sqrtPriceX96, L);
        setAmount1Input((Number(val1) / 10 ** details.token1.decimals).toFixed(6));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAmount1Change = (valStr: string, isPct = false) => {
    setAmount1Input(valStr);
    if (!isPct) setIncreasePercent1(null);
    if (!valStr || isNaN(Number(valStr)) || !details) {
      setAmount0Input('');
      return;
    }
    try {
      const val1 = parseUnits(valStr, details.token1.decimals);
      const sqrtPriceX96 = details.currentSqrtPriceX96;
      const sqrtPriceLowerX96 = getSqrtRatioAtTick(details.tickLower);
      const sqrtPriceUpperX96 = getSqrtRatioAtTick(details.tickUpper);
      
      if (sqrtPriceX96 >= sqrtPriceUpperX96) {
        setAmount0Input('0');
      } else if (sqrtPriceX96 <= sqrtPriceLowerX96) {
        setAmount0Input('');
      } else {
        const L = LiquidityAmounts.getLiquidityForAmount1(sqrtPriceLowerX96, sqrtPriceX96, val1);
        const val0 = LiquidityAmounts.getAmount0ForLiquidity(sqrtPriceX96, sqrtPriceUpperX96, L);
        setAmount0Input((Number(val0) / 10 ** details.token0.decimals).toFixed(6));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit operations
  const handleCollectFees = async () => {
    if (!details) return;
    await collectFees(details.tokenId, details.poolKey);
    setActiveModal(null);
    refetch();
  };

  const handleDecreaseLiquidity = async () => {
    if (!details) return;
    // Scale percentage to basis points (e.g. 24.82% -> 248200) to support floating-point BigInt calculations safely
    const pctBasisPoints = BigInt(Math.round(Number(decreasePercent) * 10000));
    const liquidityToRemove = (details.liquidity * pctBasisPoints) / 1000000n;
    const amount0ToRemove = (details.amount0 * pctBasisPoints) / 1000000n;
    const amount1ToRemove = (details.amount1 * pctBasisPoints) / 1000000n;

    // 2% slippage
    const amount0Min = (amount0ToRemove * 98n) / 100n;
    const amount1Min = (amount1ToRemove * 98n) / 100n;

    await decreaseLiquidity(details.tokenId, details.poolKey, liquidityToRemove, amount0Min, amount1Min);
    setActiveModal(null);
    refetch();
  };

  const handleBurnPosition = async () => {
    if (!details) return;
    // 2% slippage on full burn
    const amount0Min = (details.amount0 * 98n) / 100n;
    const amount1Min = (details.amount1 * 98n) / 100n;

    await burnPosition(details.tokenId, details.poolKey, amount0Min, amount1Min);
    setActiveModal(null);
    refetch();
  };

  const handleIncreaseLiquiditySubmit = async () => {
    if (!details || !userAddress) return;
    try {
      const val0 = amount0Input ? parseUnits(amount0Input, details.token0.decimals) : 0n;
      const val1 = amount1Input ? parseUnits(amount1Input, details.token1.decimals) : 0n;

      if (val0 === 0n && val1 === 0n) {
        showToast('error', 'Zero Amount', 'Please input some amount of tokens to add.');
        return;
      }

      // Check approvals
      if (details.token0.address !== '0x0000000000000000000000000000000000000000' && val0 > 0n) {
        showToast('pending', 'Checking Allowance', `Checking allowance for ${details.token0.symbol}...`);
        const { p2ToSpenderAmount, p2ToSpenderExpiration } = await checkAllowance(
          details.token0.address,
          userAddress,
          POSITION_MANAGER_ADDRESS as `0x${string}`
        );
        const now = Math.floor(Date.now() / 1000);
        if (p2ToSpenderExpiration <= now || p2ToSpenderAmount < val0) {
          showToast('pending', 'Approving Token', `Approving ${details.token0.symbol} for Position Manager...`);
          await approveTokenWithPermit2(
            details.token0.address,
            maxUint256,
            POSITION_MANAGER_ADDRESS as `0x${string}`
          );
        }
      }

      if (details.token1.address !== '0x0000000000000000000000000000000000000000' && val1 > 0n) {
        showToast('pending', 'Checking Allowance', `Checking allowance for ${details.token1.symbol}...`);
        const { p2ToSpenderAmount, p2ToSpenderExpiration } = await checkAllowance(
          details.token1.address,
          userAddress,
          POSITION_MANAGER_ADDRESS as `0x${string}`
        );
        const now = Math.floor(Date.now() / 1000);
        if (p2ToSpenderExpiration <= now || p2ToSpenderAmount < val1) {
          showToast('pending', 'Approving Token', `Approving ${details.token1.symbol} for Position Manager...`);
          await approveTokenWithPermit2(
            details.token1.address,
            maxUint256,
            POSITION_MANAGER_ADDRESS as `0x${string}`
          );
        }
      }

      const L = LiquidityAmounts.getLiquidityForAmounts(
        details.currentSqrtPriceX96,
        getSqrtRatioAtTick(details.tickLower),
        getSqrtRatioAtTick(details.tickUpper),
        val0,
        val1
      );

      const amount0Max = val0 + (val0 * 2n) / 100n;
      const amount1Max = val1 + (val1 * 2n) / 100n;

      await increaseLiquidity(details.tokenId, details.poolKey, L, amount0Max, amount1Max);
      setActiveModal(null);
      refetch();
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Increase Failed', e?.message ?? 'Failed to increase liquidity');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[12px]   text-white/40">Loading on-chain position state...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-md mx-auto px-6">
        <div className="p-4 bg-red-500/10 rounded-full text-red-500">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h2 className="text-xl text-white  tracking-tighter mb-2">Position Load Failed</h2>
          <p className="text-xs text-white/40   leading-relaxed">
            {error ?? "We couldn't find this position on-chain. Please verify the ID and try again."}
          </p>
        </div>
        <div className="flex gap-4">
          <Link to="/profile" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-[12px]   rounded-full transition-all">
            Back to Profile
          </Link>
          <button onClick={refetch} className="px-6 py-3 bg-primary text-black text-[12px]   rounded-full transition-all hover:brightness-110 active:scale-95">
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 sm:pb-40 max-w-6xl mx-auto relative w-full px-4 sm:px-6">
      {/* Toast Alert */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[99999]">
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            txHash={toast.txHash}
            onClose={dismissToast}
          />
        </div>
      )}

      <Link to="/profile" className="flex items-center gap-2 text-ash hover:text-white transition-colors mb-6 group w-fit text-xs font-medium">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        <span>Back to Profile</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2 shrink-0">
            <div className="w-10 h-10 rounded-full border border-black bg-black overflow-hidden relative z-[2]">
              <img alt="token0" className="w-full h-full object-contain" src={getTokenLogo(details.token0)} />
            </div>
            <div className="w-10 h-10 rounded-full border border-black bg-black overflow-hidden relative z-[1]">
              <img alt="token1" className="w-full h-full object-contain" src={getTokenLogo(details.token1)} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="type-h2 font-display text-bone">{details.token0.symbol} / {details.token1.symbol}</h1>
              <span className="text-[11px] bg-white/[0.08] text-bone border border-[color:var(--border-subtle)] px-2 py-0.5 rounded-[4px] font-mono">{details.feePct} Fee</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium ${details.status === 'In Range' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 'text-amber-400 bg-amber-400/10 border border-amber-400/20'}`}>
                {details.status}
              </span>
              <span className="text-[11px] text-ash font-mono">Position #{details.tokenId}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 relative">
          {!isConnected ? (
            <button
              onClick={() => open()}
              className="ui-button ui-button-primary !px-5 rounded-[6px] text-xs font-medium cursor-pointer"
            >
              Connect Wallet
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setActiveModal('collect');
                }}
                disabled={isPending}
                className="ui-button ui-button-secondary !px-4 rounded-[6px] text-xs font-medium cursor-pointer"
              >
                Collect Fees
              </button>

              <button
                onClick={() => {
                  setManageOpen(!manageOpen);
                }}
                className={`ui-button ui-button-primary !px-4 rounded-[6px] text-xs font-medium flex items-center gap-1.5 cursor-pointer`}
              >
                Manage
                <ChevronDown size={13} className={`transition-transform duration-200 ${manageOpen ? 'rotate-180' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Manage Actions */}
      {manageOpen && (
        <div className="flex flex-wrap gap-3 mb-8 p-1.5 bg-[#121212] border border-[color:var(--border-subtle)] rounded-[6px]">
          <button
            onClick={() => {
              setSelectedAction('increase');
              setActiveModal('increase');
              setManageOpen(false);
            }}
            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-[4px] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] bg-[#151515] hover:bg-[#181818] transition-colors group cursor-pointer"
          >
            <ArrowUpCircle size={14} className="text-ash group-hover:text-white" />
            <span className="text-xs text-bone font-medium">Increase Position</span>
          </button>

          <button
            onClick={() => {
              setSelectedAction('decrease');
              setActiveModal('decrease');
              setManageOpen(false);
            }}
            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-[4px] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] bg-[#151515] hover:bg-[#181818] transition-colors group cursor-pointer"
          >
            <ArrowDownCircle size={14} className="text-ash group-hover:text-white" />
            <span className="text-xs text-bone font-medium">Decrease Position</span>
          </button>

          <button
            onClick={() => {
              setSelectedAction('burn');
              setActiveModal('burn');
              setManageOpen(false);
            }}
            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-[4px] border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 transition-colors group cursor-pointer"
          >
            <Flame size={14} className="text-rose-400" />
            <span className="text-xs text-rose-300 font-medium">Burn Position</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Liquidity Card */}
        <div className="bg-[#121212] border border-[color:var(--border-subtle)] p-6 rounded-[6px]">
          <p className="text-[11px] uppercase tracking-wider text-ash font-medium mb-2">Total Liquidity Value</p>
          <p className="type-h2 font-display text-bone mb-6">
            ${usd.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2.5 border-t border-[color:var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <img src={getTokenLogo(details.token0)} alt="token0" className="w-5 h-5 rounded-full" />
                <span className="text-xs text-bone font-medium">{details.token0.symbol}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-bone">{details.amount0Human.toFixed(6)} {details.token0.symbol}</p>
                <p className="text-[11px] text-ash font-mono">
                  ${usd.amount0USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center py-2.5 border-t border-[color:var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <img src={getTokenLogo(details.token1)} alt="token1" className="w-5 h-5 rounded-full" />
                <span className="text-xs text-bone font-medium">{details.token1.symbol}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-bone">{details.amount1Human.toFixed(6)} {details.token1.symbol}</p>
                <p className="text-[11px] text-ash font-mono">
                  ${usd.amount1USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Unclaimed Fees Card */}
        <div className="bg-[#121212] border border-[color:var(--border-subtle)] p-6 rounded-[6px]">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] uppercase tracking-wider text-ash font-medium">Unclaimed Fees</p>
            <button onClick={refetch} className="text-ash hover:text-white transition-colors cursor-pointer" title="Refresh">
              <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="type-h2 font-display text-emerald-400 mb-6">
            ${usd.totalFeesUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 10 })}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2.5 border-t border-[color:var(--border-subtle)]">
              <span className="text-xs text-ash font-medium">{details.token0.symbol}</span>
              <span className="text-xs font-mono text-bone">{details.fees0Human.toFixed(6)} {details.token0.symbol}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-t border-[color:var(--border-subtle)]">
              <span className="text-xs text-ash font-medium">{details.token1.symbol}</span>
              <span className="text-xs font-mono text-bone">{details.fees1Human.toFixed(6)} {details.token1.symbol}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Range Section */}
      <div className="bg-[#121212] border border-[color:var(--border-subtle)] p-6 rounded-[6px] mb-8">
        <p className="text-[11px] uppercase tracking-wider text-ash font-medium mb-6 text-center">Price Range</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="text-center p-4 bg-[#151515] border border-[color:var(--border-subtle)] rounded-[4px]">
            <p className="text-[10px] uppercase tracking-wider text-ash mb-1">Min Price</p>
            <p className="text-xl font-mono text-bone">
              {details.priceLower === 0 ? '0' : details.priceLower.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </p>
            <p className="text-[10px] text-ash font-mono mt-1">{details.token1.symbol} per {details.token0.symbol}</p>
          </div>

          <div className="text-center p-5 bg-white/[0.04] border border-white/20 rounded-[4px] relative">
            <div className="text-[10px] uppercase font-mono text-ash mb-1">Current Price</div>
            <p className="text-2xl font-mono text-bone font-medium">{details.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
            <p className="text-[10px] text-ash font-mono mt-1">{details.token1.symbol} per {details.token0.symbol}</p>
          </div>

          <div className="text-center p-4 bg-[#151515] border border-[color:var(--border-subtle)] rounded-[4px]">
            <p className="text-[10px] uppercase tracking-wider text-ash mb-1">Max Price</p>
            <p className="text-xl font-mono text-bone">
              {details.priceUpper > 1e12 ? '∞' : details.priceUpper.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </p>
            <p className="text-[10px] text-ash font-mono mt-1">{details.token1.symbol} per {details.token0.symbol}</p>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-8 relative h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="absolute h-full bg-white/20 border-x border-white/40" style={{ left: progress.rangeLeft, right: progress.rangeRight }}></div>
          <div className="absolute top-0 h-full w-1.5 bg-white" style={{ left: progress.cursorLeft }}></div>
        </div>
        <div className="flex justify-between mt-2 text-xs font-mono text-ash">
          <span>0</span>
          <span>&infin;</span>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="mt-12">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="flex items-center gap-3 group outline-none cursor-pointer"
        >
          <div className={`p-2 rounded-lg transition-colors ${historyOpen ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white'}`}>
            <ChevronDown size={16} className={`transition-transform duration-300 ${historyOpen ? 'rotate-180' : ''}`} />
          </div>
          <span className={`text-[13px]  tracking-[0.2em] transition-colors ${historyOpen ? 'text-white' : 'text-white/40 group-hover:text-white'}`}>
            View Position Transactions
          </span>
        </button>

        {historyOpen && (
          <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-[#121212] border border-[color:var(--border-subtle)] p-4 sm:p-6 md:p-8 rounded-[8px] overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/5 text-[11px]   text-white/30">
                    <th className="pb-4 font-medium">Type</th>
                    <th className="pb-4 font-medium text-right">Amount ({details.token0.symbol})</th>
                    <th className="pb-4 font-medium text-right">Amount ({details.token1.symbol})</th>
                    <th className="pb-4 font-medium text-right">Time</th>
                    <th className="pb-4 font-medium text-center">Status</th>
                    <th className="pb-4 font-medium text-right">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[13px] font-mono  text-white/70">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-primary/70 font-sans text-xs">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                        Loading transaction history...
                      </td>
                    </tr>
                  ) : historyItems.length > 0 ? (
                    historyItems
                      .slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE)
                      .map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 text-white font-sans tracking-wide">{item.type}</td>
                        <td className={`py-4 text-right font-mono ${item.token0Amount.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.token0Amount}
                        </td>
                        <td className={`py-4 text-right font-mono ${item.token1Amount.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.token1Amount}
                        </td>
                        <td className="py-4 text-right text-white/40 font-sans">{getRelativeTime(item.timestamp)}</td>
                        <td className="py-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px]">Success</span>
                        </td>
                        <td className="py-4 text-right">
                          <a 
                            href={`https://liteforge.explorer.caldera.xyz/tx/${item.hash}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
                          >
                            {`${item.hash.slice(0, 6)}...${item.hash.slice(-4)}`}
                            <ExternalLink size={10} />
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-white/30 font-sans text-xs">
                        No transactions found for this position.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* History Pagination */}
              {historyItems.length > HISTORY_PAGE_SIZE && (
                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-ash">
                  <span>
                    Page {historyPage + 1} of {Math.ceil(historyItems.length / HISTORY_PAGE_SIZE)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={historyPage === 0}
                      onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                      className="ui-button ui-button-secondary !min-h-7 !px-2.5 text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      disabled={(historyPage + 1) * HISTORY_PAGE_SIZE >= historyItems.length}
                      onClick={() => setHistoryPage(p => p + 1)}
                      className="ui-button ui-button-secondary !min-h-7 !px-2.5 text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collect Fees Modal */}
      {activeModal === 'collect' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />

          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#121212] border border-white/[0.08] rounded-[6px] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-ash hover:text-bone p-1.5 rounded-[4px] hover:bg-white/[0.04] transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-ash block mb-1">
                [ Collect Fees ]
              </span>
              <h2 className="text-lg font-medium text-bone tracking-[-0.02em]">Claim Accrued Earnings</h2>
              <p className="text-xs text-ash mt-0.5">
                Collect earned trading fees generated by this liquidity position.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-[#151515] border border-white/[0.06] rounded-[6px] p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <img src={getTokenLogo(details.token0)} className="w-5 h-5 rounded-full border border-white/10" />
                    <div>
                      <p className="text-xs font-medium text-bone">{details.fees0Human.toFixed(6)} {details.token0.symbol}</p>
                      <p className="text-[10px] font-mono text-ash">{details.token0.name}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-ash">
                    ${usd.fees0USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="h-px bg-white/[0.04]" />

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <img src={getTokenLogo(details.token1)} className="w-5 h-5 rounded-full border border-white/10" />
                    <div>
                      <p className="text-xs font-medium text-bone">{details.fees1Human.toFixed(6)} {details.token1.symbol}</p>
                      <p className="text-[10px] font-mono text-ash">{details.token1.name}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-ash">
                    ${usd.fees1USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex justify-between items-baseline">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-ash">Total Receivable</span>
                  <span className="text-base font-semibold text-bone font-mono">
                    ${usd.totalFeesUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="ui-button-secondary rounded-[6px] py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCollectFees}
                disabled={isPending}
                className="ui-button-primary rounded-[6px] py-2.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending && <RefreshCw size={12} className="animate-spin" />}
                Collect All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Increase Position Modal */}
      {activeModal === 'increase' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />

          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#121212] border border-white/[0.08] rounded-[6px] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-ash hover:text-bone p-1.5 rounded-[4px] hover:bg-white/[0.04] transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-ash block mb-1">
                [ Add Liquidity ]
              </span>
              <h2 className="text-lg font-medium text-bone tracking-[-0.02em]">Increase Position</h2>
              <p className="text-xs text-ash mt-0.5">
                Supply additional liquidity to your active price range.
              </p>
            </div>

            <div className="space-y-3">
              {/* Token Input 0 */}
              <div className="bg-[#151515] border border-white/[0.06] rounded-[6px] p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-ash">Deposit {details.token0.symbol}</span>
                  <span className="text-xs font-mono text-ash">
                    Bal: {token0?.balance ?? '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <input
                    type="text"
                    placeholder="0.0"
                    value={amount0Input}
                    onChange={(e) => handleAmount0Change(e.target.value)}
                    className="bg-transparent text-xl font-medium text-bone outline-none w-1/2 font-mono"
                  />
                  <TokenSelector
                    selectedToken={token0}
                    onSelect={() => {}}
                    tokens={token0 ? [token0] : []}
                    disabled={true}
                  />
                </div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePercent0Click(p)}
                      className={`px-2.5 py-1 rounded-[4px] text-[11px] font-mono font-medium transition-colors border ${
                        increasePercent0 === p
                          ? 'bg-white/[0.1] text-bone border-white/30'
                          : 'bg-transparent border-white/[0.08] text-ash hover:text-bone hover:border-white/20'
                      }`}
                    >
                      {p === 100 ? 'MAX' : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Token Input 1 */}
              <div className="bg-[#151515] border border-white/[0.06] rounded-[6px] p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-ash">Deposit {details.token1.symbol}</span>
                  <span className="text-xs font-mono text-ash">
                    Bal: {token1?.balance ?? '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <input
                    type="text"
                    placeholder="0.0"
                    value={amount1Input}
                    onChange={(e) => handleAmount1Change(e.target.value)}
                    className="bg-transparent text-xl font-medium text-bone outline-none w-1/2 font-mono"
                  />
                  <TokenSelector
                    selectedToken={token1}
                    onSelect={() => {}}
                    tokens={token1 ? [token1] : []}
                    disabled={true}
                  />
                </div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePercent1Click(p)}
                      className={`px-2.5 py-1 rounded-[4px] text-[11px] font-mono font-medium transition-colors border ${
                        increasePercent1 === p
                          ? 'bg-white/[0.1] text-bone border-white/30'
                          : 'bg-transparent border-white/[0.08] text-ash hover:text-bone hover:border-white/20'
                      }`}
                    >
                      {p === 100 ? 'MAX' : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#151515] border border-white/[0.06] rounded-[6px] p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-ash">Active Range</span>
                  <span className="text-[11px] font-mono text-emerald-400">In Range</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-black/30 border border-white/[0.04] rounded-[4px] p-2">
                    <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-ash">Min Price</p>
                    <p className="text-xs font-medium font-mono text-bone mt-0.5">
                      {details.priceLower.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </p>
                  </div>
                  <div className="bg-black/30 border border-white/[0.04] rounded-[4px] p-2">
                    <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-ash">Max Price</p>
                    <p className="text-xs font-medium font-mono text-bone mt-0.5">
                      {details.priceUpper > 1e12 ? '∞' : details.priceUpper.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="ui-button-secondary rounded-[6px] py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleIncreaseLiquiditySubmit}
                disabled={isPending}
                className="ui-button-primary rounded-[6px] py-2.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending && <RefreshCw size={12} className="animate-spin" />}
                Add Liquidity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decrease Position Modal */}
      {activeModal === 'decrease' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />

          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#121212] border border-white/[0.08] rounded-[6px] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-ash hover:text-bone p-1.5 rounded-[4px] hover:bg-white/[0.04] transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-ash block mb-1">
                [ Remove Liquidity ]
              </span>
              <h2 className="text-lg font-medium text-bone tracking-[-0.02em]">Decrease Position</h2>
              <p className="text-xs text-ash mt-0.5">
                Withdraw a portion of your deposited assets.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#151515] border border-white/[0.06] rounded-[6px] p-5 text-center">
                <span className="text-3xl font-medium font-mono text-bone tracking-tight">
                  {Number(decreasePercent).toFixed(0)}%
                </span>
                
                <div className="flex justify-center gap-2 mt-4">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      onClick={() => setDecreasePercent(p)}
                      className={`px-3 py-1 border rounded-[4px] text-[11px] font-mono font-medium transition-colors ${
                        decreasePercent === p
                          ? 'bg-white/[0.1] text-bone border-white/30'
                          : 'bg-transparent border-white/[0.08] text-ash hover:text-bone hover:border-white/20'
                      }`}
                    >
                      {p === 100 ? 'MAX' : `${p}%`}
                    </button>
                  ))}
                </div>

                <div className="px-4 mt-5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={decreasePercent}
                    onChange={(e) => setDecreasePercent(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 appearance-none outline-none accent-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-[#151515] border border-white/[0.06] rounded-[6px] p-4 space-y-3">
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-ash">Assets to Receive</p>
                
                {/* Token 0 Input */}
                <div className="flex justify-between items-center bg-black/30 border border-white/[0.06] px-3.5 py-2.5 rounded-[4px]">
                  <div className="flex items-center gap-2">
                    <img src={getTokenLogo(details.token0)} className="w-4 h-4 rounded-full" />
                    <span className="text-xs font-medium text-bone">{details.token0.symbol}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="0.0"
                    value={
                      decreaseInputFocused === 'token0'
                        ? amount0RemoveInput
                        : (details.amount0Human * (decreasePercent / 100)).toLocaleString('en-US', {
                            useGrouping: false,
                            maximumFractionDigits: Math.min(details.token0.decimals, 6)
                          })
                    }
                    onFocus={() => {
                      setDecreaseInputFocused('token0');
                      setAmount0RemoveInput(
                        (details.amount0Human * (decreasePercent / 100)).toLocaleString('en-US', {
                          useGrouping: false,
                          maximumFractionDigits: Math.min(details.token0.decimals, 6)
                        })
                      );
                    }}
                    onBlur={() => setDecreaseInputFocused(null)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmount0RemoveInput(val);
                      if (!val || isNaN(Number(val))) {
                        setDecreasePercent(0);
                        return;
                      }
                      if (details.amount0Human > 0) {
                        const pct = Math.max(0, Math.min(100, (Number(val) / details.amount0Human) * 100));
                        setDecreasePercent(pct);
                      }
                    }}
                    className="bg-transparent text-right font-mono text-xs text-bone outline-none w-1/2"
                  />
                </div>

                {/* Token 1 Input */}
                <div className="flex justify-between items-center bg-black/30 border border-white/[0.06] px-3.5 py-2.5 rounded-[4px]">
                  <div className="flex items-center gap-2">
                    <img src={getTokenLogo(details.token1)} className="w-4 h-4 rounded-full" />
                    <span className="text-xs font-medium text-bone">{details.token1.symbol}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="0.0"
                    value={
                      decreaseInputFocused === 'token1'
                        ? amount1RemoveInput
                        : (details.amount1Human * (decreasePercent / 100)).toLocaleString('en-US', {
                            useGrouping: false,
                            maximumFractionDigits: Math.min(details.token1.decimals, 6)
                          })
                    }
                    onFocus={() => {
                      setDecreaseInputFocused('token1');
                      setAmount1RemoveInput(
                        (details.amount1Human * (decreasePercent / 100)).toLocaleString('en-US', {
                          useGrouping: false,
                          maximumFractionDigits: Math.min(details.token1.decimals, 6)
                        })
                      );
                    }}
                    onBlur={() => setDecreaseInputFocused(null)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmount1RemoveInput(val);
                      if (!val || isNaN(Number(val))) {
                        setDecreasePercent(0);
                        return;
                      }
                      if (details.amount1Human > 0) {
                        const pct = Math.max(0, Math.min(100, (Number(val) / details.amount1Human) * 100));
                        setDecreasePercent(pct);
                      }
                    }}
                    className="bg-transparent text-right font-mono text-xs text-bone outline-none w-1/2"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="ui-button-secondary rounded-[6px] py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDecreaseLiquidity}
                disabled={isPending}
                className="ui-button-primary rounded-[6px] py-2.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending && <RefreshCw size={12} className="animate-spin" />}
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Burn Modal */}
      {activeModal === 'burn' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />

          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#121212] border border-rose-500/20 rounded-[6px] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-ash hover:text-bone p-1.5 rounded-[4px] hover:bg-white/[0.04] transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-rose-400 block mb-1">
                [ Danger Zone ]
              </span>
              <h2 className="text-lg font-medium text-bone tracking-[-0.02em]">Close & Burn Position</h2>
              <p className="text-xs text-ash mt-0.5">
                Withdraw all liquidity, sweep earned fees, and permanently destroy the NFT position.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-[#151515] border border-white/[0.06] rounded-[6px] p-4 space-y-3">
                <div className="flex justify-between items-center text-ash text-[11px] font-mono uppercase tracking-[0.14em]">
                  <span>Total Assets Returned</span>
                  <Wallet size={12} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <img src={getTokenLogo(details.token0)} className="w-4 h-4 rounded-full" />
                      <span className="text-xs font-medium text-bone">{(details.amount0Human + details.fees0Human).toFixed(6)} {details.token0.symbol}</span>
                    </div>
                    <span className="text-xs font-mono text-ash">
                      ${(usd.amount0USD + usd.fees0USD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <img src={getTokenLogo(details.token1)} className="w-4 h-4 rounded-full" />
                      <span className="text-xs font-medium text-bone">{(details.amount1Human + details.fees1Human).toFixed(6)} {details.token1.symbol}</span>
                    </div>
                    <span className="text-xs font-mono text-ash">
                      ${(usd.amount1USD + usd.fees1USD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex justify-between items-baseline">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-ash">Total Value</span>
                  <span className="text-base font-semibold text-bone font-mono">
                    ${(usd.totalUSD + usd.totalFeesUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300/90 leading-relaxed">
                  This action is irreversible. The position NFT will be burned and cannot be reopened.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="ui-button-secondary rounded-[6px] py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleBurnPosition}
                disabled={isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-[6px] py-2.5 text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending && <RefreshCw size={12} className="animate-spin" />}
                Confirm Burn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
