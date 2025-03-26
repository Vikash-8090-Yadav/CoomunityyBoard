"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@/context/wallet-context"
import { ethers } from "ethers"
import { communityAddress } from "@/config"
import abi from "@/abi/CommunityBountyBoard.json"
import SetRewardForm from "./set-reward-form"

interface SubmissionDetailsProps {
  bountyId: number
  submissionId: number
  bountyReward: string
  bountyCreator: string
  deadline: number
}

export default function SubmissionDetails({
  bountyId,
  submissionId,
  bountyReward,
  bountyCreator,
  deadline
}: SubmissionDetailsProps) {
  const { connected, provider, address } = useWallet()
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!provider) return

      try {
        const contract = new ethers.Contract(communityAddress, abi.abi, provider)
        const submissionData = await contract.getSubmission(bountyId, submissionId)
        
        setSubmission({
          submitter: submissionData.submitter,
          ipfsProofHash: submissionData.ipfsProofHash,
          timestamp: submissionData.timestamp,
          approved: submissionData.approved,
          approvalCount: submissionData.approvalCount,
          rejectCount: submissionData.rejectCount,
          isWinner: submissionData.isWinner,
          rewardAmount: submissionData.rewardAmount
        })
      } catch (error) {
        console.error("Error fetching submission:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubmission()
  }, [bountyId, submissionId, provider])

  if (loading) {
    return <div>Loading submission details...</div>
  }

  if (!submission) {
    return <div>Submission not found</div>
  }

  const isDeadlinePassed = Math.floor(Date.now() / 1000) > deadline
  const isCreator = connected && address?.toLowerCase() === bountyCreator.toLowerCase()
  const canSetReward = isCreator && isDeadlinePassed && submission.approved

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">Submitter</h3>
          <p className="text-sm text-muted-foreground">{submission.submitter}</p>
        </div>

        <div>
          <h3 className="font-semibold">Proof Hash</h3>
          <p className="text-sm text-muted-foreground">{submission.ipfsProofHash}</p>
        </div>

        <div>
          <h3 className="font-semibold">Status</h3>
          <p className="text-sm text-muted-foreground">
            {submission.approved ? "Approved" : "Not Approved"}
          </p>
        </div>

        <div>
          <h3 className="font-semibold">Votes</h3>
          <p className="text-sm text-muted-foreground">
            Approvals: {submission.approvalCount} | Rejections: {submission.rejectCount}
          </p>
        </div>

        {submission.rewardAmount > 0 && (
          <div>
            <h3 className="font-semibold">Reward Set</h3>
            <p className="text-sm text-muted-foreground">
              {ethers.utils.formatEther(submission.rewardAmount)} ETH
            </p>
          </div>
        )}

        {isDeadlinePassed && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Voting period has ended
            </p>
          </div>
        )}

        {canSetReward && (
          <div className="mt-6">
            <h3 className="font-semibold mb-4">Set Reward</h3>
            <SetRewardForm
              bountyId={bountyId}
              submissionId={submissionId}
              bountyReward={bountyReward}
              isApproved={submission.approved}
            />
          </div>
        )}

        {isCreator && !isDeadlinePassed && (
          <p className="text-sm text-yellow-600">
            You can set the reward after the deadline has passed.
          </p>
        )}

        {isCreator && isDeadlinePassed && !submission.approved && (
          <p className="text-sm text-red-600">
            This submission is not approved. You can only set rewards for approved submissions.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

