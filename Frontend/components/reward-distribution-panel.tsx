import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Coins } from 'lucide-react';

interface Submission {
  proof: string;
  comments: string;
  submitter: string;
  submissionTime: string;
  qualityScore?: number;
}

interface RewardDistributionPanelProps {
  submissions: Submission[];
  totalReward: number;
  requirements: string;
  onAccept: (distributions: {
    submitter: string;
    percentage: number;
    amount: number;
    explanation: string;
    factors: string[];
  }[]) => void;
}

export default function RewardDistributionPanel({
  submissions,
  totalReward,
  requirements,
  onAccept
}: RewardDistributionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [distributions, setDistributions] = useState<{
    submitter: string;
    percentage: number;
    amount: number;
    explanation: string;
    factors: string[];
  }[] | null>(null);

  const analyzeRewards = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissions,
          totalReward,
          requirements,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze rewards');
      }

      const data = await response.json();
      setDistributions(data.distributions);
    } catch (error: unknown) {
      console.error('Error analyzing rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Reward Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!distributions ? (
          <Button
            onClick={analyzeRewards}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Rewards...
              </>
            ) : (
              'Analyze Reward Distribution'
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Suggested Distribution</h3>
              <div className="space-y-2">
                {distributions.map((dist, index) => (
                  <div key={index} className="p-4 bg-secondary rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{dist.submitter}</h4>
                        <p className="text-sm text-muted-foreground">
                          {dist.percentage}% ({dist.amount} tokens)
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{dist.explanation}</p>
                    <div className="mt-2">
                      <h5 className="text-sm font-medium">Factors Considered:</h5>
                      <ul className="list-disc pl-4 text-sm text-muted-foreground">
                        {dist.factors.map((factor, i) => (
                          <li key={i}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button
              onClick={() => onAccept(distributions)}
              className="w-full"
            >
              Apply Distribution
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 