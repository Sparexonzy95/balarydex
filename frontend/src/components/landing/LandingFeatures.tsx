import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Layers, Zap, Trophy, Droplets, ShieldCheck } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const features: Feature[] = [
  {
    title: "Uniswap v4 Singleton",
    description: "All liquidity pools reside in one contract. Multi-hop swaps execute in a single state transition with minimal gas overhead.",
    cta: "Trade now",
    href: "/swap",
    icon: Layers,
  },
  {
    title: "Contract Hook Modules",
    description: "Extend pool behavior dynamically: on-chain volume tracking, point multipliers, and custom fee curves.",
    cta: "View hooks",
    href: "/pools",
    icon: Cpu,
  },
  {
    title: "Concentrated Liquidity",
    description: "Custom price tick ranges allow liquidity providers to earn maximum fees with concentrated capital efficiency.",
    cta: "Explore pools",
    href: "/pools",
    icon: Zap,
  },
  {
    title: "Trading Campaigns & Points",
    description: "Participate in seasonal campaigns. Swaps are tracked on-chain by hooks to distribute verified point rewards.",
    cta: "Join campaigns",
    href: "/campaigns",
    icon: Trophy,
  },
  {
    title: "LitVM Sub-Second Finality",
    description: "High-throughput execution with instant confirmations and predictable gas costs on LitVM LiteForge.",
    cta: "View activity",
    href: "/activity",
    icon: ShieldCheck,
  },
  {
    title: "Instant Testnet Faucet",
    description: "Mint testnet zkLTC, BAL, USDC, and SOFT tokens in one click to test swaps and provide liquidity freely.",
    cta: "Claim tokens",
    href: "/faucet",
    icon: Droplets,
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="page-container">
        
        {/* Section Header */}
        <header className="mb-14 max-w-2xl">
          <div className="section-tag mb-3">[ Balary Features ]</div>
          <h2 className="type-h2 font-display text-white">
            Everything your liquidity needs.
          </h2>
          <p className="section-subtitle !mt-4 max-w-xl">
            A modular Uniswap v4 DEX built for speed, customizable execution, and on-chain gamification on LitVM.
          </p>
        </header>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="ui-surface group relative flex min-h-[260px] flex-col justify-between overflow-hidden !bg-[#121212] p-6 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:!border-[color:var(--border-hover)] sm:p-7"
              >
                <div>
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.04] text-white">
                    <Icon className="h-5 w-5 text-white/90" />
                  </div>

                  <h3 className="type-card-title font-display text-white">
                    {feature.title}
                  </h3>

                  <p className="type-card-body mt-2.5 text-ash">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[color:var(--border-subtle)]">
                  <Link
                    to={feature.href}
                    className="type-card-action inline-flex items-center gap-1.5 text-white/80 transition-colors group-hover:text-white"
                  >
                    {feature.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}
