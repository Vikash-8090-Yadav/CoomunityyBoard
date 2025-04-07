import { NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { communityAddress } from "@/config"
import abi from "@/abi/CommunityBountyBoard.json"

// Conflux EVM testnet configuration
const CONFLUX_TESTNET_RPC = 'https://evmtestnet.confluxrpc.com'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const bountyId = params.id
    console.log('Fetching submissions for bounty:', bountyId)

    // Create a static provider for Conflux EVM testnet
    console.log('Creating provider with RPC:', CONFLUX_TESTNET_RPC)
    const provider = new ethers.providers.JsonRpcProvider(CONFLUX_TESTNET_RPC)
    
    // Get network info to verify connection
    const network = await provider.getNetwork()
    console.log('Connected to network:', network)
    
    console.log('Creating contract instance with address:', communityAddress)
    const contract = new ethers.Contract(communityAddress, abi.abi, provider)

    // Get submission count
    console.log('Fetching submission count for bounty:', bountyId)
    const submissionCount = await contract.getSubmissionCount(bountyId)
    console.log('Submission count:', submissionCount.toString())
    
    // Fetch all submissions
    const submissions = []
    for (let i = 0; i < submissionCount.toNumber(); i++) {
      console.log('Fetching submission:', i)
      try {
        const submission = await contract.getSubmission(bountyId, i)
        submissions.push({
          id: i.toString(),
          submitter: submission.submitter,
          proofCID: submission.ipfsProofHash,
          status: submission.approved ? "approved" : submission.rejectCount.gt(0) ? "rejected" : "pending",
          rewardAmount: submission.rewardAmount.toString(),
          timestamp: submission.timestamp.toNumber(),
          approvalCount: submission.approvalCount.toNumber(),
          rejectCount: submission.rejectCount.toNumber(),
          isWinner: submission.isWinner,
          txHash: submission.txHash,
          payoutTxHash: submission.payoutTxHash
        })
      } catch (submissionError) {
        console.error(`Error fetching submission ${i}:`, submissionError)
        // Continue with next submission instead of failing the entire request
        continue
      }
    }

    console.log('Successfully fetched submissions:', submissions.length)
    return NextResponse.json(submissions)
  } catch (error) {
    console.error('Detailed error in submissions API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch submissions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 