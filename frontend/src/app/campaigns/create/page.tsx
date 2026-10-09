import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trophy, Zap, ChevronLeft, Sparkles, Check, 
  Layers, Plus, ShieldCheck, Flame, Info, ArrowRight, ExternalLink, Clock
} from 'lucide-react';
import { TOKENS } from '../../../config/tokens';
import { POINTSHOOK_ADDRESS, API_BASE_URL } from '../../../lib/constants';

interface PoolOption {
  id: string;
  currency0: string;
  currency1: string;
  symbol0: string;
  symbol1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export default function CreateCampaignPage() {
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('Trading & Liquidity Program');
  const [description, setDescription] = useState(
    'Swap in eligible pools to earn reward points. Points are tracked live on the leaderboard and qualify participants for future rewards.'
  );
  const [rewardType, setRewardType] = useState('ERC-1155 Tokens');
  const [rewardRate, setRewardRate] = useState('1% of Swap Volume in PTS');
  const [distribution, setDistribution] = useState('Instant On-Chain Mint');
  const [hookAddress, setHookAddress] = useState(POINTSHOOK_ADDRESS || '0xab6c2AE76cAc77d7941eB4F1c48d297a1E2b0040');
  const [isCustomHook, setIsCustomHook] = useState(false);
  const [durationDays, setDurationDays] = useState(14);
  const [customDays, setCustomDays] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const effectiveDays = isCustomDuration ? (parseInt(customDays, 10) || 14) : durationDays;
  const endDateStr = useMemo(() => {
    const d = new Date(Date.now() + effectiveDays * 86400 * 1000);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [effectiveDays]);

  // Pools state
  const [availablePools, setAvailablePools] = useState<PoolOption[]>([]);
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available pools from backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/pools`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.pools)) {
          const mapped: PoolOption[] = data.pools.map((p: any) => {
            const sym0 = p.token0?.symbol || TOKENS.find(t => t.address.toLowerCase() === (p.currency0 || p.token0?.id)?.toLowerCase())?.symbol || 'T0';
            const sym1 = p.token1?.symbol || TOKENS.find(t => t.address.toLowerCase() === (p.currency1 || p.token1?.id)?.toLowerCase())?.symbol || 'T1';
            return {
              id: p.id,
              currency0: p.token0?.id || p.currency0,
              currency1: p.token1?.id || p.currency1,
              symbol0: sym0,
              symbol1: sym1,
              fee: Number(p.feeTier || p.fee || 3000),
              tickSpacing: Number(p.tickSpacing || 60),
              hooks: p.hooks || '0x0000000000000000000000000000000000000000',
            };
          });
          setAvailablePools(mapped);
          // Default select the first 2 pools or any with PointsHook
          const defaultSelected = mapped
            .filter(p => p.hooks.toLowerCase() === (POINTSHOOK_ADDRESS || '').toLowerCase())
            .map(p => p.id);
          if (defaultSelected.length > 0) {
            setSelectedPoolIds(defaultSelected);
          } else if (mapped.length > 0) {
            setSelectedPoolIds([mapped[0].id]);
          }
        }
      })
      .catch(err => {
        console.warn('Could not load pools:', err);
      })
      .finally(() => setLoadingPools(false));
  }, []);

  const togglePool = (poolId: string) => {
    setSelectedPoolIds(prev => 
      prev.includes(poolId) ? prev.filter(id => id !== poolId) : [...prev, poolId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a campaign name.');
      return;
    }
    if (selectedPoolIds.length === 0) {
      setError('Please select at least one eligible trading pool.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const selectedPoolKeys = availablePools
      .filter(p => selectedPoolIds.includes(p.id))
      .map(p => ({
        currency0: p.currency0,
        currency1: p.currency1,
        fee: p.fee,
        tickSpacing: p.tickSpacing,
        hooks: hookAddress,
      }));

    const finalDurationDays = isCustomDuration ? (parseInt(customDays, 10) || 14) : durationDays;

    const payload = {
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      rewardType,
      rewardRate,
      distribution,
      address: hookAddress,
      poolKeys: selectedPoolKeys,
      durationDays: finalDurationDays,
      active: true,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      // Redirect to newly created campaign or campaigns list
      if (data.campaign?.id) {
        navigate(`/campaigns/${data.campaign.id}`, { state: { campaign: data.campaign } });
      } else {
        navigate('/campaigns');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-32 sm:pb-40 relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6">
      {/* Back button */}
      <Link 
        to="/campaigns" 
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-ash hover:text-bone mb-6 transition-colors group"
      >
        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <header className="mb-8">
        <div className="section-tag mb-2">
          [ Campaign Launchpad ]
        </div>
        <h1 className="type-h2 font-display text-white">Create Reward Campaign</h1>
        <p className="section-subtitle !mt-2 max-w-xl text-ash text-[14px]">
          Launch a trading competition, liquidity mining sprint, or community airdrop campaign for pools on Balary.
        </p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Campaign Details */}
        <div className="rounded-[8px] border border-[color:var(--border-subtle)] bg-[#121212] p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
            <Trophy size={16} className="text-white" />
            <h3 className="text-sm font-medium text-white uppercase tracking-wider font-mono">1. Campaign Identity</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ash mb-1.5">
                Campaign Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Balary Liquidity Rush Season 1"
                required
                className="w-full bg-[#181818] border border-[color:var(--border-subtle)] focus:border-white/30 rounded-[6px] px-3.5 py-2.5 text-[14px] text-white placeholder-ash/40 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ash mb-1.5">
                Tagline / Category
              </label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="e.g. Official Community Trading League"
                className="w-full bg-[#181818] border border-[color:var(--border-subtle)] focus:border-white/30 rounded-[6px] px-3.5 py-2.5 text-[14px] text-white placeholder-ash/40 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ash mb-1.5">
                Description & Rules
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe how participants earn rewards, eligibility criteria, and scoring..."
                className="w-full bg-[#181818] border border-[color:var(--border-subtle)] focus:border-white/30 rounded-[6px] px-3.5 py-2.5 text-[14px] text-white placeholder-ash/40 outline-none transition-colors resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-medium text-ash flex items-center gap-1.5">
                  <Clock size={13} className="text-white" />
                  <span>Campaign Duration</span>
                  <span className="text-emerald-400">*</span>
                </label>
                <span className="text-[11px] font-mono text-ash bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                  Ends {endDateStr}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
                {[
                  { days: 7, label: '7 Days', sub: '1 Week Sprint' },
                  { days: 14, label: '14 Days', sub: '2 Weeks · Standard' },
                  { days: 30, label: '30 Days', sub: '1 Month Season' },
                  { days: 60, label: '60 Days', sub: '2 Months Extended' },
                ].map(opt => {
                  const isSelected = !isCustomDuration && durationDays === opt.days;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => {
                        setIsCustomDuration(false);
                        setDurationDays(opt.days);
                      }}
                      className={`text-left p-2.5 rounded-[6px] border transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                          : 'bg-[#181818] border-[color:var(--border-subtle)] text-ash hover:border-white/20'
                      }`}
                    >
                      <div className="text-[12px] font-medium text-white">{opt.label}</div>
                      <div className="text-[10px] text-ash/70 mt-0.5">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomDuration(!isCustomDuration)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-[4px] border transition-colors cursor-pointer ${
                    isCustomDuration
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'border-white/10 text-ash hover:text-white bg-[#181818]'
                  }`}
                >
                  {isCustomDuration ? 'Custom Duration Active' : '+ Custom Duration'}
                </button>
                {isCustomDuration && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={customDays}
                      onChange={e => setCustomDays(e.target.value)}
                      placeholder="e.g. 21"
                      className="w-20 bg-[#181818] border border-[color:var(--border-subtle)] focus:border-white/30 rounded-[4px] px-2.5 py-1 text-xs text-white outline-none font-mono"
                    />
                    <span className="text-xs text-ash">days</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-ash/60 mt-1.5">
                Campaigns automatically end once the duration expires. Reward minting will halt upon completion.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Reward Mechanism */}
        <div className="rounded-[8px] border border-[color:var(--border-subtle)] bg-[#121212] p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
            <Zap size={16} className="text-white" />
            <h3 className="text-sm font-medium text-white uppercase tracking-wider font-mono">2. Reward Engine & Mechanism</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ash mb-2">
                Reward Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRewardType('ERC-1155 Tokens');
                    setRewardRate('1% of Swap Volume in PTS');
                    setDistribution('Instant On-Chain Mint');
                  }}
                  className={`text-left p-3.5 rounded-[6px] border transition-all ${
                    rewardType === 'ERC-1155 Tokens'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-[#181818] border-[color:var(--border-subtle)] text-ash hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium text-white">LitVM Points</span>
                    {rewardType === 'ERC-1155 Tokens' && <Check size={14} className="text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-ash/80 leading-normal">
                    Automated ERC-1155 tokens minted directly into trader wallets on every swap.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRewardType('Token Prize Pool');
                    setRewardRate('10,000 BAL / Top 50 Swappers');
                    setDistribution('Leaderboard Snapshot');
                  }}
                  className={`text-left p-3.5 rounded-[6px] border transition-all ${
                    rewardType === 'Token Prize Pool'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-[#181818] border-[color:var(--border-subtle)] text-ash hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium text-white">Token Prize Pool</span>
                    {rewardType === 'Token Prize Pool' && <Check size={14} className="text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-ash/80 leading-normal">
                    Fixed reward pot (e.g. $BAL or $USDC) distributed to leaders at season end.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRewardType('Custom Airdrop');
                    setRewardRate('Proportional Volume Share');
                    setDistribution('Post-Season Claim');
                  }}
                  className={`text-left p-3.5 rounded-[6px] border transition-all ${
                    rewardType === 'Custom Airdrop'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-[#181818] border-[color:var(--border-subtle)] text-ash hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium text-white">Custom Airdrop</span>
                    {rewardType === 'Custom Airdrop' && <Check size={14} className="text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-ash/80 leading-normal">
                    Retroactive rewards based on verified on-chain trading activity.
                  </p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-ash mb-1.5">
                  Reward Rate / Budget
                </label>
                <input
                  type="text"
                  value={rewardRate}
                  onChange={e => setRewardRate(e.target.value)}
                  placeholder="e.g. 1% of Swap Volume in PTS"
                  className="w-full bg-[#181818] border border-[color:var(--border-subtle)] focus:border-white/30 rounded-[6px] px-3.5 py-2.5 text-[14px] text-white placeholder-ash/40 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ash mb-1.5">
                  Distribution Method
                </label>
                <input
                  type="text"
                  value={distribution}
                  onChange={e => setDistribution(e.target.value)}
                  placeholder="e.g. Instant On-Chain Mint"
                  className="w-full bg-[#181818] border border-[color:var(--border-subtle)] focus:border-white/30 rounded-[6px] px-3.5 py-2.5 text-[14px] text-white placeholder-ash/40 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-ash">
                  Hook Contract Address
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomHook(!isCustomHook)}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  {isCustomHook ? 'Use Default PointsHook' : 'Custom Hook Address'}
                </button>
              </div>
              <input
                type="text"
                value={hookAddress}
                onChange={e => setHookAddress(e.target.value)}
                readOnly={!isCustomHook}
                className={`w-full font-mono text-[13px] rounded-[6px] px-3.5 py-2.5 border transition-colors outline-none ${
                  isCustomHook
                    ? 'bg-[#181818] border-white/20 text-white'
                    : 'bg-[#151515] border-[color:var(--border-subtle)] text-ash/80 cursor-default'
                }`}
              />
              <p className="text-[11px] text-ash/60 mt-1">
                LitVM PointsHook automatically tracks all swapper addresses and mints ERC-1155 tokens per pool.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Eligible Trading Pools */}
        <div className="rounded-[8px] border border-[color:var(--border-subtle)] bg-[#121212] p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-white" />
              <h3 className="text-sm font-medium text-white uppercase tracking-wider font-mono">
                3. Eligible Pools ({selectedPoolIds.length} Selected)
              </h3>
            </div>
            <Link
              to="/pools/create?hook=points"
              className="text-[12px] text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Plus size={12} />
              Deploy New Pool First ↗
            </Link>
          </div>

          {loadingPools ? (
            <div className="py-8 text-center text-ash text-xs">Loading available pools...</div>
          ) : availablePools.length === 0 ? (
            <div className="py-8 text-center text-ash text-xs">
              No pools found on network. Please <Link to="/pools/create" className="text-white underline">create a pool</Link> first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {availablePools.map(pool => {
                const isSelected = selectedPoolIds.includes(pool.id);
                return (
                  <div
                    key={pool.id}
                    onClick={() => togglePool(pool.id)}
                    className={`cursor-pointer p-3.5 rounded-[6px] border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-[#181818] border-[color:var(--border-subtle)] text-ash hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/20'
                      }`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white flex items-center gap-1.5">
                          <span>{pool.symbol0} / {pool.symbol1}</span>
                          <span className="text-[10px] font-mono text-ash bg-white/[0.05] px-1.5 py-0.2 rounded">
                            {(pool.fee / 10000).toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-ash/60 mt-0.5 truncate max-w-[180px]">
                          {pool.id.slice(0, 10)}…{pool.id.slice(-6)}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-white/10 text-ash">
                      {pool.hooks.toLowerCase() === (POINTSHOOK_ADDRESS || '').toLowerCase() ? '+Points' : 'Pool'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Error message if any */}
        {error && (
          <div className="p-4 rounded-[6px] bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2">
            <Info size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
          <p className="text-[12px] text-ash">
            Campaigns immediately become active and visible to all traders on Balary.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="ui-button ui-button-primary !min-h-11 !px-8 text-[14px] w-full sm:w-auto justify-center font-medium"
          >
            {submitting ? (
              <span>Deploying Campaign...</span>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Publish Campaign</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
