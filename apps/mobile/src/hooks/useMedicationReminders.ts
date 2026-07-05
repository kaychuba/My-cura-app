import { useEffect } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { apiClient } from '../services/api.client';

/**
 * Schedules a silent, vibration-only reminder on the carer's phone for every
 * dose the admin has scheduled today. No sound — the phone buzzes instead.
 */

const VIBRATION_PATTERN = [0, 500, 200, 500];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false, // vibration instead of a ping
    shouldSetBadge: true,
  }),
});

interface Shift {
  id: string;
  serviceUserId: string;
  serviceUser?: { firstName: string; lastName: string };
}

interface MARRecord {
  id: string;
  medicationId: string;
  scheduledAt: string;
  status: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  quantity?: string;
}

export async function syncMedicationReminders(): Promise<number> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== 'granted') return 0;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication', {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: VIBRATION_PATTERN,
      sound: null, // vibration only
      enableVibrate: true,
    });
  }

  // Today's shifts -> each service user's scheduled doses
  const today = new Date().toISOString().split('T')[0];
  const { data: shifts } = await apiClient.get<Shift[]>('/shifts/mine');
  const serviceUserIds = [...new Set((shifts ?? []).map((s) => s.serviceUserId))];

  const due: { at: Date; title: string; body: string }[] = [];
  for (const suId of serviceUserIds) {
    try {
      const { data } = await apiClient.get<{ medications: Medication[]; records: MARRecord[] }>(
        `/mar/daily?serviceUserId=${suId}&date=${today}`,
      );
      const medById = new Map(data.medications.map((m) => [m.id, m]));
      const suName = (shifts ?? []).find((s) => s.serviceUserId === suId)?.serviceUser;
      for (const r of data.records) {
        const at = new Date(r.scheduledAt);
        if (r.status !== 'scheduled' || at <= new Date()) continue;
        const med = medById.get(r.medicationId);
        due.push({
          at,
          title: 'Medication due',
          body: `${med?.name ?? 'Medication'}${med?.quantity ? ` (${med.quantity})` : ''}${
            suName ? ` for ${suName.firstName} ${suName.lastName}` : ''
          }`,
        });
      }
    } catch {
      // one service user failing shouldn't stop the rest
    }
  }

  // Replace whatever was scheduled before with the fresh list
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const dose of due) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: dose.title,
        body: dose.body,
        sound: false,
        vibrate: VIBRATION_PATTERN,
      },
      trigger: {
        date: dose.at,
        channelId: Platform.OS === 'android' ? 'medication' : undefined,
      } as Notifications.NotificationTriggerInput,
    });
  }
  return due.length;
}

/** Sync on mount; buzz gently right away if any dose is already overdue. */
export function useMedicationReminders() {
  useEffect(() => {
    syncMedicationReminders().catch(() => {});
    const sub = Notifications.addNotificationReceivedListener(() => {
      Vibration.vibrate(VIBRATION_PATTERN);
    });
    return () => sub.remove();
  }, []);
}
