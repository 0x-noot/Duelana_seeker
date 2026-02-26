import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CreateDuelScreen } from '../screens/CreateDuelScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { DuelAnimationScreen } from '../screens/DuelAnimationScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { WaitingForOpponentScreen } from '../screens/WaitingForOpponentScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Home: undefined;
  CreateDuel: undefined;
  Lobby: undefined;
  WaitingForOpponent: { duelPubkey: string; betAmount: number; tokenType?: 'SOL' | 'SKR' };
  DuelAnimation: { duelPubkey: string };
  Results: { duelPubkey: string };
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CreateDuel" component={CreateDuelScreen} />
      <Stack.Screen name="Lobby" component={LobbyScreen} />
      <Stack.Screen name="WaitingForOpponent" component={WaitingForOpponentScreen} />
      <Stack.Screen name="DuelAnimation" component={DuelAnimationScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}
