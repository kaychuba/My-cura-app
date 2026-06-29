import { NotificationType } from './enums';

export interface PushNotificationPayload {
  to: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  type: NotificationType;
  priority?: 'normal' | 'high';
}

export interface InAppNotification {
  id: string;
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  readAt?: string;
  createdAt: string;
}
