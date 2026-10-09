import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { useAppKit } from '@reown/appkit/react';
import { useConnection, useDisconnect } from 'wagmi';
import { Menu, X, LogOut, ArrowRight, Copy, Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTokenBalance } from '@/hooks/shared/useTokenBalance';
import { TOKENS } from '@/config/tokens';
import { subtleTap, microTransition, smoothEase } from '@/lib/motion';

function createRand(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return function () {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function createColor(rand: () => number) {
  const h = Math.floor(rand() * 360);
  const s = Math.floor(rand() * 60) + 40;
  const l = Math.floor(rand() * 50) + 30;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

interface BlockieProps {
  address: string;
  size?: number;
  className?: string;
}

function Blockie({ address, size = 20, className }: BlockieProps) {
  const { grid, colors } = useMemo(() => {
    const seed = address.toLowerCase();
    const rand = createRand(seed);

    const bgColor = createColor(rand);
    const primaryColor = createColor(rand);
    const spotColor = createColor(rand);

    const grid: number[] = [];
    const width = 8;
    const height = 8;

    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < 4; x++) {
        const val = Math.floor(rand() * 2.3);
        row.push(val);
      }
      const mirrored = [...row, ...row.slice().reverse()];
      grid.push(...mirrored);
    }

    return {
      grid,
      colors: [bgColor, primaryColor, spotColor],
    };
  }, [address]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      className={`shrink-0 ${className || 'rounded-[4px]'}`}
      style={{ imageRendering: 'pixelated' }}
    >
      {grid.map((val, idx) => {
        const x = idx % 8;
        const y = Math.floor(idx / 8);
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={1}
            height={1}
            fill={colors[val]}
          />
        );
      })}
    </svg>
  );
}

export default function Navbar() {
  const { open } = useAppKit();
  const { address, isConnected } = useConnection();
  const { formattedBalance } = useTokenBalance({ token: TOKENS[0], address });
  const { disconnect } = useDisconnect();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletDropdown, setWalletDropdown] = useState(false);
  const { pathname } = useLocation();
  const [copied, setCopied] = useState(false);

  const wallet = address;
  const shortAddress = wallet
    ? `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`
    : '';

  const handleCopy = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const isLanding = pathname === '/';

  const appNavLinks = [
    { label: 'Trade', href: '/swap' },
    { label: 'Pools', href: '/pools' },
    { label: 'Campaigns', href: '/campaigns' },
    { label: 'Faucet', href: '/faucet' },
    { label: 'Activity', href: '/activity' },
    { label: 'Profile', href: '/profile' },
  ];

  const landingNavLinks = [
    { label: 'Product', href: '/#product' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Why Balary', href: '/#why-balary' },
    { label: 'Security', href: '/#security' },
  ];

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-[color:var(--border-subtle)] bg-[#080808]/95 backdrop-blur-md">
        <div className="relative flex h-16 sm:h-20 w-full items-center justify-between px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          
          {/* Left: Logo */}
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Center: Sleek pill nav */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center pointer-events-auto">
            {isLanding ? (
              <nav
                aria-label="Landing navigation"
                className="flex items-center gap-1 rounded-[6px] border border-[color:var(--border-subtle)] bg-[#151515] p-1"
              >
                {landingNavLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="inline-flex min-h-9 items-center rounded-[4px] px-3.5 text-[13px] font-medium text-[color:var(--text-secondary)] hover:bg-white/[0.04] hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            ) : (
              <nav
                aria-label="App navigation"
                className="flex items-center gap-1 rounded-[6px] border border-[color:var(--border-subtle)] bg-[#151515] p-1"
              >
                {appNavLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={`inline-flex min-h-9 items-center rounded-[4px] px-3.5 text-[13px] font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-white/[0.08] text-white'
                          : 'text-[color:var(--text-secondary)] hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {isLanding ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/swap"
                  className="ui-button ui-button-primary !min-h-9 sm:!min-h-10 !text-[12px] sm:!text-[13px] !px-3.5 sm:!px-4 flex items-center gap-1.5"
                >
                  <span>Launch App</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ) : (
              <>
                {/* Wallet Button */}
                <div className="flex items-center">
                  {!isConnected ? (
                    <button
                      onClick={() => open()}
                      className="ui-button ui-button-primary sm:ui-button-secondary !min-h-9 sm:!min-h-10 !text-[12px] sm:!text-[13px] !px-3 sm:!px-4"
                    >
                      Connect
                    </button>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setWalletDropdown(!walletDropdown)}
                        className="flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 rounded-[6px] border border-[color:var(--border-default)] bg-[#151515] px-2.5 sm:px-3 text-[12px] sm:text-[13px] text-bone transition-colors hover:border-[color:var(--border-hover)]"
                      >
                        <Blockie address={address || ''} size={16} />
                        <span className="font-mono text-[11px] sm:text-[12px]">{shortAddress}</span>
                        <ChevronDown
                          size={12}
                          className={`text-ash transition-transform duration-200 ${
                            walletDropdown ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Wallet Dropdown */}
                      {walletDropdown && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setWalletDropdown(false)}
                          />
                          <div className="absolute right-0 top-full mt-2 w-64 rounded-[6px] border border-[color:var(--border-default)] bg-[#151515] shadow-2xl shadow-black/80 z-50 overflow-hidden">
                            <div className="border-b border-[color:var(--border-subtle)] p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider text-ash">Connected</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              </div>
                              <div className="flex items-center gap-2.5">
                                <Blockie address={address || ''} size={28} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[13px] text-white">{shortAddress}</span>
                                    <button
                                      onClick={handleCopy}
                                      className="text-ash hover:text-white transition-colors"
                                      title="Copy"
                                    >
                                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                  <span className="block text-[11px] text-ash">LitVM LiteForge</span>
                                </div>
                              </div>
                            </div>

                            <div className="border-b border-[color:var(--border-subtle)] px-4 py-3">
                              <span className="text-[10px] uppercase tracking-wider text-ash">Balance</span>
                              <p className="font-mono text-[15px] text-white mt-0.5">
                                {formattedBalance} <span className="text-ash text-[12px]">zkLTC</span>
                              </p>
                            </div>

                            <div className="p-2">
                              <button
                                onClick={() => {
                                  disconnect();
                                  setWalletDropdown(false);
                                }}
                                className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-[12px] text-ash hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              >
                                <LogOut size={13} />
                                Disconnect
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile Hamburger */}
            <motion.button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              whileTap={subtleTap}
              className="ui-icon-button flex !h-10 !w-10 text-bone md:!hidden"
            >
              <Menu className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay matching ckashapp */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22, ease: smoothEase }}
            className="fixed inset-0 z-[70] max-h-[100dvh] overflow-y-auto bg-[#080808] text-bone md:!hidden"
          >
            <div className="flex min-h-full flex-col px-6 py-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="ui-icon-button !h-10 !w-10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="mt-10 space-y-8">
                {isLanding ? (
                  <div>
                    <p className="mb-4 text-[11px] uppercase tracking-[0.12em] text-ash font-mono">
                      [ Balary Overview ]
                    </p>
                    <div className="space-y-1">
                      {landingNavLinks.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="group flex min-h-11 items-center justify-between rounded-[6px] px-4 py-2.5 text-[16px] text-bone/80 hover:bg-white/[0.04] hover:text-white transition-colors"
                        >
                          {link.label}
                          <ArrowRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>

                    <div className="pt-6">
                      <Link
                        to="/swap"
                        onClick={() => setMobileOpen(false)}
                        className="ui-button ui-button-primary w-full !min-h-12 text-[14px] flex items-center justify-center gap-2"
                      >
                        <span>Launch App</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-4 text-[11px] uppercase tracking-[0.12em] text-ash font-mono">
                      [ Trading Desks ]
                    </p>
                    <div className="space-y-1">
                      {appNavLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setMobileOpen(false)}
                          className={`group flex min-h-11 items-center justify-between rounded-[6px] px-4 py-2.5 text-[16px] transition-colors ${
                            pathname === link.href
                              ? 'bg-white/[0.08] text-white font-medium'
                              : 'text-bone/80 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          {link.label}
                          <ArrowRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ))}
                    </div>

                    {/* Wallet in Mobile Drawer */}
                    <div className="pt-4">
                      {!isConnected ? (
                        <button
                          onClick={() => {
                            open();
                            setMobileOpen(false);
                          }}
                          className="ui-button ui-button-primary w-full !min-h-12 text-[14px]"
                        >
                          Connect Wallet
                        </button>
                      ) : (
                        <div className="rounded-[6px] border border-[color:var(--border-default)] bg-[#151515] p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wider text-ash">Connected</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Blockie address={address || ''} size={24} />
                              <span className="font-mono text-[14px] text-white">{shortAddress}</span>
                            </div>
                            <button
                              onClick={handleCopy}
                              className="text-ash hover:text-white p-1"
                            >
                              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                          </div>
                          <div className="border-t border-white/[0.05] pt-2 flex justify-between text-[13px]">
                            <span className="text-ash">Balance:</span>
                            <span className="font-mono text-white">{formattedBalance} zkLTC</span>
                          </div>
                          <button
                            onClick={() => {
                              disconnect();
                              setMobileOpen(false);
                            }}
                            className="w-full text-center text-[12px] text-red-400 pt-2"
                          >
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Drawer Footer */}
              <div className="mt-auto border-t border-[color:var(--border-subtle)] pt-6 text-[12px] text-ash">
                <p>Balary DEX — Uniswap v4 on LitVM</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
