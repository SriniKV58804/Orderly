import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { TextInput, Button, Text, useTheme, Divider, Portal, Dialog } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import type { AppTheme } from '../../../../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    email: '',
    fullName: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    loadProfile();
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        email: user.email || '',
        fullName: profile.full_name || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update email if changed
      if (profile.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email,
        });
        if (emailError) throw emailError;
      }

      // Update profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .update({ full_name: profile.fullName })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) throw passwordError;
      setNewPassword('');
      setSuccess('Password updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSetup = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First get all tasks for this user
      const { data: userTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id);

      if (tasksError) throw tasksError;

      if (userTasks && userTasks.length > 0) {
        // Delete study plans for user's tasks
        const taskIds = userTasks.map(task => task.id);
        const { error: studyPlansError } = await supabase
          .from('study_plans')
          .delete()
          .in('task_id', taskIds);

        if (studyPlansError) {
          console.error('Error deleting study plans:', studyPlansError);
          // Continue with reset even if study plan deletion fails
        }

        // Delete all tasks
        const { error: deleteTasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('user_id', user.id);

        if (deleteTasksError) throw deleteTasksError;
      }

      // Delete all courses
      const { error: deleteCoursesError } = await supabase
        .from('courses')
        .delete()
        .eq('user_id', user.id);

      if (deleteCoursesError) throw deleteCoursesError;

      // Update user settings
      const { error: updateError } = await supabase
        .from('users')
        .update({
          setup_completed: false,
          canvas_token: null,
          canvas_domain: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Redirect to setup
      router.replace('/setup');
    } catch (err) {
      console.error('Reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset setup');
    } finally {
      setLoading(false);
      setShowResetDialog(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: keyboardVisible ? 300 : 100 }
      ]}
    >
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
        Profile Settings
      </Text>

      <TextInput
        label="Email"
        value={profile.email}
        onChangeText={(text) => setProfile(prev => ({ ...prev, email: text }))}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        label="Full Name"
        value={profile.fullName}
        onChangeText={(text) => setProfile(prev => ({ ...prev, fullName: text }))}
        mode="outlined"
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleUpdateProfile}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Update Profile
      </Button>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.subtitle}>
        Change Password
      </Text>

      <TextInput
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleUpdatePassword}
        loading={loading}
        disabled={loading || !newPassword}
        style={styles.button}
      >
        Update Password
      </Button>

      <Divider style={styles.divider} />

      <Button
        mode="outlined"
        onPress={() => router.push('/(app)/(tabs)/settings/config')}
        icon="cog"
        style={styles.button}
      >
        Course & Canvas Configuration
      </Button>

      <Button
        mode="outlined"
        onPress={() => setShowResetDialog(true)}
        loading={loading}
        disabled={loading}
        style={[styles.button, styles.resetButton]}
        textColor={theme.colors.secondary}
        icon="refresh"
      >
        Reset Setup Process
      </Button>

      <Button
        mode="outlined"
        onPress={handleLogout}
        loading={loading}
        disabled={loading}
        style={[styles.button, styles.logoutButton]}
        textColor={theme.colors.error}
        contentStyle={styles.logoutContent}
      >
        Logout
      </Button>

      {error && (
        <Text style={[styles.message, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}

      {success && (
        <Text style={[styles.message, { color: theme.colors.success }]}>
          {success}
        </Text>
      )}

      <Portal>
        <Dialog
          visible={showResetDialog}
          onDismiss={() => setShowResetDialog(false)}
        >
          <Dialog.Title>Warning</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will delete all your tasks and reset your setup process. This action cannot be undone.
            </Text>
            <Text style={{ marginTop: 8, color: theme.colors.error }}>
              Are you sure you want to continue?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowResetDialog(false)}>Cancel</Button>
            <Button 
              onPress={handleResetSetup}
              textColor={theme.colors.error}
            >
              Reset Everything
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginVertical: 8,
  },
  divider: {
    marginVertical: 24,
  },
  logoutButton: {
    borderColor: 'transparent',
    backgroundColor: '#ffebee',
  },
  logoutContent: {
    height: 48,
  },
  resetButton: {
    borderColor: 'transparent',
    backgroundColor: '#e3f2fd',
  },
  message: {
    textAlign: 'center',
    marginVertical: 8,
  },
}); 