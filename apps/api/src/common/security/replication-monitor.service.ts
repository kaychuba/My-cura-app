import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecurityMonitorService } from './security-monitor.service';

const CHECK_INTERVAL_MS = 5 * 60_000;
const MAX_LAG_BYTES = 64 * 1024 * 1024;

/**
 * Watches pg_stat_replication on the primary and raises an ops alert when the
 * standby disappears or falls behind. Opt-in (REPLICATION_MONITOR=true) since
 * dev machines have no replica, and the DB role needs pg_monitor:
 *   GRANT pg_monitor TO mycura_app;
 */
@Injectable()
export class ReplicationMonitorService {
  private readonly logger = new Logger('ReplicationMonitor');
  private readonly enabled: boolean;
  private wasHealthy = true;

  constructor(
    config: ConfigService,
    private readonly monitor: SecurityMonitorService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.enabled = config.get('REPLICATION_MONITOR') === 'true';
  }

  @Interval(CHECK_INTERVAL_MS)
  async check(): Promise<void> {
    if (!this.enabled) return;
    try {
      const rows: { state: string; lag: string | null }[] = await this.dataSource.query(
        `SELECT state, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)::text AS lag
         FROM pg_stat_replication`,
      );
      const streaming = rows.filter((r) => r.state === 'streaming');
      const healthy =
        streaming.length > 0 && streaming.every((r) => Number(r.lag ?? 0) < MAX_LAG_BYTES);

      if (!healthy && this.wasHealthy) {
        await this.monitor.alertOps(
          'Database replication unhealthy',
          rows.length === 0
            ? 'No replicas connected to the primary.'
            : `States: ${rows.map((r) => `${r.state} (lag ${r.lag ?? '?'} bytes)`).join(', ')}`,
        );
      }
      this.wasHealthy = healthy;
    } catch (err) {
      this.logger.warn(
        `Replication check failed (does the app role have pg_monitor?): ${(err as Error).message}`,
      );
    }
  }
}
