import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, description, requirements, rewardAmount, deadline } = req.body;

    const prompt = `Analyze this bounty description and provide improvements:

Title: ${title}
Description: ${description}
Requirements: ${requirements}
Reward Amount: ${rewardAmount}
Deadline: ${deadline}

Please provide:
1. A clearer and more detailed description
2. More specific requirements
3. Suggested reward amount with explanation
4. Appropriate tags/categories
5. Suggested deadline with reasoning
6. Any missing information that should be included

Format the response as JSON with these fields:
{
  "improvedDescription": "string",
  "improvedRequirements": "string[]",
  "suggestedReward": {
    "amount": "number",
    "explanation": "string"
  },
  "suggestedTags": "string[]",
  "suggestedDeadline": {
    "date": "string",
    "explanation": "string"
  },
  "missingInfo": "string[]"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a bounty platform expert helping users create better bounties."
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
    console.error('Error analyzing bounty:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze bounty',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 