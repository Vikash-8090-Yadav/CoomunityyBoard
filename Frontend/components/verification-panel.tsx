"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Check, X, FileText, ThumbsUp, ThumbsDown, ImageIcon, ExternalLink, Info, User, Trophy, LinkIcon, Calendar } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { ethers } from "ethers"
import { communityAddress } from "@/config"
import abi from "@/abi/CommunityBountyBoard.json"
import { TransactionProgress } from "@/components/ui/transaction-progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import QualityCheckPanel from './quality-check-panel'

type SubmissionData = {
  id: string
  submitter: string
  proofCID: string
  status: "pending" | "approved" | "rejected"
  rewardAmount: string
  timestamp: number
  approvalCount: number
  rejectCount: number
  isWinner: boolean
  txHash: string
  payoutTxHash: string
  comments?: string
  qualityScore?: number
}

interface VerificationPanelProps {
  bountyId: number
  bountyCreator: string
  deadline: number
  rewardAmount: string
}

// Add IPFS gateway configuration
const IPFS_GATEWAY = "https://ipfs.io/ipfs/"

interface IPFSMetadata {
  name: string;
  type: string;
  size: number;
  description?: string;
  files?: Array<{
    name: string;
    cid: string;
    url: string;
  }>;
  links?: string[];
  submitter?: string;
  timestamp?: number;
}

export default function VerificationPanel({ 
  bountyId, 
  bountyCreator, 
  deadline,
  rewardAmount
}: VerificationPanelProps) {
  const { connected, provider, address } = useWallet()
  const [submissions, setSubmissions] = useState<SubmissionData[]>([])
  const [voting, setVoting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settingReward, setSettingReward] = useState(false)
  const [transactionStage, setTransactionStage] = useState<"pending" | "submitted" | "confirmed" | "error">("submitted")
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null)
  const [metadata, setMetadata] = useState<IPFSMetadata | null>(null)
  const [votedSubmissions, setVotedSubmissions] = useState<Set<string>>(new Set())
  const [rewardInputs, setRewardInputs] = useState<{ [key: string]: string }>({})
  const [isActive, setIsActive] = useState(() => {
    const currentTime = new Date().getTime()
    const deadlineTime = new Date(deadline * 1000).getTime()
    return currentTime < deadlineTime
  })

  // Add deadline check effect
  useEffect(() => {
    const checkDeadline = () => {
      const currentTime = new Date().getTime()
      const deadlineTime = new Date(deadline * 1000).getTime()
      setIsActive(currentTime < deadlineTime)
    }

    // Check immediately
    checkDeadline()

    // Check every minute
    const interval = setInterval(checkDeadline, 60000)

    return () => clearInterval(interval)
  }, [deadline])

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true)
      const rpcProvider = new ethers.providers.JsonRpcProvider('https://rpc.open-campus-codex.gelato.digital')
      const contract = new ethers.Contract(communityAddress, abi.abi, rpcProvider)

      const submissionCount = await contract.getSubmissionCount(bountyId)
      const submissionPromises = Array.from({ length: submissionCount }, (_, i) => 
        contract.getSubmission(bountyId, i).catch(() => null)
      )

      const submissionsData = (await Promise.all(submissionPromises))
        .filter((data): data is ethers.utils.Result => data !== null)
        .map((data, i) => {
          const [
            submitter,
            ipfsProofHash,
            timestamp,
            approved,
            approvalCount,
            rejectCount,
            isWinner,
            rewardAmount,
            txHash,
            payoutTxHash
          ] = data

          return {
            id: i.toString(),
            submitter,
            proofCID: ipfsProofHash,
            status: approved ? "approved" : rejectCount > 0 ? "rejected" : "pending" as "approved" | "pending" | "rejected",
            rewardAmount: rewardAmount.toString(),
            timestamp: Number(timestamp),
            approvalCount: Number(approvalCount),
            rejectCount: Number(rejectCount),
            isWinner,
            txHash,
            payoutTxHash
          }
        })

      setSubmissions(submissionsData)
    } catch (err) {
      console.error("Error fetching submissions:", err)
    } finally {
      setLoading(false)
    }
  }, [bountyId])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleVote = async (submissionIndex: number, approve: boolean) => {
    if (!connected || !provider) {
      console.error("Please connect your wallet first")
      return
    }

    if (submissionIndex < 0 || submissionIndex >= submissions.length) {
      console.error("Invalid submission index")
      return
    }

    if (submissions[submissionIndex].submitter.toLowerCase() === address?.toLowerCase()) {
      console.error("You cannot vote on your own submission")
      return
    }

    if (hasVoted(submissionIndex)) {
      console.error("You have already voted on this submission")
      return
    }

    if (!isActive) {
      console.error("Voting period has ended")
      return
    }

    try {
      setVoting(true)
      setTransactionStage("submitted")
      setTransactionError(null)

      const signer = provider.getSigner()
      const contract = new ethers.Contract(communityAddress, abi.abi, signer)
      const tx = await contract.voteOnSubmission(bountyId, submissionIndex, approve)
      setTransactionStage("pending")

      await tx.wait()
      console.log("Vote transaction confirmed")
      setTransactionStage("confirmed")

      // Update voted submissions state
      setVotedSubmissions(prev => new Set([...prev, submissions[submissionIndex].id]))

      // Reload the page after successful vote
      window.location.reload()
    } catch (error) {
      console.error("Error voting:", error)
      setTransactionStage("error")
      setTransactionError(error instanceof Error ? error.message : "Failed to vote. Please try again.")
    } finally {
      setVoting(false)
    }
  }

  const handleRewardInputChange = (submissionId: string, value: string) => {
    setRewardInputs(prev => ({
      ...prev,
      [submissionId]: value
    }))
  }

  const handleSetReward = async (submissionIndex: number) => {
    if (!connected || !provider) {
      console.error("Please connect your wallet first")
      return
    }

    const submission = submissions[submissionIndex]
    const rewardAmount = rewardInputs[submission.id] || submission.rewardAmount

    if (!rewardAmount || isNaN(Number(rewardAmount)) || Number(rewardAmount) <= 0) {
      console.error("Please enter a valid reward amount")
      return
    }

    if (submission.status !== "approved") {
      console.error("Can only set reward for approved submissions")
      return
    }

    if (isActive) {
      console.error("Cannot set reward before deadline")
      return
    }

    try {
      setSettingReward(true)
      setTransactionStage("submitted")
      setTransactionError(null)

      const rewardWei = ethers.utils.parseEther(rewardAmount)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(communityAddress, abi.abi, signer)

      const tx = await contract.setSubmissionReward(
        bountyId,
        submissionIndex,
        rewardWei,
        { value: rewardWei }
      )
      setTransactionStage("pending")

      await tx.wait()
      console.log("Reward sent successfully")
      setTransactionStage("confirmed")

      // Clear the input after successful reward set
      setRewardInputs(prev => {
        const newInputs = { ...prev }
        delete newInputs[submission.id]
        return newInputs
      })

      // Reload the page after successful reward set
      window.location.reload()
    } catch (error) {
      console.error("Error sending reward:", error)
      setTransactionStage("error")
      setTransactionError(error instanceof Error ? error.message : "Failed to send reward. Please try again.")
    } finally {
      setSettingReward(false)
    }
  }

  const handleComplete = async () => {
    if (!connected || !provider) {
      console.error("Please connect your wallet first")
      return
    }

    if (address?.toLowerCase() !== bountyCreator.toLowerCase()) {
      console.error("Only the bounty creator can complete the bounty")
      return
    }

    if (new Date(deadline * 1000) > new Date()) {
      console.error("Cannot complete bounty before deadline")
      return
    }

    try {
      setTransactionStage("submitted")
      setTransactionError(null)

      const signer = provider.getSigner()
      const contract = new ethers.Contract(communityAddress, abi.abi, signer)
      const tx = await contract.completeBounty(bountyId)
      setTransactionStage("pending")

      await tx.wait()
      console.log("Bounty completed successfully")
      setTransactionStage("confirmed")

      // Reload the page after successful completion
      window.location.reload()
    } catch (error) {
      console.error("Error completing bounty:", error)
      setTransactionStage("error")
      setTransactionError(error instanceof Error ? error.message : "Failed to complete bounty. Please try again.")
    }
  }

  const loadSubmissionMetadata = async (submission: SubmissionData) => {
    try {
      if (!submission.proofCID) {
        setTransactionError("No proof identifier found")
        return
      }

      const gateways = [
        `https://moccasin-real-stork-472.mypinata.cloud/ipfs/${submission.proofCID}`,
        `https://ipfs.io/ipfs/${submission.proofCID}`,
        `https://gateway.pinata.cloud/ipfs/${submission.proofCID}`
      ]

      let metadata = null
      for (const gateway of gateways) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)
          
          const response = await fetch(gateway, { signal: controller.signal })
          clearTimeout(timeoutId)
          
          if (response.ok) {
            // Check if the response is JSON
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              metadata = await response.json()
            } else {
              // If it's not JSON, create a basic metadata object
              metadata = {
                name: "Submission File",
                type: contentType || "unknown",
                size: response.headers.get('content-length') || 0,
                description: "Binary file submission",
                files: [{
                  name: "Submission File",
                  cid: submission.proofCID,
                  url: gateway
                }]
              }
            }
            break
          }
        } catch {
          continue
        }
      }

      if (!metadata) {
        throw new Error("Failed to fetch metadata from all gateways")
      }

      setMetadata({
        name: metadata.name || "Untitled Submission",
        type: metadata.type || "unknown",
        size: metadata.size || 0,
        description: metadata.description || "",
        files: metadata.files || [],
        links: metadata.links || [],
        submitter: metadata.submitter,
        timestamp: metadata.timestamp
      })
    } catch {
      console.error("Error loading metadata")
      setTransactionError("Failed to load submission details. Please try again later.")
    }
  }

  const isImageFile = (file: { name: string }) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]
    return imageExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  }

  const FileLink = ({ file }: { file: { name: string; cid: string; url: string } }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const isImage = isImageFile(file)

    const handleClick = async (e: React.MouseEvent) => {
      e.preventDefault()

      if (isImage) {
        setShowPreview(!showPreview)
        return
      }

      setIsLoading(true)

      try {
        window.open(`https://moccasin-real-stork-472.mypinata.cloud/ipfs/${file.cid}`, "_blank")
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <div className="space-y-2">
        <a
          href={file.url}
          onClick={handleClick}
          className="flex items-center p-2 border rounded-md hover:bg-accent/30 transition-colors group"
        >
          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center mr-2">
            {isImage ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">{file.name}</p>
          </div>
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin ml-2" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-2 group-hover:text-primary transition-colors" />
          )}
        </a>

        {isImage && showPreview && (
          <div className="mt-2 rounded-md overflow-hidden border">
            <Image
              src={`${IPFS_GATEWAY}${file.cid}`}
              alt={file.name}
              width={500}
              height={300}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        )}
      </div>
    )
  }

  const isCreator = connected && address?.toLowerCase() === bountyCreator.toLowerCase()
  const isSubmissionCompleted = (submission: SubmissionData) => {
    return submission.status === "approved" && submission.rewardAmount !== "0" && submission.rewardAmount !== "0.0"
  }

  const hasVoted = (submissionIndex: number) => {
    return votedSubmissions.has(submissions[submissionIndex].id)
  }

  const handleViewDetails = (index: number, submission: SubmissionData) => {
    setSelectedSubmission(submission)
    loadSubmissionMetadata(submission)

    requestAnimationFrame(() => {
      const detailsSection = document.getElementById('submission-details')
      if (detailsSection) {
        detailsSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    })
  }

  if (loading) {
    return (
      <Card className="border-muted">
        <CardContent className="flex flex-col items-center justify-center p-12">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading verification data...</p>
        </CardContent>
      </Card>
    )
  }

  if (settingReward) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" />
        <div className="fixed top-4 right-4 z-50">
          <TransactionProgress 
            stage={transactionStage}
            errorMessage={transactionError || undefined}
            onClose={() => {
              setTransactionError(null);
            }}
          />
        </div>
        <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground mb-4">Setting reward...</p>
            {transactionError && (
              <p className="text-sm text-red-500 mt-4">{transactionError}</p>
            )}
          </CardContent>
        </Card>
      </>
    )
  }

  if (voting) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" />
        <div className="fixed top-4 right-4 z-50">
          <TransactionProgress 
            stage={transactionStage}
            errorMessage={transactionError || undefined}
            onClose={() => {
              setTransactionError(null);
            }}
          />
        </div>
        <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Processing your vote...</p>
          </CardContent>
        </Card>
      </>
    )
  }

  if (transactionStage === "pending") {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" />
        <div className="fixed top-4 right-4 z-50">
          <TransactionProgress 
            stage={transactionStage}
            errorMessage={transactionError || undefined}
            onClose={() => {
              setTransactionError(null);
            }}
          />
        </div>
        <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Processing transaction...</p>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <Card className="w-full">
      <CardContent>
        <div className="space-y-4">
          <div className="bg-muted/10 p-4 rounded-md border border-muted">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              How to Verify Submissions
            </h3>
            <p className="text-sm text-muted-foreground">
              Welcome to the verification process! First, review each submission&apos;s details and proof files. Use the Quality Check tool to analyze submission quality, then vote Approve or Reject based on your assessment. {isCreator ? "As the bounty creator, you can set rewards for approved submissions." : "The bounty creator will set rewards for approved submissions."} {isActive ? "Voting is currently active until the deadline." : "The voting period has ended."}
            </p>
          </div>

          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submissions.map((submission, index) => (
              <Card
                key={index}
                className={`overflow-hidden transition-all duration-300 ${
                  submission.status === "approved" ? "border-green-200 shadow-green-100 dark:border-green-800" : "hover:shadow-md"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                      Submission #{index + 1}
                    </CardTitle>
                    {submission.isWinner ? (
                      <Badge className="bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20">
                        Winner
                      </Badge>
                    ) : submission.status === "approved" ? (
                      <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/20">
                        Approved
                      </Badge>
                    ) : submission.status === "rejected" ? (
                      <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 border-red-500/20">
                        Rejected
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Submitted by</p>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-primary/70" />
                          <p className="font-medium">{submission.submitter.slice(0, 6)}...{submission.submitter.slice(-4)}</p>
                        </div>
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => handleViewDetails(index, submission)}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          View Full Details
                        </Button>
                      </div>
                    </div>

                    {submission.comments && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Comments</p>
                        <div className="bg-muted/20 p-3 rounded-md border border-border/50">
                          <p className="whitespace-pre-line text-sm">{submission.comments}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-2 bg-muted/10 rounded-md">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <ThumbsUp className={`h-4 w-4 ${submission.approvalCount > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                          <span className="text-sm font-medium">{submission.approvalCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ThumbsDown className={`h-4 w-4 ${submission.rejectCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                          <span className="text-sm font-medium">{submission.rejectCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {submission.rewardAmount !== "0" ? (
                          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                            <Trophy className="h-3.5 w-3.5" />
                            <span className="font-medium">
                              {ethers.utils.formatEther(submission.rewardAmount)} ETH
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>No reward set</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isActive ? (
                      <div className="text-sm text-muted-foreground text-center py-2 bg-muted/10 rounded-md border border-muted">
                        <div className="flex items-center justify-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Voting period has ended</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8"
                          onClick={() => handleVote(index, true)}
                          disabled={voting || submission.submitter.toLowerCase() === address?.toLowerCase() || hasVoted(index) || !isActive}
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                          {hasVoted(index) ? "Voted" : "Approve"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8"
                          onClick={() => handleVote(index, false)}
                          disabled={voting || submission.submitter.toLowerCase() === address?.toLowerCase() || hasVoted(index) || !isActive}
                        >
                          <X className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                          {hasVoted(index) ? "Voted" : "Reject"}
                        </Button>
                      </div>
                    )}

                    <div>
                      <QualityCheckPanel
                        submission={{
                          id: Number(submission.id),
                          bountyId: Number(bountyId),
                          submitter: submission.submitter,
                          proofCID: submission.proofCID,
                          comments: submission.comments || ''
                        }}
                        onQualityCheck={(score, feedback) => {
                          console.log('Quality check completed:', { score, feedback })
                        }}
                        bountyAmount={rewardAmount}
                        isApproved={submission.status === "approved"}
                        disabled={!isActive}
                      />
                    </div>

                    {submission.status === "approved" && !isSubmissionCompleted(submission) && isCreator && (
                      <div className="mt-4 p-3 bg-muted/10 rounded-md border">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Set Reward Amount</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Enter reward amount (e.g. 0.1)"
                            value={rewardInputs[submission.id] ?? submission.rewardAmount}
                            onChange={(e) => handleRewardInputChange(submission.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSetReward(index)
                              }
                            }}
                            className="flex-1 px-3 py-2 border rounded-md text-sm"
                            min="0"
                            step="0.000000000000000001"
                            disabled={settingReward || isActive}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSetReward(index)}
                            disabled={settingReward || !rewardInputs[submission.id] || Number(rewardInputs[submission.id]) <= 0 || isActive}
                          >
                            {settingReward ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Setting...
                              </>
                            ) : (
                              'Set Reward'
                            )}
                          </Button>
                        </div>
                        {rewardInputs[submission.id] && Number(rewardInputs[submission.id]) <= 0 && (
                          <p className="text-xs text-red-500 mt-1">Please enter a reward amount greater than 0</p>
                        )}
                        {isActive && (
                          <p className="text-xs text-yellow-600 mt-1">You can set rewards after the deadline has passed</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {transactionError && (
            <Alert variant="destructive">
              <AlertDescription>{transactionError}</AlertDescription>
            </Alert>
          )}

          {submissions.some(sub => sub.status === "approved") && !isActive && isCreator && (
            <Card className={`border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800/50 ${!isActive ? "opacity-50" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-800 dark:text-blue-300">Ready to Complete</h3>
                      <p className="text-sm text-blue-700/90 dark:text-blue-400 mt-0.5">
                        {!isActive ? "Voting period has ended. You can now complete the bounty and distribute rewards." : "Deadline has passed"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleComplete}
                    disabled={!isActive}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Complete Bounty
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedSubmission && (
            <Card id="submission-details" className="mt-6 submission-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Submission Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metadata ? (
                  <div className="space-y-6">
                    {metadata.description && (
                      <div>
                        <h3 className="text-lg font-medium mb-2 flex items-center text-foreground">
                          <span className="inline-block w-1 h-5 bg-primary mr-2 rounded"></span>
                          Description
                        </h3>
                        <div className="bg-muted/10 p-3 rounded-md border">
                          <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
                            {metadata.description}
                          </p>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {metadata.files && metadata.files.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-2 flex items-center text-foreground">
                          <span className="inline-block w-1 h-5 bg-primary mr-2 rounded"></span>
                          Files
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {metadata.files.map((file, index) => (
                            <FileLink key={index} file={file} />
                          ))}
                        </div>
                      </div>
                    )}

                    {metadata.links && metadata.links.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <h3 className="text-lg font-medium mb-2 flex items-center text-foreground">
                            <span className="inline-block w-1 h-5 bg-primary mr-2 rounded"></span>
                            Links
                          </h3>
                          <div className="space-y-2">
                            {metadata.links.map((link, index) => (
                              <a
                                key={index}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2 border rounded-md hover:bg-accent/30 transition-colors group"
                              >
                                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center mr-2">
                                  <LinkIcon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 truncate">
                                  <p className="font-medium truncate text-sm">{link}</p>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-2 group-hover:text-primary transition-colors" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10 p-3 rounded-md border">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-primary/70 mr-2" />
                        <div>
                          <p className="text-xs text-muted-foreground">Submitted by</p>
                          <p className="font-medium text-sm">{selectedSubmission.submitter.slice(0, 6)}...{selectedSubmission.submitter.slice(-4)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="font-medium text-sm">
                          {new Date(selectedSubmission.timestamp * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          {selectedSubmission.status === "approved" ? (
                            <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/20">
                              Approved
                            </Badge>
                          ) : selectedSubmission.status === "rejected" ? (
                            <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 border-red-500/20">
                              Rejected
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">Loading submission details...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  )
}