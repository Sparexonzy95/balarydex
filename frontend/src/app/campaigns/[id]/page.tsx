import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers, formatUnits } from 'ethers';
import {
  Trophy, ChevronLeft, Crown, Circle, RefreshCw, Medal,
  ExternalLink, Flame, Clock, X, AlertTriangle, Droplets
} from 'lucide-react';
import { useAccount, usePublicClient } from 'wagmi';
import { campaigns, type HookCampaign, type PoolKey } from '../../../config/hooksDetail';
import { TOKENS } from '../../../config/tokens';
import { API_BASE_URL } from '../../../lib/constants';

// ── helpers ───────────────────────────────────────────────────────────────────

const NATIVE = '0x0000000000000000000000000000000000000000';

const ERC1155_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

function getToken(address: string) {
  if (address.toLowerCase() === NATIVE.toLowerCase())
    return { symbol: 'ETH', logo: '/assets/eth.png', address: NATIVE };
  return TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase()) ?? null;
}

function computePoolId(pk: PoolKey): string {
  const enc = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [pk.currency0, pk.currency1, pk.fee, pk.tickSpacing, pk.hooks]
  );
  return ethers.keccak256(enc);
}

function formatPoints(raw: string | bigint | number): string {
  try {
    const val = typeof raw === 'bigint' ? raw : BigInt(String(raw || 0));
    if (val === 0n) return '0.00';
    const num = Number(formatUnits(val, 18));
    if (num > 0 && num < 0.0001) {
      return Number(formatUnits(val, 6)).toFixed(4);
    }
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } catch (_) {
    return '0.00';
  }
}

function timeAgo(ts: string | number): string {
  const diff = Math.floor(Date.now() / 1000) - Number(ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatCampaignStatus(campaign: any): { isEnded: boolean; badgeText: string } {
  const now = Math.floor(Date.now() / 1000);
  const endsAt = campaign?.endsAt ? Number(campaign.endsAt) : null;
  const isExplicitInactive = campaign?.active === false;

  if (isExplicitInactive || (endsAt && now >= endsAt)) {
    return { isEnded: true, badgeText: 'Ended' };
  }

  if (endsAt) {
    const diff = endsAt - now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return { isEnded: false, badgeText: `Ends in ${days}d ${hours}h` };
    const mins = Math.floor((diff % 3600) / 60);
    if (hours > 0) return { isEnded: false, badgeText: `Ends in ${hours}h ${mins}m` };
    return { isEnded: false, badgeText: `Ends in ${mins}m` };
  }

  return { isEnded: false, badgeText: 'Active' };
}

// ── Leaderboard panel ─────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

function LeaderboardPanel({
  pk,
  connectedAddress,
}: {
  pk: PoolKey;
  connectedAddress?: string;
}) {
  const navigate = useNavigate();
  const publicClient = usePublicClient();
  const poolId = useMemo(() => computePoolId(pk), [pk]);

  const t0 = getToken(pk.currency0);
  const t1 = getToken(pk.currency1);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [userOnChainPoints, setUserOnChainPoints] = useState<bigint>(0n);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch leaderboard & on-chain user points
  const loadData = useCallback(async () => {
    setLoading(true);
    let cancelled = false;

    // 1. Fetch from backend indexer API
    try {
      const res = await fetch(`${API_BASE_URL}/api/campaigns/leaderboard?poolId=${poolId}&skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        if (!cancelled && data?.pointsBalances) {
          setRows(data.pointsBalances);
          setHasMore(!!data.hasMore);
        }
      }
    } catch (err) {
      console.warn('Could not fetch leaderboard API:', err);
    } finally {
      if (!cancelled) setLoading(false);
    }

    // 2. Fetch live on-chain points balance from PointsHook contract for connected user
    if (connectedAddress && publicClient) {
      try {
        const bal = await publicClient.readContract({
          address: pk.hooks,
          abi: ERC1155_ABI,
          functionName: 'balanceOf',
          args: [connectedAddress as `0x${string}`, BigInt(poolId)],
        });
        if (!cancelled) {
          setUserOnChainPoints(bal as bigint);
        }
      } catch (e) {
        console.warn('Error reading on-chain points:', e);
      }
    }

    return () => { cancelled = true; };
  }, [poolId, page, connectedAddress, publicClient, pk.hooks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const userEntry = useMemo(() => {
    if (!connectedAddress) return null;
    return rows.find(r => r.owner.toLowerCase() === connectedAddress.toLowerCase()) ?? null;
  }, [rows, connectedAddress]);

  const userRank = useMemo(() => {
    if (!connectedAddress) return null;
    const idx = rows.findIndex(r => r.owner.toLowerCase() === connectedAddress.toLowerCase());
    return idx >= 0 ? page * PAGE_SIZE + idx + 1 : (userOnChainPoints > 0n ? 1 : null);
  }, [rows, connectedAddress, page, userOnChainPoints]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Active Pool & Your Position Bar ── */}
      <div className="rounded-[8px] border border-white/[0.08] bg-[#121212] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Pool Info */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5 shrink-0">
            {[t0, t1].map((tk, i) => (
              <div key={i} className="w-8 h-8 rounded-full border border-black bg-black overflow-hidden flex items-center justify-center">
                {tk?.logo
                  ? <img src={tk.logo} alt={tk?.symbol} className="w-full h-full object-contain" />
                  : <div className="w-full h-full bg-white/10" />}
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium text-sm">
                {t0?.symbol ?? '??'} / {t1?.symbol ?? '??'}
              </h3>
              <span className="text-[10px] font-mono text-ash bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded-[4px]">
                {(pk.fee / 10000).toFixed(2)}%
              </span>
            </div>
            <p className="text-ash text-xs">
              Swap {t0?.symbol} and {t1?.symbol} to earn reward points.
            </p>
          </div>
        </div>

        {/* User stats + Action buttons */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
          {connectedAddress && (
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-[6px] px-3 py-1.5">
              <div>
                <span className="text-[9px] text-ash font-mono uppercase tracking-wider block">Rank</span>
                <span className="text-white font-mono font-medium text-xs">#{userRank ?? '1'}</span>
              </div>
              <div className="h-5 w-[1px] bg-white/[0.08]" />
              <div>
                <span className="text-[9px] text-ash font-mono uppercase tracking-wider block">Your Points</span>
                <span className="text-white font-mono font-medium text-xs">
                  {formatPoints(userOnChainPoints > 0n ? userOnChainPoints : (userEntry?.balance || 0))} <span className="text-[10px] text-ash">PTS</span>
                </span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1 rounded hover:bg-white/10 text-ash hover:text-white transition-colors cursor-pointer"
                title="Refresh points balance"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-white' : ''} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <button
              onClick={() => navigate(`/swap?from=${t0?.address}&to=${t1?.address}&poolId=${poolId}`)}
              className="ui-button-primary rounded-[6px] px-3.5 py-1.5 text-xs flex items-center gap-1.5"
            >
              <Flame size={13} />
              <span>Swap & Earn</span>
            </button>
            <Link
              to={`/pools/${poolId}`}
              className="ui-button-secondary rounded-[6px] px-3 py-1.5 text-xs"
            >
              Pool ↗
            </Link>
          </div>
        </div>
      </div>

      {/* ── Leaderboard Table ── */}
      <div className="rounded-[8px] border border-white/[0.08] overflow-hidden bg-[#121212]">
        {/* Sub-header bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#151515]">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-white" />
            <h4 className="text-white font-medium text-xs tracking-tight">Pool Swapper Leaderboard</h4>
          </div>
          <span className="text-[11px] text-ash font-mono">
            Top Participants
          </span>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[50px_1fr_130px_100px] gap-4 px-5 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ash border-b border-white/[0.06] bg-[#151515]/50">
          <div># Rank</div>
          <div>Swapper</div>
          <div className="text-right">Points Earned</div>
          <div className="text-right">Last Activity</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/[0.04]">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="grid grid-cols-[36px_1fr_auto] md:grid-cols-[50px_1fr_130px_100px] gap-2 md:gap-4 px-4 md:px-5 py-3 items-center animate-pulse">
                <div className="h-3 w-5 bg-white/5 rounded" />
                <div className="h-3 w-28 bg-white/5 rounded" />
                <div className="h-3 w-16 bg-white/5 rounded ml-auto" />
                <div className="hidden md:block h-3 w-14 bg-white/5 rounded ml-auto" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
              <Trophy size={28} className="text-white/10" />
              <p className="text-ash text-xs">No swaps recorded in this pool yet.</p>
              <button
                onClick={() => navigate(`/swap?from=${t0?.address}&to=${t1?.address}&poolId=${poolId}`)}
                className="mt-1 ui-button-primary rounded-[6px] px-4 py-2 text-xs"
              >
                Be the first to swap
              </button>
            </div>
          ) : (
            rows.map((row, i) => {
              const rank = page * PAGE_SIZE + i + 1;
              const isUser = !!connectedAddress && row.owner.toLowerCase() === connectedAddress.toLowerCase();
              const rankIcon =
                rank === 1 ? <Crown size={14} className="text-yellow-400" /> :
                rank === 2 ? <Medal size={14} className="text-zinc-300" /> :
                rank === 3 ? <Medal size={14} className="text-amber-600" /> :
                <span className="text-ash font-mono text-xs">#{rank}</span>;

              return (
                <div
                  key={row.id || i}
                  className={`grid grid-cols-[36px_1fr_auto] md:grid-cols-[50px_1fr_130px_100px] gap-2 md:gap-4 px-4 md:px-5 py-3 items-center transition-colors
                    ${isUser ? 'bg-white/[0.04] border-l-2 border-white' : 'hover:bg-white/[0.02]'}`}
                >
                  <div className="flex items-center">{rankIcon}</div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    {isUser && (
                      <span className="text-[9px] font-mono uppercase tracking-wider bg-white/10 text-white px-1.5 py-0.5 rounded shrink-0">You</span>
                    )}
                    <a
                      href={`https://liteforge.explorer.caldera.xyz/address/${row.owner}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-white/90 hover:text-white transition-colors flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{shortAddr(row.owner)}</span>
                      <ExternalLink size={10} className="text-ash shrink-0" />
                    </a>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono text-white font-medium">
                      {formatPoints(row.balance)} <span className="text-[10px] text-ash">PTS</span>
                    </span>
                  </div>

                  <div className="hidden md:block text-right">
                    <span className="text-xs text-ash font-mono">
                      {row.transfers?.[0] ? timeAgo(row.transfers[0].timestamp) : 'Recent'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 md:px-5 py-3 border-t border-white/[0.06] flex items-center justify-between bg-[#151515]">
          <span className="text-xs font-mono text-ash">Page {page + 1}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0 || loading}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="ui-button-secondary rounded-[4px] px-3 py-1.5 text-xs disabled:opacity-30 disabled:pointer-events-none"
            >
              Prev
            </button>
            <button
              disabled={!hasMore || loading}
              onClick={() => setPage(p => p + 1)}
              className="ui-button-secondary rounded-[4px] px-3 py-1.5 text-xs disabled:opacity-30 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState(0);
  const [fetchedCampaign, setFetchedCampaign] = useState<any>(null);

  useEffect(() => {
    const st = location.state as any;
    if (st?.campaign) return;
    if (id) {
      fetch(`${API_BASE_URL}/api/campaigns/${id}`)
        .then(r => r.json())
        .then(d => {
          if (d?.campaign) {
            setFetchedCampaign(d.campaign);
          }
        })
        .catch(() => {});
    }
  }, [id, location.state]);

  const campaign: HookCampaign | null = useMemo(() => {
    const st = location.state as any;
    if (st?.campaign) return st.campaign as HookCampaign;
    if (fetchedCampaign) return fetchedCampaign as HookCampaign;
    const idx = parseInt(id ?? '', 10);
    if (!isNaN(idx) && campaigns[idx]) return campaigns[idx];
    return campaigns[0] ?? null;
  }, [id, location.state, fetchedCampaign]);

  const [isEndedLocal, setIsEndedLocal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  const status = useMemo(() => {
    if (isEndedLocal) return { isEnded: true, badgeText: 'Ended' };
    return formatCampaignStatus(campaign);
  }, [campaign, isEndedLocal]);

  const handleEndCampaign = async () => {
    setIsEnding(true);
    try {
      const campId = campaign?.id !== undefined ? String(campaign.id) : String(id || '0');
      const res = await fetch(`${API_BASE_URL}/api/campaigns/${campId}/end`, { method: 'POST' });
      if (res.ok) {
        setIsEndedLocal(true);
        setShowEndModal(false);
      }
    } catch (e) {
      console.error('Failed to end campaign:', e);
    } finally {
      setIsEnding(false);
    }
  };

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-white/40 text-sm gap-4">
        <p>Campaign not found.</p>
        <Link to="/campaigns" className="text-primary hover:underline">
          Return to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-32 sm:pb-40 relative z-10 w-full max-w-4xl mx-auto px-3 sm:px-6">
      {/* End Campaign Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121212] border border-[color:var(--border-default)] rounded-[8px] p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEndModal(false)}
              className="absolute top-4 right-4 text-ash hover:text-white p-1"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-[6px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-base font-medium text-white">Conclude Campaign</h3>
                <p className="text-ash text-xs">End active reward distribution</p>
              </div>
            </div>

            <p className="text-ash text-[13px] leading-relaxed mb-6">
              Are you sure you want to end <span className="text-white font-medium">{campaign.name}</span>? 
              Once concluded, trades in eligible pools will no longer accrue campaign reward points, and leaderboards will remain permanently finalized.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="ui-button ui-button-secondary !min-h-9 !px-4 text-xs cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={isEnding}
                onClick={handleEndCampaign}
                className="ui-button !min-h-9 !px-4 text-xs bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                {isEnding ? 'Ending Campaign...' : 'Conclude Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back button */}
      <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-ash hover:text-white mb-6 transition-colors group">
        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        All Campaigns
      </Link>

      {/* ── Header ── */}
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div>
            <div className="section-tag mb-1">
              [ Campaign Overview ]
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                {campaign.name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-mono uppercase tracking-wider border ${
                !status.isEnded
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <Circle size={5} className={!status.isEnded ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'} />
                {status.badgeText}
              </span>
            </div>
            <p className="text-ash text-xs sm:text-[13px] mt-1 max-w-xl">
              {campaign.description.split('\n')[0]}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!status.isEnded && (
              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                className="ui-button ui-button-secondary !min-h-8 !px-3 text-xs flex items-center gap-1.5 text-ash hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
              >
                <Clock size={13} />
                <span>End Campaign</span>
              </button>
            )}
            <Link
              to="/faucet"
              className="ui-button ui-button-secondary !min-h-8 !px-3 text-xs flex items-center gap-1.5"
            >
              <Droplets size={13} className="text-ash" />
              <span>Faucet</span>
            </Link>
          </div>
        </div>

        {/* Clean 3-Card Summary (Dev contract removed) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-[6px] bg-[#121212] border border-[color:var(--border-subtle)] p-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ash">Reward Type</span>
            <span className="text-xs font-mono font-medium text-white">{campaign.rewardType || 'ERC-1155 Points'}</span>
          </div>

          <div className="rounded-[6px] bg-[#121212] border border-[color:var(--border-subtle)] p-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ash">Eligible Pools</span>
            <span className="text-xs font-mono font-medium text-white">{campaign.poolKeys?.length || 0} Active Pairs</span>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-[6px] bg-[#121212] border border-[color:var(--border-subtle)] p-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ash">Reward Accrual</span>
            <span className="text-xs font-mono font-medium text-white">Instant On-Chain</span>
          </div>
        </div>
      </header>

      {/* ── Leaderboard Section with Pool Tabs ── */}
      <section>
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <div>
            <div className="section-tag mb-0.5">
              [ Leaderboards ]
            </div>
            <h2 className="text-base font-medium text-white tracking-tight">Incentivised Pool Rankings</h2>
          </div>
          <span className="text-xs font-mono text-ash">Select pair to view ranking</span>
        </div>

        {(!campaign.poolKeys || campaign.poolKeys.length === 0) ? (
          <div className="rounded-[8px] border border-white/[0.08] bg-[#121212] p-8 text-center text-ash text-sm">
            <p>No trading pools have been linked to this campaign yet.</p>
            <Link to="/pools/create?hook=points" className="ui-button ui-button-secondary !min-h-9 !px-4 text-xs mt-3 inline-flex items-center gap-1.5">
              <span>+ Create an Incentivized Pool</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[#121212] border border-white/[0.08] rounded-[6px] mb-4 overflow-x-auto">
              {campaign.poolKeys.map((pk, i) => {
                const t0 = getToken(pk.currency0);
                const t1 = getToken(pk.currency1);
                const isActive = activeTab === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-xs font-mono font-medium transition-colors cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-white/[0.1] text-white border-white/30'
                        : 'text-ash hover:text-white hover:bg-white/[0.04] border-transparent'
                    }`}
                  >
                    <div className="flex -space-x-1.5">
                      {[t0, t1].map((tk, j) => (
                        <div key={j} className="w-4 h-4 rounded-full border border-black bg-black overflow-hidden flex items-center justify-center">
                          {tk?.logo
                            ? <img src={tk.logo} alt={tk?.symbol} className="w-full h-full object-contain" />
                            : <div className="w-full h-full bg-white/10" />}
                        </div>
                      ))}
                    </div>
                    <span>{t0?.symbol ?? '??'}/{t1?.symbol ?? '??'}</span>
                    <span className={`text-[10px] font-mono ${isActive ? 'text-white/70' : 'text-ash/60'}`}>
                      {(pk.fee / 10000).toFixed(2)}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active panel */}
            {campaign.poolKeys[activeTab] && (
              <LeaderboardPanel
                key={activeTab}
                pk={campaign.poolKeys[activeTab]}
                connectedAddress={connectedAddress}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
