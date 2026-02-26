import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { fontFamily } from '../theme';

interface Props {
  onPress: () => void;
  style?: ViewStyle;
}

export function RSCloseButton({ onPress, style }: Props) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.button, pressed && styles.pressed, style]}
    >
      <Text style={styles.text}>X</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    backgroundColor: '#ff0000',
    borderWidth: 2,
    borderTopColor: '#ff6666',
    borderLeftColor: '#ff6666',
    borderBottomColor: '#990000',
    borderRightColor: '#990000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontFamily,
    fontSize: 14,
    color: '#ffffff',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});
