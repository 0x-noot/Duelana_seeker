import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

interface WalletContextValue {
  publicKey: PublicKey | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSendTransaction: (
    transaction: any,
  ) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue>(
  {} as WalletContextValue,
);

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}

interface Props {
  children: ReactNode;
}

const APP_IDENTITY = {
  name: 'Duelana',
  uri: 'https://duelana.app',
  icon: 'favicon.ico',
};

export function WalletProvider({ children }: Props) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const connect = useCallback(async () => {
    await transact(async (wallet: Web3MobileWallet) => {
      const authResult = await wallet.authorize({
        cluster: 'devnet',
        identity: APP_IDENTITY,
      });
      setPublicKey(new PublicKey(Buffer.from(authResult.accounts[0].address, 'base64')));
      setAuthToken(authResult.auth_token);
    });
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setAuthToken(null);
  }, []);

  const signAndSendTransaction = useCallback(
    async (transaction: any): Promise<string> => {
      const signatures = await transact(
        async (wallet: Web3MobileWallet) => {
          // Reauthorize with cached token, fall back to full authorize if stale
          let authorized = false;
          if (authToken) {
            try {
              await wallet.reauthorize({
                auth_token: authToken,
                identity: APP_IDENTITY,
              });
              authorized = true;
            } catch {
              // Token expired/stale — fall through to full authorize
            }
          }
          if (!authorized) {
            const authResult = await wallet.authorize({
              cluster: 'devnet',
              identity: APP_IDENTITY,
            });
            setPublicKey(new PublicKey(Buffer.from(authResult.accounts[0].address, 'base64')));
            setAuthToken(authResult.auth_token);
          }

          const signedTxs = await wallet.signAndSendTransactions({
            transactions: [transaction],
          });
          return signedTxs;
        },
      );
      return signatures[0];
    },
    [authToken],
  );

  const value = useMemo(
    () => ({
      publicKey,
      connected: publicKey !== null,
      connect,
      disconnect,
      signAndSendTransaction,
    }),
    [publicKey, connect, disconnect, signAndSendTransaction],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
