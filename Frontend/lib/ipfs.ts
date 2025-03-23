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

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    // For demo purposes, if we don't have real credentials, simulate upload
    if (projectId === "demo-project-id") {
      console.log("Using demo mode for IPFS upload")
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate upload delay

      // Return a fake CID
      const randomCID = `Qm${Array.from(
        { length: 44 },
        () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 62)],
      ).join("")}`

      return randomCID
    }

    // Real upload logic
    const fileData = await file.arrayBuffer()
    const buffer = Buffer.from(fileData)

    const added = await ipfsClient.add(buffer, {
      progress: (prog) => console.log(`Upload progress: ${prog}`),
    })

    console.log("File uploaded to IPFS with CID:", added.cid.toString())
    return added.cid.toString()
  } catch (error) {
    console.error("Error uploading file to IPFS:", error)
    throw new Error("Failed to upload to IPFS")
  }
}

// Function to upload JSON metadata to IPFS
export async function uploadJSONToIPFS(data: any): Promise<string> {
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

