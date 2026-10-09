import React from 'react';
import { Search, ExternalLink, Menu } from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch, onToggleMobileMenu }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--border-subtle)] bg-[#080808]/95 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 md:px-8">
        
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden text-ash hover:text-white p-1"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-white/10 bg-[#151515] p-1 transition-transform group-hover:scale-105">
              <svg viewBox="0 0 40 40" fill="none" className="h-5 w-5" aria-hidden="true">
                <defs>
                  <linearGradient id="balary-b-docs" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="60%" stopColor="#EDEDED" />
                    <stop offset="100%" stopColor="#D4D4D4" />
                  </linearGradient>
                </defs>
                <path d="M7 6.5C7 5.67 7.67 5 8.5 5H14C14.83 5 15.5 5.67 15.5 6.5V33.5C15.5 34.33 14.83 35 14 35H8.5C7.67 35 7 34.33 7 33.5V6.5Z" fill="url(#balary-b-docs)" />
                <path fillRule="evenodd" clipRule="evenodd" d="M14 5H24C28.42 5 31.5 7.9 31.5 12C31.5 16 28.5 18.8 24 19H14V5ZM15.5 9.5V14.5H23.5C25.5 14.5 27 13.4 27 12C27 10.6 25.5 9.5 23.5 9.5H15.5Z" fill="url(#balary-b-docs)" />
                <path fillRule="evenodd" clipRule="evenodd" d="M14 18.5H25C29.8 18.5 33.5 21.8 33.5 26.5C33.5 31.5 29.5 35 24.5 35H14V18.5ZM15.5 23.5V30H24C26.5 30 28.5 28.5 28.5 26.5C28.5 24.5 26.5 23.5 24 23.5H15.5Z" fill="url(#balary-b-docs)" />
                <path d="M5 20L11 16V24L5 20Z" fill="#F59E0B" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[18px] font-bold tracking-tight text-white">Balary</span>
              <span className="rounded-[4px] border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-ash uppercase">
                Docs
              </span>
            </div>
          </a>
        </div>

        {/* Center: Search button */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <button
            onClick={onOpenSearch}
            className="flex w-full items-center justify-between rounded-[6px] border border-[color:var(--border-default)] bg-[#121212] px-3.5 py-1.5 text-[13px] text-ash hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search size={14} />
              <span>Search docs...</span>
            </div>
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Links */}
        <div className="flex items-center gap-3">
          <a
            href="https://liteforge.explorer.caldera.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 text-[13px] text-ash hover:text-white transition-colors"
          >
            <span>Explorer</span>
            <ExternalLink size={12} />
          </a>

          <a
            href="http://localhost:3000"
            className="flex items-center gap-1.5 rounded-[6px] bg-white text-black px-3.5 py-1.5 text-[13px] font-medium hover:bg-white/90 transition-colors"
          >
            <span>Launch App</span>
            <ExternalLink size={12} />
          </a>
        </div>

      </div>
    </header>
  );
};
