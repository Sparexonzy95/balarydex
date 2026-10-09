import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Check, X, Sparkles, Activity, ArrowDown } from "lucide-react";
import { liftHover, microTransition, smoothEase, subtleTap } from "@/lib/motion";
import {
  MotionElement,
  MotionHeading,
  MotionSection,
} from "@/components/motion/MotionSection";
import { BalaryLogoIcon } from "@/components/Logo";

// ── Left-side SectionNav Indicator (ckashapp style) ───────────────────────────
const sections = [
  { id: "hero", title: "Overview" },
  { id: "product", title: "Product" },
  { id: "how-it-works", title: "How it works" },
  { id: "why-balary", title: "Why Balary" },
  { id: "security", title: "Security" },
];

function SectionNav() {
  const [activeId, setActiveId] = useState(sections[0].id);

  useEffect(() => {
    const updateActiveSection = () => {
      const viewportPoint = window.innerHeight * 0.38;
      let current = sections[0].id;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        if (rect.top <= viewportPoint && rect.bottom >= viewportPoint) {
          current = section.id;
          break;
        }

        if (rect.top < viewportPoint) current = section.id;
      }

      setActiveId(current);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const activeIndex = sections.findIndex((section) => section.id === activeId);

  return (
    <nav aria-label="Section navigation" className="fixed left-5 top-28 z-40 hidden lg:block">
      <div className="relative flex flex-col items-start gap-3 py-2">
        <div className="absolute left-[7px] top-0 h-full w-px bg-white/10" />
        {sections.map((section, index) => {
          const isActive = section.id === activeId;
          const isPassed = index < activeIndex;
          const color = isActive ? "bg-bone" : isPassed ? "bg-bone/45" : "bg-white/20";

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="group relative flex h-4 items-center"
              aria-label={section.title}
            >
              <motion.span
                className={`relative z-10 block rounded-full ${color}`}
                animate={{
                  width: isActive ? 26 : 13,
                  height: isActive ? 2 : 1,
                }}
                transition={{ duration: 0.45, ease: smoothEase }}
              />
              <span className="pointer-events-none absolute left-9 whitespace-nowrap rounded-[4px] border border-[color:var(--border-default)] bg-[#151515] px-2.5 py-1 text-[11px] font-medium text-bone/80 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
                {section.title}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

// ── Comparison Mark Component ───────────────────────────────────────────────
function Mark({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
        active
          ? "bg-bone text-[#111]"
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

// ── Flipit Hero 3-Card Deck Composition ─────────────────────────────────────
function HeroComposition() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] xs:max-w-[380px] sm:max-w-md lg:max-w-none overflow-hidden sm:overflow-visible">
      <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent opacity-40 blur-2xl" />

      <div className="relative h-[410px] sm:h-[480px] md:h-[510px] w-full isolation-isolate select-none flex items-center justify-center scale-[0.8] xs:scale-[0.88] sm:scale-100 origin-center">
        
        {/* Card 1: Back (Liquidity Pool) - tilted left */}
        <motion.div
          initial={{ opacity: 0, x: -30, rotate: -12 }}
          animate={{ opacity: 1, x: 0, rotate: -8 }}
          whileHover={{ rotate: -4, scale: 1.03, zIndex: 35 }}
          transition={{ duration: 0.45, ease: smoothEase }}
          className="absolute z-10 w-[270px] sm:w-[290px] left-1/2 top-1/2 -translate-x-[76%] -translate-y-[62%] rounded-[8px] border border-white/10 bg-[#111111]/95 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-md transition-shadow hover:shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <BalaryLogoIcon className="h-4 w-4" />
              <span className="text-[12px] font-medium text-bone">Pool Position</span>
            </div>
            <span className="rounded-[4px] border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
              0.05% Fee
            </span>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-white">zkLTC / BAL</span>
              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                In Range
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden my-2">
              <div className="h-full bg-bone rounded-full w-[76%]" />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-ash/80">
              <span>Min: 0.000100</span>
              <span>Max: 0.001000</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono pt-2 border-t border-white/[0.06]">
            <div className="rounded-[4px] bg-black/40 border border-white/[0.05] p-2">
              <span className="block text-[8px] uppercase text-ash">Efficiency</span>
              <span className="block font-medium text-bone mt-0.5">4,000x</span>
            </div>
            <div className="rounded-[4px] bg-black/40 border border-white/[0.05] p-2">
              <span className="block text-[8px] uppercase text-ash">Earned Fee</span>
              <span className="block font-medium text-emerald-400 mt-0.5">+14.8 zkLTC</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Center (Instant Swap) - main front card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ rotate: 0, scale: 1.02, zIndex: 35 }}
          transition={{ duration: 0.45, ease: smoothEase }}
          className="absolute z-20 w-[285px] sm:w-[315px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[2deg] rounded-[8px] border border-white/15 bg-[#151515] p-4 sm:p-5 shadow-[0_30px_70px_rgba(0,0,0,0.85)] transition-shadow hover:shadow-[0_35px_80px_rgba(0,0,0,0.95)]"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <BalaryLogoIcon className="h-4 w-4" />
              <span className="text-[13px] font-medium text-white">Instant Swap</span>
            </div>
            <span className="rounded-[4px] border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-mono text-ash">
              Best Route
            </span>
          </div>

          {/* Pay input */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[#0c0c0c] p-2.5 mb-2">
            <div className="flex justify-between text-[10px] text-ash mb-1 font-mono">
              <span>You pay</span>
              <span>Bal: 1,240.50</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-semibold text-white font-mono">100.0</span>
              <div className="flex items-center gap-1.5 rounded-[4px] bg-white/[0.06] border border-white/10 px-2 py-1">
                <img src="/tokens/wltc.svg" alt="zkLTC" className="h-4 w-4 rounded-full" />
                <span className="text-[11px] font-semibold text-white">zkLTC</span>
              </div>
            </div>
          </div>

          {/* Swap divider */}
          <div className="flex justify-center -my-1 relative z-10">
            <div className="h-6 w-6 rounded-full bg-[#1b1b1b] border border-white/15 flex items-center justify-center text-ash hover:text-white">
              <ArrowDown size={11} />
            </div>
          </div>

          {/* Receive input */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[#0c0c0c] p-2.5 mt-2 mb-3.5">
            <div className="flex justify-between text-[10px] text-ash mb-1 font-mono">
              <span>You receive</span>
              <span>Estimated</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-semibold text-bone font-mono">403,225</span>
              <div className="flex items-center gap-1.5 rounded-[4px] bg-white/[0.06] border border-white/10 px-2 py-1">
                <img src="/tokens/bal.svg" alt="BAL" className="h-4 w-4 rounded-full" />
                <span className="text-[11px] font-semibold text-white">BAL</span>
              </div>
            </div>
          </div>

          {/* Swap CTA */}
          <Link
            to="/swap"
            className="flex w-full items-center justify-center gap-1.5 rounded-[4px] bg-bone py-2 text-[12px] font-semibold text-[#111] hover:bg-white transition-colors"
          >
            <span>Swap tokens</span>
            <ArrowRight size={13} />
          </Link>

          <p className="text-center text-[9px] font-mono text-ash/70 mt-2">
            1 zkLTC ≈ 4,032.25 BAL · 0% Price Impact
          </p>
        </motion.div>

        {/* Card 3: Front (Rewards & Points) - tilted right */}
        <motion.div
          initial={{ opacity: 0, x: 30, rotate: 10 }}
          animate={{ opacity: 1, x: 0, rotate: 6 }}
          whileHover={{ rotate: 2, scale: 1.04, zIndex: 35 }}
          transition={{ duration: 0.45, ease: smoothEase }}
          className="absolute z-30 w-[240px] sm:w-[255px] left-1/2 top-1/2 -translate-x-[22%] -translate-y-[24%] rounded-[8px] border border-white/12 bg-[#121212]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md transition-shadow hover:shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[12px] font-medium text-bone">Loyalty Rewards</span>
            </div>
            <span className="rounded-[4px] border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-mono text-amber-400">
              Season 1
            </span>
          </div>

          <div className="mb-3">
            <span className="block text-[9px] uppercase tracking-wider text-ash font-mono">Points Accrued</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[22px] font-bold text-white font-mono tracking-tight">12,450</span>
              <span className="text-[10px] font-semibold text-amber-400 font-mono">PTS</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] font-mono">
            <div className="flex justify-between items-center text-ash">
              <span>Campaign Tier</span>
              <span className="text-bone">Gold Rank #1</span>
            </div>
            <div className="flex justify-between items-center text-ash">
              <span>LP Multiplier</span>
              <span className="text-amber-400 font-medium">2.5x Boost</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[9px] font-mono text-ash/80 flex items-center justify-between">
            <span>Minted on-chain</span>
            <span className="text-emerald-400">Active</span>
          </div>
        </motion.div>

        {/* Caption */}
        <p className="absolute bottom-1 sm:bottom-3 left-0 right-0 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-ash/80">
          SWAP / POOLS / REWARDS
        </p>
      </div>
    </div>
  );
}

// ── Content Datasets ────────────────────────────────────────────────────────
const features = [
  {
    number: "01",
    title: "Concentrated liquidity",
    copy: "Deploy capital within custom price bounds to earn maximum fee yields and minimize slippage for traders.",
    tag: "Capital Efficiency",
  },
  {
    number: "02",
    title: "Optimal execution",
    copy: "Trade any token pair with ultra-low price impact powered by streamlined liquidity pool routing.",
    tag: "Best Pricing",
  },
  {
    number: "03",
    title: "Continuous fee returns",
    copy: "Earn trading fees automatically on every transaction that clears through your active price ranges.",
    tag: "Fee Harvesting",
  },
  {
    number: "04",
    title: "On-chain loyalty rewards",
    copy: "Accumulate season rewards and loyalty multipliers on every swap and liquidity provision.",
    tag: "Season Perks",
  },
  {
    number: "05",
    title: "Sub-second finality",
    copy: "Experience immediate trade execution with sub-second block times and near-zero network fees.",
    tag: "LitVM Speed",
  },
  {
    number: "06",
    title: "Permissionless markets",
    copy: "Create new pools with custom fee tiers (0.01%, 0.05%, 0.30%, 1.00%) and trade freely with no gatekeepers.",
    tag: "Open Access",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect & Claim",
    copy: "Connect any Web3 wallet in one click and claim test assets from the faucet to explore trading immediately.",
    cta: "Open Faucet",
    href: "/faucet",
  },
  {
    number: "02",
    title: "Swap or Provide",
    copy: "Trade pairs with minimal slippage or deposit concentrated liquidity into active pools to begin earning fees.",
    cta: "Open Swap",
    href: "/swap",
  },
  {
    number: "03",
    title: "Collect Yield & Points",
    copy: "Harvest accrued swap fees anytime and track your on-chain loyalty rewards across seasonal campaigns.",
    cta: "View Campaigns",
    href: "/campaigns",
  },
];

const comparisons = [
  {
    feature: "Concentrated Price Ranges",
    balary: true,
    traditional: false,
    detail: "Custom capital bounds vs fragmented constant product (x*y=k)",
  },
  {
    feature: "Optimal Trade Execution",
    balary: true,
    traditional: false,
    detail: "Minimal slippage & deeper liquidity at current trading prices",
  },
  {
    feature: "On-Chain Loyalty Rewards",
    balary: true,
    traditional: false,
    detail: "Direct on-chain reward points vs centralized or absent incentives",
  },
  {
    feature: "Sub-Second Trade Settlement",
    balary: true,
    traditional: false,
    detail: "Instant block confirmations vs slow congested network queues",
  },
  {
    feature: "Automated Fee Accrual",
    balary: true,
    traditional: false,
    detail: "Claimable trading fees on every swap through your range",
  },
  {
    feature: "Non-Custodial Security",
    balary: true,
    traditional: true,
    detail: "100% wallet self-custody with zero intermediary counterparty risk",
  },
];

const securityFeatures = [
  {
    number: "01",
    title: "Non-Custodial Architecture",
    copy: "You retain exclusive ownership of your private keys and assets. Balary never holds, freezes, or custodies your tokens.",
    tag: "Self-Custody",
    cta: "Launch App",
    href: "/swap",
  },
  {
    number: "02",
    title: "Verifiable On-Chain State",
    copy: "Every pool reserve, swap execution rate, and fee distribution is mathematically defined and verifiable on-chain.",
    tag: "Transparency",
    cta: "Explore Pools",
    href: "/pools",
  },
  {
    number: "03",
    title: "Sub-Second Finality",
    copy: "Instant block confirmations eliminate front-running risk and ensure deterministic swap fulfillment every time.",
    tag: "Execution",
    cta: "Start Trading",
    href: "/swap",
  },
  {
    number: "04",
    title: "Continuous Fee Accrual",
    copy: "Liquidity providers earn proportional trading fees on every transaction within range, claimable with zero lockup.",
    tag: "Yield",
    cta: "View Campaigns",
    href: "/campaigns",
  },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 38,
    mass: 0.95,
  });

  const heroOpacity = useTransform(smooth, [0, 0.4], [1, 0.85]);
  const heroY = useTransform(smooth, [0, 0.4], [0, -18]);

  return (
    <div className="relative min-h-screen text-bone selection:bg-white/20">
      <SectionNav />

      {/* ── Hero Section (Flipit-inspired composition with Balary branding) ── */}
      <section
        id="hero"
        ref={heroRef}
        className="relative overflow-hidden pt-20 sm:pt-28 pb-14 sm:pb-20 md:pt-36 md:pb-24"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.035),transparent_48%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_45%,rgba(0,0,0,0.6))]" />

        <div className="page-container relative z-10">
          <div className="grid grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            
            {/* Left: Content Column */}
            <motion.div
              style={{ opacity: heroOpacity, y: heroY }}
              className="flex flex-col items-start text-left"
            >
              <div className="section-tag mb-3 sm:mb-4">
                [ The Decentralized Exchange for LitVM ]
              </div>

              <h1 className="type-display-xl font-display text-white max-w-[15ch]">
                Trade fast.<br />
                Provide liquidity.<br />
                <span className="text-ash">Earn protocol rewards.</span>
              </h1>

              <p className="section-subtitle !mt-4 sm:!mt-5 max-w-[34rem] text-[15px] sm:text-[16px] md:text-[17px]">
                The native decentralized exchange for LitVM. Execute token swaps with concentrated capital efficiency, minimal slippage, and on-chain season rewards.
              </p>

              <div className="mt-7 sm:mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
                <motion.div
                  whileHover={liftHover}
                  whileTap={subtleTap}
                  transition={microTransition}
                  className="w-full sm:w-auto"
                >
                  <Link
                    to="/swap"
                    className="ui-button ui-button-primary w-full sm:w-auto !min-h-11 sm:!min-h-12 !px-6"
                  >
                    Launch App
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={liftHover}
                  whileTap={subtleTap}
                  transition={microTransition}
                  className="w-full sm:w-auto"
                >
                  <Link
                    to="/pools"
                    className="ui-button ui-button-secondary w-full sm:w-auto !min-h-11 sm:!min-h-12 !px-6"
                  >
                    Explore Pools
                  </Link>
                </motion.div>
              </div>

              {/* Trader Status indicators */}
              <div className="mt-8 sm:mt-12 flex flex-wrap items-center gap-4 sm:gap-6 border-t border-[color:var(--border-subtle)] pt-5 sm:pt-6 text-[12px] sm:text-[13px] text-ash">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
                  <span>Built on LitVM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-white/70" />
                  <span>Sub-Second Finality</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-white/70" />
                  <span>On-Chain Rewards</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Flipit-style 3D 3-Card Deck Visual */}
            <HeroComposition />

          </div>
        </div>
      </section>

      {/* ── Product Section (Strictly user-facing, equal height cards) ── */}
      <MotionSection
        id="product"
        aria-labelledby="product-heading"
        backgroundClassName="bg-[#080808]"
        className="snap-section relative isolate overflow-hidden !py-20 md:!py-24 lg:!py-28"
      >
        <div className="page-container min-w-0">
          <header className="mb-12 max-w-2xl md:mb-16">
            <MotionElement role="eyebrow">
              <p className="section-tag mb-0">[ Product ]</p>
            </MotionElement>

            <MotionHeading>
              <h2
                id="product-heading"
                className="type-h2 mt-6 max-w-xl font-display text-bone"
              >
                Everything a modern DEX needs.
              </h2>
            </MotionHeading>

            <MotionElement role="copy">
              <p className="section-subtitle !mt-5 max-w-[60ch]">
                Concentrated liquidity, sub-second execution, and continuous on-chain rewards natively on LitVM.
              </p>
            </MotionElement>
          </header>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr items-stretch">
            {features.map((feature, index) => (
              <MotionElement
                role="item"
                index={index}
                key={feature.title}
                className="h-full flex flex-col"
                innerClassName="h-full flex flex-col flex-1"
              >
                <motion.article
                  whileHover={liftHover}
                  transition={microTransition}
                  className="ui-surface flex h-full flex-col justify-between overflow-hidden p-6 rounded-[6px] border border-white/[0.08] hover:border-white/20 transition-colors"
                >
                  <div className="flex-1 flex flex-col">
                    <span className="text-xs font-mono text-ash block mb-3">
                      {feature.number}
                    </span>
                    <h3 className="type-card-title font-display text-bone mb-2">
                      {feature.title}
                    </h3>
                    <p className="type-card-body text-ash leading-relaxed">
                      {feature.copy}
                    </p>
                  </div>

                  <div className="pt-4 mt-5 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-ash/80">
                    <span>{feature.tag}</span>
                    <ArrowRight size={12} className="opacity-40" />
                  </div>
                </motion.article>
              </MotionElement>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* ── How It Works Section (3 Equal-height Step cards) ── */}
      <MotionSection
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        backgroundClassName="bg-[#0e0e0e]"
        className="relative py-20 md:py-28"
      >
        <div className="page-container">
          <header className="max-w-2xl mb-12 md:mb-16">
            <MotionElement role="eyebrow">
              <div className="section-tag mb-0">[ How it works ]</div>
            </MotionElement>

            <MotionHeading>
              <h2
                id="how-it-works-heading"
                className="type-h2 mt-6 font-display text-bone"
              >
                From wallet to live market.
              </h2>
            </MotionHeading>

            <MotionElement role="copy">
              <p className="section-subtitle !mt-5">
                Three simple steps to start trading and deploying liquidity.
              </p>
            </MotionElement>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr items-stretch">
            {steps.map((step, index) => (
              <MotionElement
                role="item"
                index={index}
                key={step.title}
                className="h-full flex flex-col"
                innerClassName="h-full flex flex-col flex-1"
              >
                <motion.article
                  whileHover={liftHover}
                  transition={microTransition}
                  className="ui-surface flex h-full flex-col justify-between p-6 rounded-[6px] border border-white/[0.08] hover:border-white/20 transition-colors"
                >
                  <div className="flex-1 flex flex-col">
                    <span className="text-xs font-mono text-ash block mb-4">
                      {step.number}
                    </span>
                    <h3 className="type-step font-display text-bone mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-ash leading-relaxed mb-6">
                      {step.copy}
                    </p>
                  </div>

                  <Link
                    to={step.href}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-bone hover:underline pt-4 border-t border-white/[0.04]"
                  >
                    <span>{step.cta}</span>
                    <ArrowRight size={13} />
                  </Link>
                </motion.article>
              </MotionElement>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* ── Why Balary Section (Clean trader-centric comparison table) ── */}
      <MotionSection
        id="why-balary"
        backgroundClassName="bg-[#121212]"
        className="mist-section grain-texture relative block w-full overflow-hidden py-20 text-white lg:py-28"
      >
        <div className="page-container min-w-0">
          <header className="mb-8 max-w-2xl sm:mb-10">
            <MotionElement role="eyebrow">
              <div className="section-tag mb-0">[ Why Balary ]</div>
            </MotionElement>

            <MotionHeading>
              <h2 className="type-h2 mt-6 font-display text-white">
                Modern trading without friction.
              </h2>
            </MotionHeading>

            <MotionElement role="copy">
              <p className="section-subtitle !mt-5">
                See how Balary compares against traditional decentralized exchange platforms.
              </p>
            </MotionElement>
          </header>

          <MotionElement
            role="visual"
            className="ui-surface w-full overflow-hidden rounded-[6px]"
          >
            <div className="w-full overflow-x-auto scroll-smooth touch-pan-x">
              <table className="w-full min-w-[620px] sm:min-w-[700px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#151515] text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] text-ash">
                    <th className="py-3.5 px-4 sm:py-4 sm:px-6 font-medium">Trading Feature</th>
                    <th className="py-3.5 px-4 sm:py-4 sm:px-6 font-medium text-bone">Balary</th>
                    <th className="py-3.5 px-4 sm:py-4 sm:px-6 font-medium text-ash">Traditional DEXs</th>
                    <th className="py-3.5 px-4 sm:py-4 sm:px-6 font-medium text-ash">Advantage to You</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-[11px] sm:text-xs">
                  {comparisons.map((row) => (
                    <tr key={row.feature} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 sm:py-4 sm:px-6 text-bone font-medium">
                        {row.feature}
                      </td>
                      <td className="py-3.5 px-4 sm:py-4 sm:px-6">
                        <Mark active={row.balary} />
                      </td>
                      <td className="py-3.5 px-4 sm:py-4 sm:px-6">
                        <Mark active={row.traditional} />
                      </td>
                      <td className="py-3.5 px-4 sm:py-4 sm:px-6 text-ash font-mono text-[10px] sm:text-[11px]">
                        {row.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionElement>
          
          <p className="text-[11px] text-ash/60 mt-3 font-mono">
            * Direct comparison across capital efficiency, execution latency, and incentive rewards.
          </p>
        </div>
      </MotionSection>

      {/* ── Security & Ecosystem Section (Replaces old dev docs) ── */}
      <MotionSection
        id="security"
        backgroundClassName="bg-[#0e0e0e]"
        className="relative py-20 md:py-28"
      >
        <div className="page-container">
          <header className="max-w-2xl mb-12 md:mb-16">
            <MotionElement role="eyebrow">
              <div className="section-tag mb-0">[ Security & Trust ]</div>
            </MotionElement>

            <MotionHeading>
              <h2 className="type-h2 mt-6 font-display text-bone">
                Built for self-custody and transparent trading.
              </h2>
            </MotionHeading>

            <MotionElement role="copy">
              <p className="section-subtitle !mt-5">
                Your keys, your assets, completely non-custodial and verifiable on-chain.
              </p>
            </MotionElement>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr items-stretch">
            {securityFeatures.map((item, index) => (
              <MotionElement
                role="item"
                index={index}
                key={item.title}
                className="h-full flex flex-col"
                innerClassName="h-full flex flex-col flex-1"
              >
                <motion.div
                  whileHover={liftHover}
                  transition={microTransition}
                  className="ui-surface flex h-full flex-col justify-between p-6 rounded-[6px] border border-white/[0.08] hover:border-white/20 transition-colors"
                >
                  <div className="flex-1 flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-ash bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-[4px] inline-block mb-3 w-fit">
                      {item.tag}
                    </span>
                    <h3 className="type-card-title font-display text-bone mb-2">
                      {item.title}
                    </h3>
                    <p className="type-card-body text-ash mb-4 leading-relaxed">
                      {item.copy}
                    </p>
                  </div>

                  <Link
                    to={item.href}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-bone hover:underline pt-3 border-t border-white/[0.04]"
                  >
                    <span>{item.cta}</span>
                    <ArrowRight size={12} className="text-ash" />
                  </Link>
                </motion.div>
              </MotionElement>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* ── Final CTA Section ── */}
      <MotionSection
        id="cta"
        className="relative py-24 text-center"
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <MotionElement role="eyebrow">
            <div className="section-tag mb-0">[ Start Trading ]</div>
          </MotionElement>

          <MotionHeading>
            <h2 className="type-display mt-6 font-display text-bone">
              Trade with speed on LitVM.
            </h2>
          </MotionHeading>

          <MotionElement role="copy">
            <p className="section-subtitle max-w-md mx-auto !mt-4">
              Open the swap desk or provide concentrated liquidity in seconds.
            </p>
          </MotionElement>

          <MotionElement role="cta">
            <div className="mt-8 flex justify-center">
              <motion.div
                whileHover={liftHover}
                whileTap={subtleTap}
                transition={microTransition}
              >
                <Link
                  to="/swap"
                  className="ui-button ui-button-primary !min-h-12 !px-8 text-sm flex items-center justify-center gap-2"
                >
                  <span>Launch App</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>
          </MotionElement>
        </div>
      </MotionSection>

    </div>
  );
}
