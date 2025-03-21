"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBounty } from "@/context/bounty-context"
import { formatEther } from "ethers"
import { Calendar, Clock, Award } from "lucide-react"

export default function BountyList() {
  const { bounties, loading } = useBounty()
  const [filteredBounties, setFilteredBounties] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("deadline")

  useEffect(() => {
    if (bounties) {
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
          return Number.parseFloat(formatEther(b.reward)) - Number.parseFloat(formatEther(a.reward))
        }
        return 0
      })

      setFilteredBounties(filtered)
    }
  }, [bounties, searchTerm, sortBy])

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

  if (loading) {
    return <div className="flex justify-center p-8">Loading bounties...</div>
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

      {filteredBounties.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No bounties found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBounties.map((bounty) => (
            <Card key={bounty.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-1">{bounty.title}</CardTitle>
                  {getStatusBadge(bounty.status)}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3 mb-4">{bounty.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Award className="mr-2 h-4 w-4" />
                    <span>{formatEther(bounty.reward)} ETH</span>
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

