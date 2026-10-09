import { createPublicClient, http, Address } from 'viem';
import { litvmTestnet } from './chains';

const ERC20_METADATA_ABI = [
  { inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
] as const;

const TOKENURI_ABI = [
  {
    inputs: [],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const publicClient = createPublicClient({
  chain: litvmTestnet,
  transport: http(),
});

const imageCache = new Map<string, string | null>();
const metadataCache = new Map<string, { name: string; symbol: string; decimals: number } | null>();

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

function resolveIpfsUrl(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return uri;
}

async function fetchImageFromUri(uri: string): Promise<string | null> {
  const resolved = resolveIpfsUrl(uri);

  if (resolved.startsWith('data:')) {
    const match = resolved.match(/\w+\/\w+;base64,/);
    if (match) return resolved;
  }

  try {
    const res = await fetch(resolved);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('image')) {
      return resolved;
    }

    const json = await res.json();
    if (json.image) {
      return resolveIpfsUrl(json.image);
    }
    if (json.image_data) {
      return json.image_data;
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchTokenImage(tokenAddress: Address): Promise<string | null> {
  const cacheKey = tokenAddress.toLowerCase();

  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  try {
    const uri = await publicClient.readContract({
      address: tokenAddress,
      abi: TOKENURI_ABI,
      functionName: 'tokenURI',
    });

    if (!uri) {
      imageCache.set(cacheKey, null);
      return null;
    }

    const imageUrl = await fetchImageFromUri(uri);
    imageCache.set(cacheKey, imageUrl);
    return imageUrl;
  } catch {
    imageCache.set(cacheKey, null);
    return null;
  }
}

export function getCachedTokenImage(tokenAddress: string): string | null | undefined {
  if (imageCache.has(tokenAddress.toLowerCase())) {
    return imageCache.get(tokenAddress.toLowerCase());
  }
  return undefined;
}

export async function fetchTokenMetadata(tokenAddress: Address): Promise<TokenMetadata | null> {
  const cacheKey = tokenAddress.toLowerCase();

  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }

  try {
    const [name, symbol, decimals] = await Promise.all([
      publicClient.readContract({ address: tokenAddress, abi: ERC20_METADATA_ABI, functionName: 'name' }),
      publicClient.readContract({ address: tokenAddress, abi: ERC20_METADATA_ABI, functionName: 'symbol' }),
      publicClient.readContract({ address: tokenAddress, abi: ERC20_METADATA_ABI, functionName: 'decimals' }),
    ]);

    const result = { name, symbol, decimals: Number(decimals) };
    metadataCache.set(cacheKey, result);
    return result;
  } catch {
    try {
      const name = await publicClient.readContract({ address: tokenAddress, abi: ERC20_METADATA_ABI, functionName: 'name' }).catch(() => null);
      const symbol = await publicClient.readContract({ address: tokenAddress, abi: ERC20_METADATA_ABI, functionName: 'symbol' }).catch(() => null);
      const decimals = await publicClient.readContract({ address: tokenAddress, abi: ERC20_METADATA_ABI, functionName: 'decimals' }).catch(() => null);

      if (name !== null && symbol !== null && decimals !== null) {
        const result = { name: String(name), symbol: String(symbol), decimals: Number(decimals) };
        metadataCache.set(cacheKey, result);
        return result;
      }
    } catch {}

    metadataCache.set(cacheKey, null);
    return null;
  }
}

export function getCachedTokenMetadata(tokenAddress: string): TokenMetadata | null | undefined {
  if (metadataCache.has(tokenAddress.toLowerCase())) {
    return metadataCache.get(tokenAddress.toLowerCase());
  }
  return undefined;
}
