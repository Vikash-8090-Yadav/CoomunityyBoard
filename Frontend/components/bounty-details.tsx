"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import { formatEther } from "ethers/lib/utils"
import { Calendar, Clock, Award, User, FileText, Loader2, AlertTriangle, Trophy } from "lucide-react"
import VerificationPanel from "@/components/verification-panel"
import SubmissionDetails from "./submission-details"
import { formatDistanceToNow } from "date-fns"
import type { Bounty, Submission } from "@/types/bounty"
import CollapsibleSubmitProof from "./collapsible-submit-proof"
import { useAccount } from "@/context/account-context"
import { ethers } from "ethers"
import abi from "@/abi/CommunityBountyBoard.json"
import { communityAddress } from "@/config"

interface BountyDetailsProps {
  id: string
}

export default function BountyDetails({ id }: BountyDetailsProps) {
  const router = useRouter()
  const { connected, address, chainId } = useWallet()
  const { getBountyDetails } = useBounty()
  const { address: accountAddress } = useAccount()
  const { provider } = useWallet()

  const [bounty, setBounty] = useState<Bounty | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitProofOpen, setIsSubmitProofOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [hasVoted, setHasVoted] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(true)
  const [payoutTxHash, setPayoutTxHash] = useState<string | null>(null)

  // Add useEffect for tab persistence
  useEffect(() => {
    const storedTab = localStorage.getItem('bounty-active-tab')
    if (storedTab) {
      setActiveTab(storedTab)
      // Clear the stored preference after using it
      localStorage.removeItem('bounty-active-tab')
    }
  }, [])

  const loadBounty = useCallback(async () => {
    if (!connected || !id) return

    try {
      setLoading(true)
      setError(null)
      const details = await getBountyDetails(Number(id))
      if (details) {
        const formattedBounty: Bounty = {
          ...details,
          rewardAmount: formatEther(details.reward),
          submissions: details.submissions.map((sub: any): Submission => ({
            ...sub,
            rewardAmount: formatEther(details.reward),
            rewardShare: 1,
            ipfsProofHash: sub.proofCID || "",
            timestamp: sub.timestamp,
            approved: sub.approved,
            approvalCount: Number(sub.approvalCount),
            rejectCount: Number(sub.rejectCount),
            isWinner: sub.isWinner,
            hasVoted: sub.hasVoted,
            txHash: sub.txHash,
            payoutTxHash: sub.payoutTxHash,
            comments: sub.comments ? [sub.comments] : undefined
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

  useEffect(() => {
    const checkVoteStatus = async () => {
      if (!bounty || !selectedSubmission || !accountAddress || !provider) return;

      setIsLoadingVoteStatus(true);
      try {
        const contract = new ethers.Contract(
          communityAddress,
          abi.abi,
          provider
        );

        const voted = await contract.hasVotedOnSubmission(bounty.id, selectedSubmission.id, accountAddress);
        setHasVoted(voted);
      } catch (error) {
        console.error("Error checking vote status:", error);
      } finally {
        setIsLoadingVoteStatus(false);
      }
    };

    const fetchPayoutHash = async () => {
      if (!bounty || !selectedSubmission || !provider) return;

      try {
        const contract = new ethers.Contract(
          communityAddress,
          abi.abi,
          provider
        );

        const hash = await contract.getPayoutTxHash(bounty.id, selectedSubmission.id);
        if (hash && hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          setPayoutTxHash(hash);
        }
      } catch (error) {
        console.error("Error fetching payout hash:", error);
        // Don't set error state here as it's not critical
      }
    };

    checkVoteStatus();
    fetchPayoutHash();
  }, [accountAddress, bounty, selectedSubmission, provider]);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return (
          <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/20">Active</Badge>
        )
      case 1:
        return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">Completed</Badge>
      case 2:
        return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 border-red-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const isCreator = bounty && address && bounty.creator.toLowerCase() === address?.toLowerCase()
  const isActive = bounty?.status === 0
  const isExpired = bounty?.deadline ? bounty.deadline * 1000 < Date.now() : false

  const deadline = new Date((bounty?.deadline ?? 0) * 1000)
  const timeToDeadline = formatDistanceToNow(deadline, { addSuffix: true })

  // Debug logging
  useEffect(() => {
    if (bounty) {
      console.log("Submit Button Conditions:", {
        isActive,
        connected,
        isCreator,
        status: bounty.status,
        userAddress: address,
        creatorAddress: bounty.creator,
        bountyDeadline: bounty.deadline * 1000,
        currentTime: Date.now(),
        isExpired,
      })
    }
  }, [bounty, connected, address, isActive, isCreator, isExpired])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "submit") {
      setIsSubmitProofOpen(true)
    } else if (value === "details") {
      setIsSubmitProofOpen(false)
    }
  }

  if (!connected) {
    return (
      <Card className="border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
        <CardContent className="pt-6 flex flex-col items-center justify-center p-10 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-amber-700 dark:text-amber-400">Wallet Not Connected</h3>
          <p className="text-amber-600 dark:text-amber-300">Please connect your wallet to view bounty details</p>
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
          <p className="text-amber-600 dark:text-amber-300 mb-2">Please switch to Conflux Testnet (Chain ID: 71)</p>
          <p className="text-sm text-amber-500 dark:text-amber-400/70">Current network: {chainId || "Unknown"}</p>
        </CardContent>
      </Card>
    )
  }

  if (loading && activeTab !== "submit") {
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
      <Card className="border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
        <CardContent className="pt-6 flex flex-col items-center justify-center p-10 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-red-700 dark:text-red-400">Error Loading Bounty</h3>
          <p className="text-red-600 dark:text-red-300">{error}</p>
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
          <p className="text-amber-600 dark:text-amber-300">No bounty found with ID: {id}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-3">{bounty?.title}</h1>
              <div className="flex items-center gap-2">
                {getStatusBadge(bounty?.status ?? 0)}
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
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{bounty?.description}</p>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg border">
                <h3 className="text-lg font-medium mb-3 flex items-center text-foreground">
                  <span className="inline-block w-1 h-5 bg-primary mr-2 rounded"></span>
                  Requirements
                </h3>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{bounty?.proofRequirements}</p>
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
                      <p className="font-medium text-lg">{bounty?.rewardAmount} ETH</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="font-medium">{formatDate(bounty?.deadline || 0)}</p>
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
                        {bounty?.deadline && bounty.deadline * 1000 > Date.now() ? (
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
                        {bounty?.creator
                          ? `${bounty.creator.substring(0, 6)}...${bounty.creator.substring(bounty.creator.length - 4)}`
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isActive && connected && !isCreator && (
                <Button
                  className="w-full shadow-sm hover:shadow transition-all"
                  onClick={() => {
                    setIsSubmitProofOpen(true)
                    setActiveTab("submit")
                  }}
                >
                  Submit Proof
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border shadow-md">
        <CardContent className="p-6">
          <Tabs value={activeTab} className="space-y-4" onValueChange={handleTabChange}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="details">Details</TabsTrigger>
              {bounty.status === 0 && !isCreator && connected && <TabsTrigger value="submit">Submit Proof</TabsTrigger>}
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              {!bounty?.submissions?.length ? (
                <Card className="border-dashed border-2 bg-muted/10">
                  <CardContent className="p-10 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No submissions yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bounty.submissions.map((submission: Submission, index: number) => (
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
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Proof</p>
                              {submission.proofCID ? (
                                <a
                                  href={`https://gateway.pinata.cloud/ipfs/${submission.proofCID}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center group"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const pinataUrl = `https://gateway.pinata.cloud/ipfs/${submission.proofCID}`;
                                    const publicUrl = `https://ipfs.io/ipfs/${submission.proofCID}`;
                                    
                                    fetch(pinataUrl)
                                      .then(response => {
                                        if (response.ok) {
                                          window.open(pinataUrl, '_blank');
                                        } else {
                                          window.open(publicUrl, '_blank');
                                        }
                                      })
                                      .catch(() => {
                                        window.open(publicUrl, '_blank');
                                      });
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2 group-hover:text-primary/80 transition-colors" />
                                  <span className="font-medium">View Proof</span>
                                </a>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveTab("verification");
                                    setSelectedSubmission(submission);
                                  }}
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

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setActiveTab("verification");
                              const verificationTab = document.querySelector('[value="verification"]');
                              if (verificationTab) {
                                verificationTab.scrollIntoView({ behavior: 'smooth' });
                              }
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
              {bounty.status === 0 && !isCreator && connected && (
                <div className="space-y-4">
                  <CollapsibleSubmitProof
                    bountyId={bounty.id.toString()}
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
                  <VerificationPanel bounty={bounty} />
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

