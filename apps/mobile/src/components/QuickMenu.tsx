import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SwipeableSheet } from './SwipeableSheet';
import { colors } from '../theme';

interface MenuOption {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  description: string;
  route: string;
}

const OPTIONS: MenuOption[] = [
  { icon: 'clock', label: 'Clock In / Out', description: 'Start or end a visit', route: '/(worker)/clock-in' },
  { icon: 'calendar', label: 'My Schedule', description: 'Shifts on the calendar', route: '/(worker)/schedule' },
  { icon: 'edit-3', label: 'Care Notes', description: 'Hourly care documentation', route: '/(worker)/visit-notes' },
  { icon: 'clipboard', label: 'MAR Chart', description: 'Medication records', route: '/(worker)/mar' },
  { icon: 'user', label: 'Body Map', description: 'Log marks or injuries', route: '/(worker)/body-map' },
  { icon: 'alert-triangle', label: 'Report Incident', description: 'Accidents & events', route: '/(worker)/incident-report' },
  { icon: 'shield', label: 'Speak Up', description: 'Confidential concerns', route: '/(worker)/whistleblowing' },
  { icon: 'book-open', label: 'Policies', description: 'Read & acknowledge', route: '/(worker)/policies' },
  { icon: 'sun', label: 'Leave', description: 'Balance & requests', route: '/(worker)/leave' },
  { icon: 'file-text', label: 'Payslips', description: 'Your pay history', route: '/(worker)/payslips' },
  { icon: 'credit-card', label: 'Expenses', description: 'Claim what you spent', route: '/(worker)/expenses' },
  { icon: 'award', label: 'My Training', description: 'Courses & renewals', route: '/(worker)/my-training' },
  { icon: 'message-square', label: 'Messages', description: 'Team conversations', route: '/(worker)/messages' },
  { icon: 'bell', label: 'Notifications', description: 'Alerts & reminders', route: '/(worker)/notifications' },
  { icon: 'user-check', label: 'My Profile', description: 'Details & settings', route: '/(worker)/profile' },
];

export function QuickMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const open = (route: string) => {
    onClose();
    router.push(route as never);
  };

  return (
    <SwipeableSheet visible={visible} onClose={onClose} fullScreen>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Menu</Text>
            <Text style={styles.subtitle}>Everything in one place — swipe down to close</Text>
          </View>
          <TouchableOpacity style={styles.collapseButton} onPress={onClose} activeOpacity={0.7}>
            <Feather name="chevron-down" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.route}
              style={styles.card}
              onPress={() => open(opt.route)}
              activeOpacity={0.75}
            >
              <View style={styles.iconCircle}>
                <Feather name={opt.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.cardLabel}>{opt.label}</Text>
              <Text style={styles.cardDescription}>{opt.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </SwipeableSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  collapseButton: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 16, paddingBottom: 24,
  },
  card: {
    width: '47.7%', backgroundColor: colors.surface, borderRadius: 16,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  cardLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  cardDescription: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
});
