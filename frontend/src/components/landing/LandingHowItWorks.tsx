import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Droplets, ArrowLeftRight, Trophy } from "lucide-react";

interface Step {
  step: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

const steps: Step[] = [
  {
    step: "01",
    title: "Claim testnet tokens",
    description: "Connect your wallet on LitVM LiteForge (Chain ID 4441) and claim zkLTC gas along with BAL, USDC, and SOFT tokens from the faucet.",
    cta: "Go to Faucet",
    href: "/faucet",
    icon: Droplets,
    badge: "24h Cooldown Faucet",
  },
  {
    step: "02",
    title: "Swap or provide liquidity",
    description: "Execute instant trades via the UniversalRouter or provide concentrated liquidity in custom tick ranges to capture trading fees.",
    cta: "Launch Trade",
    href: "/swap",
    icon: ArrowLeftRight,
    badge: "Uniswap v4 Pools",
  },
  {
    step: "03",
    title: "Earn season rewards",
    description: "Every swap and liquidity deposit interacts with the PointsHook, streaming verified on-chain points to your profile for season rewards.",
    cta: "View Campaigns",
    href: "/campaigns",
    icon: Trophy,
    badge: "On-Chain Hooks",
  },
];

export default function LandingHowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="border-t border-[color:var(--border-subtle)] bg-[#0d0d0d] py-20 md:py-28">
      <div className="page-container">

        {/* Section Header */}
        <header className="mb-14 max-w-2xl">
          <div className="section-tag mb-3">[ How It Works ]</div>
          <h2 className="type-h2 font-display text-white">
            Three steps. Start trading.
          </h2>
          <p className="section-subtitle !mt-4 max-w-xl">
            From funding your testnet wallet to accumulating verified on-chain hook points, Balary keeps DeFi simple.
          </p>
        </header>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const isHovered = activeStep === index;

            return (
              <div
                key={item.step}
                onMouseEnter={() => setActiveStep(index)}
                className={`ui-surface group relative flex flex-col justify-between rounded-[8px] p-7 transition-[border-color,background-color,transform] duration-200 ${
                  isHovered
                    ? "!bg-[#161616] !border-[color:var(--border-hover)] -translate-y-1"
                    : "!bg-[#111111]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-financial font-mono text-[14px] font-semibold tracking-wider text-ash/80">
                      [{item.step}]
                    </span>
                    <span className="rounded-[4px] border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-ash">
                      {item.badge}
                    </span>
                  </div>

                  <div className="my-6 flex h-12 w-12 items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.05] text-white">
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="type-h3 font-display text-white">
                    {item.title}
                  </h3>

                  <p className="type-card-body mt-3 text-ash">
                    {item.description}
                  </p>
                </div>

                <div className="mt-8 pt-5 border-t border-[color:var(--border-subtle)]">
                  <Link
                    to={item.href}
                    className="ui-button ui-button-secondary w-full !min-h-10 text-[13px] hover:!border-white/30"
                  >
                    {item.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
