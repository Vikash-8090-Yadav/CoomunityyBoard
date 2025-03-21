"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import { parseEther } from "ethers"

export default function CreateBountyForm() {
  const router = useRouter()
  const { connected } = useWallet()
  const { createBounty } = useBounty()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [requirements, setRequirements] = useState("")
  const [reward, setReward] = useState("")
  const [tokenType, setTokenType] = useState("native")
  const [date, setDate] = useState<Date>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!connected) {
      setError("Please connect your wallet first")
      return
    }

    if (!title || !description || !requirements || !reward || !date) {
      setError("Please fill in all fields")
      return
    }

    try {
      setLoading(true)
      setError("")

      // Convert deadline to Unix timestamp
      const deadline = Math.floor(date.getTime() / 1000)

      // Create bounty on the blockchain
      await createBounty(
        title,
        description,
        requirements,
        parseEther(reward),
        tokenType === "native" ? true : false,
        deadline,
        { value: tokenType === "native" ? parseEther(reward) : 0 },
      )

      router.push("/")
    } catch (err) {
      console.error("Error creating bounty:", err)
      setError(err.message || "Failed to create bounty")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Bounty Title</Label>
            <Input
              id="title"
              placeholder="Enter a clear title for your bounty"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this bounty is about"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              placeholder="List the specific requirements for completing this bounty"
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="reward">Reward Amount</Label>
              <Input
                id="reward"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.00"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Token Type</Label>
              <RadioGroup value={tokenType} onValueChange={setTokenType} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="native" id="native" />
                  <Label htmlFor="native">Native (ETH)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="erc20" id="erc20" disabled />
                  <Label htmlFor="erc20" className="text-muted-foreground">
                    ERC20 (Coming soon)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || !connected}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Bounty...
              </>
            ) : (
              "Create Bounty"
            )}
          </Button>

          {!connected && (
            <p className="text-center text-sm text-muted-foreground">Please connect your wallet to create a bounty</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

