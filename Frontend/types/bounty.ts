export interface Submission {
  id: number
  bountyId: number
  submitter: string
  ipfsProofHash: string
  timestamp: number
  approved: boolean
  approvalCount: number
  rejectCount: number
  isWinner: boolean
  rewardAmount: string
  rewardShare: number
  hasVoted?: boolean
  txHash?: string
  verifiers?: string[]
  proofCID?: string
  comments?: string[]
  payoutTxHash?: string
  bountyTitle?: string
  reward?: string | bigint
}

export interface Bounty {
  id: number
  creator: string
  title: string
  description: string
  proofRequirements: string
  reward: string | bigint
  rewardToken: string
  deadline: number
  completed: boolean
  winnerCount: number
  submissionCount: number
  submissions: Submission[]
  status: number
  winner?: string
}

// The file structure from Pinata response
export interface PinataFileResponse {
  name: string;
  cid: string;
  url: string;
}

// The metadata structure that matches the actual Pinata response
export interface ProofMetadata {
  title: string;
  description: string;
  submitter: string;
  timestamp: number;
  files: PinataFileResponse[];
  links: string[];
}

export interface BountyContextType {
  bounties: Bounty[]
  loading: boolean
  error: string | null
  createBounty: (
    title: string,
    description: string,
    proofRequirements: string,
    reward: number,
    rewardToken: string,
    deadline: number
  ) => Promise<void>
  submitProof: (bountyId: number, proofHash: string) => Promise<void>
  voteOnSubmission: (bountyId: number, submissionId: number, approve: boolean) => Promise<void>
  completeBounty: (bountyId: number) => Promise<void>
  getBountyDetails: (bountyId: number) => Promise<Bounty>
  getUserBounties: (address: string) => Promise<number[]>
  getUserSubmissions: (address: string) => Promise<number[]>
  hasVotedOnSubmission: (bountyId: number, submissionId: number, address: string) => Promise<boolean>
} 