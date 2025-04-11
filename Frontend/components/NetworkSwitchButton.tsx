"use client";

import { useWallet } from "../context/wallet-context";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

interface NetworkConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

interface EthereumError extends Error {
  code: number;
}

const networks: Record<string, NetworkConfig> = {
  baseSepolia: {
    chainId: `0x${Number(84532).toString(16)}`,
    chainName: "Base Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ['https://sepolia-explorer.base.org'],
  },
};

export default function NetworkSwitchButton() {
  const { setIsCorrectNetwork } = useWallet();
  const [loading, setLoading] = useState(false);
  const [showButton, setShowButton] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          // Use provider to get chain ID instead of direct request
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const network = await provider.getNetwork();
          const currentChainId = `0x${network.chainId.toString(16)}`;
          
          console.log("Current chain ID:", currentChainId);
          console.log("Target chain ID:", networks.baseSepolia.chainId);
          
          // Convert current chain ID to decimal for comparison
          const currentChainIdDecimal = parseInt(currentChainId, 16);
          
          if (currentChainIdDecimal === 84532) { // Base Sepolia Chain ID
            console.log("On correct network (Base Sepolia), hiding button");
            setIsCorrectNetwork(true);
            setShowButton(false);
          } else {
            console.log("On wrong network, showing button");
            setIsCorrectNetwork(false);
            setShowButton(true);
          }
        } catch (error) {
          console.error("Error checking network:", error);
          setIsCorrectNetwork(false);
          setShowButton(true);
        }
      }
    };

    checkNetwork();

    // Add event listener for network changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        checkNetwork();
      });
    }

    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetwork);
      }
    };
  }, [setIsCorrectNetwork]);

  const handleSwitchNetwork = async () => {
    setLoading(true);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        alert("Please install MetaMask to use this feature");
        return;
      }

      // Get current chain ID
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log("Current chain ID:", currentChainId);

      // If already on the correct network, return
      const currentChainIdDecimal = parseInt(currentChainId, 16);
      if (currentChainIdDecimal === 84532) { // Base Sepolia Chain ID
        console.log("Already on Base Sepolia");
        setIsCorrectNetwork(true);
        setShowButton(false);
        return;
      }

      try {
        // Try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networks.baseSepolia.chainId }],
        });
        console.log("Successfully switched networks");
        setIsCorrectNetwork(true);
        setShowButton(false);
      } catch (switchError: unknown) {
        // If the network hasn't been added to MetaMask
        if ((switchError as EthereumError).code === 4902) {
          try {
            // Add the network
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networks.baseSepolia],
            });
            console.log("Network added successfully");
            
            // Try switching again after adding
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: networks.baseSepolia.chainId }],
            });
            console.log("Successfully switched after adding network");
            setIsCorrectNetwork(true);
            setShowButton(false);
          } catch (addError) {
            console.error("Add network error:", addError);
            throw new Error('Failed to add Base Sepolia to your wallet');
          }
        } else {
          throw new Error('Failed to switch to Base Sepolia network');
        }
      }
    } catch (error) {
      console.error("Network switch error:", error);
      alert(error instanceof Error ? error.message : "Failed to switch network. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!showButton) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg">
        <p className="mb-2">You are on the wrong network!</p>
        <button
          onClick={handleSwitchNetwork}
          disabled={loading}
          className={`bg-white text-red-500 px-4 py-2 rounded hover:bg-gray-100 transition-colors ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Switching...' : 'Switch to Base Sepolia'}
        </button>
      </div>
    </div>
  );
}