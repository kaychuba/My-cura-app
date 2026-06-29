import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ScheduleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.title}>My Schedule</Text>
      <Text style={styles.sub}>Full calendar view coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  sub: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
});
