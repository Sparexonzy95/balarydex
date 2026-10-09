import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Loader2, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';

import { TokenConfig } from '@/config/tokens';
import { useTokenBalance } from '@/hooks/shared/useTokenBalance';
import { fetchTokenMetadata } from '@/lib/tokenMetadata';
import TokenImage from './TokenImage';

export interface Token extends TokenConfig {
  balance?: string;
  isCustom?: boolean;
}

interface TokenSelectorProps {
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  tokens: Token[];
  excludeToken?: Token | null;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const TokenListItem = ({
  token,
  isSelected,
  onClick,
  onRemove
}: {
  token: Token;
  isSelected: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) => {
  const { address } = useAccount();
  const { formattedBalance } = useTokenBalance({ token, address });

  return (
    <div
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-white/[0.04] rounded-[6px] transition-colors group cursor-pointer ${
        isSelected ? 'bg-white/[0.06]' : ''
      }`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-8 h-8 border border-white/10 rounded-full overflow-hidden shrink-0 bg-black flex items-center justify-center">
          <TokenImage tokenAddress={token.address} symbol={token.symbol} className="w-full h-full" alt={token.symbol} />
        </div>
        <div className="text-left min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-[15px] tracking-tight truncate ${isSelected ? 'text-primary' : 'text-white'}`}>
              {token.symbol}
            </p>
            {token.isCustom && (
              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.2 rounded uppercase tracking-wider font-semibold">
                Custom
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest truncate">{token.name}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[12px] font-mono text-white/60">{formattedBalance}</span>
          {isSelected && (
            <span className="text-[10px] uppercase tracking-widest text-primary">Selected</span>
          )}
        </div>
        {token.isCustom && onRemove && (
          <button
            type="button"
            title="Remove custom token"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 text-white/20 hover:text-red-400 transition-colors cursor-pointer rounded"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onSelect,
  tokens,
  excludeToken = null,
  label = "Select Token",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Persistent user-imported custom tokens
  const [customTokens, setCustomTokens] = useState<Token[]>(() => {
    try {
      const saved = localStorage.getItem('mlswap:custom_tokens');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // On-chain search state
  const [resolvingToken, setResolvingToken] = useState<Token | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Combine default tokens with imported custom tokens
  const allTokens = useMemo(() => {
    const seen = new Set<string>();
    const combined: Token[] = [];
    for (const t of [...tokens, ...customTokens]) {
      const lower = t.address.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push({
          ...t,
          isCustom: customTokens.some(c => c.address.toLowerCase() === lower)
        });
      }
    }
    return combined;
  }, [tokens, customTokens]);

  const trimmedQuery = searchQuery.trim();
  const isAddressQuery = isAddress(trimmedQuery);
  const existingMatch = allTokens.find(t => t.address.toLowerCase() === trimmedQuery.toLowerCase());

  // Search on-chain if user pasted an unknown contract address
  useEffect(() => {
    if (!isAddressQuery || existingMatch) {
      setResolvingToken(null);
      setIsResolving(false);
      setResolveError(null);
      return;
    }

    let isCancelled = false;
    setIsResolving(true);
    setResolveError(null);
    setResolvingToken(null);

    fetchTokenMetadata(trimmedQuery as `0x${string}`)
      .then((meta) => {
        if (isCancelled) return;
        if (meta && meta.name && meta.symbol) {
          setResolvingToken({
            address: trimmedQuery as `0x${string}`,
            name: meta.name,
            symbol: meta.symbol,
            decimals: meta.decimals,
            logo: '/logo.svg',
            isCustom: true
          });
        } else {
          setResolveError("No ERC-20 contract found at this address on LitVM LiteForge.");
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setResolveError("Failed to query token on LitVM LiteForge.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsResolving(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [trimmedQuery, isAddressQuery, existingMatch]);

  const filteredTokens = allTokens.filter(token => {
    if (excludeToken && token.address.toLowerCase() === excludeToken.address.toLowerCase()) return false;
    return (
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleImportToken = (token: Token) => {
    const updated = [...customTokens.filter(t => t.address.toLowerCase() !== token.address.toLowerCase()), token];
    setCustomTokens(updated);
    try {
      localStorage.setItem('mlswap:custom_tokens', JSON.stringify(updated));
    } catch (_) {}
    onSelect(token);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleRemoveToken = (tokenAddress: string) => {
    const updated = customTokens.filter(t => t.address.toLowerCase() !== tokenAddress.toLowerCase());
    setCustomTokens(updated);
    try {
      localStorage.setItem('mlswap:custom_tokens', JSON.stringify(updated));
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearchQuery("");
      setResolvingToken(null);
      setIsResolving(false);
      setResolveError(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-full transition-all cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 group active:scale-95'
        }`}
      >
        {selectedToken ? (
          <>
            <div className="w-5 h-5 shrink-0 rounded-full overflow-hidden bg-black flex items-center justify-center">
              <TokenImage tokenAddress={selectedToken.address} symbol={selectedToken.symbol} className="w-full h-full" alt={selectedToken.symbol} />
            </div>
            <span className="text-sm text-white tracking-tight">{selectedToken.symbol}</span>
            {selectedToken.isCustom && (
              <span className="text-[9px] bg-primary/20 text-primary px-1 rounded uppercase tracking-wider">Custom</span>
            )}
          </>
        ) : (
          <span className="text-sm text-white/40 uppercase tracking-tight">{label}</span>
        )}
        {!disabled && (
          <ChevronDown 
            size={14} 
            className={`text-white/20 group-hover:text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          />
        )}
      </button>

      {/* Dropdown / Modal Portal */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-lg h-[88vh] max-h-[640px] bg-[#111111] border border-white/10 p-4 sm:p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center overflow-hidden text-center rounded-[12px] sm:rounded-[16px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/30 hover:text-white transition-colors cursor-pointer p-1"
            >
              <X size={18} />
            </button>
            
            <div className="flex flex-col items-center text-center mt-1 sm:mt-2 w-full">
              <h2 className="text-lg sm:text-xl font-display font-medium text-white tracking-tight mb-1.5">Select a Token</h2>
              <p className="text-[11px] text-ash/80 mb-4 max-w-xs">
                Select an official token or paste any ERC-20 address on LitVM
              </p>

              <div className="w-full relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash/60" size={15} />
                <input
                  autoFocus
                  type="text"
                  placeholder="SEARCH NAME OR PASTE ADDRESS (0X...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 pl-10 pr-4 py-2.5 sm:py-3 text-[12px] rounded-[6px] uppercase tracking-wider text-white outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </div>

            {/* Resolving On-Chain Card */}
            {isResolving && (
              <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-6 mt-4 flex items-center justify-center gap-3">
                <Loader2 size={18} className="animate-spin text-primary" />
                <span className="text-xs text-white/60">Checking token on LitVM LiteForge...</span>
              </div>
            )}

            {/* Found Unlisted Token Card */}
            {resolvingToken && (
              <div className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-4 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full border border-primary/30 bg-black flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {resolvingToken.symbol.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white truncate">{resolvingToken.symbol}</span>
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                        New Token
                      </span>
                    </div>
                    <p className="text-xs text-white/50 truncate">{resolvingToken.name} • {resolvingToken.decimals} decimals</p>
                    <p className="text-[11px] font-mono text-white/30 truncate max-w-[220px]">{resolvingToken.address}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleImportToken(resolvingToken)}
                  className="w-full sm:w-auto bg-primary text-black px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider gold-glow hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  Import & Select
                </button>
              </div>
            )}

            {resolveError && (
              <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mt-4 text-center text-red-400 text-xs">
                {resolveError}
              </div>
            )}

            {/* Token List */}
            <div className="w-full flex-1 overflow-y-auto custom-scrollbar mt-4 px-1 divide-y divide-white/[0.04]">
              {filteredTokens.length > 0 ? (
                <div className="space-y-1">
                  {filteredTokens.map((token) => (
                    <TokenListItem
                      key={token.address}
                      token={token}
                      isSelected={selectedToken?.address.toLowerCase() === token.address.toLowerCase()}
                      onClick={() => {
                        onSelect(token);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                      onRemove={token.isCustom ? () => handleRemoveToken(token.address) : undefined}
                    />
                  ))}
                </div>
              ) : !isResolving && !resolvingToken && (
                <div className="h-full flex flex-col items-center justify-center p-8 opacity-30">
                  <Search size={32} className="mb-4" />
                  <p className="text-[11px] uppercase tracking-widest text-white">No assets found</p>
                  <p className="text-[10px] text-white/50 mt-1">Paste a full contract address (0x...) to import</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TokenSelector;
