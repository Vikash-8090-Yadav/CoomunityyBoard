// Enhanced IPFS upload functionality
import { create } from "ipfs-http-client"

// Configure IPFS client - in a production app, you would use a dedicated IPFS service
// like Pinata, Web3.Storage, or Infura IPFS
const projectId = process.env.NEXT_PUBLIC_INFURA_IPFS_PROJECT_ID || "demo-project-id"
const projectSecret = process.env.NEXT_PUBLIC_INFURA_IPFS_PROJECT_SECRET || "demo-project-secret"
const auth = "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64")

const ipfsClient = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: {
    authorization: auth,
  },
})

export async function uploadToIPFS(file: File): Promise<{ cid: string; url: string }> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      cid: data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to upload to IPFS: ${error.message}`)
    }
    throw new Error('Failed to upload to IPFS: Unknown error')
  }
}

// Function to upload JSON metadata to IPFS
export async function uploadJSONToIPFS(data: Record<string, unknown>): Promise<string> {
  try {
    // For demo purposes
    if (projectId === "demo-project-id") {
      console.log("Using demo mode for JSON IPFS upload")
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const randomCID = `Qm${Array.from(
        { length: 44 },
        () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 62)],
      ).join("")}`

      return randomCID
    }

    // Convert JSON to buffer
    const buffer = Buffer.from(JSON.stringify(data))

    const added = await ipfsClient.add(buffer)
    console.log("JSON uploaded to IPFS with CID:", added.cid.toString())
    return added.cid.toString()
  } catch (error) {
    console.error("Error uploading JSON to IPFS:", error)
    throw new Error("Failed to upload JSON to IPFS")
  }
}

// Function to get IPFS gateway URL for a CID
export function getIPFSGatewayURL(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`
}

