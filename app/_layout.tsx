import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../src/contexts/AuthContext';
import { lightTheme } from '../src/theme';

export default function RootLayout() {
  return (
    <PaperProvider theme={lightTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </AuthProvider>
    </PaperProvider>
  );
} 