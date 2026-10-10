import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { 
  Trophy, ArrowRight, Circle, Layers, ArrowLeftRight, 
  Award, Plus, Clock
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { campaigns, type HookCampaign, type PoolKey } from '../../config/hooksDetail';
import { TOKENS } from '../../config/tokens';
import { API_BASE_URL, isAdminWallet } from '../../lib/constants';

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
  const t0 = getToken(pk.currency0);
  const t1 = getToken(pk.currency1);

  return (
    <div className="inline-flex items-center gap-1.5 bg-[#181818] border border-[color:var(--border-subtle)] rounded-[4px] px-2 py-1 text-[11px] text-bone font-mono">
      <div className="flex -space-x-1 shrink-0">
        {[t0, t1].map((tk, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-full border border-black bg-black overflow-hidden flex items-center justify-center">
            {tk?.logo ? (
              <img src={tk.logo} alt={tk.symbol} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-white/20" />
            )}
          </div>
        ))}
      </div>
      <span>{t0?.symbol ?? '??'}/{t1?.symbol ?? '??'}</span>
      <span className="text-ash/60 text-[10px]">{(pk.fee / 10000).toFixed(2)}%</span>
    </div>
  );
}

export default function CampaignsPage() {
  const { address } = useAccount();
  const [campaignList, setCampaignList] = useState<any[]>(campaigns || []);
  const [page, setPage] = useState(1);
  const CAMPAIGNS_PER_PAGE = 3;

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
    <div className="pb-32 sm:pb-40 relative z-10 w-full max-w-4xl mx-auto px-3 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="section-tag mb-1">
            [ Reward Campaigns ]
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight">Trading Campaigns</h1>
          <p className="text-ash text-[12px] sm:text-[13px] mt-0.5">
            Swap in eligible pools to earn on-chain points and climb the reward leaderboard.
          </p>
        </div>

        {isAdminWallet(address) && (
          <Link
            to="/campaigns/create"
            className="ui-button ui-button-primary !min-h-8 !px-3.5 text-[12px] self-start sm:self-auto inline-flex items-center gap-1.5"
          >
            <Plus size={13} />
            <span>Create Campaign</span>
          </Link>
        )}
      </header>

      {/* Responsive Stat Strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] p-2.5 sm:p-3.5 flex flex-col gap-0.5">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ash font-medium flex items-center gap-1">
            <Trophy size={11} className="text-white" /> Active
          </span>
          <span className="text-base sm:text-xl font-medium font-mono text-white">
            {stats.activeCampaigns}
          </span>
        </div>

        <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] p-2.5 sm:p-3.5 flex flex-col gap-0.5">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ash font-medium flex items-center gap-1">
            <Award size={11} className="text-white" /> Points
          </span>
          <span className="text-base sm:text-xl font-medium font-mono text-white truncate">
            {stats.totalPointsDistributed}
          </span>
        </div>

        <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-[#121212] p-2.5 sm:p-3.5 flex flex-col gap-0.5">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ash font-medium flex items-center gap-1">
            <Layers size={11} className="text-white" /> Swappers
          </span>
          <span className="text-base sm:text-xl font-medium font-mono text-white">
            {stats.totalParticipants}
          </span>
        </div>
      </div>

      {/* Campaigns List */}
      {campaignList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30 text-xs uppercase tracking-widest border border-dashed border-white/10 rounded-[6px]">
          No campaigns found
        </div>
      ) : (
        <div className="flex flex-col gap-4 mb-6">
          {paginatedCampaigns.map((c: any, index: number) => {
            const campId = c.id !== undefined ? String(c.id) : String((page - 1) * CAMPAIGNS_PER_PAGE + index);
            const status = formatCampaignStatus(c);

            return (
              <div 
                key={campId} 
                className="rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] p-4 sm:p-5 flex flex-col gap-3.5 hover:border-[color:var(--border-hover)] transition-colors"
              >
                {/* Title + Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[6px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                      <Trophy size={15} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-white font-medium text-[15px] sm:text-[16px] leading-tight">{c.name}</h2>
                      <p className="text-ash text-[11px] font-mono">
                        {c.tagline || c.rewardType || 'ERC-1155 Points'}
                      </p>
                    </div>
                  </div>

                  <span className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] uppercase tracking-wider font-mono border ${
                    !status.isEnded
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {!status.isEnded ? (
                      <Circle size={5} className="fill-emerald-400 text-emerald-400" />
                    ) : (
                      <Clock size={9} />
                    )}
                    {status.badgeText}
                  </span>
                </div>

                {/* Description */}
                <p className="text-ash text-[12px] leading-relaxed line-clamp-2">
                  {c.description ? c.description.split('\n\n')[0] : 'Swap in eligible pools to earn on-chain points.'}
                </p>

                {/* Eligible Pools Chips */}
                {(c.poolKeys || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-ash/60 font-mono mr-1">Pairs:</span>
                    {(c.poolKeys || []).map((pk: any, pi: number) => (
                      <PoolPill key={pi} pk={pk} />
                    ))}
                  </div>
                )}

                {/* Footer Strip */}
                <div className="pt-2.5 border-t border-[color:var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-ash">
                    <span>Rate: <strong className="text-bone font-normal">{c.rewardRate || '1% in Points'}</strong></span>
                    <span>·</span>
                    <span className="text-emerald-400">{c.distribution || 'On-Chain Mint'}</span>
                  </div>

                  <Link
                    to={`/campaigns/${campId}`}
                    state={{ campaign: c }}
                    className="ui-button ui-button-primary !min-h-8 !px-3 text-[12px] self-start sm:self-auto inline-flex items-center gap-1.5"
                  >
                    <span>View Leaderboard</span>
                    <ArrowRight size={12} />
                  </Link>
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
