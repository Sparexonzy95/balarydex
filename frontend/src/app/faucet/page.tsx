import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Droplets, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Coins, 
  Loader2, 
  Layers, 
  ArrowLeftRight 
} from 'lucide-react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { formatUnits } from 'viem';

import { TOKENS } from '@/config/tokens';
import { FAUCET_ADDRESS } from '@/lib/constants';
import FAUCET_ABI from '@/abi/MultiTokenFaucet.json';
import TokenImage from '@/components/TokenImage';
import Toast, { ToastType } from '@/components/Toast';
import { useTokenBalance } from '@/hooks/shared/useTokenBalance';

interface TokenClaimRowProps {
  token: typeof TOKENS[0];
  userAddress: string | undefined;
}

function TokenClaimRow({ token, userAddress }: TokenClaimRowProps) {
  const { formattedBalance } = useTokenBalance({ token, address: userAddress });

  return (
    <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#181818] p-4 flex items-center justify-between hover:border-[color:var(--border-default)] transition-colors">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-[6px] border border-white/10 bg-[#121212] flex items-center justify-center overflow-hidden shrink-0">
          <TokenImage 
            tokenAddress={token.address} 
            symbol={token.symbol} 
            className="w-full h-full object-contain" 
            alt={token.symbol} 
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-medium text-white">{token.symbol}</h3>
            <span className="text-[10px] text-ash uppercase tracking-wider font-mono">
              {token.decimals} dec
            </span>
          </div>
          <p className="text-[12px] text-ash">{token.name}</p>
        </div>
      </div>

      <div className="text-right flex flex-col items-end">
        <span className="text-[13px] font-medium text-bone font-mono">
          +500 {token.symbol}
        </span>
        <span className="text-[11px] font-mono text-ash mt-0.5">
          Bal: {formattedBalance}
        </span>
      </div>
    </div>
  );
}

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [copied, setCopied] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(86400);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [toast, setToast] = useState<{
    show: boolean;
    type: ToastType;
    title: string;
    message: string;
    txHash?: string;
  }>({
    show: false,
    type: 'pending',
    title: '',
    message: '',
  });

  const showToast = (type: ToastType, title: string, message: string, txHash?: string) => {
    setToast({ show: true, type, title, message, txHash });
  };

  const dismissToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  const copyFaucetAddress = () => {
    navigator.clipboard.writeText(FAUCET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch cooldown and time until next claim
  useEffect(() => {
    if (!publicClient) return;

    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const cd = await publicClient.readContract({
          address: FAUCET_ADDRESS as `0x${string}`,
          abi: FAUCET_ABI.abi,
          functionName: 'cooldown',
        }) as bigint;

        if (isMounted) setCooldownSeconds(Number(cd));

        if (address) {
          const remaining = await publicClient.readContract({
            address: FAUCET_ADDRESS as `0x${string}`,
            abi: FAUCET_ABI.abi,
            functionName: 'timeUntilNextClaim',
            args: [address as `0x${string}`],
          }) as bigint;

          if (isMounted) setTimeUntilNext(Number(remaining));
        } else {
          if (isMounted) setTimeUntilNext(0);
        }
      } catch (err) {
        console.warn('Error fetching faucet status:', err);
      }
    };

    fetchStatus();

    // Local countdown ticker
    const timer = setInterval(() => {
      setTimeUntilNext(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [publicClient, address, refreshTrigger]);

  const handleClaim = async () => {
    if (!isConnected || !address) {
      open();
      return;
    }

    if (timeUntilNext > 0) {
      showToast('error', 'Cooldown Active', `Please wait ${formatCooldown(timeUntilNext)} before claiming again.`);
      return;
    }

    try {
      setIsClaiming(true);
      showToast('pending', 'Claiming Tokens', 'Initiating faucet claim transaction...');

      const hash = await writeContractAsync({
        address: FAUCET_ADDRESS as `0x${string}`,
        abi: FAUCET_ABI.abi,
        functionName: 'claim',
      });

      showToast('pending', 'Transaction Submitted', 'Waiting for on-chain confirmation on LitVM...', hash);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      showToast(
        'success',
        'Claim Successful!',
        '500 of each token (BAL, USDC, WLTC, SOFT, MONKE) have been deposited into your wallet.',
        hash
      );

      // Trigger cooldown and balance refresh
      setTimeUntilNext(cooldownSeconds || 86400);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Faucet claim error:', err);
      const msg = err?.shortMessage || err?.message || 'Transaction was rejected or reverted.';
      showToast('error', 'Claim Failed', msg);
    } finally {
      setIsClaiming(false);
    }
  };

  const formatCooldown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const formatCooldownBadge = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.round(seconds / 3600);
      return `${hours} Hour${hours > 1 ? 's' : ''}`;
    }
    const mins = Math.round(seconds / 60);
    return `${mins} Minute${mins > 1 ? 's' : ''}`;
  };

  return (
    <div className="pb-40 max-w-4xl mx-auto relative w-full">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-20 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            txHash={toast.txHash}
            onClose={dismissToast}
          />
        </div>
      )}

      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-[350px] h-[350px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Droplets size={22} />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary font-semibold">
              LitVM LiteForge Testnet (4441)
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Testnet Token Faucet
          </h1>
          <p className="text-sm text-white/50 mt-2 max-w-xl">
            Claim free test tokens (BAL, USDC, WLTC, SOFT, MONKE) to create liquidity pools, provide liquidity, and test swaps on Balary.
          </p>
        </div>

        {/* Faucet Address Pill */}
        <div className="bg-white/[0.03] border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-white/30">Faucet Contract</span>
            <span className="text-xs font-mono text-white/80">
              {FAUCET_ADDRESS.slice(0, 6)}...{FAUCET_ADDRESS.slice(-4)}
            </span>
          </div>
          <button
            onClick={copyFaucetAddress}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
            title="Copy Faucet Contract"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <a
            href={`https://liteforge.explorer.caldera.xyz/address/${FAUCET_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-primary transition-colors"
            title="View Contract on Explorer"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Claim Action Box */}
      <div className="ui-surface rounded-[8px] border border-[color:var(--border-default)] !bg-[#121212] p-6 sm:p-8 mb-10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[color:var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-white" />
              <h2 className="text-[17px] font-medium text-white">Instant Multi-Token Bundle</h2>
            </div>
            <p className="text-[13px] text-ash">
              Delivers <span className="text-white font-medium">500 units</span> of each supported test token directly to your wallet.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-ash">
            <Clock size={14} />
            <span>Cooldown:</span>
            <span className="font-mono text-white bg-[#181818] border border-[color:var(--border-subtle)] px-2.5 py-0.5 rounded-[4px]">
              {formatCooldownBadge(cooldownSeconds || 86400)}
            </span>
          </div>
        </div>

        {/* Tokens In Bundle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-6">
          {TOKENS.map((token) => (
            <TokenClaimRow
              key={token.address}
              token={token}
              userAddress={address}
            />
          ))}
        </div>

        {/* Claim Button */}
        <div>
          {!isConnected ? (
            <button
              onClick={() => open()}
              className="ui-button ui-button-primary w-full !min-h-12 !text-[14px] font-medium"
            >
              Connect Wallet to Claim
            </button>
          ) : timeUntilNext > 0 ? (
            <button
              disabled
              className="ui-button ui-button-secondary w-full !min-h-12 !text-[14px] opacity-60 cursor-not-allowed"
            >
              <Clock size={15} />
              Cooldown Active: Next Claim in {formatCooldown(timeUntilNext)}
            </button>
          ) : (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className={`ui-button ui-button-primary w-full !min-h-12 !text-[14px] font-medium ${
                isClaiming ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isClaiming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Claiming Tokens on-chain...
                </>
              ) : (
                <>
                  <Droplets size={16} />
                  Claim All Test Tokens (500 Each)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Next Steps / Testing Workflow */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">
          What can you do with these tokens?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/pools/create"
            className="group bg-white/[0.02] border border-white/5 hover:border-primary/40 rounded-2xl p-6 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
                <Layers size={18} />
              </div>
              <h4 className="text-base font-semibold text-white group-hover:text-primary transition-colors">
                1. Create a Liquidity Pool
              </h4>
              <p className="text-xs text-white/40 mt-2 leading-relaxed">
                Use your newly claimed tokens (or import a custom ERC-20) to initialize a new Uniswap v4 pool on LitVM.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              Create Pool <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/pools"
            className="group bg-white/[0.02] border border-white/5 hover:border-primary/40 rounded-2xl p-6 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
                <Coins size={18} />
              </div>
              <h4 className="text-base font-semibold text-white group-hover:text-primary transition-colors">
                2. Provide Liquidity
              </h4>
              <p className="text-xs text-white/40 mt-2 leading-relaxed">
                Deposit tokens into active pools (like WLTC/SOFT or WLTC/BAL) to earn trading fees on every swap.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              Explore Pools <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/swap"
            className="group rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] hover:border-[color:var(--border-default)] p-5 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-[4px] bg-white/[0.05] border border-white/10 text-white flex items-center justify-center mb-3">
                <ArrowLeftRight size={17} />
              </div>
              <h4 className="text-[14px] font-medium text-white group-hover:text-bone transition-colors">
                3. Test Instant Swaps
              </h4>
              <p className="text-[12px] text-ash mt-1.5 leading-relaxed">
                Swap between BAL, USDC, WLTC, SOFT, and MONKE with low fees and live price execution on LitVM.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-white/80">
              Go to Swap <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
