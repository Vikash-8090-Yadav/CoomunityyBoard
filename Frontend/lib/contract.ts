import { ethers } from 'ethers';
import CommunityBountyBoard from '@/abi/CommunityBountyBoard.json';
import { communityAddress } from '@/config';
const CONTRACT_ADDRESS = communityAddress || '';

export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  CommunityBountyBoard.abi,
  new ethers.providers.Web3Provider(window.ethereum)
); 