import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2 } from 'lucide-react';

interface BountyAISuggestionsProps {
  title: string;
  description: string;
  requirements: string;
  rewardAmount: string;
  deadline: string;
  onAccept: (suggestions: {
    improvedDescription: string;
    improvedRequirements: string[];
    suggestedReward: { amount: number };
    suggestedDeadline: { date: string };
  }) => void;
}

interface AISuggestions {
  improvedDescription: string;
  improvedRequirements: string[];
  suggestedReward: { amount: number };
  suggestedDeadline: { date: string };
}

export default function BountyAISuggestions({ 
  title, 
  description, 
  requirements, 
  rewardAmount, 
  deadline,
  onAccept 
}: BountyAISuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);

  const getSuggestions = async () => {
    setLoading(true);
    try {
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
          deadline
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (error: unknown) {
      console.error('Error getting suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestions ? (
          <Button
            onClick={getSuggestions}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting Suggestions...
              </>
            ) : (
              'Get AI Suggestions'
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Suggested Description</h3>
              <p className="text-sm text-muted-foreground">{suggestions.improvedDescription}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Suggested Requirements</h3>
              <ul className="list-disc pl-4 text-sm text-muted-foreground">
                {suggestions.improvedRequirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Suggested Reward</h3>
              <p className="text-sm text-muted-foreground">{suggestions.suggestedReward.amount} ETH</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Suggested Deadline</h3>
              <p className="text-sm text-muted-foreground">{suggestions.suggestedDeadline.date}</p>
            </div>
            <Button
              onClick={() => onAccept(suggestions)}
              className="w-full"
            >
              Apply Suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 