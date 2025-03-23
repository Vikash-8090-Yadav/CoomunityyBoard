"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  hasVoted?: boolean;
  proofCID?: string;
  comments?: string;
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
  winner: string;
  submissionCount: number;
  submissions: Submission[];
  status: number;
  minimumApprovals: number;
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
  createBounty: (title: string, description: string, proofRequirements: string, reward: number, deadline: number) => Promise<void>;
  submitProof: (bountyId: number, proofHash: string) => Promise<void>;
  verifySubmission: (bountyId: number, submissionId: number) => Promise<void>;
  completeAndPayBounty: (bountyId: number, submissionId: number) => Promise<void>;
  getBountyDetails: (bountyId: number) => Promise<Bounty>;
  getUserBounties: (address: string) => Promise<number[]>;
  getUserSubmissions: (address: string) => Promise<number[]>;
  voteOnSubmission: (bountyId: number, submissionId: number) => Promise<void>;
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
        ethers.constants.AddressZero,
        BigInt(deadline),
        { value }
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
      const tx = await contract.submitProof(bountyId, proofHash);
      await tx.wait();
      await fetchAllBounties();
    } catch (err: any) {
      console.error("Error submitting proof:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify submission
  const verifySubmission = async (bountyId: number, submissionId: number) => {
    if (!signer) throw new Error("Please connect your wallet");

    try {
      setLoading(true);
      setError(null);

      const contract = getSignedContract();
      const tx = await contract.verifySubmission(bountyId, submissionId);
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
  const getBountyDetails = async (bountyId: number): Promise<Bounty> => {
    const contract = getReadOnlyContract();

    try {
      console.log('Fetching bounty details for ID:', bountyId);
      
      // Get bounty details
      const details = await contract.getBountyDetails(bountyId);
      console.log('Raw bounty details:', details);

      // Destructure the response, handling both array and object formats
      let creator, title, description, proofRequirements, reward, rewardToken, 
          deadline, completed, winner, submissionCount, status, minimumApprovals;

      if (Array.isArray(details)) {
        [
          creator,
          title,
          description,
          proofRequirements,
          reward,
          rewardToken,
          deadline,
          completed,
          winner,
          submissionCount,
          status,
          minimumApprovals
        ] = details;
      } else {
        // Handle object format if contract returns named properties
        ({
          creator,
          title,
          description,
          proofRequirements,
          reward,
          rewardToken,
          deadline,
          completed,
          winner,
          submissionCount,
          status = 0, // Default to 0 (Active) if not provided
          minimumApprovals = 3 // Default to 3 if not provided
        } = details);
      }
      
      // Get submissions
      const submissions: Submission[] = [];
      const submissionCountNum = submissionCount ? submissionCount.toNumber() : 0;
      
      for (let i = 0; i < submissionCountNum; i++) {
        const submission = await contract.getSubmission(bountyId, i);
        console.log(`Raw submission ${i}:`, submission);

        let submitter, ipfsProofHash, timestamp, approved, approvalCount;

        if (Array.isArray(submission)) {
          [submitter, ipfsProofHash, timestamp, approved, approvalCount] = submission;
        } else {
          ({
            submitter,
            ipfsProofHash,
            timestamp,
            approved,
            approvalCount
          } = submission);
        }

        let hasVoted = false;
        if (account) {
          hasVoted = await contract.hasVotedOnSubmission(bountyId, i, account);
        }

        submissions.push({
          id: i,
          bountyId,
          submitter,
          ipfsProofHash,
          timestamp: timestamp ? timestamp.toNumber() : Math.floor(Date.now() / 1000),
          approved: approved || false,
          approvalCount: approvalCount ? approvalCount.toNumber() : 0,
          hasVoted
        });
      }

      const bounty = {
        id: bountyId,
        creator: creator || ethers.constants.AddressZero,
        title: title || "",
        description: description || "",
        proofRequirements: proofRequirements || "",
        reward: reward || BigInt(0),
        rewardToken: rewardToken || ethers.constants.AddressZero,
        deadline: deadline ? deadline.toNumber() : Math.floor(Date.now() / 1000),
        completed: completed || false,
        winner: winner || ethers.constants.AddressZero,
        submissionCount: submissionCountNum,
        submissions,
        status: status ? (typeof status === 'number' ? status : status.toNumber()) : 0,
        minimumApprovals: minimumApprovals ? (typeof minimumApprovals === 'number' ? minimumApprovals : minimumApprovals.toNumber()) : 3
      };

      console.log('Processed bounty:', bounty);
      return bounty;
    } catch (err: any) {
      console.error(`Error fetching bounty ${bountyId}:`, err);
      throw err;
    }
  };

  // Get user's bounties
  const getUserBounties = async (userAddress: string): Promise<number[]> => {
    const contract = getReadOnlyContract();
    const bounties = await contract.getUserBounties([userAddress]) as bigint[];
    return bounties.map(Number);
  };

  // Get user's submissions
  const getUserSubmissions = async (userAddress: string): Promise<number[]> => {
    const contract = getReadOnlyContract();
    const submissions = await contract.getUserSubmissions([userAddress]) as bigint[];
    return submissions.map(Number);
  };

  // Vote on submission
  const voteOnSubmission = async (bountyId: number, submissionId: number) => {
    if (!signer) throw new Error("Please connect your wallet");

    try {
      setLoading(true);
      setError(null);

      const contract = getSignedContract();
      console.log(`Voting on submission ${submissionId} for bounty ${bountyId}`);
      const tx = await contract.voteOnSubmission(bountyId, submissionId);
      await tx.wait();
      await fetchAllBounties();
    } catch (err: any) {
      console.error("Error voting on submission:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
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

