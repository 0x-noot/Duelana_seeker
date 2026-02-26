import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { useConnection } from '../providers/ConnectionProvider';
import { useWallet } from '../providers/WalletProvider';
import idl from '../idl/duelana.json';

export function useDuelanaProgram() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const program = useMemo(() => {
    // AnchorProvider requires a wallet with publicKey, signTransaction,
    // and signAllTransactions. Provide a stub wallet since we sign via MWA.
    const walletAdapter = {
      publicKey: publicKey ?? new PublicKey(Buffer.alloc(32)),
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any) => txs,
    };
    const provider = new AnchorProvider(
      connection,
      walletAdapter as any,
      { commitment: 'confirmed' },
    );
    return new Program(idl as any, provider);
  }, [connection, publicKey]);

  return program;
}
