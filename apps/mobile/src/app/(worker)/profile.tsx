import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
      </View>
      <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
      <Text style={styles.role}>{user?.role?.replace(/_/g, ' ')}</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E3A5F',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  role: { fontSize: 14, color: '#64748B', textTransform: 'capitalize', marginTop: 4, marginBottom: 32 },
  logoutButton: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12,
  },
  logoutText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
});
