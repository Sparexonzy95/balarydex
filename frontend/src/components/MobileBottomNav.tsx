import { Link, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Layers, Trophy, Droplets, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileBottomNav() {
  const { pathname } = useLocation();

  const navItems = [
    { label: 'Trade', href: '/swap', icon: ArrowLeftRight },
    { label: 'Pools', href: '/pools', icon: Layers },
    { label: 'Campaigns', href: '/campaigns', icon: Trophy },
    { label: 'Faucet', href: '/faucet', icon: Droplets },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav
      aria-label="Mobile application navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#090909]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(0,0,0,0.85)]"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/swap' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className="relative flex flex-1 flex-col items-center justify-center py-1 transition-transform active:scale-95"
            >
              <div
                className={`flex h-8 w-11 items-center justify-center rounded-[6px] transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.1] text-white shadow-[0_0_12px_rgba(255,255,255,0.06)]'
                    : 'text-ash/60 hover:text-white/80'
                }`}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.75} />
              </div>
              <span
                className={`mt-0.5 text-[10px] font-medium tracking-tight transition-colors ${
                  isActive ? 'text-white' : 'text-ash/60'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.span
                  layoutId="activeBottomNavPill"
                  className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-bone shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
