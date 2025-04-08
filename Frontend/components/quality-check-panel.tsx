import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Wand2, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { useBounty } from "@/context/bounty-context"

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
  bountyAmount,
  isApproved,
  disabled = false
}: {
  submission: {
    id: number;
    bountyId: number;
    submitter: string;
    proofCID: string;
    comments: string;
  };
  onQualityCheck: (score: number, feedback: string) => void;
  bountyAmount: string;
  isApproved: boolean;
  disabled?: boolean;
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<QualityCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { } = useWallet()
  const { } = useBounty()

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

  const renderStars = (score: number) => {
    const stars = []
    const filledStars = Math.floor(score / 20)
    const hasHalfStar = score % 20 >= 10

    for (let i = 0; i < 5; i++) {
      if (i < filledStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
      } else if (i === filledStars && hasHalfStar) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />)
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-muted-foreground" />)
      }
    }
    return stars
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Quality Check
        </CardTitle>
        {analysisResult && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAnalyze}
            disabled={isAnalyzing || disabled}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
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
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Quality Score</h3>
              <Badge variant={analysisResult.score >= 70 ? "success" : analysisResult.score >= 40 ? "warning" : "destructive"}>
                {analysisResult.score}/100
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              {renderStars(analysisResult.score)}
            </div>

            <div>
              <h3 className="font-medium mb-2">Detailed Feedback</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {analysisResult.feedback}
              </p>
            </div>

            {analysisResult.rewardSuggestion && (
              <div>
                <h3 className="font-medium mb-2">Reward Suggestion</h3>
                <p className="text-sm text-muted-foreground">
                  {analysisResult.rewardSuggestion.percentage}% of bounty amount
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analysisResult.rewardSuggestion.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}