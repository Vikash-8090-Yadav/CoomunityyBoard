import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Loader2, Check, X, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface BountyAISuggestionsProps {
  title: string;
  description: string;
  requirements: string;
  rewardAmount: string;
  deadline: string;
  onAccept: (suggestions: any) => void;
}

export function BountyAISuggestions({
  title,
  description,
  requirements,
  rewardAmount,
  deadline,
  onAccept
}: BountyAISuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const analyzeBounty = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analyze-bounty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          requirements,
          rewardAmount,
          deadline,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze bounty');
      }

      const data = await response.json();
      setSuggestions(data);
      toast.success('AI analysis completed!');
    } catch (error) {
      console.error('Error analyzing bounty:', error);
      toast.error('Failed to analyze bounty. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestions) {
      onAccept(suggestions);
      toast.success('AI suggestions applied!');
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Bounty Enhancement</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={analyzeBounty}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Get AI Suggestions
            </>
          )}
        </Button>
      </div>

      {suggestions && (
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
              Apply Suggestions
            </Button>
          </div>

          {showDetails && (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium">Improved Description</h4>
                <p className="text-muted-foreground">{suggestions.improvedDescription}</p>
              </div>

              <div>
                <h4 className="font-medium">Improved Requirements</h4>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {suggestions.improvedRequirements.map((req: string, index: number) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Suggested Reward</h4>
                <p className="text-muted-foreground">
                  {suggestions.suggestedReward.amount} tokens
                  <br />
                  <span className="text-xs">{suggestions.suggestedReward.explanation}</span>
                </p>
              </div>

              <div>
                <h4 className="font-medium">Suggested Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.suggestedTags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium">Suggested Deadline</h4>
                <p className="text-muted-foreground">
                  {suggestions.suggestedDeadline.date}
                  <br />
                  <span className="text-xs">{suggestions.suggestedDeadline.explanation}</span>
                </p>
              </div>

              {suggestions.missingInfo.length > 0 && (
                <div>
                  <h4 className="font-medium text-destructive">Missing Information</h4>
                  <ul className="list-disc pl-4 text-muted-foreground">
                    {suggestions.missingInfo.map((info: string, index: number) => (
                      <li key={index}>{info}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
} 