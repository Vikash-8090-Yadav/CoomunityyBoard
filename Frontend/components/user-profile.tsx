"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import { formatEther } from "ethers"
import { Award, Calendar, User, FileText, Loader2 } from "lucide-react"
import Link from "next/link"

export default function UserProfile() {
  const { connected, address } = useWallet()
  const { getUserBounties, getUserSubmissions, getUserReputation } = useBounty()

  const [createdBounties, setCreatedBounties] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [reputation, setReputation] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!connected || !address) return

      try {
        setLoading(true)

        const [bounties, subs, rep] = await Promise.all([
          getUserBounties(address),
          getUserSubmissions(address),
          getUserReputation(address),
        ])

        setCreatedBounties(bounties)
        setSubmissions(subs)
        setReputation(rep)
      } catch (err) {
        console.error("Error fetching user data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [connected, address, getUserBounties, getUserSubmissions, getUserReputation])

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
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reputation</p>
                      <p className="text-xl font-bold">{reputation}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-xl font-bold">{submissions.filter((s) => s.approved).length}</p>
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
                <p className="text-muted-foreground">You haven't created any bounties yet</p>
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
                        <span>{formatEther(bounty.reward)} ETH</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Deadline: {formatDate(bounty.deadline)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 mt-auto">
                    <Button variant="outline" className="w-full" asChild>
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
                <p className="text-muted-foreground">You haven't submitted any bounties yet</p>
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
                      <Badge variant={submission.approved ? "default" : "outline"}>
                        {submission.approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        <span className="text-sm">{formatEther(submission.reward)} ETH</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span className="text-sm">Submitted on: {formatDate(submission.timestamp)}</span>
                      </div>
                      <Button variant="outline" className="w-full" asChild>
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

