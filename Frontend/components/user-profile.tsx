"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import { ethers } from "ethers"
import { Award, Calendar, User, FileText, Loader2, Trophy, Star } from "lucide-react"
import Link from "next/link"
import ReputationBadge from "@/components/reputation-badge"
import { Progress } from "@/components/ui/progress"
import type { Bounty, Submission } from "@/types/bounty"

export default function UserProfile() {
  const { connected, address } = useWallet()
  const { getUserBounties, getUserSubmissions, getUserReputation, getBountyDetails } = useBounty()

  const [createdBounties, setCreatedBounties] = useState<Bounty[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [reputation, setReputation] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!connected || !address) return

      try {
        setLoading(true)

        // Get user's reputation
        const rep = await getUserReputation(address)
        setReputation(rep)

        // Get user's bounty IDs and fetch full details
        const bountyIds = await getUserBounties(address)
        const bounties = await Promise.all(
          bountyIds.map(id => getBountyDetails(id))
        )
        setCreatedBounties(bounties)

        // Get user's submission IDs and fetch full details
        const submissionIds = await getUserSubmissions(address)
        const subs = await Promise.all(
          submissionIds.map(async (bountyId) => {
            const bounty = await getBountyDetails(bountyId)
            const submission = bounty.submissions.find(s => s.submitter.toLowerCase() === address.toLowerCase())
            if (submission) {
              const enrichedSubmission: Submission = {
                ...submission,
                bountyTitle: bounty.title,
                reward: bounty.reward
              }
              return enrichedSubmission
            }
            return null
          })
        )
        
        // Filter out null values and set submissions
        const validSubmissions = subs.filter((s): s is Submission => s !== null)
        setSubmissions(validSubmissions)

      } catch (err) {
        console.error("Error fetching user data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [connected, address, getUserBounties, getUserSubmissions, getUserReputation, getBountyDetails])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getStatusBadge = (status: number) => {
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

  // Calculate next reputation tier
  const getNextTier = () => {
    if (reputation < 10) return { name: "Contributor", target: 10, progress: (reputation / 10) * 100 }
    if (reputation < 50) return { name: "Expert", target: 50, progress: ((reputation - 10) / 40) * 100 }
    if (reputation < 100) return { name: "Master", target: 100, progress: ((reputation - 50) / 50) * 100 }
    return { name: "Master", target: reputation, progress: 100 }
  }

  const nextTier = getNextTier()

  // Calculate stats
  const stats = {
    created: createdBounties.length,
    completed: submissions.filter((s) => s.approved).length,
    pending: submissions.filter((s) => !s.approved).length,
    totalEarned: submissions
      .filter((s) => s.approved && s.reward)
      .reduce((sum: number, sub: Submission) => {
        try {
          const formattedAmount = ethers.utils.formatEther(sub.reward || '0')
          return sum + Number.parseFloat(formattedAmount)
        } catch (e) {
          console.error('Error formatting reward:', e)
          return sum
        }
      }, 0),
  }

  if (!connected) {
    return (
      <Card className="text-center p-6">
        <CardContent className="pt-6">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-4">Please connect your wallet to view your profile</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}</h2>
                  <p className="text-muted-foreground">Wallet Address</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <span className="font-medium">Reputation</span>
                  </div>
                  <ReputationBadge reputation={reputation} size="lg" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress to {nextTier.name}</span>
                    <span>
                      {reputation} / {nextTier.target}
                    </span>
                  </div>
                  <Progress value={nextTier.progress} className="h-2" />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>How to earn reputation:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Create a bounty (+1 point)</li>
                    <li>Complete a bounty (+5 points)</li>
                    <li>Verify submissions (+1 point per verification)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-medium mb-4">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bounties Created</p>
                      <p className="text-xl font-bold">{stats.created}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bounties Completed</p>
                      <p className="text-xl font-bold">{stats.completed}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Submissions</p>
                      <p className="text-xl font-bold">{stats.pending}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Earned</p>
                      <p className="text-xl font-bold">{stats.totalEarned.toFixed(3)} ETH</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="created" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="created">Created Bounties ({createdBounties.length})</TabsTrigger>
          <TabsTrigger value="submissions">Your Submissions ({submissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="created" className="mt-4">
          {createdBounties.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">You haven&apos;t created any bounties yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/create">Create a Bounty</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {createdBounties.map((bounty) => (
                <Card key={bounty.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="line-clamp-1 text-base">{bounty.title}</CardTitle>
                      {getStatusBadge(bounty.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground line-clamp-2 mb-4 text-sm">{bounty.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        <span>{bounty.reward ? ethers.utils.formatEther(bounty.reward) : '0'} ETH</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Deadline: {formatDate(bounty.deadline)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 mt-auto">
                    <Button className="w-full" asChild>
                      <Link href={`/bounty/${bounty.id}`}>View Details</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">You haven&apos;t submitted any bounties yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/">Browse Bounties</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">{submission.bountyTitle}</CardTitle>
                      <Badge className={submission.approved ? "bg-green-500" : "bg-amber-500"}>
                        {submission.approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        <span className="text-sm">{submission.reward ? ethers.utils.formatEther(submission.reward) : '0'} ETH</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span className="text-sm">Submitted on: {formatDate(submission.timestamp)}</span>
                      </div>
                      <Button className="w-full" asChild>
                        <Link href={`/bounty/${submission.bountyId}`}>View Bounty</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

