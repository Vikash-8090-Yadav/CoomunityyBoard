"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SubmitProofForm from "@/components/submit-proof-form"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CollapsibleSubmitProofProps {
  bountyId: string
  bountyTitle: string
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export default function CollapsibleSubmitProof({
  bountyId,
  bountyTitle,
  isOpen,
  setIsOpen,
}: CollapsibleSubmitProofProps) {
  // Ensure the component scrolls into view when opened
  useEffect(() => {
    if (isOpen) {
      const element = document.getElementById("submit-proof-form")
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      }
    }
  }, [isOpen])

  return (
    <Card className="border border-primary/10 rounded-lg bg-primary/5" id="submit-proof-form">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold flex items-center">
            <span className="inline-block w-1 h-6 bg-primary mr-3 rounded"></span>
            Submit Your Proof
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="h-8 w-8 p-0">
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
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

