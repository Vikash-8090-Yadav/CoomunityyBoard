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
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import type { Bounty, Submission, ProofMetadata, PinataFileResponse } from "@/types/bounty"

// Utility function to truncate Ethereum addresses
const truncateAddress = (address: string) => {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function VerificationPanel({ bounty }: { bounty: Bounty }) {
  const { connected, address } = useWallet()
  const { verifySubmission, completeAndPayBounty } = useBounty()

  const [verifying, setVerifying] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState("")
  const [selectedSubmission, setSelectedSubmission] = useState(0)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [metadata, setMetadata] = useState<ProofMetadata | null>(null)

  const handleVerify = async (submissionIndex: number, approve: boolean) => {
    if (!connected) return

    try {
      setVerifying(true)
      setError("")
      await verifySubmission(bounty.id, submissionIndex)
      // Reload page to reflect changes
      window.location.reload()
    } catch (err: any) {
      console.error("Error verifying submission:", err)
      setError(err.message || "Failed to verify submission")
    } finally {
      setVerifying(false)
    }
  }

  const handleComplete = async (submissionIndex: number) => {
    if (!connected) return

    try {
      setCompleting(true)
      setError("")
      await completeAndPayBounty(bounty.id, submissionIndex)
      // Reload page to reflect changes
      window.location.reload()
    } catch (err: any) {
      console.error("Error completing bounty:", err)
      setError(err.message || "Failed to complete bounty")
    } finally {
      setCompleting(false)
    }
  }

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

  const isCreator = address && bounty.creator.toLowerCase() === address.toLowerCase()
  const isActive = bounty.status === 0

  // Check if user has already verified a submission
  const hasVerified = (submissionIndex: number) => {
    const submission = bounty.submissions[submissionIndex]
    return submission.verifiers?.some((v) => v.toLowerCase() === address?.toLowerCase()) ?? false
  }

  // Calculate approval percentage
  const getApprovalPercentage = (submission: Submission) => {
    return (submission.approvalCount / bounty.minimumApprovals) * 100
  }

  // Check if submission can be completed (has enough approvals)
  const canComplete = (submission: Submission) => {
    return submission.approvalCount >= bounty.minimumApprovals
  }

  if (bounty.submissions.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-muted/10">
        <CardContent className="p-10 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">No submissions to verify</p>
        </CardContent>
      </Card>
    )
  }

  const handleViewDetails = (index: number, submission: Submission) => {
    console.log("Viewing details for submission:", submission) // Debug log
    setSelectedSubmission(index)

    loadSubmissionMetadata(submission)

    const detailsTab = document.querySelector('[data-value="details"]') as HTMLElement
    detailsTab?.click()
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 mb-6">
        <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
          <Info className="h-5 w-5 mr-2" />
          How Voting Works
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          As a community member, you can vote to approve or reject submissions. Each submission needs{" "}
          <span className="font-semibold">{bounty.minimumApprovals} approvals</span> before the bounty creator can
          complete it and pay the reward. Your vote matters!
        </p>
      </div>

      <div className="bg-muted/30 p-5 rounded-lg border border-border/50">
        <h3 className="font-medium mb-2 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary mr-2 rounded"></span>
          Verification Process
        </h3>
        <p className="text-sm text-muted-foreground">
          Community members can review and verify submissions. Once a submission receives {bounty.minimumApprovals}{" "}
          approvals, the bounty creator can complete the bounty and the reward will be automatically transferred to the
          winner. Both the creator and submitter will receive reputation points.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="submissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="submissions" className="data-[state=active]:shadow-sm">
            Submissions ({bounty.submissions.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:shadow-sm">
            Submission Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="mt-0 space-y-6">
          {bounty.submissions.map((submission, index) => (
            <Card
              key={index}
              className={`overflow-hidden transition-all duration-300 ${
                selectedSubmission === index ? "border-primary shadow-md" : "hover:shadow-sm"
              }`}
            >
              <CardHeader className="bg-muted/30 pb-3">
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
                <CardDescription className="flex items-center mt-1">
                  <User className="h-3 w-3 mr-1 text-muted-foreground" />
                  <span>By: {truncateAddress(submission.submitter)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Verification Progress ({bounty.minimumApprovals} approvals needed)
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress
                        value={getApprovalPercentage(submission)}
                        className="flex-1 h-2"
                        // Add color based on progress
                        style={
                          {
                            background: "var(--muted)",
                            "--progress-background":
                              submission.approvalCount >= bounty.minimumApprovals
                                ? "var(--green-500)"
                                : "var(--primary)",
                          } as React.CSSProperties
                        }
                      />
                      <span className="text-sm font-medium">
                        {submission.approvalCount}/{bounty.minimumApprovals}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(index, submission)}
                      className="bg-primary/5 hover:bg-primary/10"
                    >
                      <FileText className="mr-1.5 h-4 w-4" />
                      View Details
                    </Button>

                    {isActive && connected && !isCreator && !hasVerified(index) && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 dark:text-red-500 border-red-200 dark:border-red-800"
                          onClick={() => handleVerify(index, false)}
                          disabled={verifying}
                        >
                          {verifying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5 mr-1" />
                          )}
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 dark:text-green-500 border-green-200 dark:border-green-800"
                          onClick={() => handleVerify(index, true)}
                          disabled={verifying}
                        >
                          {verifying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          )}
                          Approve
                        </Button>
                      </div>
                    )}

                    {isActive && connected && isCreator && canComplete(submission) && (
                      <Button size="sm" onClick={() => handleComplete(index)} disabled={completing} className="mt-2">
                        {completing ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-3.5 w-3.5" />
                        )}
                        Complete & Pay
                      </Button>
                    )}
                  </div>

                  {hasVerified(index) && (
                    <div className="bg-primary/5 text-xs text-muted-foreground p-2 rounded-md border border-primary/10">
                      <Check className="h-3 w-3 inline mr-1 text-green-500" />
                      You have already verified this submission
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="details" className="mt-0">
          <Card className="overflow-hidden border shadow-md">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle>Submission Details</CardTitle>
              {metadata && <CardDescription>{metadata.title}</CardDescription>}
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

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10 p-3 rounded-md border mt-4">
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

                  <div className="flex justify-end gap-2 mt-4">
                    {isActive && connected && !isCreator && !hasVerified(selectedSubmission) && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 dark:text-red-500 border-red-200 dark:border-red-800"
                          onClick={() => handleVerify(selectedSubmission, false)}
                          disabled={verifying}
                        >
                          {verifying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5 mr-1" />
                          )}
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 dark:text-green-500 border-green-200 dark:border-green-800"
                          onClick={() => handleVerify(selectedSubmission, true)}
                          disabled={verifying}
                        >
                          {verifying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          )}
                          Approve
                        </Button>
                      </div>
                    )}

                    {isActive && connected && isCreator && canComplete(bounty.submissions[selectedSubmission]) && (
                      <Button size="sm" onClick={() => handleComplete(selectedSubmission)} disabled={completing}>
                        {completing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        Complete & Pay
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Select a submission to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

