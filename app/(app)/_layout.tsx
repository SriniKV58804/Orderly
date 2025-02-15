import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AppLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="tasks/new"
        options={{
          presentation: 'modal',
          title: 'New Task',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="tasks/[id]"
        options={{
          title: 'Task Details',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="canvas/sync"
        options={{
          presentation: 'modal',
          title: 'Import Canvas Assignments',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
} 