"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { ethers } from "ethers"
import { communityAddress } from "@/config"
import abi from "@/abi/CommunityBountyBoard.json"
import { TransactionProgress } from "@/components/ui/transaction-progress"

interface SubmitProofFormProps {
  bountyId: number
}

export default function SubmitProofForm({
  bountyId
}: SubmitProofFormProps) {
  const router = useRouter()
  const { connected, provider } = useWallet()
  const [loading, setLoading] = useState(false)
  const [proof, setProof] = useState("")
  const [transactionStage, setTransactionStage] = useState<"submitted" | "pending" | "confirmed" | "error">("submitted")
  const [transactionError, setTransactionError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!connected) {
      setTransactionStage("error")
      setTransactionError("Please connect your wallet first")
      return
    }

    if (!proof) {
      setTransactionStage("error")
      setTransactionError("Please provide a proof")
      return
    }

    try {
      setLoading(true)
      setTransactionStage("submitted")
      setTransactionError(null)

      if (!provider) {
        throw new Error("Provider is not available")
      }

      const signer = provider.getSigner()
      const contract = new ethers.Contract(communityAddress, abi.abi, signer)

      const tx = await contract.submitProof(bountyId, proof)
      setTransactionStage("pending")

      const receipt = await tx.wait()
      console.log("Transaction confirmed:", receipt)
      setTransactionStage("confirmed")

      await new Promise(resolve => setTimeout(resolve, 1500))
      router.push("/")
    } catch (err: unknown) {
      console.error("Error submitting proof:", err)
      setTransactionStage("error")
      
      if (err instanceof Error) {
        if (err.message.includes("4001")) {
          setTransactionError("Transaction was rejected in your wallet")
        } else if (err.message.includes("insufficient funds")) {
          setTransactionError("You don&apos;t have enough ETH to submit this proof")
        } else {
          setTransactionError(err.message || "Failed to submit proof. Please try again.")
        }
      } else {
        setTransactionError("Failed to submit proof. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <TransactionProgress 
              stage={transactionStage} 
              errorMessage={transactionError || undefined}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="proof">Proof</Label>
            <Textarea
              id="proof"
              placeholder="Enter your proof here"
              rows={4}
              value={proof}
              onChange={(event) => setProof(event.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading || !connected}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Proof"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

