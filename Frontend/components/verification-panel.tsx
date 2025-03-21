"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import { Check, X, Loader2, AlertTriangle } from "lucide-react"

export default function VerificationPanel({ bounty }) {
  const { connected, address } = useWallet()
  const { verifySubmission, completeAndPayBounty } = useBounty()

  const [verifying, setVerifying] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState("")

  const handleVerify = async (submissionIndex, approve) => {
    if (!connected) return

    try {
      setVerifying(true)
      setError("")
      await verifySubmission(bounty.id, submissionIndex, approve)
      window.location.reload()
    } catch (err) {
      console.error("Error verifying submission:", err)
      setError(err.message || "Failed to verify submission")
    } finally {
      setVerifying(false)
    }
  }

  const handleComplete = async (submissionIndex) => {
    if (!connected) return

    try {
      setCompleting(true)
      setError("")
      await completeAndPayBounty(bounty.id, submissionIndex)
      window.location.reload()
    } catch (err) {
      console.error("Error completing bounty:", err)
      setError(err.message || "Failed to complete bounty")
    } finally {
      setCompleting(false)
    }
  }

  const isCreator = address && bounty.creator.toLowerCase() === address.toLowerCase()
  const isActive = bounty.status === 0

  // Check if user has already verified a submission
  const hasVerified = (submissionIndex) => {
    const submission = bounty.submissions[submissionIndex]
    return submission.verifiers.some((v) => v.toLowerCase() === address.toLowerCase())
  }

  // Calculate approval percentage
  const getApprovalPercentage = (submission) => {
    return (submission.approvalCount / 3) * 100
  }

  // Check if submission can be completed (has 3 or more approvals)
  const canComplete = (submission) => {
    return submission.approvalCount >= 3
  }

  if (bounty.submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No submissions to verify</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-medium mb-2">Verification Process</h3>
        <p className="text-sm text-muted-foreground">
          Community members can review and verify submissions. Once a submission receives 3 approvals, the bounty
          creator can complete the bounty and the reward will be automatically transferred to the winner.
        </p>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

      {bounty.submissions.map((submission, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-lg">Submission #{index + 1} Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Verification Progress (3 approvals needed)</p>
                <div className="flex items-center gap-4">
                  <Progress value={getApprovalPercentage(submission)} className="flex-1" />
                  <span className="text-sm font-medium">{submission.approvalCount}/3</span>
                </div>
              </div>

              {isActive && connected && !isCreator && !hasVerified(index) && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleVerify(index, false)}
                    disabled={verifying}
                  >
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Reject
                  </Button>
                  <Button className="flex-1" onClick={() => handleVerify(index, true)} disabled={verifying}>
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                </div>
              )}

              {isActive && connected && isCreator && canComplete(submission) && (
                <Button className="w-full" onClick={() => handleComplete(index)} disabled={completing}>
                  {completing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Complete Bounty & Pay Reward
                </Button>
              )}

              {hasVerified(index) && (
                <p className="text-sm text-muted-foreground">You have already verified this submission</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

