"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, User } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { Submission } from "@/types/bounty"

interface SubmissionDetailsProps {
  bountyId: number
  submission: Submission
}

export default function SubmissionDetails({ bountyId, submission }: SubmissionDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Submitted by</p>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-primary/70" />
              <p className="font-medium">{`${submission.submitter.substring(0, 6)}...${submission.submitter.substring(submission.submitter.length - 4)}`}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Proof</p>
            <a
              href={`https://ipfs.io/ipfs/${submission.proofCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center group"
            >
              <FileText className="h-4 w-4 mr-2 group-hover:text-primary/80 transition-colors" />
              <span className="font-medium">View Proof on IPFS</span>
            </a>
          </div>
        </div>

        <Separator />

        {submission.comments && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Comments</p>
            <div className="bg-muted/20 p-3 rounded-md border border-border/50">
              <p className="whitespace-pre-line text-sm">{submission.comments}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

