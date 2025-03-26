import { ethers } from 'ethers';
import CommunityBountyBoard from '@/abi/CommunityBountyBoard.json';
import { communityAddress } from '@/config';

const CONTRACT_ADDRESS = communityAddress;

// Initialize contract with null provider
let contract: ethers.Contract | null = null;

// Function to get contract instance
export const getContract = () => {
  if (typeof window !== "undefined" && window.ethereum) {
    if (!contract) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CommunityBountyBoard.abi,
        provider
      );
    }
    return contract;
  }
  return null;
};

// Function to get contract with signer
export const getSignedContract = () => {
  if (typeof window !== "undefined" && window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(
      CONTRACT_ADDRESS,
      CommunityBountyBoard.abi,
      signer
    );
  }
  return null;
}; 