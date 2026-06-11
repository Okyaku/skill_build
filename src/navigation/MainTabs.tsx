import React, { useEffect } from 'react';
import { createBottomTabNavigator, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainTabsProps } from '../../App';
import { useProject } from '../../contexts/ProjectContext';
import Chat from '../screens/Chat';
import Notes from '../screens/Notes';
import Practice from '../screens/Practice';

export type MainTabParamList = {
  Chat: undefined;
  Notes: undefined;
  Practice: undefined;
};

export type ChatProps = BottomTabScreenProps<MainTabParamList, 'Chat'>;
export type NotesProps = BottomTabScreenProps<MainTabParamList, 'Notes'>;
export type PracticeProps = BottomTabScreenProps<MainTabParamList, 'Practice'>;

const Tab = createBottomTabNavigator<MainTabParamList>();

interface MainTabsComponentProps {
  navigation: MainTabsProps['navigation'];
  route: MainTabsProps['route'];
}

export default function MainTabs({ route }: MainTabsComponentProps): React.ReactElement {
  const { setCurrentProject } = useProject();
  const { projectId, projectTitle } = route.params || {};

  useEffect(() => {
    if (projectId && projectTitle) {
      setCurrentProject(projectId, projectTitle);
    }
  }, [projectId, projectTitle, setCurrentProject]);
  return (
    <Tab.Navigator
      initialRouteName="Chat"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF9900',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Chat"
        component={Chat}
        options={{ tabBarLabel: 'チャット' }}
      />
      <Tab.Screen
        name="Notes"
        component={Notes}
        options={{ tabBarLabel: 'ノート' }}
      />
      <Tab.Screen
        name="Practice"
        component={Practice}
        options={{ tabBarLabel: '問題集' }}
      />
    </Tab.Navigator>
  );
}
