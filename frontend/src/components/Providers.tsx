import { useState } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { litvmTestnet } from '@/lib/chains';

const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  import.meta.env.VITE_REOWN_PROJECT_ID ||
  'b56e18d47c72ab683b10814fe9495694';

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [litvmTestnet],
  ssr: true,
  transports: {
    [litvmTestnet.id]: http(),
  }
});

// Export underlying Wagmi config
export const config = wagmiAdapter.wagmiConfig;

// Initialize AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks: [litvmTestnet],
  projectId,
  metadata: {
    name: 'Balary',
    description: 'The Premier Decentralized Exchange on LitVM',
    url: 'https://balary.lol',
    icons: ['https://balary.lol/balary-icon.png'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#FFD217',
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
