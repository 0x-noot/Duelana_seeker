import React, { useState } from 'react';
import { Pressable, Text, ImageBackground, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontFamily, spacing } from '../theme';
import { buttons } from '../assets';
import { AudioManager } from '../audio/AudioManager';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'long' | 'small';
  disabled?: boolean;
  style?: ViewStyle;
}

const spriteMap = {
  long: { up: buttons.longUp, down: buttons.longDown },
  small: { up: buttons.smallUp, down: buttons.smallDown },
};

export function SpriteButton({
  title,
  onPress,
  variant = 'long',
  disabled = false,
  style,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const sprites = spriteMap[variant];
  const source = pressed && !disabled ? sprites.down : sprites.up;

  return (
    <Pressable
      onPress={() => { AudioManager.playUIClick(); onPress(); }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[
        variant === 'long' ? styles.longOuter : styles.smallOuter,
        disabled && styles.disabled,
        style,
      ]}
    >
      <ImageBackground
        source={source}
        style={variant === 'long' ? styles.longInner : styles.smallInner}
        resizeMode="stretch"
      >
        <Text style={[styles.text, variant === 'small' && styles.smallText]}>
          {title}
        </Text>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  longOuter: {
    width: '100%',
    height: 64,
  },
  smallOuter: {
    height: 52,
    minWidth: 100,
  },
  longInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  smallInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  smallText: {
    fontSize: 13,
  },
});
