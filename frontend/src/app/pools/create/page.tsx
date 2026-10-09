import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Info, Plug, Sparkles, Award } from 'lucide-react';
import TokenSelector, { Token } from '@/components/TokenSelector';
import { TOKENS } from '@/config/tokens';
import { usePool } from '@/hooks/pool/usePool';
import Toast from '@/components/Toast';
import { zeroAddress } from 'viem';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { POINTSHOOK_ADDRESS } from '@/lib/constants';

export default function CreatePoolPage() {
  const [searchParams] = useSearchParams();
  const { isConnected } = useAccount();
  const { open } = useAppKit();

  const [feeTier, setFeeTier] = useState(0.3);
  const [tickSpacing, setTickSpacing] = useState(60);
  const [priceRatioA, setPriceRatioA] = useState('1');
  const [priceRatioB, setPriceRatioB] = useState('1');
  const [isCustomRatio, setIsCustomRatio] = useState(false);
  const [customPriceA, setCustomPriceA] = useState('1');
  const [customPriceB, setCustomPriceB] = useState('1');

  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);
  const [tokenA, setTokenA] = useState<Token>(TOKENS[2]);
  const [tokenB, setTokenB] = useState<Token>(TOKENS[3]);

  const { initializePool, isConfirming, toast, dismissToast } = usePool()


  const isPointsRequested = searchParams.get('hook') === 'points';
  const [hookType, setHookType] = useState<'none' | 'points' | 'custom'>(isPointsRequested ? 'points' : 'none');
  const [hooks, setHooks] = useState<`0x${string}`>(isPointsRequested ? (POINTSHOOK_ADDRESS as `0x${string}`) : zeroAddress);


  const copyToken = (address: string, isA: boolean) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    if (isA) {
      setCopiedA(true);
      setTimeout(() => setCopiedA(false), 2000);
    } else {
      setCopiedB(true);
      setTimeout(() => setCopiedB(false), 2000);
    }
  };

  const feeTiers = [
    { label: 0.01, sub: 'STABLE', spacing: 1 },
    { label: 0.05, sub: 'BEST', spacing: 10 },
    { label: 0.3, sub: 'DEFI', spacing: 60 },
    { label: 1.00, sub: 'EXOTIC', spacing: 200 },
  ];

  const [copied0, setCopied0] = useState(false);
  const [copied1, setCopied1] = useState(false);

  const copyToClipboard = (text: string, isToken0: boolean) => {
    navigator.clipboard.writeText(text);
    if (isToken0) {
      setCopied0(true);
      setTimeout(() => setCopied0(false), 2000);
    } else {
      setCopied1(true);
      setTimeout(() => setCopied1(false), 2000);
    }
  };

  const isTokenA0 = (tokenA.address || '').toLowerCase() < (tokenB.address || '').toLowerCase();
  const t0 = isTokenA0 ? tokenA : tokenB;
  const t1 = isTokenA0 ? tokenB : tokenA;


  return (
    <div className="pb-32 sm:pb-40 max-w-4xl mx-auto relative w-full px-4 sm:px-6 md:px-0">
      <div className="w-full max-w-[560px]">      

          {/* Toast Demo Layer */}
          
          {toast.show && (

            <div className="fixed top-15 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
              <Toast
                  type={toast.type}
                  title={toast.title}
                  message={toast.message}
                  txHash={toast.txHash}
                  onClose={dismissToast}
                />
            </div>
          )}
      </div>
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-40 left-0 w-[250px] h-[250px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

      <Link to="/pools" className="flex items-center gap-2 text-ash hover:text-white transition-colors mb-6 group w-fit text-xs font-medium">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        <span>Back to Pools</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <div className="section-tag mb-1">[ Initialize ]</div>
        <h1 className="type-h1 font-display text-white">Create Pool</h1>
      </div>

      <div className="bg-[#121212] border border-[color:var(--border-default)] p-4 sm:p-6 md:p-8 rounded-[6px] relative overflow-hidden space-y-8">

        {/* Select Pair Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase tracking-wider text-ash font-medium">Step 1: Select Pair</label>
            <Info size={13} className="text-ash/40" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Token A */}
            <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px] flex flex-col gap-3">
              <span className="text-[11px] uppercase tracking-wider text-ash font-medium">First Asset</span>
              <div className="flex justify-between items-center">
                <TokenSelector
                  selectedToken={tokenA}
                  onSelect={setTokenA}
                  tokens={TOKENS}
                  excludeToken={tokenB}
                  className="w-full"
                />
              </div>
            </div>

            {/* Token B */}
            <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px] flex flex-col gap-3">
              <span className="text-[11px] uppercase tracking-wider text-ash font-medium">Second Asset</span>
              <div className="flex justify-between items-center">
                <TokenSelector
                  selectedToken={tokenB}
                  onSelect={setTokenB}
                  tokens={TOKENS}
                  excludeToken={tokenA}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Token Order Summary - Protocol Readout */}
          <div className="bg-[#0c0c0c] border border-[color:var(--border-subtle)] p-4 rounded-[6px] font-mono text-xs">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-ash text-[12px] w-6">[0]</span>
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-bone font-medium uppercase">{t0.symbol}</span>
                      <span className="text-ash/60 text-[11px]">Token0</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(t0.address || '', true)}
                      className={`transition-colors p-1 cursor-pointer ${copied0 ? 'text-emerald-400' : 'text-ash/40 hover:text-white'}`}
                      title="Copy Address"
                    >
                      {copied0 ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <span className="text-ash/70 text-[11px] font-mono break-all select-all">
                    {t0.address}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-[color:var(--border-subtle)]">
                <span className="text-ash text-[12px] w-6">[1]</span>
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-bone font-medium uppercase">{t1.symbol}</span>
                      <span className="text-ash/60 text-[11px]">Token1</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(t1.address || '', false)}
                      className={`transition-colors p-1 ${copied1 ? 'text-emerald-400' : 'text-ash/40 hover:text-white'}`}
                      title="Copy Address"
                    >
                      {copied1 ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <span className="text-ash/70 text-[11px] font-mono break-all select-all">
                    {t1.address}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Tier Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase tracking-wider text-ash font-medium">Step 2: Select Fee Tier</label>
            <Info size={13} className="text-ash/40" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {feeTiers.map((tier) => (
              <button
                key={tier.label}
                onClick={() => {setFeeTier(tier.label);setTickSpacing(tier.spacing)}}
                className={`flex flex-col text-left transition-all p-4 rounded-[6px] border cursor-pointer ${feeTier === tier.label
                  ? 'bg-white/[0.08] border-white/30 text-white'
                  : 'bg-[#151515] border-[color:var(--border-subtle)] hover:border-[color:var(--border-hover)] text-ash'
                  }`}
              >
                <span className={`text-2xl font-display font-medium tracking-tight mb-2 ${feeTier === tier.label ? 'text-bone' : 'text-ash'}`}>
                  {tier.label}%
                </span>
                <div className="flex items-center justify-between pt-2 border-t border-white/5 w-full text-[11px] font-mono">
                  <span>Tick: {tier.spacing}</span>
                  {feeTier === tier.label && <Check size={12} className="text-bone" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Starting Price Ratio Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase tracking-wider text-ash font-medium">Step 3: Initial Price</label>
            <Info size={13} className="text-ash/40" />
          </div>
          <div className="flex flex-wrap gap-2">
            {['1:1', '2:1', '1:2', 'CUSTOM'].map((opt) => {
              const isCustomOpt = opt === 'CUSTOM';
              const [a, b] = isCustomOpt ? [customPriceA, customPriceB] : opt.split(':');
              const isActive = isCustomOpt
                ? isCustomRatio
                : !isCustomRatio && priceRatioA === a && priceRatioB === b;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    if (isCustomOpt) {
                      setIsCustomRatio(true);
                      setPriceRatioA(customPriceA);
                      setPriceRatioB(customPriceB);
                    } else {
                      setIsCustomRatio(false);
                      setPriceRatioA(a);
                      setPriceRatioB(b);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-mono rounded-[4px] border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.1] border-white/30 text-bone font-medium'
                      : 'bg-[#151515] border-[color:var(--border-subtle)] text-ash hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {isCustomRatio && (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px]">
              <div className="space-y-1">
                <p className="text-[11px] text-ash text-center font-mono">{t0.symbol}</p>
                <input
                  className="w-full bg-transparent border-b border-[color:var(--border-subtle)] py-1.5 text-center focus:outline-none focus:border-white/40 transition-all text-xl text-bone font-mono"
                  type="text"
                  value={customPriceA}
                  onChange={(e) => {
                    setCustomPriceA(e.target.value);
                    setPriceRatioA(e.target.value);
                  }}
                />
              </div>
              <span className="text-ash text-xl">:</span>
              <div className="space-y-1">
                <p className="text-[11px] text-ash text-center font-mono">{t1.symbol}</p>
                <input
                  className="w-full bg-transparent border-b border-[color:var(--border-subtle)] py-1.5 text-center focus:outline-none focus:border-white/40 transition-all text-xl text-bone font-mono"
                  type="text"
                  value={customPriceB}
                  onChange={(e) => {
                    setCustomPriceB(e.target.value);
                    setPriceRatioB(e.target.value);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Hook Details Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase tracking-wider text-ash font-medium">Step 4: Extension Hooks</label>
            <Info size={13} className="text-ash/40" />
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setHookType('none');
                setHooks(zeroAddress);
              }}
              className={`p-4 rounded-[6px] border text-left flex flex-col justify-between transition-all cursor-pointer ${
                hookType === 'none'
                  ? 'bg-white/[0.08] border-white/30 text-white'
                  : 'bg-[#151515] border-[color:var(--border-subtle)] text-ash hover:border-[color:var(--border-hover)]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-bone">Standard Pool</span>
                {hookType === 'none' && <Check size={14} className="text-bone" />}
              </div>
              <p className="text-[11px] text-ash/80 leading-relaxed">
                Standard Uniswap v4 liquidity pool with no hook attachments or automated incentives.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setHookType('points');
                setHooks(POINTSHOOK_ADDRESS as `0x${string}`);
              }}
              className={`p-4 rounded-[6px] border text-left flex flex-col justify-between transition-all cursor-pointer ${
                hookType === 'points'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                  : 'bg-[#151515] border-[color:var(--border-subtle)] text-ash hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-emerald-400" />
                    Incentivized Campaign
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    +Points
                  </span>
                </div>
                {hookType === 'points' && <Check size={14} className="text-emerald-400" />}
              </div>
              <p className="text-[11px] text-ash/80 leading-relaxed">
                LitVM PointsHook streams ERC-1155 on-chain points to swappers, qualifying this pool for official reward campaigns.
              </p>
            </button>
          </div>

          <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug size={13} className="text-ash" />
                <span className="text-xs text-bone font-medium">Hook Contract Address</span>
              </div>
              {hookType === 'points' && (
                <span className="text-[10px] font-mono text-emerald-400">
                  LitVM PointsHook Active
                </span>
              )}
            </div>

            <div className="relative">
              <input
                className="w-full bg-[#0c0c0c] border border-[color:var(--border-subtle)] px-3 py-2.5 rounded-[4px] font-mono text-xs text-bone placeholder:text-ash/40 focus:outline-none focus:border-[color:var(--border-hover)]"
                type="text"
                placeholder={zeroAddress}
                value={hooks === zeroAddress ? '' : hooks}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (val === '') {
                    setHooks(zeroAddress);
                    setHookType('none');
                  } else {
                    setHooks(val as `0x${string}`);
                    if (val.toLowerCase() === POINTSHOOK_ADDRESS.toLowerCase()) {
                      setHookType('points');
                    } else {
                      setHookType('custom');
                    }
                  }
                }}
              />
              {hooks !== zeroAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setHooks(zeroAddress);
                    setHookType('none');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ash hover:text-white cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            
            {hooks !== zeroAddress && !/^0x[a-fA-F0-9]{40}$/.test(hooks) && (
              <p className="text-rose-400 text-[11px] font-mono">
                Invalid Ethereum address format
              </p>
            )}
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          {!isConnected ? (
            <button
              onClick={() => open()}
              className="ui-button ui-button-primary w-full py-3.5 rounded-[6px] text-sm font-medium flex items-center justify-center cursor-pointer"
            >
              Connect Wallet
            </button>
          ) : (
            <button 
              disabled={isConfirming}
              className={`ui-button ui-button-primary w-full py-3.5 rounded-[6px] text-sm font-medium flex items-center justify-center cursor-pointer ${isConfirming ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => initializePool({
                tokenA: t0,
                tokenB: t1,
                fee: feeTier * 10000,
                tickSpacing,
                hooks,
                priceRatioA,
                priceRatioB
              })}
            >
              {isConfirming ? 'Confirming...' : 'Initialize Pool'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
