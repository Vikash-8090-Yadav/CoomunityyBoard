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
}

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: "",
  connected: false,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState("");
  const [connected, setConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum, {
        name: 'CFXTestnet',
        chainId: 71,
        ensAddress: undefined
      });
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
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      };

      checkConnection();

      (window as any).ethereum.on("chainChanged", (chainId: string) => {
        console.log("Network changed to chainId:", chainId);
        if (chainId !== "0x47") {
          console.log("Warning: Not connected to Conflux Testnet");
        }
        window.location.reload();
      });

      (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          connect();
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
      // Check if MetaMask is installed
      if (typeof window.ethereum === "undefined") {
        throw new Error("Please install MetaMask to connect your wallet");
      }

      // Initialize provider if not already done
      if (!provider) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);
      }

      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const currentProvider = provider || new ethers.providers.Web3Provider(window.ethereum);
      const network = await currentProvider.getNetwork();

      // Check and switch to Conflux Testnet if needed
      if (network.chainId !== 71) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x47' }],
          });
        } catch (switchError: any) {
          // If the chain hasn't been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x47',
                  chainName: 'CFXTestnet',
                  nativeCurrency: {
                    name: 'CFXTestnet',
                    symbol: 'CFX',
                    decimals: 18
                  },
                  rpcUrls: ['https://evmtestnet.confluxrpc.com'],
                  blockExplorerUrls: ['https://www.confluxscan.io/']
                }],
              });
            } catch (addError) {
              throw new Error('Failed to add Conflux Testnet to your wallet. Please try adding it manually.');
            }
          }
          throw new Error('Failed to switch to Conflux Testnet. Please switch networks manually.');
        }
      }

      // Get signer and address
      const ethSigner = currentProvider.getSigner();
      const userAddress = await ethSigner.getAddress();
      const updatedNetwork = await currentProvider.getNetwork();

      // Update state
      setSigner(ethSigner);
      setAddress(userAddress);
      setConnected(true);
      setChainId(updatedNetwork.chainId);

      console.log("Successfully connected to wallet on network:", {
        chainId: updatedNetwork.chainId,
        name: updatedNetwork.name
      });

    } catch (error: any) {
      console.error("Wallet connection error:", error);
      // Reset state on error
      setSigner(null);
      setAddress("");
      setConnected(false);
      setChainId(null);
      
      // Throw a user-friendly error message
      throw new Error(error.message || "Failed to connect wallet. Please try again.");
    }
  };

  const disconnect = () => {
    setSigner(null);
    setAddress("");
    setConnected(false);
    setChainId(null);
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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);