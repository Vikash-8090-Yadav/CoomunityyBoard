import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Wand2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Star, RefreshCw } from "lucide-react"

interface Submission {
  id: number;
  bountyId: number;
  submitter: string;
  proofCID: string;
  comments?: string;
}

interface QualityCheckPanelProps {
  submission: {
    id: number;
    bountyId: number;
    submitter: string;
    proofCID: string;
    comments: string;
  };
  onQualityCheck: (score: number, feedback: string) => void;
  isSubmitter: boolean;
  bountyAmount: string;
  isApproved: boolean;
  disabled?: boolean;
}

interface QualityCheckResult {
  score: number;
  feedback: string;
  analysis: string;
  rewardSuggestion: {
    percentage: number;
    explanation: string;
  };
}

export default function QualityCheckPanel({
  submission,
  onQualityCheck,
  isSubmitter,
  bountyAmount,
  isApproved,
  disabled = false
}: QualityCheckPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    feedback: string;
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAnalyze = async () => {
    if (disabled) {
      toast({
        title: "Analysis Disabled",
        description: "Quality analysis is not available after the deadline.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submission.id,
          bountyId: submission.bountyId,
          submitter: submission.submitter,
          proofCID: submission.proofCID,
          comments: submission.comments,
          bountyAmount,
          isApproved,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze quality')
      }

      const data = await response.json()
      setAnalysisResult(data)
      onQualityCheck(data.score, data.feedback)
    } catch (err) {
      console.error('Error analyzing quality:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze quality')
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze submission quality. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Quality Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysisResult ? (
          <Button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || disabled}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : disabled ? (
              'Cannot check after the deadline'
            ) : (
              'Run Quality Check'
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Quality Score</h3>
              <p className="text-sm text-muted-foreground">{analysisResult.score}/100</p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Detailed Feedback</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {analysisResult.feedback}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 