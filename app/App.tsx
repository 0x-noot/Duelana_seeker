import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConnectionProvider } from './src/providers/ConnectionProvider';
import { WalletProvider } from './src/providers/WalletProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { AudioManager } from './src/audio/AudioManager';

export default function App() {
  useEffect(() => {
    AudioManager.init();
    return () => { AudioManager.cleanup(); };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ConnectionProvider>
        <WalletProvider>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: colors.primary,
                background: colors.bg,
                card: colors.surface,
                text: colors.textLight,
                border: colors.textMuted,
                notification: colors.primary,
              },
              fonts: {
                regular: { fontFamily: 'PressStart2P', fontWeight: 'normal' },
                medium: { fontFamily: 'PressStart2P', fontWeight: '500' },
                bold: { fontFamily: 'PressStart2P', fontWeight: 'bold' },
                heavy: { fontFamily: 'PressStart2P', fontWeight: '900' },
              },
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </WalletProvider>
      </ConnectionProvider>
    </SafeAreaProvider>
  );
}
