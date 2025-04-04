import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Info, Lock, Coins, Wand2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface QualityCheckPanelProps {
  submission: {
    proof: string;
    comments: string;
    requirements: string;
  };
  onQualityCheck?: (score: number, feedback: string) => void;
  userRole: 'owner' | 'submitter' | 'viewer';
  isApproved: boolean;
  isSubmitter?: boolean;
  bountyAmount?: number;
}

export default function QualityCheckPanel({ 
  submission, 
  onQualityCheck, 
  userRole,
  isApproved,
  isSubmitter = false,
  bountyAmount = 0
}: QualityCheckPanelProps) {
  const [loading, setLoading] = useState(false);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [rewardSuggestion, setRewardSuggestion] = useState<{
    percentage: number;
    explanation: string;
  } | null>(null);

  const checkQuality = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/check-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        throw new Error('Failed to check quality');
      }

      const data = await response.json();
      setQualityScore(data.score);
      setFeedback(data.feedback);
      setRewardSuggestion(data.rewardSuggestion || null);
      
      if (onQualityCheck) {
        onQualityCheck(data.score, data.feedback);
      }

      toast({
        title: "Quality Check Complete",
        description: `Score: ${data.score}/100`,
        variant: data.score >= 70 ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform quality check",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            AI Quality Check
          </span>
          {qualityScore !== null && (
            <span className={`text-lg font-bold ${getScoreColor(qualityScore)}`}>
              {qualityScore}/100
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {qualityScore === null ? (
            <Button
              onClick={checkQuality}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Check Quality
                </>
              )}
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {qualityScore >= 70 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <p className="text-sm">
                  {qualityScore >= 70
                    ? "This submission meets quality standards"
                    : "This submission may need improvement"}
                </p>
              </div>
              
              {userRole === 'owner' && rewardSuggestion && (
                <div className="mt-2 p-3 bg-muted/30 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">AI Reward Suggestion</span>
                  </div>
                  <div className="text-sm">
                    <p className="mb-1">
                      Suggested Reward: {rewardSuggestion.percentage}% of bounty amount
                      {bountyAmount > 0 && ` (${(bountyAmount * rewardSuggestion.percentage / 100).toFixed(2)} tokens)`}
                    </p>
                    <p className="text-muted-foreground">{rewardSuggestion.explanation}</p>
                  </div>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>

              {showDetails && (
                <div className="mt-4 p-4 bg-muted/50 rounded-md">
                  <h4 className="font-medium mb-2">AI Feedback:</h4>
                  <p className="text-sm whitespace-pre-line">{feedback}</p>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 