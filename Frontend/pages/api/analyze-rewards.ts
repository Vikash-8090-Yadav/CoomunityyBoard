import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Submission {
  proof: string;
  comments: string;
  submitter: string;
  submissionTime: string;
  qualityScore?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissions, totalReward, requirements } = req.body;

    const prompt = `Analyze these approved submissions and suggest fair reward distribution:

Total Reward: ${totalReward} tokens
Requirements: ${requirements}

Submissions:
${submissions.map((sub: Submission, index: number) => `
Submission ${index + 1}:
- Submitter: ${sub.submitter}
- Submission Time: ${sub.submissionTime}
- Comments: ${sub.comments}
- Quality Score: ${sub.qualityScore || 'Not available'}
`).join('\n')}

Please provide:
1. Fair reward distribution percentages
2. Explanation for each distribution
3. Key factors considered
4. Any special considerations

Format the response as JSON with these fields:
{
  "distributions": [
    {
      "submitter": "string",
      "percentage": "number",
      "amount": "number",
      "explanation": "string",
      "factors": ["string"]
    }
  ],
  "totalDistributed": "number",
  "summary": "string"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a fair reward distribution expert helping bounty owners distribute rewards fairly among submissions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const analysis = completion.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error('No analysis received from OpenAI');
    }

    const parsedAnalysis = JSON.parse(analysis);
    return res.status(200).json(parsedAnalysis);

  } catch (error) {
    console.error('Error analyzing rewards:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze rewards',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 