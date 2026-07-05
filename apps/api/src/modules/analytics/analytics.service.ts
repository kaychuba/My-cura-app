import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Read-only KPIs aggregated straight from the operational tables.
 * One round-trip per block; all scoped by tenant.
 */
@Injectable()
export class AnalyticsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async overview(tenantId: string) {
    const one = async (sql: string, params: unknown[] = []): Promise<Record<string, string>> =>
      (await this.dataSource.query(sql, [tenantId, ...params]))[0] ?? {};

    const people = await one(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'care_worker' AND status = 'active') AS active_workers,
        (SELECT COUNT(*) FROM service_users WHERE tenant_id = $1 AND status = 'active') AS active_service_users
    `);

    const shifts = await one(`
      SELECT
        COUNT(*) FILTER (WHERE scheduled_start::date = CURRENT_DATE) AS today_total,
        COUNT(*) FILTER (WHERE scheduled_start::date = CURRENT_DATE AND status = 'completed') AS today_completed,
        COUNT(*) FILTER (WHERE scheduled_start >= date_trunc('week', CURRENT_DATE)
                         AND scheduled_start < date_trunc('week', CURRENT_DATE) + interval '7 days') AS this_week
      FROM shifts WHERE tenant_id = $1
    `);

    const mar = await one(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('given','self_administered','parent_administered','administered_by_gp')) AS given,
        COUNT(*) FILTER (WHERE status = 'scheduled') AS pending,
        COUNT(*) FILTER (WHERE status = 'refused') AS refused,
        COUNT(*) FILTER (WHERE status IN ('not_administered','not_available')) AS missed
      FROM mar_records WHERE tenant_id = $1 AND scheduled_at::date = CURRENT_DATE
    `);

    const alerts = await one(`
      SELECT
        (SELECT COUNT(*) FROM visit_notes WHERE tenant_id = $1
           AND escalation_status IN ('raised','acknowledged')) AS open_escalations,
        (SELECT COUNT(*) FROM leave_requests WHERE tenant_id = $1 AND status = 'pending') AS pending_leave,
        (SELECT COUNT(*) FROM expenses WHERE tenant_id = $1 AND status = 'submitted') AS pending_expenses,
        (SELECT COUNT(*) FROM training_records WHERE tenant_id = $1 AND status = 'completed'
           AND expires_at BETWEEN NOW() AND NOW() + interval '30 days') AS training_expiring_30d,
        (SELECT COUNT(*) FROM whistleblowing_reports WHERE tenant_id = $1 AND status = 'submitted') AS open_whistleblowing
    `);

    const n = (v: string | undefined) => Number(v ?? 0);
    const marGiven = n(mar['given']);
    const marTotal = marGiven + n(mar['refused']) + n(mar['missed']);

    return {
      people: {
        activeWorkers: n(people['active_workers']),
        activeServiceUsers: n(people['active_service_users']),
      },
      shifts: {
        todayTotal: n(shifts['today_total']),
        todayCompleted: n(shifts['today_completed']),
        thisWeek: n(shifts['this_week']),
      },
      medication: {
        givenToday: marGiven,
        pendingToday: n(mar['pending']),
        refusedToday: n(mar['refused']),
        missedToday: n(mar['missed']),
        complianceToday: marTotal > 0 ? Math.round((marGiven / marTotal) * 100) : 100,
      },
      attention: {
        openEscalations: n(alerts['open_escalations']),
        pendingLeave: n(alerts['pending_leave']),
        pendingExpenses: n(alerts['pending_expenses']),
        trainingExpiring30d: n(alerts['training_expiring_30d']),
        openWhistleblowing: n(alerts['open_whistleblowing']),
      },
    };
  }
}
