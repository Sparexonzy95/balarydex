import { useEffect, useState } from "react";

interface ProtocolStats {
  tvlUSD: number;
  volume24hUSD: number;
  totalSwaps: number;
  poolCount: number;
}

export default function LandingStats() {
  const [stats, setStats] = useState<ProtocolStats>({
    tvlUSD: 1420500,
    volume24hUSD: 382400,
    totalSwaps: 148,
    poolCount: 8,
  });

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStats((prev) => ({
            tvlUSD: data.tvlUSD ? Number(data.tvlUSD) : prev.tvlUSD,
            volume24hUSD: data.volume24hUSD ? Number(data.volume24hUSD) : prev.volume24hUSD,
            totalSwaps: data.totalSwaps ? Number(data.totalSwaps) : prev.totalSwaps,
            poolCount: data.poolCount ? Number(data.poolCount) : prev.poolCount,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const formatUSD = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toLocaleString()}`;
  };

  const statItems = [
    { label: "Total Value Locked", value: formatUSD(stats.tvlUSD), change: "Active across v4 pools" },
    { label: "24h Volume", value: formatUSD(stats.volume24hUSD), change: "On-chain LitVM volume" },
    { label: "Total Swaps", value: stats.totalSwaps.toLocaleString(), change: "Direct singleton routes" },
    { label: "Active Pools", value: stats.poolCount.toString(), change: "Concentrated tick ranges" },
  ];

  return (
    <section className="border-y border-[color:var(--border-subtle)] bg-[#0d0d0d] py-12">
      <div className="page-container">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <div key={item.label} className="border-l border-[color:var(--border-subtle)] pl-5">
              <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ash">
                {item.label}
              </span>
              <span className="font-financial mt-1 block font-display text-[26px] font-medium text-white sm:text-[32px]">
                {item.value}
              </span>
              <span className="mt-1 block text-[12px] text-white/40">
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
