import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-[color:var(--border-subtle)] bg-[#0a0a0a] py-14 text-bone">
      <div className="page-container">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-[13px] leading-relaxed text-ash">
              Decentralized exchange providing concentrated liquidity and sub-second trade execution on LitVM.
            </p>
            <div className="pt-2 text-[12px] text-ash/80">
              <span className="inline-flex items-center gap-2 rounded-[4px] border border-white/10 bg-white/[0.03] px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Built on LitVM Network
              </span>
            </div>
          </div>

          {/* Trade Links */}
          <div>
            <h4 className="text-[12px] font-medium uppercase tracking-[0.1em] text-ash">
              Trading
            </h4>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              <li>
                <Link to="/swap" className="text-bone/70 hover:text-white transition-colors">
                  Swap Tokens
                </Link>
              </li>
              <li>
                <Link to="/pools" className="text-bone/70 hover:text-white transition-colors">
                  Liquidity Pools
                </Link>
              </li>
              <li>
                <Link to="/pools/create" className="text-bone/70 hover:text-white transition-colors">
                  Create Pool
                </Link>
              </li>
              <li>
                <Link to="/activity" className="text-bone/70 hover:text-white transition-colors">
                  Activity Feed
                </Link>
              </li>
            </ul>
          </div>

          {/* Protocol Links */}
          <div>
            <h4 className="text-[12px] font-medium uppercase tracking-[0.1em] text-ash">
              Protocol
            </h4>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              <li>
                <a href="/#product" className="text-bone/70 hover:text-white transition-colors">
                  Product
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="text-bone/70 hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#why-balary" className="text-bone/70 hover:text-white transition-colors">
                  Why Balary
                </a>
              </li>
              <li>
                <a href="/#security" className="text-bone/70 hover:text-white transition-colors">
                  Security & Trust
                </a>
              </li>
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h4 className="text-[12px] font-medium uppercase tracking-[0.1em] text-ash">
              Community
            </h4>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              <li>
                <a
                  href="https://x.com/balarydex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bone/70 hover:text-white transition-colors"
                >
                  X (Twitter)
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/balary"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bone/70 hover:text-white transition-colors"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://liteforge.explorer.caldera.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bone/70 hover:text-white transition-colors"
                >
                  LitVM Explorer ↗
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[color:var(--border-subtle)] pt-8 text-[12px] text-ash sm:flex-row">
          <p>© 2026 Balary Protocol. All rights reserved.</p>
          <div className="flex items-center gap-4 text-ash">
            <span>Sub-Second Finality</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>LitVM Network</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
