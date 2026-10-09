import { Link } from "react-router-dom";
import { ArrowRight, Droplets } from "lucide-react";

export default function LandingCTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="page-container">
        <div className="ui-surface relative overflow-hidden rounded-[8px] border border-[color:var(--border-default)] !bg-[#121212] p-8 md:p-14 text-center">
          
          {/* Subtle gradient glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />

          <div className="relative z-10 mx-auto max-w-2xl">
            <span className="section-tag justify-center">
              [ Get Started ]
            </span>

            <h2 className="type-h2 font-display text-white mt-4">
              Start trading on LitVM today.
            </h2>

            <p className="section-subtitle mx-auto !mt-4 max-w-xl">
              Connect your wallet, claim free testnet tokens from the faucet, and experience instant Uniswap v4 swaps with on-chain season rewards.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/swap"
                className="ui-button ui-button-primary w-full sm:w-auto !min-h-12 !px-8"
              >
                Launch App
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/faucet"
                className="ui-button ui-button-secondary w-full sm:w-auto !min-h-12 !px-6"
              >
                <Droplets className="h-4 w-4" />
                Claim Faucet
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
