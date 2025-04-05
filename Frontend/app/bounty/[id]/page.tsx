import { WalletProvider } from "@/context/wallet-context"
import { BountyProvider } from "@/context/bounty-context"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "@/components/header"
import BountyDetails from "@/components/bounty-details"

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BountyPage({ params }: PageProps) {
  const resolvedParams = await params;
  const bountyId = resolvedParams.id;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WalletProvider>
        <BountyProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto py-6 px-4">
              <BountyDetails id={bountyId} />
            </main>
          </div>
        </BountyProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}

