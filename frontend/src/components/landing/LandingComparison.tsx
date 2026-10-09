import { Check, X } from "lucide-react";

interface ComparisonRow {
  feature: string;
  balary: boolean;
  legacyAmm: boolean;
  orderbook: boolean;
}

const rows: ComparisonRow[] = [
  { feature: "Singleton contract architecture", balary: true, legacyAmm: false, orderbook: false },
  { feature: "Dynamic hook extensibility", balary: true, legacyAmm: false, orderbook: false },
  { feature: "Flash accounting (EIP-1153)", balary: true, legacyAmm: false, orderbook: false },
  { feature: "On-chain points & campaign rewards", balary: true, legacyAmm: false, orderbook: false },
  { feature: "Concentrated liquidity tick ranges", balary: true, legacyAmm: true, orderbook: false },
  { feature: "Sub-second block confirmation (LitVM)", balary: true, legacyAmm: false, orderbook: true },
  { feature: "Self-custodial & permissionless", balary: true, legacyAmm: true, orderbook: false },
];

const columns = [
  { key: "balary", label: "Balary (v4)" },
  { key: "legacyAmm", label: "Legacy AMMs (v2/v3)" },
  { key: "orderbook", label: "Traditional Orderbooks" },
] as const;

function Mark({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
        active
          ? "bg-white text-[#111]"
          : "border border-white/20 text-white/30"
      }`}
    >
      {active ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <X className="h-3.5 w-3.5" strokeWidth={1.8} />
      )}
    </span>
  );
}

export default function LandingComparison() {
  return (
    <section id="why-balary" className="py-20 md:py-28">
      <div className="page-container">
        
        {/* Section Header */}
        <div className="mb-12 max-w-2xl">
          <div className="section-tag mb-3">[ Compare ]</div>
          <h2 className="type-h2 font-display text-white">
            Why Balary?
          </h2>
          <p className="section-subtitle !mt-4 max-w-xl">
            See how Uniswap v4 on LitVM outperforms multi-contract legacy architectures.
          </p>
        </div>

        {/* Table Surface */}
        <div className="ui-surface w-full overflow-hidden rounded-[8px] !bg-[#121212]">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[color:var(--border-subtle)] bg-[#151515]">
                  <th className="px-5 py-4 text-[12px] font-medium tracking-[0.06em] text-ash sm:px-6">
                    Feature
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-5 py-4 text-center text-xs font-medium sm:px-6 sm:text-sm ${
                        column.key === "balary" ? "text-white font-semibold" : "text-white/50"
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-[color:var(--border-subtle)] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4 text-xs font-medium text-bone/90 sm:px-6 sm:text-sm">
                      {row.feature}
                    </td>

                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-5 py-4 text-center sm:px-6 ${
                          column.key === "balary" ? "bg-white/[0.03]" : ""
                        }`}
                      >
                        <Mark active={row[column.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}
