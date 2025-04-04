"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBounty } from "@/context/bounty-context"
import { formatUnits } from "ethers/lib/utils"
import { Calendar, Clock, Award } from "lucide-react"
import type { Bounty } from "@/context/bounty-context"

export default function BountyList() {
  const { bounties, loading, error, account } = useBounty()
  const [filteredBounties, setFilteredBounties] = useState<Bounty[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("deadline")

  // Debug log when component mounts
  useEffect(() => {
    console.log('BountyList: Component mounted');
    console.log('BountyList: Initial bounties:', bounties);
    console.log('BountyList: Loading state:', loading);
    console.log('BountyList: Error state:', error);
    console.log('BountyList: Account:', account);
  }, [bounties, loading, error, account]);

  useEffect(() => {
    console.log('BountyList: Bounties changed:', bounties); // Debug log
    if (bounties && bounties.length > 0) {
      let filtered = [...bounties]

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(
          (bounty) =>
            bounty.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bounty.description.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      }

      // Apply sorting
      filtered.sort((a, b) => {
        if (sortBy === "deadline") {
          return a.deadline - b.deadline
        } else if (sortBy === "reward") {
          const aReward = formatUnits(a.reward.toString(), 18);
          const bReward = formatUnits(b.reward.toString(), 18);
          return Number.parseFloat(bReward) - Number.parseFloat(aReward)
        }
        return 0
      })

      console.log('BountyList: Setting filtered bounties:', filtered); // Debug log
      setFilteredBounties(filtered)
    } else {
      console.log('BountyList: No bounties available, clearing filtered bounties'); // Debug log
      setFilteredBounties([])
    }
  }, [bounties, searchTerm, sortBy])

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getStatusBadge = (bounty: Bounty) => {
    if (bounty.completed) {
      return <Badge className="bg-blue-500">Completed</Badge>
    } else if (bounty.deadline * 1000 < Date.now()) {
      return <Badge className="bg-red-500">Expired</Badge>
    } else {
      return <Badge className="bg-green-500">Active</Badge>
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading bounties...</div>
  }

  if (error) {
    return <div className="flex justify-center p-8 text-red-500">Error: {error}</div>
  }

  if (!account) {
    return <div className="flex justify-center p-8">Please connect your wallet to view bounties</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="w-full md:w-1/2">
          <Input placeholder="Search bounties..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full md:w-1/4">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">Sort by Deadline</SelectItem>
              <SelectItem value="reward">Sort by Reward</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(!bounties || bounties.length === 0) ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No bounties found</p>
          <p className="text-sm text-muted-foreground mt-2">Total bounties: {bounties?.length || 0}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBounties.map((bounty: Bounty) => (
            <Card key={bounty.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-1">{bounty.title ?? 'Untitled'}</CardTitle>
                  {getStatusBadge(bounty)}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3 mb-4">{bounty.description ?? 'No description available'}</p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Award className="mr-2 h-4 w-4" />
                    <span>{bounty.reward ? `${formatUnits(bounty.reward.toString(), 18)} ETH` : 'Reward not specified'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Deadline: {formatDate(bounty.deadline)}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>
                      {bounty.deadline * 1000 > Date.now()
                        ? `${Math.ceil((bounty.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} days left`
                        : "Expired"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/bounty/${bounty.id}`} className="w-full">
                  <Button variant="default" className="w-full">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

