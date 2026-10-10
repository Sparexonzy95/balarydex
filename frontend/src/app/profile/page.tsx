import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, usePublicClient, useWriteContract, useSendTransaction } from 'wagmi';
import { ExternalLink, Wallet, LayoutList, X, Send, ChevronDown, Check, Loader2 } from 'lucide-react';
import { isAddress, parseUnits, formatUnits } from 'viem';
import { TOKENS, type TokenConfig } from '@/config/tokens';
import { useTokenBalances } from '@/hooks/profile/useTokenBalances';
import { useUserPositions } from '@/hooks/profile/useUserPositions';
import Toast from '@/components/Toast';
import { request } from 'graphql-request';
import { SUBGRAPH_ENDPOINT, GET_USER_ACTIVITY } from '@/lib/queries';
import { API_BASE_URL } from '@/lib/constants';

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

const formatCurrency = (val: string | number | undefined) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
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
    isAmt0Neg = false;
    isAmt1Neg = false;
  } else if (amount > 0) {
    typeText = `Added Liquidity (${token0Symbol}/${token1Symbol})`;
    isAmt0Neg = true;
    isAmt1Neg = true;
  } else {
    typeText = `Removed Liquidity (${token0Symbol}/${token1Symbol})`;
    isAmt0Neg = false;
    isAmt1Neg = false;
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
    usd: ml.amountUSD || 0,
    token0Amount: amount0Formatted,
    token1Amount: amount1Formatted,
    isToken0Negative: isAmt0Neg,
    isToken1Negative: isAmt1Neg
  };
};



export default function ProfilePage() {
  const navigate = useNavigate();
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const [activeTab, setActiveTab] = useState<'tokens' | 'activity' | 'positions'>('tokens');

  // Hook values
  const { balances, isLoading: balancesLoading, totalUsdValue, refetch: refetchBalances } = useTokenBalances();
  const { positions: userPositions, isLoading: positionsLoading } = useUserPositions();

  // Dynamic user activity state
  const [profileSwaps, setProfileSwaps] = useState<ActivityItem[]>([]);
  const [profileSwapsLoading, setProfileSwapsLoading] = useState(false);
  const [profileSwapsPage, setProfileSwapsPage] = useState(0);
  const [profileRefreshTrigger, setProfileRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleSwapEvent = () => {
      setProfileRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('mlswap:swap_completed', handleSwapEvent);
    return () => {
      window.removeEventListener('mlswap:swap_completed', handleSwapEvent);
    };
  }, []);

  useEffect(() => {
    if (!userAddress) {
      setProfileSwaps([]);
      return;
    }

    const fetchUserActivity = async () => {
      try {
        setProfileSwapsLoading(true);

        let items: ActivityItem[] = [];

        // 1. Fetch from fast local backend API
        try {
          const res = await fetch(`${API_BASE_URL}/api/activity?user=${userAddress.toLowerCase()}&limit=50`);
          if (res.ok) {
            const data = await res.json();
            if (data?.activity && Array.isArray(data.activity)) {
              items = data.activity;
            }
          }
        } catch (_) {}

        // 2. Fallback to subgraph if empty
        if (items.length === 0) {
          const data: any = await request(SUBGRAPH_ENDPOINT, GET_USER_ACTIVITY, {
            user: userAddress.toLowerCase(),
            userBytes: userAddress.toLowerCase(),
            first: 50
          }).catch(() => ({ swaps: [], modifyLiquidities: [] }));

          if (data.swaps) {
            data.swaps.forEach((s: any) => {
              items.push(mapSwap(s, s.transaction?.id || s.id, Number(s.timestamp)));
            });
          }
          if (data.modifyLiquidities) {
            data.modifyLiquidities.forEach((ml: any) => {
              if (Number(ml.amount) !== 0) {
                items.push(mapModifyLiquidity(ml, ml.transaction?.id || ml.id, Number(ml.timestamp)));
              }
            });
          }
        }

        // Merge local storage recent swaps for this user
        const localRecent = (() => {
          try {
            return JSON.parse(localStorage.getItem('mlswap:recent_swaps') || '[]');
          } catch {
            return [];
          }
        })();

        const userNorm = userAddress.toLowerCase();
        const userLocal = localRecent.filter((s: any) => (s.sender || '').toLowerCase() === userNorm).map((s: any) => {
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
            usd: usd,
            token0Amount: `-${amtIn.toFixed(4)} ${sym0}`,
            token1Amount: `+${amtOut.toFixed(4)} ${sym1}`,
            isToken0Negative: true,
            isToken1Negative: false
          };
        });

        const seen = new Set();
        const combined: ActivityItem[] = [];
        userLocal.forEach((item: ActivityItem) => {
          const key = (item.hash || item.id).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        });
        items.forEach((item: ActivityItem) => {
          const key = (item.hash || item.id).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        });

        // Strict sort from new to old
        combined.sort((a, b) => b.timestamp - a.timestamp);
        setProfileSwaps(combined);
        setProfileSwapsPage(0);
      } catch (error) {
        console.error('Error fetching user activity:', error);
      } finally {
        setProfileSwapsLoading(false);
      }
    };

    fetchUserActivity();
  }, [userAddress, profileRefreshTrigger]);

  const PROFILE_PAGE_SIZE = 6;
  const paginatedTransactions = profileSwaps.slice(profileSwapsPage * PROFILE_PAGE_SIZE, (profileSwapsPage + 1) * PROFILE_PAGE_SIZE);
  const totalPages = Math.ceil(profileSwaps.length / PROFILE_PAGE_SIZE);
  const hasPrevProfilePage = profileSwapsPage > 0;
  const hasNextProfilePage = profileSwapsPage < totalPages - 1;

  const [positionsPage, setPositionsPage] = useState(0);
  const POSITIONS_PAGE_SIZE = 6;
  const totalPositionPages = Math.ceil(userPositions.length / POSITIONS_PAGE_SIZE) || 1;
  const paginatedPositions = userPositions.slice(positionsPage * POSITIONS_PAGE_SIZE, (positionsPage + 1) * POSITIONS_PAGE_SIZE);
  const hasPrevPositionPage = positionsPage > 0;
  const hasNextPositionPage = positionsPage < totalPositionPages - 1;

  // Send Modal States
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>('0x0000000000000000000000000000000000000000'); // Default to ETH
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [ethBalance, setEthBalance] = useState<{ raw: bigint; formatted: string } | null>(null);

  // Custom token state
  const [customTokenDetails, setCustomTokenDetails] = useState<{
    address: `0x${string}`;
    name: string;
    symbol: string;
    decimals: number;
    logo: string;
    balanceRaw: bigint;
    balanceFormatted: string;
  } | null>(null);
  const [customTokenLoading, setCustomTokenLoading] = useState(false);
  const [customTokenError, setCustomTokenError] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'pending' | 'success' | 'error';
    title: string;
    message: string;
    txHash?: string;
  }>({ show: false, type: 'pending', title: '', message: '' });

  const showToast = (type: 'pending' | 'success' | 'error', title: string, message: string, txHash?: string) => {
    setToast({ show: true, type, title, message, txHash });
  };

  const dismissToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };


  const selectableTokens = TOKENS;

  // Fetch ETH Balance
  useEffect(() => {
    if (!userAddress || !publicClient || !isSendModalOpen) return;
    
    let cancelled = false;
    const fetchEthBalance = async () => {
      try {
        const bal = await publicClient.getBalance({ address: userAddress });
        if (!cancelled) {
          setEthBalance({
            raw: bal,
            formatted: parseFloat(formatUnits(bal, 18)).toFixed(6)
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchEthBalance();
    const interval = setInterval(fetchEthBalance, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userAddress, publicClient, isSendModalOpen]);

  // Fetch Custom Token details
  useEffect(() => {
    if (!customTokenAddress || !isAddress(customTokenAddress) || !publicClient || !userAddress) {
      setCustomTokenDetails(null);
      setCustomTokenError(null);
      return;
    }

    let cancelled = false;

    const fetchCustomToken = async () => {
      setCustomTokenLoading(true);
      setCustomTokenError(null);
      try {
        const [decimals, symbol, name, balance] = await Promise.all([
          publicClient.readContract({
            address: customTokenAddress as `0x${string}`,
            abi: [
              { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' }
            ],
            functionName: 'decimals',
          }).catch(() => 18),
          publicClient.readContract({
            address: customTokenAddress as `0x${string}`,
            abi: [
              { type: 'function', name: 'symbol', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' }
            ],
            functionName: 'symbol',
          }).catch(() => 'UNKNOWN'),
          publicClient.readContract({
            address: customTokenAddress as `0x${string}`,
            abi: [
              { type: 'function', name: 'name', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' }
            ],
            functionName: 'name',
          }).catch(() => 'Unknown Token'),
          publicClient.readContract({
            address: customTokenAddress as `0x${string}`,
            abi: [
              { type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }
            ],
            functionName: 'balanceOf',
            args: [userAddress],
          }).catch(() => 0n),
        ]);

        if (cancelled) return;

        setCustomTokenDetails({
          address: customTokenAddress as `0x${string}`,
          name,
          symbol,
          decimals,
          logo: 'https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/info/logo.png',
          balanceRaw: balance,
          balanceFormatted: formatUnits(balance, decimals),
        });
      } catch (err: any) {
        if (!cancelled) {
          setCustomTokenError('Failed to load token. Ensure it is a valid ERC20 contract.');
          setCustomTokenDetails(null);
        }
      } finally {
        if (!cancelled) setCustomTokenLoading(false);
      }
    };

    fetchCustomToken();
    return () => { cancelled = true; };
  }, [customTokenAddress, publicClient, userAddress]);

  const getSelectedTokenDetails = () => {
    if (selectedTokenAddress === 'custom') {
      if (customTokenDetails) {
        return {
          symbol: customTokenDetails.symbol,
          decimals: customTokenDetails.decimals,
          rawBalance: customTokenDetails.balanceRaw,
          formattedBalance: customTokenDetails.balanceFormatted,
          logo: customTokenDetails.logo,
          name: customTokenDetails.name,
        };
      }
      return {
        symbol: 'Custom',
        decimals: 18,
        rawBalance: 0n,
        formattedBalance: '0',
        logo: 'https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/info/logo.png',
        name: 'Custom ERC20',
      };
    }


    const configToken = TOKENS.find(t => t.address === selectedTokenAddress);
    const balanceInfo = balances.find(b => b.token.address === selectedTokenAddress);
    const rawBal = balanceInfo?.raw ?? 0n;
    const decs = configToken?.decimals ?? 18;
    return {
      symbol: configToken?.symbol ?? 'Unknown',
      decimals: decs,
      rawBalance: rawBal,
      formattedBalance: formatUnits(rawBal, decs),
      logo: configToken?.logo ?? '',
      name: configToken?.name ?? '',
    };
  };

  const handleSend = async () => {
    if (!isConnected || !userAddress) {
      showToast('error', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }

    if (!recipient || !isAddress(recipient)) {
      showToast('error', 'Invalid Recipient', 'Please enter a valid recipient address.');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showToast('error', 'Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    const tokenDetails = getSelectedTokenDetails();
    const parsedAmount = parseUnits(amount, tokenDetails.decimals);

    if (parsedAmount > tokenDetails.rawBalance) {
      showToast('error', 'Insufficient Balance', `You do not have enough ${tokenDetails.symbol} to cover this send.`);
      return;
    }

    setSendLoading(true);
    showToast('pending', 'Sending Transaction', `Sending ${amount} ${tokenDetails.symbol} to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`);

    try {
      let txHash: `0x${string}`;

      if (selectedTokenAddress === '0x0000000000000000000000000000000000000000') {
        txHash = await sendTransactionAsync({
          to: recipient as `0x${string}`,
          value: parsedAmount,
        });
      } else {
        const tokenAddr = selectedTokenAddress === 'custom' ? customTokenAddress : selectedTokenAddress;
        txHash = await writeContractAsync({
          address: tokenAddr as `0x${string}`,
          abi: [
            {
              type: 'function',
              name: 'transfer',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
              ],
              outputs: [{ name: '', type: 'bool' }],
              stateMutability: 'nonpayable',
            },
          ],
          functionName: 'transfer',
          args: [recipient as `0x${string}`, parsedAmount],
        });
      }

      showToast('success', 'Send Success', `Successfully sent ${amount} ${tokenDetails.symbol}!`, txHash);
      setIsSendModalOpen(false);
      setAmount('');
      setRecipient('');
      setCustomTokenAddress('');
      
      // Refresh balances
      setTimeout(() => {
        refetchBalances();
      }, 3000);

    } catch (e: any) {
      console.error(e);
      showToast('error', 'Send Failed', e?.shortMessage ?? e?.message ?? 'Failed to send assets.');
    } finally {
      setSendLoading(false);
    }
  };

  const formatUsd = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  const formatPrice = (p: number) =>
    p < 0.001 ? p.toExponential(4) : p.toLocaleString('en-US', { maximumFractionDigits: 6 });

  return (
    <div className="pb-40 w-full relative z-10">
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

      {/* Portfolio header */}
      <section className="w-full mb-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
          <div className="shrink-0">
            <div className="section-tag mb-2">
              [ My Portfolio ]
            </div>
            <h1 className="type-h1 font-display text-white mb-3">
              {!isConnected
                ? <span className="text-white/20">Not connected</span>
                : totalUsdValue > 0
                  ? formatUsd(totalUsdValue)
                  : <span className="text-white/60 font-mono text-3xl">{userAddress?.slice(0, 6)}…{userAddress?.slice(-4)}</span>
              }
            </h1>
            {isConnected && (
              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-[4px] w-fit border border-emerald-400/20 text-[11px] font-medium">
                  <Wallet size={11} />
                  <span>Connected</span>
                </div>
                <button
                  onClick={() => setIsSendModalOpen(true)}
                  className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[12px]"
                >
                  <Send size={11} />
                  Send Assets
                </button>
              </div>
            )}
          </div>

          {/* Token balance bar — weighted by USD value */}
          {isConnected && (
            <div className="flex-1 w-full lg:max-w-md rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] p-4 flex flex-col justify-center gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider text-ash shrink-0 font-medium">Token Allocation</p>
                {totalUsdValue > 0 && (
                  <p className="text-[11px] text-ash font-mono">{formatUsd(totalUsdValue)} total</p>
                )}
              </div>
              <div className="flex h-1.5 w-full bg-white/5 rounded-full overflow-hidden shrink-0">
                {balancesLoading ? (
                  <div className="h-full w-full bg-white/10 animate-pulse rounded-full" />
                ) : totalUsdValue === 0 ? (
                  <div className="h-full w-full bg-white/5 rounded-full" />
                ) : (
                  (() => {
                    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316'];
                    return balances
                      .filter(b => (b.usdValue ?? 0) > 0)
                      .map((b, i) => {
                        const pct = ((b.usdValue ?? 0) / totalUsdValue) * 100;
                        return (
                          <div
                            key={b.token.symbol}
                            className="h-full transition-all duration-500 hover:brightness-125"
                            style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                            title={`${b.token.symbol}: ${formatUsd(b.usdValue ?? 0)} (${pct.toFixed(1)}%)`}
                          />
                        );
                      })
                  })()
                )}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {(() => {
                  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316'];
                  return balances
                    .filter(b => (b.usdValue ?? 0) > 0)
                    .map((b, i) => (
                      <span key={b.token.symbol} className="flex items-center gap-1 text-[11px] text-ash">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                        {b.token.symbol}
                        <span className="text-white/30">{((b.usdValue ?? 0) / totalUsdValue * 100).toFixed(0)}%</span>
                      </span>
                    ));
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="w-full flex gap-1 p-1 bg-[#121212] rounded-[6px] mb-8 border border-[color:var(--border-default)]">
        <button 
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 py-2 rounded-[4px] text-[13px] font-medium transition-colors cursor-pointer ${
            activeTab === 'tokens' 
              ? 'bg-white/[0.08] text-white' 
              : 'text-ash hover:text-white'
          }`}
        >
          Tokens
        </button>
        <button 
          onClick={() => setActiveTab('positions')}
          className={`flex-1 py-2 rounded-[4px] text-[13px] font-medium transition-colors cursor-pointer ${
            activeTab === 'positions' 
              ? 'bg-white/[0.08] text-white' 
              : 'text-ash hover:text-white'
          }`}
        >
          Positions
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-2 rounded-[4px] text-[13px] font-medium transition-colors cursor-pointer ${
            activeTab === 'activity' 
              ? 'bg-white/[0.08] text-white' 
              : 'text-ash hover:text-white'
          }`}
        >
          Activity
        </button>
      </div>

      {/* Content */}
      <div className="w-full">
        {activeTab === 'tokens' ? (
          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr] gap-4 px-6 py-2 text-[11px] uppercase tracking-wider text-ash font-medium">
              <div>Token</div>
              <div className="text-right">Balance</div>
              <div className="text-right">Address</div>
            </div>

            {!isConnected ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-ash">
                <Wallet size={32} strokeWidth={1.5} />
                <p className="text-[13px]">Connect your wallet to see balances</p>
              </div>
            ) : balancesLoading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#121212] border border-[color:var(--border-subtle)] rounded-[6px] animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-white/10" />
                    <div className="space-y-2">
                      <div className="h-3 w-20 bg-white/10 rounded" />
                      <div className="h-2 w-12 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-24 bg-white/10 rounded" />
                </div>
              ))
            ) : (
              balances.map((item) => {
                const hasBalance = item.raw > 0n;
                return (
                  <div
                    key={item.token.address}
                    className={`group relative bg-[#121212] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] p-4 rounded-[6px] transition-all duration-200 overflow-hidden ${
                      hasBalance ? 'hover:bg-[#151515]' : 'opacity-40'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 items-center">
                      {/* Token info */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          <img
                            src={item.token.logo}
                            alt={item.token.symbol}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm text-bone font-medium tracking-tight">{item.token.name}</h3>
                            {item.usdPrice !== null && (
                              <span className="text-[11px] font-mono text-ash bg-white/5 px-1.5 py-0.5 rounded-[3px]">
                                ${item.usdPrice < 0.01
                                  ? item.usdPrice.toFixed(6)
                                  : item.usdPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                              </span>
                            )}
                          </div>
                          <p className="text-ash text-[12px] font-mono mt-0.5">{item.token.symbol}</p>
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="text-left md:text-right">
                        {hasBalance ? (
                          <>
                            <p className="text-lg text-white tracking-tight font-mono">{item.formatted}</p>
                            <p className="text-white/30 text-[12px]   mt-0.5">{item.token.symbol}</p>
                          </>
                        ) : (
                          <p className="text-white/20 text-sm font-mono">—</p>
                        )}
                      </div>

                      {/* USD Value */}
                      <div className="text-left md:text-right">
                        {item.usdValue !== null ? (
                          <>
                            <p className="text-sm text-primary/80 font-mono tracking-tight">{formatUsd(item.usdValue)}</p>
                            <p className="text-white/20 text-[11px]   mt-0.5">value</p>
                          </>
                        ) : (
                          <p className="text-white/20 text-[11px]  ">no price</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === 'positions' ? (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#121212] border border-[color:var(--border-subtle)] p-5 rounded-[6px] relative overflow-hidden">
                <p className="text-[11px] uppercase tracking-wider text-ash mb-2 font-medium">Active Positions</p>
                <p className="type-h2 font-display text-bone tracking-tight">
                  {positionsLoading ? <span className="animate-pulse">…</span> : userPositions.length}
                </p>
              </div>
              <div className="bg-[#121212] border border-[color:var(--border-subtle)] p-5 rounded-[6px] relative overflow-hidden">
                <p className="text-[11px] uppercase tracking-wider text-ash mb-2 font-medium">Unique Pools</p>
                <p className="type-h2 font-display text-bone tracking-tight">
                  {positionsLoading ? <span className="animate-pulse">…</span>
                    : new Set(userPositions.map(p => `${p.currency0}-${p.currency1}-${p.fee}`)).size}
                </p>
              </div>
            </div>

            {/* Position list */}
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-ash">
                <Wallet size={32} strokeWidth={1.5} />
                <p className="text-[13px]">Connect your wallet to see positions</p>
              </div>
            ) : positionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-6 bg-[#121212] border border-[color:var(--border-subtle)] rounded-[6px] animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-black" />
                        <div className="w-10 h-10 rounded-full bg-white/5 border-2 border-black" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-40 bg-white/10 rounded" />
                        <div className="h-3 w-56 bg-white/5 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : userPositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-ash">
                <LayoutList size={32} strokeWidth={1.5} />
                <p className="text-[13px]">No positions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedPositions.map((pos) => (
                  <div
                    key={pos.tokenId}
                    onClick={() => navigate(`/positions/${pos.tokenId}`)}
                    className="group bg-[#121212] border border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] hover:bg-[#151515] p-5 rounded-[6px] transition-all duration-200 cursor-pointer relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      {/* Left: token logos + pair info */}
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-2 shrink-0">
                          {[pos.token0, pos.token1].map((tok, i) => (
                            <div key={i} className="w-9 h-9 rounded-full border border-black bg-white/5 overflow-hidden">
                              {tok.logo ? (
                                <img
                                  src={tok.logo}
                                  alt={tok.symbol}
                                  className="w-full h-full object-contain"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[11px] text-white/40">{tok.symbol[0]}</div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base text-bone font-medium tracking-tight">
                              {pos.token0.symbol} / {pos.token1.symbol}
                            </h3>
                            <span className="text-[11px] bg-white/[0.06] text-bone border border-[color:var(--border-subtle)] px-2 py-0.5 rounded-[4px]">
                              {pos.feePct}
                            </span>
                            <span className="text-[11px] text-ash font-mono bg-white/5 px-2 py-0.5 rounded-[4px]">
                              #{pos.tokenId}
                            </span>
                          </div>
                          <p className="text-[12px] font-mono text-ash mt-1">
                            Range:&nbsp;
                            <span className="text-bone">
                              {formatPrice(pos.priceLower)}&nbsp;—&nbsp;{formatPrice(pos.priceUpper)}
                            </span>
                            &nbsp;<span className="text-ash/60">{pos.token1.symbol}/{pos.token0.symbol}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: ticks */}
                      <div className="text-left md:text-right shrink-0">
                        <p className="text-[11px] text-ash uppercase tracking-wider mb-1 font-medium">Tick Range</p>
                        <p className="text-xs font-mono text-bone">
                          {pos.tickLower} — {pos.tickUpper}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {userPositions.length > POSITIONS_PAGE_SIZE && (
                  <div className="p-4 border border-[color:var(--border-subtle)] flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#121212] rounded-[6px] mt-4">
                    <p className="text-[12px] text-ash">
                      Showing {positionsPage * POSITIONS_PAGE_SIZE + 1}–{Math.min((positionsPage + 1) * POSITIONS_PAGE_SIZE, userPositions.length)} of {userPositions.length} positions
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={!hasPrevPositionPage}
                        onClick={() => setPositionsPage(p => Math.max(0, p - 1))}
                        className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="text-[11px] font-mono text-ash px-2">
                        Page {positionsPage + 1} of {totalPositionPages}
                      </span>
                      <button
                        disabled={!hasNextPositionPage}
                        onClick={() => setPositionsPage(p => p + 1)}
                        className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-[#121212] rounded-[6px] border border-[color:var(--border-subtle)] overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-3 text-[11px] uppercase tracking-wider text-ash font-medium border-b border-[color:var(--border-subtle)] bg-[#151515]">
              <div>Time</div>
              <div>Type</div>
              <div>USD</div>
              <div>Token0 Amount</div>
              <div>Token1 Amount</div>
              <div className="text-right">Txn Hash</div>
            </div>
            <div className="divide-y divide-[color:var(--border-subtle)]">
              {!isConnected ? (
                <div className="p-12 text-center text-ash text-xs">
                  Connect your wallet to see activity
                </div>
              ) : profileSwapsLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-4 items-center animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-16" />
                    <div className="h-4 bg-white/5 rounded w-32" />
                    <div className="h-4 bg-white/5 rounded w-16" />
                    <div className="h-4 bg-white/5 rounded w-20" />
                    <div className="h-4 bg-white/5 rounded w-20" />
                    <div className="h-4 bg-white/5 rounded w-24 md:ml-auto" />
                  </div>
                ))
              ) : paginatedTransactions && paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => {
                  const formattedTime = getRelativeTime(tx.timestamp);
                  return (
                    <div key={tx.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group">
                      <div className="flex md:block justify-between items-center text-[12px] text-ash font-mono">
                        <span className="md:hidden text-[11px] text-ash uppercase">Time</span>
                        {formattedTime}
                      </div>

                      <div className="flex md:block justify-between items-center">
                        <span className="md:hidden text-[11px] text-ash uppercase">Type</span>
                        <p className="text-xs text-bone group-hover:text-white transition-colors">{tx.type}</p>
                      </div>

                      <div className="flex md:block justify-between items-center">
                        <span className="md:hidden text-[11px] text-ash uppercase">USD</span>
                        <p className="text-xs text-bone font-mono">
                          {tx.usd === '-' ? '-' : formatCurrency(tx.usd)}
                        </p>
                      </div>

                      <div className="flex md:block justify-between items-center">
                        <span className="md:hidden text-[11px] text-ash uppercase">Token0 Amount</span>
                        <p className={`text-[12px] font-mono ${tx.isToken0Negative ? 'text-ash' : 'text-emerald-400'}`}>{tx.token0Amount}</p>
                      </div>

                      <div className="flex md:block justify-between items-center">
                        <span className="md:hidden text-[11px] text-ash uppercase">Token1 Amount</span>
                        <p className={`text-[12px] font-mono ${tx.isToken1Negative ? 'text-ash' : 'text-emerald-400'}`}>{tx.token1Amount || '-'}</p>
                      </div>

                      <div className="flex md:block justify-between items-center md:text-right">
                        <span className="md:hidden text-[11px] text-ash uppercase">Txn Hash</span>
                        <a 
                          href={`https://liteforge.explorer.caldera.xyz/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] font-mono text-ash hover:text-bone transition-colors flex items-center justify-end gap-1.5"
                        >
                          {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                          <ExternalLink size={10} className="text-ash shrink-0" />
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-ash text-xs">
                  No transactions found
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-[color:var(--border-subtle)] flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#151515]">
              <p className="text-[12px] text-ash">
                {profileSwaps.length > 0 ? (
                  `Showing ${profileSwapsPage * PROFILE_PAGE_SIZE + 1}–${Math.min((profileSwapsPage + 1) * PROFILE_PAGE_SIZE, profileSwaps.length)} of ${profileSwaps.length} transactions`
                ) : (
                  'No transactions'
                )}
              </p>
              <div className="flex gap-2">
                <button 
                  disabled={!hasPrevProfilePage || profileSwapsLoading}
                  onClick={() => setProfileSwapsPage(prev => Math.max(0, prev - 1))}
                  className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  Prev
                </button>
                <button 
                  disabled={!hasNextProfilePage || profileSwapsLoading}
                  onClick={() => setProfileSwapsPage(prev => prev + 1)}
                  className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Send Assets Modal */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsSendModalOpen(false)}
          ></div>

          <div className="relative w-full max-w-lg bg-[#121212] border border-[color:var(--border-default)] p-6 md:p-8 rounded-[6px] shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setIsSendModalOpen(false)}
              className="absolute top-4 right-4 text-ash hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <h2 className="type-card-title text-bone mb-1">Send Assets</h2>
              <p className="text-[12px] text-ash max-w-sm">
                Transfer native ETH or any custom ERC20 token to another wallet address.
              </p>
            </div>

            <div className="w-full space-y-4">
              {/* Token Selector Dropdown */}
              <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px]">
                <label className="text-[11px] uppercase tracking-wider text-ash block mb-2 font-medium">Select Token</label>
                <div className="relative">
                  <select
                    value={selectedTokenAddress}
                    onChange={(e) => {
                      setSelectedTokenAddress(e.target.value);
                      setAmount(''); // clear amount to avoid wrong inputs
                    }}
                    className="w-full bg-[#0a0a0a] border border-[color:var(--border-subtle)] rounded-[4px] px-3 py-2.5 text-bone text-xs outline-none cursor-pointer appearance-none pr-8 focus:border-[color:var(--border-hover)]"
                  >
                    {selectableTokens.map((tok) => (
                      <option key={tok.address} value={tok.address} className="bg-[#121212] text-bone">
                        {tok.symbol} - {tok.name}
                      </option>
                    ))}
                    <option value="custom" className="bg-[#121212] text-bone">
                      CUSTOM TOKEN CONTRACT ADDRESS...
                    </option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 text-ash pointer-events-none w-4 h-4" />
                </div>
              </div>

              {/* Custom Token Address Input (if selected) */}
              {selectedTokenAddress === 'custom' && (
                <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px]">
                  <label className="text-[11px] uppercase tracking-wider text-ash block mb-2 font-medium">Token Contract Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={customTokenAddress}
                    onChange={(e) => setCustomTokenAddress(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[color:var(--border-subtle)] rounded-[4px] px-3 py-2 text-bone text-xs font-mono outline-none focus:border-[color:var(--border-hover)]"
                  />
                  {customTokenLoading && (
                    <div className="flex items-center gap-2 mt-2 text-[12px] text-ash">
                      <Loader2 size={12} className="animate-spin" />
                      Loading token contract details...
                    </div>
                  )}
                  {customTokenError && (
                    <div className="text-[12px] text-rose-400 mt-2">
                      {customTokenError}
                    </div>
                  )}
                  {customTokenDetails && (
                    <div className="mt-3 flex items-center justify-between border-t border-[color:var(--border-subtle)] pt-3">
                      <div className="flex items-center gap-2">
                        <img src={customTokenDetails.logo} className="w-5 h-5 rounded-full" />
                        <div>
                          <p className="text-xs text-bone font-medium">{customTokenDetails.symbol}</p>
                          <p className="text-[11px] text-ash">{customTokenDetails.name}</p>
                        </div>
                      </div>
                      <div className="text-right text-[12px] font-mono text-ash">
                        DECIMALS: {customTokenDetails.decimals}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recipient Address */}
              <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px]">
                <label className="text-[11px] uppercase tracking-wider text-ash block mb-2 font-medium">Recipient Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[color:var(--border-subtle)] rounded-[4px] px-3 py-2 text-bone text-xs font-mono outline-none focus:border-[color:var(--border-hover)]"
                />
              </div>

              {/* Amount Input */}
              <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] uppercase tracking-wider text-ash font-medium">Amount</label>
                  <span className="text-[11px] text-ash font-mono">
                    Balance: {parseFloat(getSelectedTokenDetails().formattedBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })} {getSelectedTokenDetails().symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <input
                    type="text"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent text-xl text-bone outline-none w-2/3 font-mono"
                  />
                  <button
                    onClick={() => setAmount(getSelectedTokenDetails().formattedBalance)}
                    className="ui-button ui-button-secondary !min-h-7 !px-2.5 rounded-[4px] text-[11px] font-mono shrink-0"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-6">
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="ui-button ui-button-secondary rounded-[6px] text-xs py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sendLoading || (selectedTokenAddress === 'custom' && !customTokenDetails)}
                className="ui-button ui-button-primary rounded-[6px] text-xs py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    Send Assets
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
