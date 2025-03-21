"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useWallet } from "./wallet-context"
import { ethers } from "ethers"
import BountySystemABI from "@/contracts/BountySystem.json"

// Contract address would be set after deployment
const CONTRACT_ADDRESS = "0x123456789abcdef123456789abcdef123456789a" // Replace with actual contract address

interface BountyContextType {
  contract: ethers.Contract | null
  bounties: any[]
  loading: boolean
  createBounty: (
    title: string,
    description: string,
    requirements: string,
    reward: bigint,
    isNative: boolean,
    deadline: number,
    options?: any,
  ) => Promise<void>
  getBounty: (id: string) => Promise<any>
  cancelBounty: (id: string) => Promise<void>
  submitProof: (bountyId: string, proofCID: string, comments: string) => Promise<void>
  verifySubmission: (bountyId: string, submissionIndex: number, approve: boolean) => Promise<void>
  completeAndPayBounty: (bountyId: string, submissionIndex: number) => Promise<void>
  getUserBounties: (address: string) => Promise<any[]>
  getUserSubmissions: (address: string) => Promise<any[]>
  getUserReputation: (address: string) => Promise<number>
}

const BountyContext = createContext<BountyContextType>({
  contract: null,
  bounties: [],
  loading: false,
  createBounty: async () => {},
  getBounty: async () => ({}),
  cancelBounty: async () => {},
  submitProof: async () => {},
  verifySubmission: async () => {},
  completeAndPayBounty: async () => {},
  getUserBounties: async () => [],
  getUserSubmissions: async () => [],
  getUserReputation: async () => 0,
})

export function BountyProvider({ children }: { children: ReactNode }) {
  const { provider, signer, connected } = useWallet()
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [bounties, setBounties] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Initialize contract when signer is available
  useEffect(() => {
    if (provider && connected) {
      const bountyContract = new ethers.Contract(CONTRACT_ADDRESS, BountySystemABI.abi, signer || provider)
      setContract(bountyContract)

      // Load all bounties
      fetchBounties(bountyContract)
    } else {
      setContract(null)
    }
  }, [provider, signer, connected])

  const fetchBounties = async (bountyContract: ethers.Contract) => {
    try {
      setLoading(true)
      const bountyCount = await bountyContract.getBountyCount()
      const bountyPromises = []

      for (let i = 0; i < bountyCount; i++) {
        bountyPromises.push(bountyContract.getBounty(i))
      }

      const bountyResults = await Promise.all(bountyPromises)

      // Format bounty data
      const formattedBounties = bountyResults.map((bounty, index) => ({
        id: index.toString(),
        title: bounty.title,
        description: bounty.description,
        requirements: bounty.requirements,
        reward: bounty.reward,
        creator: bounty.creator,
        deadline: Number(bounty.deadline),
        status: Number(bounty.status),
        submissions: [], // We'll fetch these separately when needed
      }))

      setBounties(formattedBounties)
    } catch (error) {
      console.error("Error fetching bounties:", error)
    } finally {
      setLoading(false)
    }
  }

  const createBounty = async (
    title: string,
    description: string,
    requirements: string,
    reward: bigint,
    isNative: boolean,
    deadline: number,
    options: any = {},
  ) => {
    if (!contract || !connected) throw new Error("Not connected")

    const tx = await contract.createBounty(title, description, requirements, reward, isNative, deadline, options)

    await tx.wait()

    // Refresh bounties
    fetchBounties(contract)
  }

  const getBounty = async (id: string) => {
    if (!contract) throw new Error("Contract not initialized")

    const bounty = await contract.getBounty(id)
    const submissionCount = await contract.getSubmissionCount(id)

    // Fetch all submissions for this bounty
    const submissionPromises = []
    for (let i = 0; i < submissionCount; i++) {
      submissionPromises.push(contract.getSubmission(id, i))
    }

    const submissionResults = await Promise.all(submissionPromises)

    // Format submission data
    const submissions = submissionResults.map((submission, index) => ({
      submitter: submission.submitter,
      proofCID: submission.proofCID,
      comments: submission.comments,
      approved: submission.approved,
      approvalCount: Number(submission.approvalCount),
      verifiers: submission.verifiers,
    }))

    return {
      id,
      title: bounty.title,
      description: bounty.description,
      requirements: bounty.requirements,
      reward: bounty.reward,
      creator: bounty.creator,
      deadline: Number(bounty.deadline),
      status: Number(bounty.status),
      submissions,
    }
  }

  const cancelBounty = async (id: string) => {
    if (!contract || !connected) throw new Error("Not connected")

    const tx = await contract.cancelBounty(id)
    await tx.wait()

    // Refresh bounties
    fetchBounties(contract)
  }

  const submitProof = async (bountyId: string, proofCID: string, comments: string) => {
    if (!contract || !connected) throw new Error("Not connected")

    const tx = await contract.submitProof(bountyId, proofCID, comments)
    await tx.wait()
  }

  const verifySubmission = async (bountyId: string, submissionIndex: number, approve: boolean) => {
    if (!contract || !connected) throw new Error("Not connected")

    const tx = await contract.verifySubmission(bountyId, submissionIndex, approve)
    await tx.wait()
  }

  const completeAndPayBounty = async (bountyId: string, submissionIndex: number) => {
    if (!contract || !connected) throw new Error("Not connected")

    const tx = await contract.completeAndPayBounty(bountyId, submissionIndex)
    await tx.wait()

    // Refresh bounties
    fetchBounties(contract)
  }

  const getUserBounties = async (address: string) => {
    if (!contract) throw new Error("Contract not initialized")

    const userBountyIds = await contract.getUserBounties(address)
    const bountyPromises = userBountyIds.map((id) => contract.getBounty(id))
    const bountyResults = await Promise.all(bountyPromises)

    return bountyResults.map((bounty, index) => ({
      id: userBountyIds[index].toString(),
      title: bounty.title,
      description: bounty.description,
      requirements: bounty.requirements,
      reward: bounty.reward,
      creator: bounty.creator,
      deadline: Number(bounty.deadline),
      status: Number(bounty.status),
    }))
  }

  const getUserSubmissions = async (address: string) => {
    if (!contract) throw new Error("Contract not initialized")

    const userSubmissions = await contract.getUserSubmissions(address)

    // Format the submissions with bounty details
    const formattedSubmissions = []

    for (const submission of userSubmissions) {
      const bountyId = submission.bountyId.toString()
      const bounty = await contract.getBounty(bountyId)

      formattedSubmissions.push({
        bountyId,
        bountyTitle: bounty.title,
        reward: bounty.reward,
        proofCID: submission.proofCID,
        comments: submission.comments,
        approved: submission.approved,
        timestamp: Number(submission.timestamp),
      })
    }

    return formattedSubmissions
  }

  const getUserReputation = async (address: string) => {
    if (!contract) throw new Error("Contract not initialized")

    const reputation = await contract.getUserReputation(address)
    return Number(reputation)
  }

  return (
    <BountyContext.Provider
      value={{
        contract,
        bounties,
        loading,
        createBounty,
        getBounty,
        cancelBounty,
        submitProof,
        verifySubmission,
        completeAndPayBounty,
        getUserBounties,
        getUserSubmissions,
        getUserReputation,
      }}
    >
      {children}
    </BountyContext.Provider>
  )
}

export const useBounty = () => useContext(BountyContext)

