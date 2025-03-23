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
    if (!provider) {
      console.error("No provider available");
      return;
    }

    try {
      await (window as any).ethereum.request({ method: "eth_requestAccounts" });

      const network = await provider.getNetwork();
      if (network.chainId !== 71) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x47' }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await (window as any).ethereum.request({
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
              console.error('Error adding Conflux Testnet:', addError);
            }
          }
          console.error('Failed to switch to Conflux Testnet:', switchError);
        }
      }

      const ethSigner = provider.getSigner();
      const userAddress = await ethSigner.getAddress();
      const currentNetwork = await provider.getNetwork();

      setSigner(ethSigner);
      setAddress(userAddress);
      setConnected(true);
      setChainId(currentNetwork.chainId);

      console.log("Connected to wallet on network:", {
        chainId: currentNetwork.chainId,
        name: currentNetwork.name
      });
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