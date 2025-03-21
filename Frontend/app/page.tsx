import { WalletProvider } from "@/context/wallet-context"
import { BountyProvider } from "@/context/bounty-context"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "@/components/header"
import BountyList from "@/components/bounty-list"

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WalletProvider>
        <BountyProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto py-6 px-4">
              <h1 className="text-3xl font-bold mb-6">Active Bounties</h1>
              <BountyList />
            </main>
          </div>
        </BountyProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}

