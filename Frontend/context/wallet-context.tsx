"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"

interface WalletContextType {
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  address: string
  connected: boolean
  chainId: number | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: "",
  connected: false,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [address, setAddress] = useState("")
  const [connected, setConnected] = useState(false)
  const [chainId, setChainId] = useState<number | null>(null)

  // Initialize provider on client-side
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const ethersProvider = new ethers.BrowserProvider(window.ethereum)
      setProvider(ethersProvider)

      // Check if already connected
      const checkConnection = async () => {
        try {
          const accounts = await ethersProvider.listAccounts()
          if (accounts.length > 0) {
            const ethSigner = await ethersProvider.getSigner()
            const userAddress = await ethSigner.getAddress()
            const network = await ethersProvider.getNetwork()

            setSigner(ethSigner)
            setAddress(userAddress)
            setConnected(true)
            setChainId(Number(network.chainId))
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error)
        }
      }

      checkConnection()

      // Listen for account changes
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          disconnect()
        } else {
          // Account changed, reconnect
          connect()
        }
      })

      // Listen for chain changes
      window.ethereum.on("chainChanged", () => {
        window.location.reload()
      })

      return () => {
        window.ethereum.removeAllListeners("accountsChanged")
        window.ethereum.removeAllListeners("chainChanged")
      }
    }
  }, [])

  const connect = async () => {
    if (!provider) {
      console.error("No provider available")
      return
    }

    try {
      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" })

      const ethSigner = await provider.getSigner()
      const userAddress = await ethSigner.getAddress()
      const network = await provider.getNetwork()

      setSigner(ethSigner)
      setAddress(userAddress)
      setConnected(true)
      setChainId(Number(network.chainId))
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  const disconnect = () => {
    setSigner(null)
    setAddress("")
    setConnected(false)
    setChainId(null)
  }

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
  )
}

export const useWallet = () => useContext(WalletContext)

