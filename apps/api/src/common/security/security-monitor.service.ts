import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SecurityEventKind =
  | 'login_failure'
  | 'forbidden'
  | 'server_error'
  | 'upload_rejected';

interface Threshold {
  count: number;
  windowMs: number;
  title: string;
}

const THRESHOLDS: Record<SecurityEventKind, Threshold> = {
  login_failure: { count: 10, windowMs: 5 * 60_000, title: 'Login failures spiking' },
  forbidden: { count: 5, windowMs: 5 * 60_000, title: 'Possible privilege-escalation probing (repeated 403s)' },
  server_error: { count: 20, windowMs: 5 * 60_000, title: 'API returning excessive 500s' },
  upload_rejected: { count: 10, windowMs: 5 * 60_000, title: 'Repeated malicious/invalid upload attempts' },
};

const ALERT_COOLDOWN_MS = 15 * 60_000;

/**
 * In-process sliding-window counters over security-relevant events, with a
 * webhook alert (Slack-compatible `{text}` POST to ALERT_WEBHOOK_URL) when a
 * threshold is crossed. Single-instance scope by design — multi-instance
 * deployments should also alert from the edge/APM (see docs/SECURITY.md §7).
 */
@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger('SecurityMonitor');
  private readonly events = new Map<string, number[]>();
  private readonly lastAlertAt = new Map<string, number>();
  private readonly webhookUrl?: string;

  constructor(config: ConfigService) {
    this.webhookUrl = config.get<string>('ALERT_WEBHOOK_URL');
  }

  /**
   * Record one occurrence of an event. `subject` scopes the counter (an IP,
   * a user id) so one noisy actor can't hide behind the global average —
   * both the per-subject and the global counters are checked.
   */
  record(kind: SecurityEventKind, subject?: string): void {
    const now = Date.now();
    this.bump(kind, `${kind}:*`, now);
    if (subject) this.bump(kind, `${kind}:${subject}`, now, subject);
  }

  /** Direct operational alert (backup failed, replication stopped, …). */
  async alertOps(title: string, detail: string): Promise<void> {
    await this.dispatch(`⚠️ ${title}`, detail);
  }

  private bump(kind: SecurityEventKind, key: string, now: number, subject?: string): void {
    const { count, windowMs, title } = THRESHOLDS[kind];
    const bucket = (this.events.get(key) ?? []).filter((t) => now - t < windowMs);
    bucket.push(now);
    this.events.set(key, bucket);

    if (bucket.length >= count) {
      const last = this.lastAlertAt.get(key) ?? 0;
      if (now - last >= ALERT_COOLDOWN_MS) {
        this.lastAlertAt.set(key, now);
        void this.dispatch(
          `🚨 ${title}`,
          `${bucket.length} × ${kind} in ${Math.round(windowMs / 60_000)} min` +
            (subject ? ` from ${subject}` : ' (all sources)'),
        );
      }
    }
  }

  private async dispatch(title: string, detail: string): Promise<void> {
    this.logger.error(`${title} — ${detail}`);
    if (!this.webhookUrl) return;
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${title}\n${detail}` }),
      });
    } catch (err) {
      this.logger.warn(`Alert webhook unreachable: ${(err as Error).message}`);
    }
  }
}
