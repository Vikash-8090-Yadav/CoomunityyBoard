import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Loader2, Coins, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  proof: string;
  comments: string;
  submitter: string;
  submissionTime: string;
  qualityScore?: number;
}

interface Distribution {
  submitter: string;
  percentage: number;
  amount: number;
  explanation: string;
  factors: string[];
}

interface RewardDistributionPanelProps {
  submissions: Submission[];
  totalReward: number;
  requirements: string;
  onAccept: (distributions: Distribution[]) => void;
}

export function RewardDistributionPanel({
  submissions,
  totalReward,
  requirements,
  onAccept
}: RewardDistributionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [distributions, setDistributions] = useState<Distribution[] | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const analyzeRewards = async () => {
    try {
      setLoading(true);
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
      toast.success('Reward analysis completed!');
    } catch (error) {
      console.error('Error analyzing rewards:', error);
      toast.error('Failed to analyze rewards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (distributions) {
      onAccept(distributions);
      toast.success('Reward distribution applied!');
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Reward Distribution</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={analyzeRewards}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Coins className="mr-2 h-4 w-4" />
              Get Distribution Suggestions
            </>
          )}
        </Button>
      </div>

      {distributions && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleAccept}
            >
              <Check className="mr-2 h-4 w-4" />
              Apply Distribution
            </Button>
          </div>

          {showDetails && (
            <div className="space-y-4">
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
          )}
        </div>
      )}
    </Card>
  );
} 