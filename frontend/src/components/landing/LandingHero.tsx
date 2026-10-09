import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Layers, Zap, Award } from "lucide-react";
import { liftHover, microTransition, smoothEase, subtleTap } from "@/lib/motion";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]" />

      <div className="page-container relative z-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: smoothEase }}
            className="flex flex-col items-start text-left"
          >
            <div className="section-tag mb-4">
              [ Uniswap v4 on LitVM ]
            </div>

            <h1 className="type-display-xl font-display text-white max-w-[16ch]">
              Next-generation liquidity & trading on LitVM.
            </h1>

            <p className="section-subtitle !mt-5 max-w-[34rem] text-[16px] md:text-[17px]">
              Powered by Uniswap v4 singleton architecture. Sub-second finality, custom contract hooks, and on-chain season rewards for traders and LPs.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
              <Link
                to="/swap"
                className="ui-button ui-button-primary w-full sm:w-auto !min-h-12 !px-6"
              >
                Launch App
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/pools"
                className="ui-button ui-button-secondary w-full sm:w-auto !min-h-12 !px-6"
              >
                Explore Pools
              </Link>

              <Link
                to="/faucet"
                className="ui-button ui-button-secondary w-full sm:w-auto !min-h-12 !px-5 text-bone/70 hover:text-white"
              >
                Faucet
              </Link>
            </div>

            {/* Quick stats pills */}
            <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-[color:var(--border-subtle)] pt-6 text-[13px] text-ash">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <span>LitVM LiteForge (4441)</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-white/70" />
                <span>Singleton v4 Architecture</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-3.5 w-3.5 text-white/70" />
                <span>Points Hook Rewards</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Sleek Interactive DEX Preview Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: smoothEase }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            {/* Ambient card glow */}
            <div className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-b from-white/10 to-transparent opacity-40 blur-xl" />

            <div className="ui-surface relative overflow-hidden rounded-[8px] border border-[color:var(--border-default)] !bg-[#111111] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
              {/* Card top bar */}
              <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-white/10 bg-white/[0.05]">
                    <Layers className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <span className="block text-[13px] font-medium text-white">Universal v4 Pool</span>
                    <span className="block text-[10px] uppercase tracking-wider text-ash/80">LitVM Main Pool</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-[4px] border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live 0.05%
                </div>
              </div>

              {/* Pair Preview Visual */}
              <div className="my-5 space-y-2">
                <div className="flex items-center justify-between rounded-[6px] border border-[color:var(--border-subtle)] bg-[#181818] p-3.5">
                  <div>
                    <span className="block text-[11px] tracking-wide text-ash">You Pay</span>
                    <span className="font-financial text-[22px] font-medium text-white">100.0</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[6px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
                    <img src="/tokens/wltc.svg" alt="zkLTC" className="h-5 w-5 rounded-full" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    <span className="text-[13px] font-medium text-white">zkLTC</span>
                  </div>
                </div>

                <div className="flex justify-center -my-2.5 relative z-10">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#111] text-ash shadow-md">
                    <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[6px] border border-[color:var(--border-subtle)] bg-[#181818] p-3.5">
                  <div>
                    <span className="block text-[11px] tracking-wide text-ash">You Receive (est.)</span>
                    <span className="font-financial text-[22px] font-medium text-bone">184.2</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[6px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
                    <img src="/tokens/bal.svg" alt="BAL" className="h-5 w-5 rounded-full" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    <span className="text-[13px] font-medium text-white">BAL</span>
                  </div>
                </div>
              </div>

              {/* Hook Information pill */}
              <div className="rounded-[6px] border border-[color:var(--border-subtle)] bg-white/[0.02] p-3 text-[12px]">
                <div className="flex items-center justify-between text-ash">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-white/80" />
                    Hook Incentive
                  </span>
                  <span className="font-mono text-bone">+250 Points / Swap</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-white/[0.04] pt-2 text-ash">
                  <span>Routing</span>
                  <span className="text-white/80">Singleton Direct Flash</span>
                </div>
              </div>

              {/* Action Button */}
              <Link
                to="/swap?from=0x1320641bCdDE531818B09746f333333333333333&to=0x7a52140c83a736a596041ee2b4514ba1327f29bb"
                className="ui-button ui-button-primary mt-4 w-full !min-h-11"
              >
                Trade This Pair Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
