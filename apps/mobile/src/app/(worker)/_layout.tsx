import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { QuickMenu } from '../../components/QuickMenu';
import { colors } from '../../theme';

export default function WorkerLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: 8,
            paddingTop: 4,
            height: 60,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          headerStyle: { backgroundColor: colors.primary },
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
          name="menu"
          options={{
            title: 'Menu',
            headerShown: false,
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.menuTab}
                onPress={() => setMenuOpen(true)}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
              >
                <Feather name="grid" color={menuOpen ? colors.primary : colors.textMuted} size={22} />
                <Text style={[styles.menuTabLabel, menuOpen && { color: colors.primary }]}>Menu</Text>
              </TouchableOpacity>
            ),
          }}
        />

        {/* Screens reachable from the menu/dashboard — hidden from the tab bar */}
        <Tabs.Screen name="profile" options={{ href: null, headerTitle: 'My Profile' }} />
        <Tabs.Screen name="visit-notes" options={{ href: null, headerTitle: 'Visit Notes' }} />
        <Tabs.Screen name="mar" options={{ href: null, headerTitle: 'Medication (MAR)' }} />
        <Tabs.Screen name="incident-report" options={{ href: null, headerTitle: 'Report an Incident' }} />
        <Tabs.Screen name="whistleblowing" options={{ href: null, headerTitle: 'Speak Up' }} />
        <Tabs.Screen name="body-map" options={{ href: null, headerTitle: 'Body Map' }} />
        <Tabs.Screen name="policies" options={{ href: null, headerTitle: 'Company Policies' }} />
        <Tabs.Screen name="policy-detail" options={{ href: null, headerTitle: 'Policy' }} />
        <Tabs.Screen name="notifications" options={{ href: null, headerTitle: 'Notifications' }} />
        <Tabs.Screen name="care-plan" options={{ href: null, headerTitle: 'Care Plan' }} />
      </Tabs>

      <QuickMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  menuTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  menuTabLabel: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
});
