"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { ethers } from "ethers";

interface WalletContextType {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string;
  connected: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isCorrectNetwork: boolean;
  setIsCorrectNetwork: (value: boolean) => void;
  loading: boolean;
}

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: "",
  connected: false,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
  isCorrectNetwork: false,
  setIsCorrectNetwork: () => {},
  loading: false,
});

const networks = {
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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState("");
  const [connected, setConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      setProvider(ethersProvider);

      const checkConnection = async () => {
        try {
          const accounts = await ethersProvider.listAccounts();
          if (accounts.length > 0) {
            const ethSigner = ethersProvider.getSigner();
            const userAddress = await ethSigner.getAddress();
            const network = await ethersProvider.getNetwork();
            
            console.log("Connected to network:", {
              chainId: network.chainId,
              name: network.name
            });

            setSigner(ethSigner);
            setAddress(userAddress);
            setConnected(true);
            setChainId(network.chainId);
            setIsCorrectNetwork(network.chainId === 84532);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      };

      checkConnection();

      // Listen for network changes
      (window as any).ethereum.on("chainChanged", async (chainId: string) => {
        console.log("Network changed to chainId:", chainId);
        const newChainId = parseInt(chainId, 16);
        setChainId(newChainId);
        
        // Update provider and signer
        const newProvider = new ethers.providers.Web3Provider((window as any).ethereum);
        setProvider(newProvider);
        setSigner(newProvider.getSigner());
        
        // Check if we still have accounts connected
        const accounts = await newProvider.listAccounts();
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setConnected(true);
        } else {
          setAddress("");
          setConnected(false);
        }
      });

      // Listen for account changes
      (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
          if (typeof window !== 'undefined') {
            localStorage.setItem("walletAddress", accounts[0]);
          }
        }
      });

      return () => {
        (window as any).ethereum.removeAllListeners("accountsChanged");
        (window as any).ethereum.removeAllListeners("chainChanged");
      };
    }
  }, []);

  const connect = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
        const accounts = await ethersProvider.send("eth_requestAccounts", []);
        
        if (accounts.length > 0) {
          const ethSigner = ethersProvider.getSigner();
          const userAddress = await ethSigner.getAddress();
          const network = await ethersProvider.getNetwork();

          setProvider(ethersProvider);
          setSigner(ethSigner);
          setAddress(userAddress);
          setConnected(true);
          setChainId(network.chainId);
          setIsCorrectNetwork(network.chainId === 84532);

          if (typeof window !== 'undefined') {
            localStorage.setItem("walletAddress", userAddress);
          }
        }
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      throw new Error(error.message || "Failed to connect wallet");
    }
  };

  const disconnect = () => {
    setSigner(null);
    setAddress("");
    setConnected(false);
    setChainId(null);
    setIsCorrectNetwork(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("walletAddress");
    }
  };

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        connected,
        chainId,
        connect,
        disconnect,
        isCorrectNetwork,
        setIsCorrectNetwork,
        loading: false,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);