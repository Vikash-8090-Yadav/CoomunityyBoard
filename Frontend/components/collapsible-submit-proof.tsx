"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import SubmitProofForm from "./submit-proof-form"

interface CollapsibleSubmitProofProps {
  bountyId: number
  bountyTitle: string
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export default function CollapsibleSubmitProof({ 
  bountyId, 
  bountyTitle,
  isOpen,
  setIsOpen 
}: CollapsibleSubmitProofProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Submit Proof</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 p-0"
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
          <SubmitProofForm bountyId={bountyId} bountyTitle={bountyTitle} />
        </CardContent>
      )}
    </Card>
  )
}

