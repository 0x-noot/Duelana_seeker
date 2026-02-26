import React from 'react';
import { ViewStyle } from 'react-native';
import { SpriteButton } from './SpriteButton';

interface Props {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
}

export function PixelButton({
  title,
  onPress,
  disabled = false,
  style,
  small = false,
}: Props) {
  return (
    <SpriteButton
      title={title}
      onPress={onPress}
      variant={small ? 'small' : 'long'}
      disabled={disabled}
      style={style}
    />
  );
}
