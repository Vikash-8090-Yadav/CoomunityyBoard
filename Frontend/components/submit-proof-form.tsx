"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import { Upload, Loader2 } from "lucide-react"
import { uploadToIPFS } from "@/lib/ipfs"

export default function SubmitProofForm({ bountyId }: { bountyId: string }) {
  const { connected } = useWallet()
  const { submitProof } = useBounty()

  const [comments, setComments] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected) {
      setError("Please connect your wallet first")
      return
    }

    if (!file) {
      setError("Please upload a proof file")
      return
    }

    try {
      setUploading(true)
      setError("")

      // Upload file to IPFS
      const cid = await uploadToIPFS(file)

      setUploading(false)
      setSubmitting(true)

      // Submit proof to the blockchain
      await submitProof(bountyId, cid, comments)

      // Reset form
      setFile(null)
      setComments("")

      // Refresh the page to show the new submission
      window.location.reload()
    } catch (err) {
      console.error("Error submitting proof:", err)
      setError(err.message || "Failed to submit proof")
      setUploading(false)
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proof">Proof File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="proof"
                type="file"
                onChange={handleFileChange}
                className="flex-1"
                disabled={uploading || submitting}
              />
              {file && <p className="text-sm text-muted-foreground truncate max-w-[200px]">{file.name}</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload screenshots, documents, or links as proof of completion
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              placeholder="Add any additional information about your submission"
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={uploading || submitting}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" className="w-full" disabled={!connected || !file || uploading || submitting}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading to IPFS...
              </>
            ) : submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Proof...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Proof
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

