"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers, providers } from 'ethers';
import abi from "@/abi/CommunityBountyBoard.json";
import { communityAddress } from '@/config';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Export interfaces
export interface Submission {
  id: number;
  bountyId: number;
  submitter: string;
  ipfsProofHash: string;
  timestamp: number;
  approved: boolean;
  approvalCount: number;
  rejectCount: number;
  isWinner: boolean;
  rewardShare: number;
  hasVoted?: boolean;
  proofCID?: string;
  comments?: string[];
  txHash: string;
  payoutTxHash?: string;
  rewardAmount: string;
}

export interface Bounty {
  id: number;
  creator: string;
  title: string;
  description: string;
  proofRequirements: string;
  reward: bigint;
  rewardToken: string;
  deadline: number;
  completed: boolean;
  winnerCount: number;
  submissionCount: number;
  submissions: Submission[];
  status: number;
  rewardAmount: string | bigint;
}

interface ContractSubmission {
  submitter: string;
  ipfsProofHash: string;
  timestamp: bigint;
  approved: boolean;
  approvalCount: bigint;
}

interface ContractBountyDetails {
  creator: string;
  title: string;
  description: string;
  proofRequirements: string;
  reward: bigint;
  rewardToken: string;
  deadline: bigint;
  completed: boolean;
  winner: string;
  status: number;
  minimumApprovals: number;
}

interface BountyContextType {
  bounties: Bounty[];
  loading: boolean;
  error: string | null;
  account: string | null;
  connectWallet: () => Promise<void>;
  createBounty: (title: string, description: string, proofRequirements: string, reward: number, rewardToken: string, deadline: number) => Promise<void>;
  submitProof: (bountyId: number, proofHash: string) => Promise<ethers.ContractTransaction>;
  verifySubmission: (bountyId: number, submissionId: number, approve: boolean) => Promise<void>;
  completeAndPayBounty: (bountyId: number, submissionId: number) => Promise<void>;
  getBountyDetails: (bountyId: number) => Promise<Bounty>;
  getUserBounties: (address: string) => Promise<number[]>;
  getUserSubmissions: (address: string) => Promise<number[]>;
  voteOnSubmission: (bountyId: number, submissionId: number, approve: boolean) => Promise<ethers.ContractTransaction>;
  completeBounty: (bountyId: number) => Promise<ethers.ContractTransaction>;
  hasVotedOnSubmission: (bountyId: number, submissionId: number, userAddress: string) => Promise<boolean>;
  getUserReputation: (address: string) => Promise<number>;
  setReward: (bountyId: number, rewardAmount: string) => Promise<ethers.ContractTransaction>;
  setSubmissionReward: (bountyId: number, submissionId: number, rewardAmount: string) => Promise<ethers.ContractTransaction>;
}

const BountyContext = createContext<BountyContextType | undefined>(undefined);

const isBrowser = typeof window !== 'undefined';

export function BountyProvider({ children }: { children: React.ReactNode }) {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<providers.JsonRpcSigner | null>(null);

  // Initialize provider
  useEffect(() => {
    console.log('BountyProvider: Initializing provider...'); // Debug log
    if (isBrowser && window.ethereum) {
      const web3Provider = new providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      console.log('BountyProvider: Provider set'); // Debug log
    }
  }, []);

  // Handle account and signer setup
  useEffect(() => {
    if (!provider) return;

    const setupAccount = async () => {
      try {
        console.log('BountyProvider: Setting up account...'); // Debug log
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          const newSigner = provider.getSigner();
          setSigner(newSigner);
          const address = await newSigner.getAddress();
          setAccount(address);
          console.log('BountyProvider: Account set:', address); // Debug log
        }
      } catch (err) {
        console.error("Error setting up account:", err);
      }
    };

    setupAccount();

    // Listen for account changes
    window.ethereum.on('accountsChanged', async (accounts: string[]) => {
      console.log('BountyProvider: Account changed:', accounts[0]); // Debug log
      if (accounts.length > 0) {
        const newSigner = provider.getSigner();
        setSigner(newSigner);
        setAccount(accounts[0]);
    } else {
        setSigner(null);
        setAccount(null);
      }
    });

    // Listen for chain changes
    window.ethereum.on('chainChanged', () => {
      console.log('BountyProvider: Chain changed, reloading...'); // Debug log
      window.location.reload();
    });

    return () => {
      window.ethereum.removeListener('accountsChanged', () => {});
      window.ethereum.removeListener('chainChanged', () => {});
    };
  }, [provider]);

  // Fetch bounties when provider and account are ready
  useEffect(() => {
    if (provider && account) {
      console.log('BountyProvider: Provider and account ready, fetching bounties...'); // Debug log
      fetchAllBounties().catch(console.error);
    }
  }, [provider, account]);

  const connectWallet = async () => {
    if (!provider) throw new Error("Please install MetaMask");
    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        const newSigner = provider.getSigner();
        setSigner(newSigner);
        const address = await newSigner.getAddress();
        setAccount(address);
      }
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message);
    }
  };

  const getReadOnlyContract = () => {
    if (!provider) throw new Error("Provider not initialized");
    return new ethers.Contract(communityAddress, abi.abi, provider);
  };

  const getSignedContract = () => {
    if (!signer) throw new Error("Please connect your wallet");
    return new ethers.Contract(communityAddress, abi.abi, signer);
  };

  // Create new bounty
  const createBounty = async (
    title: string,
    description: string,
    proofRequirements: string,
    reward: number,
    rewardToken: string,
    deadline: number
  ) => {
    if (!signer) throw new Error("Please connect your wallet");

    try {
      setLoading(true);
      setError(null);

      const contract = getSignedContract();
      const value = ethers.utils.parseEther(reward.toString());

      const tx = await contract.createBounty(
        title,
        description,
        proofRequirements,
        value,
        rewardToken || ethers.constants.AddressZero,
        BigInt(deadline),
        { value: rewardToken === ethers.constants.AddressZero ? value : 0 }
      );

      await tx.wait();
      await fetchAllBounties();
    } catch (err: any) {
      console.error("Error creating bounty:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch all bounties
  const fetchAllBounties = async () => {
    if (!provider) {
      console.log('fetchAllBounties: No provider available'); // Debug log
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const contract = getReadOnlyContract();
      
      console.log('fetchAllBounties: Getting bounty count...'); // Debug log
      const totalBounties = await contract.bountyCount();
      console.log('fetchAllBounties: Total bounties:', totalBounties.toString());
      
      const fetchedBounties: Bounty[] = [];
      
      // Iterate through all bounties
      for (let i = 0; i < totalBounties.toNumber(); i++) {
        try {
          console.log(`fetchAllBounties: Fetching bounty ${i}...`); // Debug log
          const bounty = await getBountyDetails(i);
          console.log('fetchAllBounties: Fetched bounty:', bounty);
          fetchedBounties.push(bounty);
        } catch (err: any) {
          console.error(`fetchAllBounties: Error fetching bounty ${i}:`, err);
        }
      }

      console.log('fetchAllBounties: Setting bounties:', fetchedBounties);
      setBounties(fetchedBounties);
    } catch (err: any) {
      console.error("fetchAllBounties: Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit proof for a bounty
  const submitProof = async (bountyId: number, proofHash: string) => {
    if (!signer) throw new Error("Please connect your wallet");

    try {
      setLoading(true);
      setError(null);

      const contract = getSignedContract();
      const userAddress = await signer.getAddress();
      console.log("Submitting proof for bounty:", bountyId);
      console.log("User address:", userAddress);
      
      // Check if bounty exists and is active
      const bounty = await contract.bounties(bountyId);
      console.log("Bounty details:", bounty);
      
      if (!bounty) {
        throw new Error("Bounty does not exist");
      }

      if (bounty.completed) {
        throw new Error("Bounty is already completed");
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > bounty.deadline.toNumber()) {
        throw new Error("Bounty deadline has passed");
      }

      // Check if user has already submitted
      const hasSubmitted = await contract.hasSubmitted(bountyId, userAddress);
      if (hasSubmitted) {
        throw new Error("You have already submitted a proof for this bounty");
      }

      // Submit the proof and return the transaction
      const tx = await contract.submitProof(bountyId, proofHash);
      console.log("Transaction sent:", tx.hash);
      return tx;
    } catch (error: any) {
      console.error('Error submitting proof:', error);
      if (error.message?.includes('Already submitted a proof')) {
        throw new Error('You have already submitted a proof for this bounty');
      } else if (error.message?.includes('Bounty deadline has passed')) {
        throw new Error('The bounty deadline has passed');
      } else if (error.message?.includes('Bounty already completed')) {
        throw new Error('This bounty has already been completed');
      } else if (error.message?.includes('Invalid proof hash length')) {
        throw new Error('Invalid proof hash format');
      } else {
        throw new Error('Failed to submit proof. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify submission
  const verifySubmission = async (bountyId: number, submissionId: number, approve: boolean) => {
    if (!signer) throw new Error("Please connect your wallet");

    try {
      setLoading(true);
      setError(null);

      const contract = getSignedContract();
      const tx = await contract.approveSubmission(bountyId, submissionId, approve);
      await tx.wait();
      await fetchAllBounties();
    } catch (err: any) {
      console.error("Error verifying submission:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Complete and pay bounty
  const completeAndPayBounty = async (bountyId: number, submissionId: number) => {
    if (!signer) throw new Error("Please connect your wallet");

    try {
      setLoading(true);
      setError(null);

      const contract = getSignedContract();
      const tx = await contract.completeBounty(bountyId, submissionId);
      await tx.wait();
      await fetchAllBounties();
    } catch (err: any) {
      console.error("Error completing bounty:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get bounty details
  const getBountyDetails = useCallback(async (bountyId: number): Promise<Bounty> => {
    const contract = getReadOnlyContract();

    try {
      console.log('Fetching bounty details for ID:', bountyId);
      
      const details = await contract.bounties(bountyId);
      console.log('Raw bounty details:', details);

      // Get submissions
      const submissions: Submission[] = [];
      const submissionCount = details.submissionCount.toNumber();
      
      for (let i = 0; i < submissionCount; i++) {
        const [
          submitter,
          ipfsProofHash,
          timestamp,
          approved,
          approvalCount,
          rejectCount,
          isWinner,
          rewardShare,
          txHash,
          payoutTxHash
        ] = await contract.getSubmission(bountyId, i);

        const hasVoted = account ? await contract.hasVotedOnSubmission(bountyId, i, account) : false;

        submissions.push({
          id: i,
          bountyId,
          submitter,
          ipfsProofHash,
          timestamp: Number(timestamp),
          approved,
          approvalCount: Number(approvalCount),
          rejectCount: Number(rejectCount),
          isWinner,
          rewardShare: Number(rewardShare),
          hasVoted,
          txHash,
          payoutTxHash,
          rewardAmount: details.rewardAmount ? details.rewardAmount.toString() : "0",
          comments: details.comments ? [details.comments] : undefined
        });
      }

      return {
        id: details.id,
        creator: details.creator,
        title: details.title,
        description: details.description,
        proofRequirements: details.proofRequirements,
        reward: details.reward,
        rewardToken: details.rewardToken,
        deadline: details.deadline.toNumber(),
        completed: details.completed,
        winnerCount: details.winnerCount.toNumber(),
        submissionCount,
        submissions,
        status: details.completed ? 1 : 0,
        rewardAmount: details.rewardAmount
      };
    } catch (err: any) {
      console.error(`Error fetching bounty ${bountyId}:`, err);
      throw err;
    }
  }, [account]);

  // Get user's bounties
  const getUserBounties = async (userAddress: string): Promise<number[]> => {
    const contract = getReadOnlyContract();
    const bounties = await contract.getUserBounties(userAddress) as bigint[];
    return bounties.map(Number);
  };

  // Get user's submissions
  const getUserSubmissions = async (userAddress: string): Promise<number[]> => {
    const contract = getReadOnlyContract();
    const submissions = await contract.getUserSubmissions(userAddress) as bigint[];
    return submissions.map(Number);
  };

  // Vote on submission
  const voteOnSubmission = async (bountyId: number, submissionId: number, approve: boolean) => {
    if (!signer) throw new Error("Please connect your wallet");
    
    try {
      const contract = getSignedContract();
      const tx = await contract.voteOnSubmission(bountyId, submissionId, approve);
      return tx;
    } catch (err: any) {
      console.error("Error voting on submission:", err);
      throw new Error(err.message || "Failed to vote on submission");
    }
  };

  // Complete bounty
  const completeBounty = async (bountyId: number) => {
    if (!signer) throw new Error("Please connect your wallet");

    try {
      setLoading(true);
      setError(null);

      const contract = getSignedContract();
      const tx = await contract.completeBounty(bountyId);
      await tx.wait();
      await fetchAllBounties();
      return tx;
    } catch (err: any) {
      console.error("Error completing bounty:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if user has voted on submission
  const hasVotedOnSubmission = async (bountyId: number, submissionId: number, userAddress: string): Promise<boolean> => {
    const contract = getReadOnlyContract();
    return contract.hasVotedOnSubmission(bountyId, submissionId, userAddress);
  };

  // Get user's reputation
  const getUserReputation = async (address: string): Promise<number> => {
    const contract = getReadOnlyContract();
    try {
      const reputation = await contract.userReputation(address);
      return Number(reputation);
    } catch (err: any) {
      console.error("Error fetching user reputation:", err);
      throw err;
    }
  };

  const setReward = async (bountyId: number, rewardAmount: string) => {
    if (!signer) throw new Error("Please connect your wallet");
    try {
      const contract = getSignedContract();
      const tx = await contract.setReward(bountyId, rewardAmount);
      return tx;
    } catch (error) {
      console.error("Error setting reward:", error);
      throw error;
    }
  };

  const setSubmissionReward = async (bountyId: number, submissionId: number, rewardAmount: string) => {
    if (!signer) throw new Error("Please connect your wallet");
    try {
      const contract = getSignedContract();
      const tx = await contract.setSubmissionReward(bountyId, submissionId, rewardAmount);
      return tx;
    } catch (error) {
      console.error("Error setting submission reward:", error);
      throw error;
    }
  };

  return (
    <BountyContext.Provider
      value={{
        bounties,
        loading,
        error,
        account,
        connectWallet,
        createBounty,
        submitProof,
        verifySubmission,
        completeAndPayBounty,
        getBountyDetails,
        getUserBounties,
        getUserSubmissions,
        voteOnSubmission,
        completeBounty,
        hasVotedOnSubmission,
        getUserReputation,
        setReward,
        setSubmissionReward,
      }}
    >
      {children}
    </BountyContext.Provider>
  );
}

export function useBounty() {
  const context = useContext(BountyContext);
  if (context === undefined) {
    throw new Error("useBounty must be used within a BountyProvider");
  }
  return context;
}

