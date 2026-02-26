import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#2a2520',
  surface: '#c9965f',
  primary: '#ff981f',
  secondary: '#8b6f47',
  gold: '#ffff00',
  text: '#2a1810',
  textLight: '#ff981f',
  textMuted: '#6b5440',
  success: '#00ff00',
  danger: '#ff0000',
  black: '#1a0f08',
  borderDark: '#1c1510',
  borderLight: '#635b4f',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontFamily = 'PressStart2P';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.md,
  },
  title: {
    fontFamily,
    fontSize: 26,
    color: colors.gold,
    textAlign: 'center',
    textShadowColor: colors.black,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontFamily,
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  text: {
    fontFamily,
    fontSize: 14,
    color: colors.text,
  },
  textMuted: {
    fontFamily,
    fontSize: 12,
    color: colors.textMuted,
  },
});
