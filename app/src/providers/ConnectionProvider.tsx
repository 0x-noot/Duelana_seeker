import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Connection } from '@solana/web3.js';
import { RPC_URL } from '../utils/constants';

interface ConnectionContextValue {
  connection: Connection;
}

const ConnectionContext = createContext<ConnectionContextValue>(
  {} as ConnectionContextValue,
);

export function useConnection(): ConnectionContextValue {
  return useContext(ConnectionContext);
}

interface Props {
  children: ReactNode;
  endpoint?: string;
}

export function ConnectionProvider({ children, endpoint }: Props) {
  const connection = useMemo(
    () => new Connection(endpoint || RPC_URL, 'confirmed'),
    [endpoint],
  );

  return (
    <ConnectionContext.Provider value={{ connection }}>
      {children}
    </ConnectionContext.Provider>
  );
}
