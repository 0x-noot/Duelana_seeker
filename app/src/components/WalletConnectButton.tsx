import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWallet } from '../providers/WalletProvider';
import { useBalance } from '../hooks/useBalance';
import { truncateAddress } from '../utils/format';
import { colors, fontFamily, spacing } from '../theme';
import { PixelButton } from './PixelButton';

export function WalletConnectButton() {
  const { publicKey, connected, connect, disconnect } = useWallet();
  const balance = useBalance(publicKey);

  if (connected && publicKey) {
    return (
      <View style={styles.connected}>
        <Text style={styles.address}>
          {truncateAddress(publicKey.toBase58())}
        </Text>
        {balance !== null && (
          <Text style={styles.balance}>{balance.toFixed(2)} SOL</Text>
        )}
        <PixelButton
          title="DISC"
          onPress={disconnect}
          small
        />
      </View>
    );
  }

  return (
    <PixelButton
      title="CONNECT WALLET"
      onPress={connect}
      small
    />
  );
}

const styles = StyleSheet.create({
  connected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  address: {
    fontFamily,
    fontSize: 11,
    color: colors.textLight,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  balance: {
    fontFamily,
    fontSize: 12,
    color: colors.gold,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});
