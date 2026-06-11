import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import MainTabs from './src/navigation/MainTabs';
import ProjectList from './src/screens/ProjectList';
import TestExecution from './src/screens/TestExecution';
import NoteEditor from './src/screens/NoteEditor';
import Auth from './src/screens/Auth';

export type RootStackParamList = {
  Auth: undefined;
  ProjectList: undefined;
  MainTabs: { projectId: string; projectTitle: string };
  TestExecution: undefined;
  NoteEditor: { noteId?: string; itemType?: 'term' | 'memo' | 'question' };
};

export type ProjectListProps = NativeStackScreenProps<RootStackParamList, 'ProjectList'>;
export type MainTabsProps = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;
export type TestExecutionPropsType = NativeStackScreenProps<RootStackParamList, 'TestExecution'>;

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator(): React.ReactElement {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9900" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
        }}
      >
        {!user ? (
          // 未ログイン時は認証画面のみ
          <Stack.Screen
            name="Auth"
            component={Auth}
            options={{ headerShown: false }}
          />
        ) : (
          // ログイン済みの場合はアプリ画面
          <>
            <Stack.Screen
              name="ProjectList"
              component={ProjectList}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="TestExecution"
              component={TestExecution}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="NoteEditor"
              component={NoteEditor}
              options={{
                headerShown: false,
                gestureEnabled: true,
                presentation: 'fullScreenModal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App(): React.ReactElement {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AppNavigator />
      </ProjectProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});