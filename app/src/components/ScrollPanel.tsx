import React from 'react';
import { ImageBackground, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';
import { panels } from '../assets';

interface Props {
  children: React.ReactNode;
  variant?: 'popup' | 'scroll' | 'banner' | 'card';
  style?: ViewStyle;
}

const spriteMap = {
  popup: panels.popup,
  scroll: panels.medScroll,
  banner: panels.middleUI,
  card: panels.orderPaper,
};

// RS embossed borders only on popup and card variants
// (banner/scroll have decorative curled edges that would clip)
const borderedVariants: Record<string, boolean> = {
  popup: true,
  card: true,
  banner: false,
  scroll: false,
};

export function ScrollPanel({ children, variant = 'popup', style }: Props) {
  const showBorder = borderedVariants[variant];

  return (
    <ImageBackground
      source={spriteMap[variant]}
      style={[styles.container, showBorder && styles.rsBorder, style]}
      imageStyle={styles.image}
      resizeMode="stretch"
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    overflow: 'hidden',
  },
  rsBorder: {
    borderWidth: 2,
    borderTopColor: colors.borderDark,
    borderLeftColor: colors.borderDark,
    borderBottomColor: colors.borderLight,
    borderRightColor: colors.borderLight,
  },
  image: {
    // Ensure pixel art stays crisp
  },
});
