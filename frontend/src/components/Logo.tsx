import { Link } from 'react-router-dom';
import React from 'react';

export const BalaryLogoIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 225 225"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Upper section of Balary B with diagonal slash */}
    <path
      d="M 59 38 L 133 38 L 133 38 L 134 39 L 135 39 L 136 39 L 137 39 L 138 40 L 139 40 L 140 40 L 141 41 L 142 41 L 143 41 L 144 42 L 145 43 L 146 43 L 147 44 L 148 44 L 149 45 L 150 46 L 151 47 L 152 48 L 153 49 L 154 50 L 155 51 L 155 52 L 156 53 L 157 54 L 157 55 L 158 56 L 158 57 L 159 58 L 159 59 L 159 60 L 160 61 L 160 62 L 160 63 L 160 64 L 161 65 L 161 66 L 161 67 L 161 68 L 161 69 L 161 70 L 161 71 L 161 72 L 161 73 L 161 74 L 161 75 L 161 76 L 160 77 L 160 78 L 160 79 L 160 80 L 160 81 L 159 82 L 159 83 L 158 84 L 158 85 L 157 86 L 157 87 L 156 88 L 156 89 L 155 90 L 59 164 Z"
    />

    {/* Lower section of Balary B with parallel diagonal slash */}
    <path
      d="M 59 179 L 142 116 L 142 116 L 143 116 L 144 116 L 145 117 L 146 117 L 147 118 L 148 118 L 149 119 L 150 119 L 151 120 L 152 121 L 153 122 L 154 123 L 155 124 L 156 125 L 157 126 L 158 127 L 158 128 L 159 129 L 160 130 L 160 131 L 161 132 L 161 133 L 162 134 L 162 135 L 163 136 L 163 137 L 163 138 L 164 139 L 164 140 L 164 141 L 164 142 L 164 143 L 165 144 L 165 145 L 165 146 L 165 147 L 165 148 L 165 149 L 165 150 L 165 151 L 165 152 L 165 153 L 165 154 L 165 155 L 164 156 L 164 157 L 164 158 L 164 159 L 163 160 L 163 161 L 163 162 L 162 163 L 162 164 L 162 165 L 161 166 L 161 167 L 160 168 L 159 169 L 159 170 L 158 171 L 157 172 L 156 173 L 156 174 L 155 175 L 154 176 L 153 177 L 152 177 L 151 178 L 150 179 L 149 180 L 148 180 L 147 181 L 146 181 L 145 182 L 144 182 L 143 183 L 142 183 L 141 184 L 140 184 L 139 184 L 138 185 L 137 185 L 136 185 L 135 185 L 134 185 L 133 186 L 59 186 Z"
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
