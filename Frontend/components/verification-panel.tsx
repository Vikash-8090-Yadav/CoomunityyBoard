"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import {
  Check,
  X,
  Loader2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Info,
  ImageIcon,
  LinkIcon,
  User,
  Calendar,
  Trophy,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import type { Bounty, Submission, ProofMetadata, PinataFileResponse } from "@/types/bounty"
import { ethers } from "ethers"

// Utility function to truncate Ethereum addresses
const truncateAddress = (address: string) => {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function VerificationPanel({ bounty }: { bounty: Bounty }) {
  const { connected, address } = useWallet()
  const { voteOnSubmission, completeBounty } = useBounty()

  const [voting, setVoting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState("")
  const [selectedSubmissionIndex, setSelectedSubmissionIndex] = useState(0)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [metadata, setMetadata] = useState<ProofMetadata | null>(null)

  // Add null check for bounty
  if (!bounty) {
    return (
      <Card className="border-dashed border-2 bg-muted/10">
        <CardContent className="p-10 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">Bounty not found</p>
        </CardContent>
      </Card>
    )
  }

  // Add null check for submissions
  if (!bounty.submissions || bounty.submissions.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-muted/10">
        <CardContent className="p-10 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">No submissions to verify</p>
        </CardContent>
      </Card>
    )
  }

  const handleVote = async (submissionIndex: number, approve: boolean) => {
    if (!connected) return

    const submission = bounty.submissions[submissionIndex]
    
    // Check if user is the submitter
    if (submission.submitter.toLowerCase() === address?.toLowerCase()) {
      setError("You cannot vote on your own submission")
      return
    }

    // Check if user has already voted
    if (hasVoted(submissionIndex)) {
      setError("You have already voted on this submission")
      return
    }

    // Check if maximum votes reached
    if (submission.approvalCount + submission.rejectCount >= 3) {
      setError("Maximum votes reached for this submission")
      return
    }

    try {
      setVoting(true)
      setError("")
      await voteOnSubmission(bounty.id, submissionIndex, approve)
      // Set the tab preference to verification before reloading
      localStorage.setItem('bounty-active-tab', 'verification')
      // Reload page to reflect changes
      window.location.reload()
    } catch (err: any) {
      console.error("Error voting on submission:", err)
      setError(err.message || "Failed to vote on submission")
    } finally {
      setVoting(false)
    }
  }

  const handleComplete = async () => {
    if (!connected) {
      setError("Please connect your wallet first");
      return;
    }

    // Check if user is bounty creator
    if (address?.toLowerCase() !== bounty.creator.toLowerCase()) {
      setError("Only the bounty creator can complete the bounty");
      return;
    }

    // Check if deadline has passed
    if (new Date(bounty.deadline * 1000) > new Date()) {
      setError("Cannot complete bounty yet. The deadline hasn't passed. Voting is still in progress until " + new Date(bounty.deadline * 1000).toLocaleString());
      return;
    }

    // Check if there are any approved submissions
    const approvedSubmissions = bounty.submissions.filter(sub => sub.approved);
    if (approvedSubmissions.length === 0) {
      setError("Cannot complete bounty. There are no approved submissions.");
      return;
    }

    // Check if all approved submissions have received enough votes
    const incompleteVoting = approvedSubmissions.some(sub => 
      (sub.approvalCount + sub.rejectCount) < 3
    );
    
    if (incompleteVoting) {
      setError("Cannot complete bounty. Some approved submissions haven't received all required votes yet.");
      return;
    }

    // Check if any submission is marked as winner
    const winners = bounty.submissions.filter(sub => sub.isWinner);
    if (winners.length === 0) {
      setError("Cannot complete bounty. No winners have been determined yet.");
      return;
    }

    try {
      setCompleting(true);
      setError("");
      
      // Add loading state message
      setError("Processing transaction... Please wait and approve the transaction in your wallet.");
      
      await completeBounty(bounty.id);
      
      // Set the tab preference to verification before reloading
      localStorage.setItem('bounty-active-tab', 'verification');
      
      // Show success message before reload
      setError("Transaction submitted successfully! Page will refresh to show updated status.");
      
      // Add a small delay before reload to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      console.error("Error completing bounty:", err);
      
      // Handle specific error cases
      if (err.message.includes("execution reverted")) {
        if (err.message.includes("Bounty already completed")) {
          setError("This bounty has already been completed.");
        } else if (err.message.includes("Bounty deadline not reached")) {
          setError("Cannot complete bounty yet. The deadline hasn't passed.");
        } else if (err.message.includes("No winners found")) {
          setError("Cannot complete bounty. No winners have been determined yet.");
        } else {
          setError("Transaction failed. Please ensure all requirements are met and you have enough funds for gas.");
        }
      } else if (err.code === 4001) {
        setError("Transaction was rejected in your wallet.");
      } else {
        setError(err.message || "Failed to complete bounty. Please try again.");
      }
    } finally {
      setCompleting(false);
    }
  };

  const loadSubmissionMetadata = async (submission: Submission) => {
    console.log("Loading metadata for submission:", submission)

    if (!submission) {
      console.log("No submission provided")
      return
    }

    try {
      setLoadingMetadata(true)
      const metadataCID = submission.ipfsProofHash
      console.log("Metadata CID to fetch:", metadataCID)

      if (!metadataCID) {
        console.error("No proof CID found")
        setError("No proof identifier found")
        return
      }

      // Log the URL we're going to fetch from
      const metadataUrl = `https://moccasin-real-stork-472.mypinata.cloud/ipfs/${metadataCID}`
      console.log("Fetching from URL:", metadataUrl)

      // Fetch metadata directly from Pinata gateway
      const response = await fetch(metadataUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`)
      }

      const metadata = await response.json()
      console.log("Raw metadata from Pinata:", metadata)

      // Transform the metadata to match your format
      setMetadata({
        title: metadata.title || "Untitled Submission",
        description: metadata.description || "",
        submitter: metadata.submitter,
        timestamp: metadata.timestamp,
        files: Array.isArray(metadata.files)
          ? metadata.files.map((file: PinataFileResponse) => ({
              name: file.name,
              cid: file.cid,
              url: `https://moccasin-real-stork-472.mypinata.cloud/ipfs/${file.cid}`,
            }))
          : [],
        links: metadata.links || [],
      })
    } catch (error) {
      console.error("Error loading metadata:", error)
      setError("Failed to load submission details. Please try again later.")
    } finally {
      setLoadingMetadata(false)
    }
  }

  // Determine if a file is an image based on name or type
  const isImageFile = (file: PinataFileResponse) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]
    return imageExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  }

  // File display component using Pinata gateway
  const FileLink = ({ file }: { file: PinataFileResponse }) => {
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
        // Open file directly using Pinata gateway
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
            <img
              src={`https://moccasin-real-stork-472.mypinata.cloud/ipfs/${file.cid}`}
              alt={file.name}
              className="w-full h-auto object-contain max-h-[250px]"
              onError={() => setError("Failed to load image")}
            />
            {error && <div className="p-2 text-xs text-red-500 bg-red-50">{error}</div>}
          </div>
        )}
      </div>
    )
  }

  const isActive = bounty.status === 0
  const isCreator = connected && address?.toLowerCase() === bounty.creator.toLowerCase()

  // Check if user has already voted
  const hasVoted = (submissionIndex: number) => {
    const submission = bounty.submissions[submissionIndex]
    return submission.hasVoted
  }

  // Calculate voting progress
  const getVotingProgress = (submission: Submission) => {
    const totalVotes = submission.approvalCount + submission.rejectCount
    return (totalVotes / 3) * 100
  }

  // Check if submission is a winner
  const isWinner = (submission: Submission) => {
    return submission.isWinner
  }

  const handleViewDetails = (index: number, submission: Submission) => {
    console.log("Viewing details for submission:", submission) // Debug log
    setSelectedSubmissionIndex(index)
    loadSubmissionMetadata(submission)

    // Wait for the details section to be rendered
    setTimeout(() => {
      const detailsSection = document.querySelector('.submission-details')
      if (detailsSection) {
        detailsSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 mb-6">
        <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
          <Info className="h-5 w-5 mr-2" />
          How Voting Works
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Each submission needs <span className="font-semibold">3 total votes</span>. If approve votes exceed reject votes,
          the submitter becomes a winner. Multiple winners will share the reward equally. You cannot vote on your own
          submission or vote multiple times.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bounty.submissions.map((submission, index) => (
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
                {submission.approved ? (
                  <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/20">
                    Approved
                  </Badge>
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
                      <p className="font-medium">{truncateAddress(submission.submitter)}</p>
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
                          setSelectedSubmissionIndex(index);
                          loadSubmissionMetadata(submission);
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

                {/* Vote counts display */}
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
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={getVotingProgress(submission)} 
                      className={`w-24 h-2 ${
                        submission.approvalCount > submission.rejectCount 
                          ? '[&>div]:bg-green-500' 
                          : '[&>div]:bg-red-500'
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {3 - (submission.approvalCount + submission.rejectCount)} votes left
                    </span>
                  </div>
                </div>

                {/* Only show voting buttons if deadline hasn't passed */}
                {new Date(bounty.deadline * 1000) > new Date() && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleVote(index, true)}
                      disabled={voting || submission.submitter.toLowerCase() === address?.toLowerCase() || hasVoted(index)}
                    >
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleVote(index, false)}
                      disabled={voting || submission.submitter.toLowerCase() === address?.toLowerCase() || hasVoted(index)}
                    >
                      <X className="h-4 w-4 mr-2 text-red-500" />
                      Reject
                    </Button>
                  </div>
                )}

                {/* Show voting status message if deadline has passed */}
                {new Date(bounty.deadline * 1000) <= new Date() && (
                  <div className="text-sm text-muted-foreground text-center py-2 bg-muted/10 rounded-md">
                    Voting period has ended
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Show warning when there are approved submissions but deadline hasn't passed */}
      {bounty.submissions.some(sub => sub.approved) && !bounty.completed && new Date(bounty.deadline * 1000) > new Date() && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-300">Voting in Progress</h3>
                <p className="text-sm text-amber-700/90 dark:text-amber-400 mt-0.5">
                  This bounty has approved submissions but voting period is still active until {new Date(bounty.deadline * 1000).toLocaleString()}. 
                  Each submission requires 3 votes to determine winners.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Only show Complete Bounty when deadline has passed */}
      {bounty.submissions.some(sub => sub.approved) && !bounty.completed && new Date(bounty.deadline * 1000) < new Date() && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-300">Ready to Complete</h3>
                  <p className="text-sm text-blue-700/90 dark:text-blue-400 mt-0.5">
                    Voting period has ended. You can now complete the bounty and distribute rewards.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleComplete}
                disabled={completing}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {completing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Complete Bounty"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Details Modal */}
      {selectedSubmissionIndex !== null && (
        <Card className="mt-6 border shadow-lg submission-details">
          <CardHeader className="bg-muted/30 pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Submission #{selectedSubmissionIndex + 1} Details
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSubmissionIndex(0)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingMetadata ? (
              <div className="flex flex-col justify-center items-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading submission details...</p>
              </div>
            ) : metadata ? (
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
                      <p className="font-medium text-sm">{truncateAddress(metadata.submitter)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-primary/70 mr-2" />
                    <div>
                      <p className="text-xs text-muted-foreground">Submission date</p>
                      <p className="font-medium text-sm">{new Date(metadata.timestamp).toLocaleDateString()}</p>
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
  )
}

