export interface Submission {
  id: number
  bountyId: number
  submitter: string
  ipfsProofHash: string
  timestamp: number
  approved: boolean
  approvalCount: number
  hasVoted?: boolean
  proofCID?: string
  comments?: string
  bountyTitle?: string
  description?: string
  reward?: bigint
  verifiers?: string[]
}

export interface Bounty {
  id: number
  creator: string
  title: string
  description: string
  proofRequirements: string
  reward: bigint
  rewardToken: string
  deadline: number
  completed: boolean
  winner: string
  submissionCount: number
  submissions: Submission[]
  status: number // 0: Active, 1: Completed, 2: Cancelled
  minimumApprovals: number
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
  createBounty: (title: string, description: string, reward: number, deadline: number) => Promise<void>
  submitSolution: (bountyId: number, description: string, link: string) => Promise<void>
  approveSolution: (bountyId: number, submissionId: number) => Promise<void>
  getBountyDetails: (bountyId: number) => Promise<Bounty>
  getUserReputation: (address: string) => Promise<number>
  getUserBounties: (address: string) => Promise<Bounty[]>
  getUserSubmissions: (address: string) => Promise<Submission[]>
  verifySubmission: (bountyId: number, submissionIndex: number, approve: boolean) => Promise<void>
  completeAndPayBounty: (bountyId: number, submissionIndex: number) => Promise<void>
  submitProof: (bountyId: string, proofCID: string) => Promise<void>
} 