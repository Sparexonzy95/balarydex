import { Link } from 'react-router-dom';
import React from 'react';

export const BalaryLogoIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="balary-b-grad-inline" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#EDEDED" />
        <stop offset="100%" stopColor="#D4D4D4" />
      </linearGradient>
      <linearGradient id="balary-gold-inline" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    {/* Vertical Backbone Stem */}
    <path
      d="M7 6.5C7 5.67 7.67 5 8.5 5H14C14.83 5 15.5 5.67 15.5 6.5V33.5C15.5 34.33 14.83 35 14 35H8.5C7.67 35 7 34.33 7 33.5V6.5Z"
      fill="url(#balary-b-grad-inline)"
    />

    {/* Top Loop of B */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14 5H24C28.42 5 31.5 7.9 31.5 12C31.5 16 28.5 18.8 24 19H14V5ZM15.5 9.5V14.5H23.5C25.5 14.5 27 13.4 27 12C27 10.6 25.5 9.5 23.5 9.5H15.5Z"
      fill="url(#balary-b-grad-inline)"
    />

    {/* Bottom Loop of B */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14 18.5H25C29.8 18.5 33.5 21.8 33.5 26.5C33.5 31.5 29.5 35 24.5 35H14V18.5ZM15.5 23.5V30H24C26.5 30 28.5 28.5 28.5 26.5C28.5 24.5 26.5 23.5 24 23.5H15.5Z"
      fill="url(#balary-b-grad-inline)"
    />

    {/* DEX Dynamic Swap Arrow Accent at waist */}
    <path
      d="M5 20L11 16V24L5 20Z"
      fill="url(#balary-gold-inline)"
    />
  </svg>
);

export const Logo: React.FC = () => {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-white/10 bg-[#151515] p-1 transition-transform duration-200 group-hover:scale-105">
        <BalaryLogoIcon className="h-5 w-5 object-contain" />
      </div>
      <span className="font-display text-[19px] font-semibold tracking-tight text-bone group-hover:text-white transition-colors">
        Balary
      </span>
    </Link>
  );
};
