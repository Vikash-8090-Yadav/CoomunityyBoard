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

type SubmissionMetadata = {
  title: string
  description: string
  submitter: string
  timestamp: number
  files: Array<{
    name: string
    cid: string
    url: string
  }>
  links: string[]
}

interface VerificationPanelProps {
  bountyId: number
  bountyCreator: string
  deadline: number
  rewardAmount: string
  proofRequirements: string
}

export default function VerificationPanel({ 
  bountyId, 
  bountyCreator, 
  deadline,
  rewardAmount,
  proofRequirements
}: VerificationPanelProps) {
  const { connected, provider, address } = useWallet()
  const [submissions, setSubmissions] = useState<SubmissionData[]>([])
  const [voting, setVoting] = useState(false)
  const [transactionStage, setTransactionStage] = useState<"submitted" | "pending" | "confirmed" | "error">("submitted")
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null)
  const [metadata, setMetadata] = useState<SubmissionMetadata | null>(null)
  const [votedSubmissions] = useState<Set<string>>(new Set())

  const fetchSubmissions = useCallback(async () => {
    try {
      console.log('Fetching submissions for bounty:', bountyId)

      const provider = new ethers.providers.JsonRpcProvider('https://evmtestnet.confluxrpc.com')
      const contract = new ethers.Contract(communityAddress, abi.abi, provider)

      const submissionCount = await contract.getSubmissionCount(bountyId)
      console.log('Submission count:', submissionCount.toString())

      const submissionPromises = Array.from({ length: submissionCount }, (_, i) => 
        contract.getSubmission(bountyId, i).catch((error: Error) => {
          console.error(`Error fetching submission ${i}:`, error)
          return null
        })
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

      console.log('Fetched submissions:', submissionsData)
      setSubmissions(submissionsData)
    } catch (err) {
      console.error("Error fetching submissions:", err)
    }
  }, [bountyId])

  useEffect(() => {
    console.log('Component mounted, fetching submissions...')
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

      fetchSubmissions()
    } catch (error: unknown) {
      console.error("Error voting:", error)
      setTransactionStage("error")
      setTransactionError(error instanceof Error ? error.message : "Failed to vote. Please try again.")
    } finally {
      setVoting(false)
    }
  }

  const handleSetReward = async (submissionIndex: number) => {
    if (!connected || !provider) {
      console.error("Please connect your wallet first")
      return
    }

    const rewardAmount = submissions[submissionIndex].rewardAmount
    if (!rewardAmount || isNaN(Number(rewardAmount)) || Number(rewardAmount) <= 0) {
      console.error("Please enter a valid reward amount")
      return
    }

    try {
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

      fetchSubmissions()
    } catch (error: unknown) {
      console.error("Error sending reward:", error)
      setTransactionStage("error")
      setTransactionError(error instanceof Error ? error.message : "Failed to send reward. Please try again.")
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

      fetchSubmissions()
    } catch (error: unknown) {
      console.error("Error completing bounty:", error)
      setTransactionStage("error")
      setTransactionError(error instanceof Error ? error.message : "Failed to complete bounty. Please try again.")
    }
  }

  const loadSubmissionMetadata = async (submission: SubmissionData) => {
    try {
      console.log("Metadata CID to fetch:", submission.proofCID)

      if (!submission.proofCID) {
        console.error("No proof CID found")
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
            metadata = await response.json()
            break
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${gateway}:`, err)
          continue
        }
      }

      if (!metadata) {
        throw new Error("Failed to fetch metadata from all gateways")
      }

      console.log("Raw metadata from IPFS:", metadata)

      setMetadata({
        title: metadata.title || "Untitled Submission",
        description: metadata.description || "",
        submitter: metadata.submitter,
        timestamp: metadata.timestamp,
        files: Array.isArray(metadata.files)
          ? metadata.files.map((file: { name: string; cid: string }) => ({
              name: file.name,
              cid: file.cid,
              url: `https://moccasin-real-stork-472.mypinata.cloud/ipfs/${file.cid}`,
            }))
          : [],
        links: metadata.links || [],
      })
    } catch (error: unknown) {
      console.error("Error loading metadata:", error)
      setTransactionError(error instanceof Error ? error.message : "Failed to load submission details. Please try again later.")
    }
  }

  const isImageFile = (file: { name: string }) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]
    return imageExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  }

  const FileLink = ({ file }: { file: { name: string; cid: string; url: string } }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPreview, setShowPreview] = useState(false)
    const isImage = isImageFile(file)

    const handleClick = async (e: React.MouseEvent) => {
      e.preventDefault()

      if (isImage) {
        setShowPreview(!showPreview)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        window.open(`https://moccasin-real-stork-472.mypinata.cloud/ipfs/${file.cid}`, "_blank")
      } catch (err) {
        console.error("Error opening file:", err)
        setError("Failed to open file")
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
              src={`https://moccasin-real-stork-472.mypinata.cloud/ipfs/${file.cid}`}
              alt={file.name}
              width={500}
              height={250}
              className="w-full h-auto object-contain max-h-[250px]"
              onError={() => setError("Failed to load image")}
            />
            {error && <div className="p-2 text-xs text-red-500 bg-red-50">{error}</div>}
          </div>
        )}
      </div>
    )
  }

  const isActive = new Date(deadline * 1000) > new Date()
  const isCreator = connected && address?.toLowerCase() === bountyCreator.toLowerCase()
  const isSubmissionCompleted = (submission: SubmissionData) => {
    return submission.status === "approved" && submission.rewardAmount !== "0" && submission.rewardAmount !== "0.0"
  }

  const hasVoted = (submissionIndex: number) => {
    return votedSubmissions.has(submissions[submissionIndex].id)
  }

  useEffect(() => {
    console.log("Deadline check:", {
      deadline,
      currentTime: new Date().getTime(),
      deadlineTime: new Date(deadline * 1000).getTime(),
      isActive,
      formattedDeadline: new Date(deadline * 1000).toLocaleString()
    })
  }, [deadline, isActive])

  const handleViewDetails = (index: number, submission: SubmissionData) => {
    console.log("Viewing details for submission:", submission)
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

  if (voting) {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Verification Panel</span>
          <Badge variant="outline" className="ml-2">
            {connected ? "Connected" : "Not Connected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Creator: {bountyCreator}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              <span>Deadline: {new Date(deadline * 1000).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Proof Requirements:</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{proofRequirements}</p>
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
                    {new Date(deadline * 1000) < new Date() && submission.status === "approved" ? (
                      <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/20">
                        Approved
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
                        <p className="text-sm font-medium text-muted-foreground mb-1">Proof</p>
                        {submission.proofCID ? (
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${submission.proofCID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center group"
                            onClick={(e) => {
                              e.preventDefault()
                              const pinataUrl = `https://gateway.pinata.cloud/ipfs/${submission.proofCID}`
                              const publicUrl = `https://ipfs.io/ipfs/${submission.proofCID}`
                              
                              fetch(pinataUrl)
                                .then(response => {
                                  if (response.ok) {
                                    window.open(pinataUrl, '_blank')
                                  } else {
                                    window.open(publicUrl, '_blank')
                                  }
                                })
                                .catch(() => {
                                  window.open(publicUrl, '_blank')
                                })
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2 group-hover:text-primary/80 transition-colors" />
                            <span className="font-medium">View Proof</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => handleViewDetails(index, submission)}
                            className="text-primary hover:underline flex items-center group"
                          >
                            <FileText className="h-4 w-4 mr-2 group-hover:text-primary/80 transition-colors" />
                            <span className="font-medium">See Proof</span>
                          </button>
                        )}
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
                    </div>

                    {isActive ? (
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleVote(index, true)}
                          disabled={voting || submission.submitter.toLowerCase() === address?.toLowerCase() || hasVoted(index)}
                        >
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                          {hasVoted(index) ? "Already Voted" : "Approve"}
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => handleVote(index, false)}
                          disabled={voting || submission.submitter.toLowerCase() === address?.toLowerCase() || hasVoted(index)}
                        >
                          <X className="h-4 w-4 mr-2 text-red-500" />
                          {hasVoted(index) ? "Already Voted" : "Reject"}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-2 bg-muted/10 rounded-md">
                        Voting period has ended
                      </div>
                    )}

                    <div className={!isActive ? "opacity-50 pointer-events-none" : ""}>
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
                        isSubmitter={submission.submitter.toLowerCase() === address?.toLowerCase()}
                        bountyAmount={rewardAmount}
                        isApproved={submission.status === "approved"}
                      />
                    </div>

                    {submission.status === "approved" && !isSubmissionCompleted(submission) && isCreator && (
                      <div className={`mt-2 space-y-2 ${!isActive ? "opacity-50 pointer-events-none" : ""}`}>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Enter reward amount"
                            value={submission.rewardAmount}
                            onChange={() => {
                              // Handle reward amount change
                            }}
                            className="flex-1 px-3 py-2 border rounded-md text-sm"
                            min="0"
                            step="0.000000000000000001"
                            disabled={!isActive}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSetReward(index)}
                            disabled={voting || !submission.rewardAmount || !isActive}
                          >
                            Set Reward
                          </Button>
                        </div>
                      </div>
                    )}

                    {!isActive && isCreator && (
                      <div className={`text-sm text-muted-foreground text-center py-2 bg-muted/10 rounded-md ${!isActive ? "opacity-50" : ""}`}>
                        Voting period is active
                      </div>
                    )}

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
                          <p className="font-medium text-sm">{metadata.submitter.slice(0, 6)}...{metadata.submitter.slice(-4)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-primary/70 mr-2" />
                        <div>
                          <p className="text-xs text-muted-foreground">Submission date</p>
                          <p className="font-medium text-sm">{new Date(metadata.timestamp * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          {!isActive && selectedSubmission.status === "approved" ? (
                            <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/20">
                              Approved
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
                    <p className="text-muted-foreground">No details available for this submission</p>
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

