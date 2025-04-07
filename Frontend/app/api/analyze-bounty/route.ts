import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalyzeBountyRequest {
  title: string;
  description: string;
  requirements: string;
  rewardAmount: string;
  deadline: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AnalyzeBountyRequest;
    const { title, description, requirements, rewardAmount, deadline } = body;

    // Get current date and add 30 days for a reasonable default deadline
    const currentDate = new Date();
    const defaultDeadline = new Date(currentDate);
    defaultDeadline.setDate(currentDate.getDate() + 30);

    const prompt = `You are a bounty creation assistant. Analyze the following bounty details and provide suggestions:

Title: ${title}
Description: ${description}
Requirements: ${requirements}
Reward Amount: ${rewardAmount} ETH
Current Deadline: ${deadline}

Please provide:
1. An improved description that is more detailed and engaging
2. A list of clear, specific requirements
3. A suggested reward amount based on the complexity of the task
4. A suggested deadline that is reasonable for the task complexity

Current date is ${currentDate.toISOString().split('T')[0]}. Please suggest a deadline that is in the future relative to this date.

Format your response as a JSON object with the following structure:
{
  "improvedDescription": "string",
  "improvedRequirements": ["string"],
  "suggestedReward": { "amount": number },
  "suggestedDeadline": { "date": "YYYY-MM-DD" }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a bounty creation assistant. Provide clear, actionable suggestions for improving bounty details."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    // Parse the response and ensure the date is valid
    const suggestions = JSON.parse(response);
    
    // Validate and adjust the suggested deadline if needed
    const suggestedDate = new Date(suggestions.suggestedDeadline.date);
    if (suggestedDate <= currentDate) {
      // If the suggested date is in the past, use the default deadline
      suggestions.suggestedDeadline.date = defaultDeadline.toISOString().split('T')[0];
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error analyzing bounty:', error);
    return NextResponse.json(
      { error: 'Failed to analyze bounty' },
      { status: 500 }
    );
  }
} 