"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useWallet } from "@/context/wallet-context"
import { useBounty, type Submission as ContractSubmission } from "@/context/bounty-context"
import { formatEther } from "ethers/lib/utils"
import { Calendar, Clock, Award, User, FileText, Loader2, AlertTriangle, Trophy } from "lucide-react"
import VerificationPanel from "@/components/verification-panel"
import { formatDistanceToNow } from "date-fns"
import type { Bounty as BountyType, Submission as SubmissionType } from "@/types/bounty"
import CollapsibleSubmitProof from "./collapsible-submit-proof"
import { Input } from "@/components/ui/input"
import { TransactionProgress } from "@/components/ui/transaction-progress"

interface BountyDetailsProps {
  id: string
}

export default function BountyDetails({ id }: BountyDetailsProps) {
  const router = useRouter()
  const { connected, address, chainId } = useWallet()
  const { getBountyDetails, setSubmissionReward, completeBounty } = useBounty()

  const [bounty, setBounty] = useState<BountyType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitProofOpen, setIsSubmitProofOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [showSubmitProof, setShowSubmitProof] = useState(false)
  const [showRewardForm, setShowRewardForm] = useState(false)
  const [rewardAmount, setRewardAmount] = useState("")
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [transactionStage, setTransactionStage] = useState<"idle" | "submitted" | "pending" | "confirmed" | "error">("idle")

  // Load saved tab preference from localStorage
  useEffect(() => {
    const storedTab = localStorage.getItem('bounty-active-tab')
    if (storedTab) {
      setActiveTab(storedTab)
      localStorage.removeItem('bounty-active-tab')
    }
  }, [])

  // Fetch bounty details
  const loadBounty = useCallback(async () => {
    if (!connected || !id) return

    try {
      setLoading(true)
      setError(null)
      const details = await getBountyDetails(Number(id))
      if (details) {
        const formattedBounty: BountyType = {
          id: details.id,
          creator: details.creator,
          title: details.title,
          description: details.description,
          proofRequirements: details.proofRequirements,
          reward: details.reward,
          rewardToken: details.rewardToken,
          deadline: details.deadline,
          completed: details.completed,
          winnerCount: details.winnerCount,
          submissionCount: details.submissionCount,
          status: details.status,
          rewardAmount: formatEther(details.reward),
          submissions: details.submissions.map((sub: ContractSubmission): SubmissionType => ({
            id: sub.id,
            bountyId: Number(id),
            submitter: sub.submitter,
            rewardAmount: formatEther(sub.rewardAmount || "0"),
            rewardShare: sub.rewardShare,
            ipfsProofHash: sub.ipfsProofHash,
            timestamp: sub.timestamp,
            approved: sub.approved,
            approvalCount: sub.approvalCount,
            rejectCount: sub.rejectCount,
            isWinner: sub.isWinner,
            hasVoted: sub.hasVoted,
            txHash: sub.txHash,
            payoutTxHash: sub.payoutTxHash,
            comments: undefined
          }))
        }
        setBounty(formattedBounty)
      }
    } catch (err: unknown) {
      console.error("Error loading bounty:", err)
      setError(err instanceof Error ? err.message : "Failed to load bounty details")
    } finally {
      setLoading(false)
    }
  }, [connected, getBountyDetails, id])

  useEffect(() => {
    loadBounty()
  }, [loadBounty])

  // Helper functions
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0: return <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/20">Active</Badge>
      case 1: return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">Completed</Badge>
      case 2: return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 border-red-500/20">Cancelled</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "submit") {
      setIsSubmitProofOpen(true)
    } else if (value === "details") {
      setIsSubmitProofOpen(false)
    }
  }

  // Transaction handlers
  const handleSetReward = async (submissionId: number) => {
    if (!bounty || !rewardAmount) return
    try {
      setLoading(true)
      setError(null)
      setTransactionStage("submitted")
      const tx = await setSubmissionReward(bounty.id, submissionId, rewardAmount)
      if (tx) {
        setTransactionHash(tx.hash)
        setTransactionStage("pending")
        const receipt = await tx.wait()
        if (receipt.status === 1) {
          setTransactionStage("confirmed")
          await loadBounty()
          setShowRewardForm(false)
          setRewardAmount("")
          setSelectedSubmissionId(null)
          setTimeout(() => setTransactionStage("idle"), 3000)
        }
      }
    } catch (err: unknown) {
      console.error("Error setting reward:", err)
      setError(err instanceof Error ? err.message : "Failed to set reward")
      setTransactionStage("error")
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteBounty = async () => {
    if (!bounty) return
    try {
      setLoading(true)
      setError(null)
      setTransactionStage("submitted")
      const tx = await completeBounty(bounty.id)
      if (tx) {
        setTransactionHash(tx.hash)
        setTransactionStage("pending")
        const receipt = await tx.wait()
        if (receipt.status === 1) {
          setTransactionStage("confirmed")
          await loadBounty()
          setTimeout(() => setTransactionStage("idle"), 3000)
        }
      }
    } catch (err: unknown) {
      console.error("Error completing bounty:", err)
      setError(err instanceof Error ? err.message : "Failed to complete bounty")
      setTransactionStage("error")
    } finally {
      setLoading(false)
    }
  }

  // Derived state
  const isCreator = bounty && address && bounty.creator.toLowerCase() === address?.toLowerCase()
  const isActive = bounty?.status === 0
  const isExpired = bounty?.deadline ? bounty.deadline * 1000 < Date.now() : false
  const deadline = new Date((bounty?.deadline ?? 0) * 1000)
  const timeToDeadline = formatDistanceToNow(deadline, { addSuffix: true })

  // Render states
  if (!connected) {
    return (
      <Card className="border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
        <CardContent className="pt-6 flex flex-col items-center justify-center p-10 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-amber-700 dark:text-amber-400">Wallet Not Connected</h3>
          <p className="text-amber-600 dark:text-amber-300 break-words max-w-md">Please connect your wallet to view bounty details</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
            Back to Bounties
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (chainId !== 71) {
    return (
      <Card className="border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
        <CardContent className="pt-6 flex flex-col items-center justify-center p-10 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-amber-700 dark:text-amber-400">Wrong Network</h3>
          <p className="text-amber-600 dark:text-amber-300 mb-2 break-words max-w-md">Please switch to Conflux Testnet (Chain ID: 71)</p>
          <p className="text-sm text-amber-500 dark:text-amber-400/70 break-words max-w-md">Current network: {chainId || "Unknown"}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
            Back to Bounties
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading && !bounty) {
    return (
      <Card className="border-muted">
        <CardContent className="flex flex-col items-center justify-center p-12">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading bounty details...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex flex-col items-center justify-center p-12">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <p className="text-destructive text-center break-words max-w-md">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setError(null)
              setTransactionStage("idle")
            }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!bounty) {
    return (
      <Card className="border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
        <CardContent className="pt-6 flex flex-col items-center justify-center p-10 text-center">
          <FileText className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-amber-700 dark:text-amber-400">Bounty Not Found</h3>
          <p className="text-amber-600 dark:text-amber-300 break-words max-w-md">No bounty found with ID: {id}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
            Back to Bounties
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Transaction Progress Overlay */}
      {transactionStage !== "idle" && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" />
          <div className="fixed top-4 right-4 z-50">
            <TransactionProgress 
              stage={transactionStage}
              errorMessage={error || undefined}
              transactionHash={transactionHash}
              onClose={() => {
                if (transactionStage === "confirmed" || transactionStage === "error") {
                  setTransactionStage("idle")
                  setTransactionHash(null)
                  setError(null)
                }
              }}
            />
          </div>
        </>
      )}

      {/* Bounty Header Card */}
      <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-3">{bounty.title}</h1>
              <div className="flex items-center gap-2">
                {getStatusBadge(bounty.status)}
                {isExpired && isActive && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    Expired
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="shadow-sm hover:shadow transition-all"
            >
              Back to Bounties
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h3 className="text-lg font-medium mb-3 flex items-center text-foreground">
                  <span className="inline-block w-1 h-5 bg-primary mr-2 rounded"></span>
                  Description
                </h3>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{bounty.description}</p>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg border">
                <h3 className="text-lg font-medium mb-3 flex items-center text-foreground">
                  <span className="inline-block w-1 h-5 bg-primary mr-2 rounded"></span>
                  Requirements
                </h3>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{bounty.proofRequirements}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="bg-card shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Reward</p>
                      <p className="font-medium text-lg">{bounty.rewardAmount} ETH</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="font-medium">{formatDate(bounty.deadline)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeToDeadline}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Time Remaining</p>
                      <p className="font-medium">
                        {bounty.deadline * 1000 > Date.now() ? (
                          <span>
                            {Math.ceil((bounty.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} days left
                          </span>
                        ) : (
                          <span className="text-red-500">Expired</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Created by</p>
                      <p className="font-medium">
                        {bounty.creator
                          ? `${bounty.creator.substring(0, 6)}...${bounty.creator.substring(bounty.creator.length - 4)}`
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isActive && connected && !isCreator && bounty.deadline * 1000 > Date.now() && (
                <Button
                  className="w-full shadow-sm hover:shadow transition-all"
                  onClick={() => {
                    setIsSubmitProofOpen(true)
                    setActiveTab("submit")
                    setShowSubmitProof(true)
                    requestAnimationFrame(() => {
                      const submitProofSection = document.getElementById('submit-proof-section')
                      if (submitProofSection) {
                        submitProofSection.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'start'
                        })
                      }
                    })
                  }}
                >
                  Submit Proof
                </Button>
              )}

              {isCreator && bounty.status === 0 && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCompleteBounty}
                  disabled={loading || transactionStage !== "idle"}
                >
                  {transactionStage !== "idle" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {transactionStage === "submitted" && "Submitting..."}
                      {transactionStage === "pending" && "Processing..."}
                      {transactionStage === "confirmed" && "Confirmed!"}
                      {transactionStage === "error" && "Failed"}
                    </>
                  ) : (
                    "Complete Bounty"
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bounty Tabs Section */}
      <Card className="overflow-hidden border shadow-md">
        <CardContent className="p-6">
          <Tabs value={activeTab} className="space-y-4" onValueChange={handleTabChange}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="details">Details</TabsTrigger>
              {bounty.status === 0 && !isCreator && connected && <TabsTrigger value="submit">Submit Proof</TabsTrigger>}
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              {!bounty.submissions?.length ? (
                <Card className="border-dashed border-2 bg-muted/10">
                  <CardContent className="p-10 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No submissions yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bounty.submissions.map((submission: SubmissionType, index: number) => (
                    <Card
                      key={index}
                      className={`overflow-hidden transition-all duration-300 ${
                        submission.approved ? "border-green-200 shadow-green-100 dark:border-green-800" : "hover:shadow-md"
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg flex items-center">
                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                            Submission #{index + 1}
                          </CardTitle>
                          {isExpired ? (
                            submission.approved ? (
                              <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/20">
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Not Approved
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
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
                                <p className="font-medium">{`${submission.submitter.substring(0, 6)}...${submission.submitter.substring(submission.submitter.length - 4)}`}</p>
                              </div>
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

                          {isCreator && submission.approved && !submission.isWinner && (
                            <div className="space-y-2">
                              {!showRewardForm || selectedSubmissionId !== submission.id ? (
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    setShowRewardForm(true)
                                    setSelectedSubmissionId(submission.id)
                                  }}
                                >
                                  Set Reward
                                </Button>
                              ) : (
                                <div className="space-y-2">
                                  <Input
                                    type="number"
                                    placeholder="Enter reward amount in ETH"
                                    value={rewardAmount}
                                    onChange={(e) => setRewardAmount(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      className="flex-1"
                                      onClick={() => handleSetReward(submission.id)}
                                      disabled={loading}
                                    >
                                      {loading ? "Setting Reward..." : "Confirm Reward"}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => {
                                        setShowRewardForm(false)
                                        setRewardAmount("")
                                        setSelectedSubmissionId(null)
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => {
                              setActiveTab("verification")
                              requestAnimationFrame(() => {
                                const verificationPanel = document.getElementById('verification-panel')
                                if (verificationPanel) {
                                  verificationPanel.scrollIntoView({ 
                                    behavior: 'smooth',
                                    block: 'start'
                                  })
                                }
                              })
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="submit">
              {bounty.status === 0 && !isCreator && connected && showSubmitProof && (
                <div id="submit-proof-section" className="space-y-4">
                  <CollapsibleSubmitProof
                    bountyId={bounty.id}
                    bountyTitle={bounty.title}
                    isOpen={isSubmitProofOpen}
                    setIsOpen={setIsSubmitProofOpen}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="verification">
              {bounty && (
                <div className="space-y-6">
                  <VerificationPanel 
                    bountyId={bounty.id} 
                    bountyCreator={bounty.creator} 
                    deadline={bounty.deadline}
                    rewardAmount={typeof bounty.rewardAmount === 'bigint' ? bounty.rewardAmount.toString() : bounty.rewardAmount}
                    proofRequirements={bounty.proofRequirements}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {bounty.completed && bounty.winner && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900/50">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
              <h3 className="text-xl font-semibold">Winner</h3>
            </div>
            <div className="flex items-center">
              <User className="h-5 w-5 text-green-600 mr-2" />
              <p className="font-medium">{`${bounty.winner.substring(0, 6)}...${bounty.winner.substring(bounty.winner.length - 4)}`}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}