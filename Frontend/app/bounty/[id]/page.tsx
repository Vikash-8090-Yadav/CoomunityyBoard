import { WalletProvider } from "@/context/wallet-context"
import { BountyProvider } from "@/context/bounty-context"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "@/components/header"
import BountyDetails from "@/components/bounty-details"

export default function BountyPage({ params }: { params: { id: string } }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WalletProvider>
        <BountyProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto py-6 px-4">
              <BountyDetails id={params.id} />
            </main>
          </div>
        </BountyProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}

