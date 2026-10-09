import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { 
  Trophy, ArrowRight, Circle, Layers, ArrowLeftRight, 
  Award, Plus, Clock
} from 'lucide-react';
import { campaigns, type HookCampaign, type PoolKey } from '../../config/hooksDetail';
import { TOKENS } from '../../config/tokens';
import { API_BASE_URL } from '../../lib/constants';

function computePoolId(pk: PoolKey): string {
  const enc = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [pk.currency0, pk.currency1, pk.fee, pk.tickSpacing, pk.hooks]
  );
  return ethers.keccak256(enc);
}

const NATIVE = '0x0000000000000000000000000000000000000000';

function getToken(address: string) {
  if (address.toLowerCase() === NATIVE.toLowerCase()) {
    return { symbol: 'ETH', logo: '/assets/eth.png', address: NATIVE };
  }
  return TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase()) ?? null;
}

function formatCampaignStatus(campaign: any): { isEnded: boolean; badgeText: string } {
  const now = Math.floor(Date.now() / 1000);
  const endsAt = campaign.endsAt ? Number(campaign.endsAt) : null;
  const isExplicitInactive = campaign.active === false;

  if (isExplicitInactive || (endsAt && now >= endsAt)) {
    return { isEnded: true, badgeText: 'Ended' };
  }

  if (endsAt) {
    const diff = endsAt - now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) {
      return { isEnded: false, badgeText: `Ends in ${days}d ${hours}h` };
    }
    const mins = Math.floor((diff % 3600) / 60);
    if (hours > 0) {
      return { isEnded: false, badgeText: `Ends in ${hours}h ${mins}m` };
    }
    return { isEnded: false, badgeText: `Ends in ${mins}m` };
  }

  return { isEnded: false, badgeText: 'Active' };
}

function PoolPill({ pk }: { pk: PoolKey }) {
  const navigate = useNavigate();
  const t0 = getToken(pk.currency0);
  const t1 = getToken(pk.currency1);
  const poolId = computePoolId(pk);

  return (
    <div className="flex items-center justify-between w-full bg-[#181818] hover:bg-[#1e1e1e] border border-[color:var(--border-subtle)] rounded-[6px] px-3 py-2 transition-colors">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {[t0, t1].map((tk, i) => (
            <div key={i} className="w-5 h-5 rounded-full border border-black bg-black overflow-hidden shadow-sm">
              {tk?.logo
                ? <img src={tk.logo} alt={tk.symbol} className="w-full h-full object-contain" />
                : <div className="w-full h-full bg-white/20" />}
            </div>
          ))}
        </div>
        <span className="text-[13px] text-white font-medium">
          {t0?.symbol ?? '??'}/{t1?.symbol ?? '??'}
        </span>
        <span className="text-[11px] text-ash/40">·</span>
        <span className="text-[11px] text-ash font-mono">{(pk.fee / 10000).toFixed(2)}%</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-[3px] border border-emerald-500/20">
          +Points
        </span>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(`/swap?from=${t0?.address}&to=${t1?.address}&poolId=${poolId}`);
          }}
          className="ui-button ui-button-secondary !min-h-6 !px-2 rounded-[4px] text-[11px]"
        >
          <ArrowLeftRight size={10} />
          Swap
        </button>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaignList, setCampaignList] = useState<any[]>(campaigns || []);
  const [page, setPage] = useState(1);
  const CAMPAIGNS_PER_PAGE = 2;

  const [stats, setStats] = useState<{
    totalParticipants: number;
    totalPointsDistributed: string;
    activeCampaigns: number;
  }>({
    totalParticipants: 0,
    totalPointsDistributed: '0.00',
    activeCampaigns: 0,
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/campaigns/stats`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setStats({
            totalParticipants: data.totalParticipants ?? 0,
            totalPointsDistributed: data.totalPointsDistributed ?? '0.00',
            activeCampaigns: data.activeCampaigns ?? 0,
          });
        }
      })
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/campaigns`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.campaigns)) {
          const sorted = [...data.campaigns].sort((a, b) => {
            if (a.active !== b.active) return b.active ? 1 : -1;
            return Number(b.createdAt || 0) - Number(a.createdAt || 0);
          });
          setCampaignList(sorted);
        } else {
          setCampaignList([]);
        }
      })
      .catch(() => {
        setCampaignList([]);
      });
  }, []);

  const totalPages = Math.ceil(campaignList.length / CAMPAIGNS_PER_PAGE) || 1;
  const paginatedCampaigns = campaignList.slice((page - 1) * CAMPAIGNS_PER_PAGE, page * CAMPAIGNS_PER_PAGE);

  return (
    <div className="pb-32 sm:pb-40 relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="section-tag mb-1.5">
            [ Reward Campaigns ]
          </div>
          <h1 className="type-h2 font-display text-white">Trading Campaigns</h1>
          <p className="text-ash text-[13px] mt-1">
            Swap in eligible pools to earn on-chain points and climb the reward leaderboard.
          </p>
        </div>

        <Link
          to="/campaigns/create"
          className="ui-button ui-button-primary !min-h-9 !px-4 text-[13px] self-start sm:self-auto inline-flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span>Create Campaign</span>
        </Link>
      </header>

      {/* Compact Stat Strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] p-3.5 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-ash font-medium flex items-center gap-1.5">
            <Trophy size={12} className="text-white" /> Active Campaigns
          </span>
          <span className="text-lg md:text-xl font-medium font-financial text-white mt-0.5">
            {stats.activeCampaigns}
          </span>
        </div>

        <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] p-3.5 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-ash font-medium flex items-center gap-1.5">
            <Award size={12} className="text-white" /> Points Minted
          </span>
          <span className="text-lg md:text-xl font-medium font-financial text-white mt-0.5">
            {stats.totalPointsDistributed} <span className="text-xs text-ash font-sans">PTS</span>
          </span>
        </div>

        <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] p-3.5 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-ash font-medium flex items-center gap-1.5">
            <Layers size={12} className="text-white" /> Swappers
          </span>
          <span className="text-lg md:text-xl font-medium font-financial text-white mt-0.5">
            {stats.totalParticipants} <span className="text-xs text-ash font-sans">users</span>
          </span>
        </div>
      </div>

      {/* Campaigns List (Paginated to 2 per page) */}
      {campaignList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/30 text-xs uppercase tracking-widest">
          No campaigns found
        </div>
      ) : (
        <div className="flex flex-col gap-6 mb-8">
          {paginatedCampaigns.map((c: any, index: number) => {
            const campId = c.id !== undefined ? String(c.id) : String((page - 1) * CAMPAIGNS_PER_PAGE + index);
            const status = formatCampaignStatus(c);

            return (
              <div 
                key={campId} 
                className="rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] overflow-hidden"
              >
                <div className="p-6 md:p-7 flex flex-col md:grid md:grid-cols-[1fr_360px] gap-6">
                  {/* Left Column: Info & Description */}
                  <div className="flex flex-col justify-between gap-5">
                    <div>
                      {/* Title + Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[6px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                            <Trophy size={18} className="text-white" />
                          </div>
                          <div>
                            <h2 className="text-white font-medium text-[18px]">{c.name}</h2>
                            <p className="text-ash text-[11px] font-mono mt-0.5">
                              {c.tagline ? `${c.tagline} · ` : ''}{c.rewardType}
                            </p>
                          </div>
                        </div>

                        <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[10px] uppercase tracking-wider font-mono border ${
                          !status.isEnded
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {!status.isEnded ? (
                            <Circle size={6} className="fill-emerald-400 text-emerald-400" />
                          ) : (
                            <Clock size={10} />
                          )}
                          {status.badgeText}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-ash text-[13px] leading-relaxed line-clamp-2 mt-2">
                        {c.description ? c.description.split('\n\n')[0] : 'Swap in designated pools to earn rewards and climb the leaderboard.'}
                      </p>

                      {/* Reward Meta */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-2.5 rounded-[4px] bg-[#161616] border border-[color:var(--border-subtle)]">
                          <p className="text-[10px] uppercase tracking-wider text-ash font-medium">Reward Rate</p>
                          <p className="text-[12px] font-mono text-bone mt-0.5">
                            {c.rewardRate || '1% Volume in PTS'}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-[4px] bg-[#161616] border border-[color:var(--border-subtle)]">
                          <p className="text-[10px] uppercase tracking-wider text-ash font-medium">Distribution</p>
                          <p className="text-[12px] font-mono text-emerald-400 mt-0.5">
                            {c.distribution || 'Instant On-Chain Mint'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* View Leaderboard CTA */}
                    <div className="pt-2">
                      <Link
                        to={`/campaigns/${campId}`}
                        state={{ campaign: c }}
                        className="ui-button ui-button-primary !min-h-9 !px-4 text-[12px] inline-flex items-center gap-1.5"
                      >
                        <span>View Leaderboard</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Included Pools */}
                  <div className="flex flex-col justify-between bg-[#161616] border border-[color:var(--border-subtle)] rounded-[6px] p-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <span className="text-[11px] uppercase tracking-wider text-ash font-medium">
                          Eligible Pools ({(c.poolKeys || []).length})
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">Rewards Active</span>
                      </div>

                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                        {(c.poolKeys || []).length === 0 ? (
                          <div className="py-6 text-center text-xs text-ash/40">No pools linked yet</div>
                        ) : (
                          (c.poolKeys || []).map((pk: any, pi: number) => (
                            <PoolPill key={pi} pk={pk} />
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-ash">
                      <span>Network</span>
                      <span className="font-mono text-white/80">LitVM Testnet</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls (2 per page) */}
      {campaignList.length > 0 && (
        <div className="p-4 rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[12px] text-ash">
            Showing {(page - 1) * CAMPAIGNS_PER_PAGE + 1}–{Math.min(page * CAMPAIGNS_PER_PAGE, campaignList.length)} of {campaignList.length} campaigns
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Prev
            </button>
            <span className="text-[11px] font-mono text-ash px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="ui-button ui-button-secondary !min-h-7 !px-3 rounded-[4px] text-[11px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
