import { useState, useEffect } from 'react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useConnection } from '../providers/ConnectionProvider';

export function useBalance(publicKey: PublicKey | null) {
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      const lamports = await connection.getBalance(publicKey);
      if (!cancelled) {
        setBalance(lamports / LAMPORTS_PER_SOL);
      }
    };

    fetchBalance();

    const id = connection.onAccountChange(publicKey, (info) => {
      if (!cancelled) {
        setBalance(info.lamports / LAMPORTS_PER_SOL);
      }
    });

    return () => {
      cancelled = true;
      connection.removeAccountChangeListener(id);
    };
  }, [publicKey, connection]);

  return balance;
}
