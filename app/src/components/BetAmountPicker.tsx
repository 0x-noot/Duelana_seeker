import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { SOL_BET_PRESETS, SKR_BET_PRESETS } from '../utils/constants';
import { colors, fontFamily, spacing } from '../theme';
import { PixelButton } from './PixelButton';

export type TokenType = 'SOL' | 'SKR';

interface Props {
  onSelect: (amount: number) => void;
  disabled?: boolean;
  tokenType?: TokenType;
}

export function BetAmountPicker({ onSelect, disabled = false, tokenType = 'SOL' }: Props) {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const presets = tokenType === 'SKR' ? SKR_BET_PRESETS : SOL_BET_PRESETS;

  // Reset selection when token type changes
  useEffect(() => {
    setSelectedPreset(null);
    setCustomAmount('');
  }, [tokenType]);

  const handlePreset = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount('');
    onSelect(amount);
  };

  const handleCustom = () => {
    const amount = parseFloat(customAmount);
    if (amount > 0) {
      setSelectedPreset(null);
      onSelect(amount);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>BET AMOUNT ({tokenType})</Text>

      <View style={styles.presets}>
        {presets.map((amount) => (
          <PixelButton
            key={amount}
            title={`${amount}`}
            onPress={() => handlePreset(amount)}
            disabled={disabled}
            small
          />
        ))}
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={styles.input}
          value={customAmount}
          onChangeText={setCustomAmount}
          placeholder="Custom"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          editable={!disabled}
        />
        <PixelButton
          title="SET"
          onPress={handleCustom}
          disabled={disabled || !customAmount}
          small
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  label: {
    fontFamily,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  input: {
    fontFamily,
    fontSize: 14,
    color: colors.text,
    backgroundColor: 'rgba(201, 150, 95, 0.3)',
    borderWidth: 2,
    borderColor: colors.textMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    width: 120,
    textAlign: 'center',
  },
});
