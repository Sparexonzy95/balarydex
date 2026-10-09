import { useState, useEffect } from 'react';
import { fetchTokenMetadata, getCachedTokenMetadata, TokenMetadata } from '@/lib/tokenMetadata';
import { TOKENS } from '@/config/tokens';

export function useTokenMetadata(tokenAddress: string | undefined) {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tokenAddress) {
      setMetadata(null);
      return;
    }

    const configToken = TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (configToken) {
      setMetadata({ name: configToken.name, symbol: configToken.symbol, decimals: configToken.decimals });
      return;
    }

    const cached = getCachedTokenMetadata(tokenAddress);
    if (cached !== undefined) {
      setMetadata(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchTokenMetadata(tokenAddress as `0x${string}`).then((result) => {
      if (!cancelled) {
        setMetadata(result);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [tokenAddress]);

  return { metadata, isLoading };
}
