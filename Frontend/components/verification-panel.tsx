"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBounty } from "@/context/bounty-context"
import { useWallet } from "@/context/wallet-context"
import { TransactionProgress } from "@/components/ui/transaction-progress"
import QualityCheckPanel from "@/components/quality-check-panel"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface VerificationPanelProps {
  bountyId: string
  bountyCreator: string
}

interface SubmissionData {
  id: string
  submitter: string
  proofCID: string
  status: "pending" | "approved" | "rejected"
  rewardAmount: string
  metadata?: {
    description: string
    files: Array<{
      name: string
      url: string
    }>
  }
}

type TransactionStage = "submitted" | "pending" | "confirmed" | "error"

export function VerificationPanel({ bountyId, bountyCreator }: VerificationPanelProps) {
  const { address, connected } = useWallet()
  const { verifySubmission, completeBounty } = useBounty()
  const { toast } = useToast()

  const [submissions, setSubmissions] = useState<SubmissionData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmissionIndex, setSelectedSubmissionIndex] = useState<number | null>(null)
  const [metadata, setMetadata] = useState<{
    description: string;
    files: Array<{
      name: string;
      url: string;
    }>;
  } | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [transactionStage, setTransactionStage] = useState<TransactionStage>("submitted")
  const [transactionError, setTransactionError] = useState<string | null>(null)

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/bounties/${bountyId}/submissions`)
      if (!response.ok) {
        throw new Error("Failed to fetch submissions")
      }
      const data = await response.json()
      setSubmissions(data)
    } catch (err) {
      console.error("Error fetching submissions:", err)
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [bountyId, toast])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleApprove = async (submissionIndex: number) => {
    try {
      setTransactionStage("submitted")
      await verifySubmission(Number(bountyId), submissionIndex, true)
      setTransactionStage("confirmed")
      toast({
        title: "Success",
        description: "Submission approved successfully",
      })
      fetchSubmissions()
    } catch (err) {
      console.error("Error approving submission:", err)
      setTransactionError(err instanceof Error ? err.message : "Failed to approve submission")
      setTransactionStage("error")
      toast({
        title: "Error",
        description: "Failed to approve submission",
        variant: "destructive",
      })
    } finally {
      setTransactionStage("submitted")
      setTransactionError(null)
    }
  }

  const handleReject = async (submissionIndex: number) => {
    try {
      setTransactionStage("submitted")
      await verifySubmission(Number(bountyId), submissionIndex, false)
      setTransactionStage("confirmed")
      toast({
        title: "Success",
        description: "Submission rejected successfully",
      })
      fetchSubmissions()
    } catch (err) {
      console.error("Error rejecting submission:", err)
      setTransactionError(err instanceof Error ? err.message : "Failed to reject submission")
      setTransactionStage("error")
      toast({
        title: "Error",
        description: "Failed to reject submission",
        variant: "destructive",
      })
    } finally {
      setTransactionStage("submitted")
      setTransactionError(null)
    }
  }

  const handleComplete = async () => {
    try {
      setCompleting(true)
      setTransactionStage("submitted")
      await completeBounty(Number(bountyId))
      setTransactionStage("confirmed")
      toast({
        title: "Success",
        description: "Bounty completed successfully",
      })
      fetchSubmissions()
    } catch (err) {
      console.error("Error completing bounty:", err)
      setTransactionError(err instanceof Error ? err.message : "Failed to complete bounty")
      setTransactionStage("error")
      toast({
        title: "Error",
        description: "Failed to complete bounty",
        variant: "destructive",
      })
    } finally {
      setCompleting(false)
      setTransactionStage("submitted")
      setTransactionError(null)
    }
  }

  const handleViewDetails = (index: number, submission: SubmissionData) => {
    setSelectedSubmissionIndex(index)
    loadSubmissionMetadata(submission)
  }

  const loadSubmissionMetadata = async (submission: SubmissionData) => {
    try {
      setLoadingMetadata(true)
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${submission.proofCID}`)
      if (!response.ok) {
        throw new Error("Failed to fetch metadata")
      }
      const data = await response.json()
      setMetadata(data as {
        description: string;
        files: Array<{
          name: string;
          url: string;
        }>;
      })
    } catch (err) {
      console.error("Error loading metadata:", err)
    } finally {
      setLoadingMetadata(false)
    }
  }

  const FileLink = ({ file }: { file: { name: string; url: string } }) => {
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-700"
      >
        {file.name}
      </a>
    )
  }

  const isCreator = connected && address?.toLowerCase() === bountyCreator.toLowerCase()

  // Show loading state while transaction is pending
  if (loading || completing) {
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
      <CardHeader>
        <CardTitle>Submissions</CardTitle>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <p className="text-center text-gray-500">No submissions yet</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission, index) => (
              <div key={submission.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Submitter: {submission.submitter}</p>
                    <p className="text-sm text-gray-500">Status: {submission.status}</p>
                    {submission.rewardAmount && (
                      <p className="text-sm text-gray-500">
                        Reward: {submission.rewardAmount} ETH
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isCreator && submission.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(index)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(index)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(index, submission)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
                {selectedSubmissionIndex === index && (
                  <div className="mt-4">
                    {loadingMetadata ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : metadata ? (
                      <div className="space-y-4">
                        <p className="text-sm">{metadata.description}</p>
                        {metadata.files && metadata.files.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Files:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {metadata.files.map((file, i) => (
                                <li key={i}>
                                  <FileLink file={file} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No metadata available</p>
                    )}
                  </div>
                )}
                <QualityCheckPanel
                  submission={{
                    id: Number(submission.id),
                    bountyId: Number(bountyId),
                    submitter: submission.submitter,
                    proofCID: submission.proofCID,
                    comments: "",
                  }}
                  onQualityCheck={(score, feedback) => {
                    console.log('Quality check completed:', { score, feedback })
                  }}
                  isSubmitter={submission.submitter.toLowerCase() === address?.toLowerCase()}
                  bountyAmount={submission.rewardAmount}
                  isApproved={submission.status === "approved"}
                />
              </div>
            ))}
            {isCreator && submissions.some(s => s.status === "approved") && (
              <div className="flex justify-end mt-4">
                <Button onClick={handleComplete}>Complete Bounty</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

