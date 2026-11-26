import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider } from '../lib/settings';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.primary, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ presentation: 'modal', title: 'Event' }} />
        <Stack.Screen name="member/[id]" options={{ presentation: 'modal', title: 'Family member' }} />
      </Stack>
    </SettingsProvider>
  );
}
