import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from './wallet-context';

interface AccountContextType {
  address: string | null;
  isConnected: boolean;
}

const AccountContext = createContext<AccountContextType>({
  address: null,
  isConnected: false,
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { connected, address } = useWallet();
  const [accountAddress, setAccountAddress] = useState<string | null>(null);

  useEffect(() => {
    if (connected && address) {
      setAccountAddress(address);
    } else {
      setAccountAddress(null);
    }
  }, [connected, address]);

  return (
    <AccountContext.Provider value={{ address: accountAddress, isConnected: connected }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
} 