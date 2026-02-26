import { LAMPORTS_PER_SOL } from './constants';

export function formatSol(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function formatToken(smallestUnits: number, decimals: number): string {
  const value = smallestUnits / Math.pow(10, decimals);
  // Show up to 2 decimal places for tokens, but trim trailing zeros
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
}

export function tokenToSmallestUnit(amount: number, decimals: number): number {
  return Math.round(amount * Math.pow(10, decimals));
}
