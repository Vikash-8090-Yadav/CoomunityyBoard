"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import { formatEther } from "ethers"
import { Calendar, Clock, Award, User, FileText, Loader2 } from "lucide-react"
import SubmitProofForm from "@/components/submit-proof-form"
import VerificationPanel from "@/components/verification-panel"


import abi from "../abi/CommunityBountyBoard.json"

import {communityAddress} from "../config"

export default function BountyDetails({ id }: { id: string }) {
  const router = useRouter()
  const { connected, address } = useWallet()
  const { getBounty, cancelBounty } = useBounty()

  const [bounty, setBounty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchBounty = async () => {
      try {
        setLoading(true)
        const bountyData = await getBounty(id)
        setBounty(bountyData)
      } catch (err) {
        console.error("Error fetching bounty:", err)
        setError("Failed to load bounty details")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchBounty()
    }
  }, [id, getBounty])

  const handleCancel = async () => {
    if (!connected || !bounty) return

    try {
      setCancelling(true)
      await cancelBounty(bounty.id)
      router.push("/")
    } catch (err) {
      console.error("Error cancelling bounty:", err)
      setError("Failed to cancel bounty")
    } finally {
      setCancelling(false)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 0: // Active
        return <Badge className="bg-green-500">Active</Badge>
      case 1: // Completed
        return <Badge className="bg-blue-500">Completed</Badge>
      case 2: // Cancelled
        return <Badge className="bg-red-500">Cancelled</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const isCreator = bounty && address && bounty.creator.toLowerCase() === address.toLowerCase()
  const isActive = bounty && bounty.status === 0
  const isExpired = bounty && bounty.deadline * 1000 < Date.now()
  const canCancel = isCreator && isActive && bounty.submissions.length === 0

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !bounty) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || "Bounty not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
          Back to Bounties
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">{bounty.title}</h1>
          <div className="flex items-center mt-2 space-x-2">
            {getStatusBadge(bounty.status)}
            {isExpired && isActive && <Badge variant="outline">Expired</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            Back
          </Button>
          {canCancel && (
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Bounty"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-line">{bounty.description}</p>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-2">Requirements</h3>
                <p className="text-muted-foreground whitespace-pre-line">{bounty.requirements}</p>
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center">
                    <Award className="mr-2 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Reward</p>
                      <p className="font-medium">{formatEther(bounty.reward)} ETH</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="font-medium">{formatDate(bounty.deadline)}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time Remaining</p>
                      <p className="font-medium">
                        {bounty.deadline * 1000 > Date.now()
                          ? `${Math.ceil((bounty.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} days left`
                          : "Expired"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <User className="mr-2 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created by</p>
                      <p className="font-medium">{`${bounty.creator.substring(0, 6)}...${bounty.creator.substring(bounty.creator.length - 4)}`}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isActive && connected && !isCreator && (
                <Button
                  className="w-full"
                  onClick={() => document.getElementById("submit-section").scrollIntoView({ behavior: "smooth" })}
                >
                  Submit Proof
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="submissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submissions">Submissions ({bounty.submissions.length})</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="mt-4">
          {bounty.submissions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No submissions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bounty.submissions.map((submission, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Submission #{index + 1}</CardTitle>
                      <Badge variant={submission.approved ? "default" : "outline"}>
                        {submission.approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted by</p>
                        <p>{`${submission.submitter.substring(0, 6)}...${submission.submitter.substring(submission.submitter.length - 4)}`}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Proof</p>
                        <a
                          href={`https://ipfs.io/ipfs/${submission.proofCID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Proof on IPFS
                        </a>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Comments</p>
                        <p className="whitespace-pre-line">{submission.comments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {isActive && connected && !isCreator && (
            <div id="submit-section" className="mt-6">
              <h3 className="text-xl font-bold mb-4">Submit Your Proof</h3>
              <SubmitProofForm bountyId={bounty.id} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="verification" className="mt-4">
          <VerificationPanel bounty={bounty} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

