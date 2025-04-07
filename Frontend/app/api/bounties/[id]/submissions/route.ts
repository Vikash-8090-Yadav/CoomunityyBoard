import { NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { communityAddress } from "@/config"
import abi from "@/abi/CommunityBountyBoard.json"

const CONFLUX_TESTNET_RPC = 'https://evmtestnet.confluxrpc.com'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = request.nextUrl
    const segments = pathname.split('/')
    const bountyId = segments[segments.indexOf('bounties') + 1]

    if (!bountyId) {
      return NextResponse.json({ error: 'Missing bounty ID in route.' }, { status: 400 })
    }

    console.log('Fetching submissions for bounty:', bountyId)

    const provider = new ethers.providers.JsonRpcProvider(CONFLUX_TESTNET_RPC)
    const network = await provider.getNetwork()
    console.log('Connected to network:', network)

    const contract = new ethers.Contract(communityAddress, abi.abi, provider)

    const submissionCount = await contract.getSubmissionCount(bountyId)
    console.log('Submission count:', submissionCount.toString())

    const submissions = []
    for (let i = 0; i < submissionCount.toNumber(); i++) {
      try {
        const submission = await contract.getSubmission(bountyId, i)
        submissions.push({
          id: i.toString(),
          submitter: submission.submitter,
          proofCID: submission.ipfsProofHash,
          status: submission.approved
            ? "approved"
            : submission.rejectCount.gt(0)
            ? "rejected"
            : "pending",
          rewardAmount: submission.rewardAmount.toString(),
          timestamp: submission.timestamp.toNumber(),
          approvalCount: submission.approvalCount.toNumber(),
          rejectCount: submission.rejectCount.toNumber(),
          isWinner: submission.isWinner,
          txHash: submission.txHash,
          payoutTxHash: submission.payoutTxHash,
        })
      } catch (submissionError) {
        console.error(`Error fetching submission ${i}:`, submissionError)
        continue
      }
    }

    return NextResponse.json(submissions)
  } catch (error) {
    console.error('Detailed error in submissions API:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch submissions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
