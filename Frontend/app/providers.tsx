'use client'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { confluxESpace, confluxESpaceTestnet, mainnet, sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BountyProvider } from '@/context/bounty-context'

const config = createConfig({
  chains: [confluxESpaceTestnet],
  transports: {
    [confluxESpaceTestnet.id]: http(),
  },
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BountyProvider>
          {children}
        </BountyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 