"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, LinkIcon, ImageIcon, FileText, X } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { ethers } from "ethers"
import { communityAddress } from "@/config"
import abi from "@/abi/CommunityBountyBoard.json"
import { TransactionProgress } from "@/components/ui/transaction-progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { pinataService } from '@/lib/pinata'

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
}

interface SubmitProofFormProps {
  bountyId: number;
  bountyTitle: string;
  onSuccess?: () => void;
}

export default function SubmitProofForm({ bountyId, bountyTitle, onSuccess }: SubmitProofFormProps) {
  const { connected, provider, address } = useWallet()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [newLink, setNewLink] = useState("")
  const [loading, setLoading] = useState(false)
  const [transactionStage, setTransactionStage] = useState<"submitted" | "pending" | "confirmed" | "error">("submitted")
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected) {
      setTransactionStage("error")
      setTransactionError("Please connect your wallet first")
      return
    }

    if (files.length === 0 && links.length === 0) {
      setTransactionStage("error")
      setTransactionError("Please upload at least one file or add a link as proof")
      return
    }

    try {
      setLoading(true)
      setTransactionStage("submitted")
      setTransactionError(null)

      // Upload files to Pinata
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

      // Create metadata
      const metadata: ProofMetadata = {
        title: title || `Proof for Bounty: ${bountyTitle}`,
        description: description,
        submitter: address || "",
        timestamp: Date.now(),
        files: uploadedFiles,
        links: links,
      }

      // Upload metadata to Pinata
      const metadataCid = await pinataService.uploadJSON(metadata)
      const cleanCid = metadataCid.replace('ipfs://', '')

      if (!provider) {
        throw new Error("Provider is not available")
      }

      const signer = provider.getSigner()

      // Get current nonce
      const nonce = await provider.getTransactionCount(await signer.getAddress())

      // Create the transaction data
      const iface = new ethers.utils.Interface(abi.abi)
      const encodedData = iface.encodeFunctionData("submitProof", [
        bountyId.toString(),
        cleanCid
      ])

      // Create transaction object
      const tx = {
        from: await signer.getAddress(),
        to: communityAddress,
        data: encodedData,
        nonce: nonce
      }

      // Send transaction
      const txResponse = await signer.sendTransaction(tx)

      setTransactionStage("pending")

      // Wait for transaction to be mined
      const receipt = await txResponse.wait()
      console.log("Transaction confirmed:", receipt)
      setTransactionStage("confirmed")

      // Wait for a moment to show the completed state
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }

      setSuccess(true)

      // Automatically navigate to details tab after showing success message
      setTimeout(() => {
        // Set the tab preference to details
        localStorage.setItem('bounty-active-tab', 'details');
        // Refresh the page to show updated data
        window.location.reload();
      }, 2000);

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

  // Show loading state while transaction is pending
  if (loading) {
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
        <CardTitle className="text-xl">Submit Proof of Completion</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Proof Title</Label>
            <Input
              id="title"
              placeholder="Enter a clear title for your proof"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <Tabs defaultValue="files" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files">Upload Files</TabsTrigger>
              <TabsTrigger value="links">Add Links</TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-1">Drag and drop files or click to upload</p>
                  <p className="text-xs text-muted-foreground">
                    Upload screenshots, documents, or any files as proof of completion
                  </p>
                  <Input
                    ref={fileInputRef}
                    id="proof-files"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={loading}
                  />
                </div>

                {files.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Uploaded Files</h4>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-accent/50 rounded-md">
                          <div className="flex items-center">
                            {file.type.startsWith("image/") ? (
                              <ImageIcon className="h-4 w-4 mr-2 text-blue-500" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2 text-blue-500" />
                            )}
                            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="h-6 w-6">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="links" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="link">Add Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="link"
                    placeholder="https://example.com/my-work"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    disabled={loading}
                  />
                  <Button type="button" onClick={addLink} disabled={loading || !newLink.trim()}>
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add links to GitHub repositories, deployed websites, or other online resources
                </p>

                {links.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Added Links</h4>
                    <div className="space-y-2">
                      {links.map((link, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-accent/50 rounded-md">
                          <div className="flex items-center">
                            <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline truncate max-w-[200px]"
                            >
                              {link}
                            </a>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeLink(index)} className="h-6 w-6">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="description">Description of Work</Label>
            <Textarea
              id="description"
              placeholder="Describe how you completed the bounty requirements..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {transactionError && (
            <Alert variant="destructive">
              <AlertDescription>{transactionError}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!connected || (files.length === 0 && links.length === 0) || loading}
          >
            {loading ? (
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

          <div className="text-xs text-muted-foreground">
            <p>By submitting, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Your work meets all the requirements specified in the bounty</li>
              <li>The proof you&apos;re submitting is your original work</li>
              <li>You understand that community members will verify your submission</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

