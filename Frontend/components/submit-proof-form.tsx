"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"
import { Upload, Loader2, LinkIcon, ImageIcon, FileText, X } from "lucide-react"
import { uploadToIPFS, uploadJSONToIPFS, getIPFSGatewayURL } from "@/lib/ipfs"
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

export default function SubmitProofForm({ bountyId, bountyTitle }: { bountyId: string; bountyTitle: string }) {
  const { connected, address } = useWallet()
  const { submitProof, getBountyDetails } = useBounty()
  const [bountyDetails, setBountyDetails] = useState<any>(null)

  useEffect(() => {
    const fetchBountyDetails = async () => {
      if (bountyId) {
        const details = await getBountyDetails(Number(bountyId))
        setBountyDetails(details)
      }
    }
    fetchBountyDetails()
  }, [bountyId, getBountyDetails])

  const [comments, setComments] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [newLink, setNewLink] = useState("")
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
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
      // Basic URL validation
      try {
        new URL(newLink)
        setLinks((prev) => [...prev, newLink])
        setNewLink("")
      } catch (e) {
        setError("Please enter a valid URL")
      }
    }
  }

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected) {
      setError("Please connect your wallet first")
      return
    }

    if (files.length === 0 && links.length === 0) {
      setError("Please upload at least one file or add a link as proof")
      return
    }

    if (bountyDetails && bountyDetails.status === 'Completed') {
      setError("This bounty has already been completed")
      return
    }

    try {
      setUploading(true)
      setError("")

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
        title: `Proof for Bounty: ${bountyTitle}`,
        description: comments,
        submitter: address || "",
        timestamp: Date.now(),
        files: uploadedFiles,
        links: links,
      }

      // Upload metadata to Pinata
      const metadataCid = await pinataService.uploadJSON(metadata)
      console.log('Metadata uploaded to Pinata:', metadataCid)

      setUploading(false)
      setSubmitting(true)

      // Submit proof to the blockchain with the new contract structure
      await submitProof(Number(bountyId), metadataCid)

      // Reset form and show success message
      setFiles([])
      setLinks([])
      setComments("")
      setSuccess(true)
    } catch (error: unknown) {
      console.error("Error submitting proof:", error)
      setError(error instanceof Error ? error.message : "Failed to submit proof")
      setUploading(false)
      setSubmitting(false)
    } finally {
      setSubmitting(false)
    }
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
              You can submit additional proofs if needed, and the bounty creator can choose any approved submission to complete the bounty.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
              View Submission Status
            </Button>
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
                    disabled={uploading || submitting}
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
                    disabled={uploading || submitting}
                  />
                  <Button type="button" onClick={addLink} disabled={uploading || submitting || !newLink.trim()}>
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
            <Label htmlFor="comments">Description of Work</Label>
            <Textarea
              id="comments"
              placeholder="Describe how you completed the bounty requirements..."
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={uploading || submitting}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!connected || (files.length === 0 && links.length === 0) || uploading || submitting}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading to Pinata...
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

          <div className="text-xs text-muted-foreground">
            <p>By submitting, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Your work meets all the requirements specified in the bounty</li>
              <li>The proof you're submitting is your original work</li>
              <li>You understand that community members will verify your submission</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

