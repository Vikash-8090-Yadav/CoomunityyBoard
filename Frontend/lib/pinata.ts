const PINATA_GATEWAY = "https://moccasin-real-stork-472.mypinata.cloud/ipfs";
const PINATA_API_URL = "https://api.pinata.cloud";

class PinataService {
  private apiKey: string;
  private apiSecret: string;
  private jwt: string | undefined;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
    this.apiSecret = process.env.NEXT_PUBLIC_PINATA_API_SECRET || '';
    this.jwt = process.env.NEXT_PUBLIC_PINATA_JWT;

    // Log configuration status (without exposing sensitive data)
    console.log('Pinata Service Configuration:', {
      hasApiKey: !!this.apiKey,
      hasApiSecret: !!this.apiSecret,
      hasJWT: !!this.jwt
    });
  }

  private getHeaders(isMultipart = false) {
    const headers: Record<string, string> = {};
    
    if (this.jwt) {
      headers['Authorization'] = `Bearer ${this.jwt}`;
    } else {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('Pinata credentials not configured. Please check your environment variables.');
      }
      headers['pinata_api_key'] = this.apiKey;
      headers['pinata_secret_api_key'] = this.apiSecret;
    }

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  async uploadFile(file: File): Promise<{ cid: string; url: string }> {
    try {
      console.log('Starting file upload to Pinata:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: formData
      });

      const responseText = await response.text();
      console.log('Pinata Response:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file to Pinata: ${response.status} ${response.statusText}\n${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid JSON response from Pinata: ${responseText}`);
      }

      console.log('File upload successful:', {
        IpfsHash: data.IpfsHash,
        PinSize: data.PinSize,
        Timestamp: data.Timestamp
      });

      return {
        cid: data.IpfsHash,
        url: this.getIPFSUrl(data.IpfsHash)
      };
    } catch {
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async uploadJSON(json: object): Promise<string> {
    try {
      console.log('Starting JSON upload to Pinata:', json);

      const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(json)
      });

      const responseText = await response.text();
      console.log('Pinata JSON Response:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });

      if (!response.ok) {
        throw new Error(`Failed to upload JSON to Pinata: ${response.status} ${response.statusText}\n${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid JSON response from Pinata: ${responseText}`);
      }

      console.log('JSON upload successful:', {
        IpfsHash: data.IpfsHash,
        Timestamp: data.Timestamp
      });

      return data.IpfsHash;
    } catch {
      throw new Error('Failed to upload JSON to IPFS');
    }
  }

  async fetchMetadata(ipfsHash: string) {
    try {
      console.log('Fetching metadata from dedicated gateway:', ipfsHash);

      // Use the dedicated gateway directly
      const response = await fetch(`${PINATA_GATEWAY}/${ipfsHash}`);
      
      if (!response.ok) {
        console.error('Gateway fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }

      const data = await response.json();
      console.log('Successfully fetched metadata:', data);
      return data;
    } catch (error) {
      console.error('Error fetching from dedicated gateway:', error);
      throw error;
    }
  }

  getIPFSUrl(ipfsHash: string) {
    return `${PINATA_GATEWAY}/${ipfsHash}`;
  }
}

export const pinataService = new PinataService();
export default PinataService; 