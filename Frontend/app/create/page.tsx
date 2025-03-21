import { WalletProvider } from "@/context/wallet-context"
import { BountyProvider } from "@/context/bounty-context"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "@/components/header"
import CreateBountyForm from "@/components/create-bounty-form"

export default function CreateBountyPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WalletProvider>
        <BountyProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto py-6 px-4">
              <h1 className="text-3xl font-bold mb-6">Create New Bounty</h1>
              <CreateBountyForm />
            </main>
          </div>
        </BountyProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}

