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
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      setProvider(ethersProvider);

      const checkConnection = async () => {
        try {
          const accounts = await ethersProvider.listAccounts();
          if (accounts.length > 0) {
            const ethSigner = ethersProvider.getSigner();
            const userAddress = await ethSigner.getAddress();
            const network = await ethersProvider.getNetwork();

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

      (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          connect();
        }
      });

      (window as any).ethereum.on("chainChanged", () => {
        window.location.reload();
      });

      return () => {
        (window as any).ethereum.removeAllListeners("accountsChanged");
        (window as any).ethereum.removeAllListeners("chainChanged");
      };
    }
  }, []);

  const connect = async () => {
    if (!provider) {
      console.error("No provider available");
      return;
    }

    try {
      await (window as any).ethereum.request({ method: "eth_requestAccounts" });

      const ethSigner = provider.getSigner();
      const userAddress = await ethSigner.getAddress();
      const network = await provider.getNetwork();

      setSigner(ethSigner);
      setAddress(userAddress);
      setConnected(true);
      setChainId(network.chainId);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
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