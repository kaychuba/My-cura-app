import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function WorkerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1E3A5F',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          paddingBottom: 8,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: '#1E3A5F' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size - 2} />,
          headerTitle: 'My-Cura',
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size - 2} />,
          headerTitle: 'My Schedule',
        }}
      />
      <Tabs.Screen
        name="clock-in"
        options={{
          title: 'Clock In',
          tabBarIcon: ({ color, size }) => <Feather name="clock" color={color} size={size - 2} />,
          headerTitle: 'Clock In / Out',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Feather name="message-square" color={color} size={size - 2} />,
          headerTitle: 'Messages',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size - 2} />,
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}
