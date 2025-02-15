import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

interface CustomColors {
  textPrimary: string;
  textSecondary: string;
  divider: string;
  success: string;
}

export interface AppTheme extends MD3Theme {
  colors: MD3Theme['colors'] & CustomColors;
}

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#7C4DFF',
    secondary: '#B388FF',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    onSurface: '#1A1A1A',
    onBackground: '#1A1A1A',
    error: '#FF5252',
    onError: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#757575',
    divider: '#E0E0E0',
    success: '#4CAF50',
  },
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#B388FF',
    secondary: '#7C4DFF',
    background: '#121212',
    surface: '#1E1E1E',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
    error: '#FF5252',
    onError: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    divider: '#2C2C2C',
    success: '#81C784',
  },
}; 