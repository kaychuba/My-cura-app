import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Every 5 minutes: if a carer hasn't clocked in within 15 minutes of the
 * shift's start (or hasn't clocked out within 15 minutes of its end), drop
 * an alert into their notification feed. Runs on the privileged connection
 * because cron has no request/tenant context; inserts carry the tenant id
 * explicitly and are deduplicated per shift+kind.
 */
@Injectable()
export class LateClockAlertsService {
  private readonly logger = new Logger(LateClockAlertsService.name);

  constructor(@InjectDataSource('auth') private authDb: DataSource) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweep() {
    try {
      const lateIn: Array<{ id: string; tenant_id: string; care_worker_id: string; scheduled_start: string; first_name?: string; last_name?: string }> =
        await this.authDb.query(`
          SELECT s.id, s.tenant_id, s.care_worker_id, s.scheduled_start, su.first_name, su.last_name
            FROM shifts s
            LEFT JOIN service_users su ON su.id = s.service_user_id
           WHERE s.status IN ('assigned', 'confirmed')
             AND s.care_worker_id IS NOT NULL
             AND s.scheduled_start < NOW() - interval '15 minutes'
             AND s.scheduled_start > NOW() - interval '12 hours'
        `);

      const lateOut: typeof lateIn = await this.authDb.query(`
        SELECT s.id, s.tenant_id, s.care_worker_id, s.scheduled_end AS scheduled_start, su.first_name, su.last_name
          FROM shifts s
          LEFT JOIN service_users su ON su.id = s.service_user_id
         WHERE s.status = 'in_progress'
           AND s.scheduled_end < NOW() - interval '15 minutes'
           AND s.scheduled_end > NOW() - interval '12 hours'
      `);

      for (const [rows, kind, title, verb] of [
        [lateIn, 'late_clock_in', 'You are late to clock in', 'started'],
        [lateOut, 'late_clock_out', 'You are late to clock out', 'ended'],
      ] as const) {
        for (const s of rows) {
          const [dupe] = await this.authDb.query(
            `SELECT 1 FROM notifications
              WHERE tenant_id = $1 AND user_id = $2 AND type = 'shift_alert'
                AND data->>'shiftId' = $3 AND data->>'kind' = $4 LIMIT 1`,
            [s.tenant_id, s.care_worker_id, s.id, kind],
          );
          if (dupe) continue;

          const at = new Date(s.scheduled_start).toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit',
          });
          const who = s.first_name ? ` with ${s.first_name} ${s.last_name}` : '';
          await this.authDb.query(
            `INSERT INTO notifications (id, tenant_id, user_id, type, title, body, data, created_at, updated_at)
             VALUES (uuid_generate_v4(), $1, $2, 'shift_alert', $3, $4, $5::jsonb, NOW(), NOW())`,
            [
              s.tenant_id,
              s.care_worker_id,
              title,
              `Your visit${who} ${verb} at ${at} — please open Clock In now.`,
              JSON.stringify({ shiftId: s.id, kind }),
            ],
          );
        }
      }
    } catch (e) {
      this.logger.warn(`Late clock sweep failed: ${(e as Error).message}`);
    }
  }
}
