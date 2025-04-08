"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, ImageIcon, FileText, X } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { ethers } from "ethers"
import { communityAddress } from "@/config"
import abi from "@/abi/CommunityBountyBoard.json"
import { TransactionProgress } from "@/components/ui/transaction-progress"
import { pinataService } from '@/lib/pinata'
import { useBounty } from "@/context/bounty-context"
import { useAccount } from "wagmi"
import { uploadJSONToIPFS, getIPFSGatewayURL } from "@/lib/ipfs"
import { toast } from "@/components/ui/use-toast"

interface ProofMetadata {
  title: string
  description: string
  submitter: string
  timestamp: number
  files: Array<{
    name: string
    cid: string
    url: string
  }>
  links: string[]
  [key: string]: unknown
}

interface SubmitProofFormProps {
  bountyId: string
  bountyTitle: string
  onSuccess?: () => void
}

export default function SubmitProofForm({ bountyId, bountyTitle, onSuccess }: SubmitProofFormProps) {
  const { provider, address } = useWallet()
  const { submitProof, getBountyDetails } = useBounty()
  const { isConnected } = useAccount()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [newLink, setNewLink] = useState("")
  const [loading, setLoading] = useState(false)
  const [transactionStage, setTransactionStage] = useState<"submitted" | "pending" | "confirmed" | "error">("submitted")
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [proof, setProof] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const addLink = () => {
    if (newLink.trim() !== "") {
      try {
        new URL(newLink)
        setLinks((prev) => [...prev, newLink])
        setNewLink("")
      } catch {
        setTransactionError("Please enter a valid URL")
      }
    }
  }

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const handlePreview = async () => {
    if (!address || !bountyId) return

    try {
      setLoading(true)
      setTransactionError(null)

      const metadata: ProofMetadata = {
        title: title || `Proof for Bounty: ${bountyTitle}`,
        description: description,
        submitter: address,
        timestamp: Date.now(),
        files: [],
        links: links,
      }

      const previewCid = await uploadJSONToIPFS(metadata)
      const previewUrl = getIPFSGatewayURL(previewCid)
      setProof(previewUrl)
      
      toast({
        title: "Preview Generated",
        description: "Your proof preview has been generated successfully.",
        variant: "default"
      })
    } catch (err) {
      console.error("Error generating preview:", err)
      setTransactionError("Failed to generate preview. Please try again.")
      toast({
        title: "Preview Generation Failed",
        description: "Failed to generate preview. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !bountyId) return

    if (!isConnected) {
      setTransactionStage("error")
      setTransactionError("Please connect your wallet first")
      return
    }

    try {
      setLoading(true)
      setTransactionError(null)

      const bounty = await getBountyDetails(Number(bountyId))
      if (!bounty) {
        setTransactionError("Bounty not found")
        return
      }

      if (bounty.deadline * 1000 < Date.now()) {
        setTransactionError("Cannot submit proof for an expired bounty")
        return
      }

      if (files.length === 0 && links.length === 0) {
        setTransactionStage("error")
        setTransactionError("Please upload at least one file or add a link as proof")
        return
      }

      setTransactionStage("submitted")

      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const result = await pinataService.uploadFile(file)
          return {
            name: file.name,
            cid: result.cid,
            url: result.url
          }
        })
      )

      const metadata: ProofMetadata = {
        title: title || `Proof for Bounty: ${bountyTitle}`,
        description: description,
        submitter: address,
        timestamp: Date.now(),
        files: uploadedFiles,
        links: links,
      }

      const metadataCid = await pinataService.uploadJSON(metadata)
      const cleanCid = metadataCid.replace('ipfs://', '')

      if (!provider) {
        throw new Error("Provider is not available")
      }

      const signer = provider.getSigner()
      const nonce = await provider.getTransactionCount(await signer.getAddress())

      const iface = new ethers.utils.Interface(abi.abi)
      const encodedData = iface.encodeFunctionData("submitProof", [
        bountyId.toString(),
        cleanCid
      ])

      const tx = {
        from: await signer.getAddress(),
        to: communityAddress,
        data: encodedData,
        nonce: nonce
      }

      const txResponse = await signer.sendTransaction(tx)

      setTransactionStage("pending")

      const receipt = await txResponse.wait()
      console.log("Transaction confirmed:", receipt)
      setTransactionStage("confirmed")

      await new Promise(resolve => setTimeout(resolve, 1500))

      if (onSuccess) {
        onSuccess()
      }

      setSuccess(true)

      setTimeout(() => {
        localStorage.setItem('bounty-active-tab', 'details');
        window.location.reload();
      }, 2000);

      if (submitProof) {
        await submitProof(Number(bountyId), cleanCid)
      }

    } catch (err: unknown) {
      console.error("Error submitting proof:", err)
      setTransactionStage("error")
      
      if (err instanceof Error) {
        if (err.message.includes("4001")) {
          setTransactionError("Transaction was rejected in your wallet")
        } else {
          setTransactionError(err.message || "Failed to submit proof. Please try again.")
        }
      } else {
        setTransactionError("Failed to submit proof. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" />
        <div className="fixed top-4 right-4 z-50">
          <TransactionProgress 
            stage={transactionStage}
            errorMessage={transactionError || undefined}
          />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">
                {transactionStage === "submitted" && "Submitting proof..."}
                {transactionStage === "pending" && "Processing transaction..."}
                {transactionStage === "confirmed" && "Transaction confirmed!"}
                {transactionStage === "error" && "Transaction failed"}
              </p>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">Proof Submitted Successfully!</h3>
            <p className="text-muted-foreground mb-4">
              Your proof has been submitted and is now awaiting verification by community members.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to submission details...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Proof</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your proof"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your proof in detail"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Files</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={loading}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Generate Preview
              </Button>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Links</Label>
            <div className="flex gap-2">
              <Input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Enter a URL"
              />
              <Button type="button" onClick={addLink}>
                Add Link
              </Button>
            </div>
            {links.length > 0 && (
              <div className="mt-2 space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="text-sm">{link}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {proof && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm break-all">{proof}</p>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Proof'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}