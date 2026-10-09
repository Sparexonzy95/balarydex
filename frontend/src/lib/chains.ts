import { defineChain } from '@reown/appkit/networks';

export const litvmTestnet = defineChain({
  id: 4441,
  caipNetworkId: 'eip155:4441',
  chainNamespace: 'eip155',
  name: 'LitVM LiteForge',
  nativeCurrency: {
    decimals: 18,
    name: 'zkLTC',
    symbol: 'zkLTC',
  },
  rpcUrls: {
    default: {
      http: [
        'https://liteforge.rpc.caldera.xyz/http',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'LiteForge Explorer',
      url: 'https://liteforge.explorer.caldera.xyz',
    },
  },
  testnet: true,
});

export const arcMainnet = litvmTestnet; // backward compatibility fallback