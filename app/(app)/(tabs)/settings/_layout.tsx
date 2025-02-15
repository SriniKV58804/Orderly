import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function SettingsLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="config"
        options={{
          title: 'Configuration',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
} 