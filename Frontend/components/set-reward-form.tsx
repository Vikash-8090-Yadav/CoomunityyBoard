"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { ethers } from "ethers"
import { communityAddress } from "@/config"
import abi from "@/abi/CommunityBountyBoard.json"
import { TransactionProgress } from "@/components/ui/transaction-progress"

interface SetRewardFormProps {
  bountyId: number
  submissionId: number
  bountyReward: string
  isApproved: boolean
  onSuccess?: () => void
}

export default function SetRewardForm({ 
  bountyId, 
  submissionId, 
  bountyReward,
  isApproved,
  onSuccess 
}: SetRewardFormProps) {
  const router = useRouter()
  const { connected, provider } = useWallet()
  const [reward, setReward] = useState("")
  const [loading, setLoading] = useState(false)
  const [transactionStage, setTransactionStage] = useState<"submitted" | "pending" | "confirmed" | "error">("submitted")
  const [transactionError, setTransactionError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected) {
      setTransactionStage("error")
      setTransactionError("Please connect your wallet first")
      return
    }

    if (!reward) {
      setTransactionStage("error")
      setTransactionError("Please enter a reward amount")
      return
    }

    const rewardInWei = ethers.utils.parseEther(reward)
    const bountyRewardInWei = ethers.utils.parseEther(bountyReward)

    if (rewardInWei.gt(bountyRewardInWei)) {
      setTransactionStage("error")
      setTransactionError("Reward cannot exceed bounty amount")
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

      // Create transaction object
      const tx = await contract.setSubmissionReward(
        bountyId,
        submissionId,
        rewardInWei,
        { value: rewardInWei }
      )

      setTransactionStage("pending")

      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log("Transaction confirmed:", receipt)
      setTransactionStage("confirmed")

      // Wait for a moment to show the completed state
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }

      // Refresh the page to show updated state
      router.refresh()

    } catch (err: unknown) {
      console.error("Error setting reward:", err)
      setTransactionStage("error")
      
      // Handle specific error cases
      if (err instanceof Error) {
        if (err.message.includes("4001")) {
          setTransactionError("Transaction was rejected in your wallet")
        } else if (err.message.includes("insufficient funds")) {
          setTransactionError("You don't have enough ETH to set this reward")
        } else if (err.message.includes("Cannot set reward before deadline")) {
          setTransactionError("Cannot set reward before deadline")
        } else if (err.message.includes("Can only set reward for approved submissions")) {
          setTransactionError("Can only set reward for approved submissions")
        } else {
          setTransactionError(err.message || "Failed to set reward. Please try again.")
        }
      } else {
        setTransactionError("Failed to set reward. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while transaction is pending
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
            <Label htmlFor="reward">Reward Amount (ETH)</Label>
            <Input
              id="reward"
              type="number"
              step="0.001"
              min="0"
              max={bountyReward}
              placeholder="0.00"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              required
              disabled={!isApproved}
            />
            <p className="text-sm text-muted-foreground">
              Maximum reward: {bountyReward} ETH
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={loading || !connected || !isApproved}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting Reward...
              </>
            ) : (
              "Set Reward"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 