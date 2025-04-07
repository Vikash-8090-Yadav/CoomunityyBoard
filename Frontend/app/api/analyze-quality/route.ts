import { NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface QualityCheckRequest {
  submissionId: string
  bountyId: string
  ipfsHash: string
  comments?: string
  bountyAmount: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: QualityCheckRequest = await request.json()
    const { submissionId, bountyId, ipfsHash, comments, bountyAmount } = body

    console.log('Analyzing quality for submission:', {
      submissionId,
      bountyId,
      ipfsHash
    })

    // Create a prompt for quality analysis
    const prompt = `
      Analyze this bounty submission for quality and completeness:
      
      IPFS Link: ${ipfsHash}
      Comments: ${comments || 'No comments provided'}
      Bounty Amount: ${bountyAmount}
      
      Please evaluate based on:
      1. Completeness of the explanation in comments
      2. Clarity of the submission description
      3. Technical accuracy of the described solution
      4. Relevance to bounty requirements
      5. Code quality description (if applicable)
      6. IPFS Link Analysis:
         - Does the IPFS link follow the correct format?
         - Is the link properly documented in the comments?
         - Does the comment explain what the link contains?
      
      Note: While I cannot access the actual IPFS content, I can evaluate:
      - The quality of the submission description
      - The clarity of the explanation
      - The completeness of the documentation
      - The relevance to the requirements
      
      Provide:
      1. A score from 0-100
      2. Detailed feedback in bullet points
      3. A reward suggestion as a percentage of the total bounty amount (0-100%)
         - Explain why this percentage is recommended
         - Consider the quality score and completeness
         - Higher scores should get higher percentages
         - Lower scores should get lower percentages
         - Be fair and consistent in your recommendations
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert code reviewer and bounty submission evaluator. Focus on evaluating the quality of the submission description and documentation, as you cannot access the actual IPFS content. Provide fair and consistent reward suggestions based on the quality score."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const analysis = completion.choices[0]?.message?.content || ''
    
    // Parse the AI response to extract score and feedback
    const scoreMatch = analysis.match(/score:?\s*(\d+)/i)
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0
    
    // Extract reward suggestion
    const rewardMatch = analysis.match(/reward:?\s*(\d+)%/i)
    const rewardPercentage = rewardMatch ? parseInt(rewardMatch[1]) : 0
    
    // Extract reward explanation
    const rewardExplanation = analysis.match(/reward explanation:?\s*([^]*?)(?=\n\n|$)/i)?.[1]?.trim() || 
                             'No specific reward explanation provided.'
    
    // Extract detailed feedback
    const feedback = analysis.replace(/score:?\s*\d+.*?reward:?\s*\d+%.*?reward explanation:?\s*[^]*?(?=\n\n|$)/i, '').trim()

    return NextResponse.json({
      score,
      feedback,
      analysis,
      rewardSuggestion: {
        percentage: rewardPercentage,
        explanation: rewardExplanation
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error analyzing quality:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze quality',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 