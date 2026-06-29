import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface CareSummaryInput {
  serviceUserName: string;
  periodLabel: string;
  visitNotes: Array<{
    date: string;
    careWorker: string;
    narrative: string;
    mood?: string;
    fluidIntakeMl?: number;
    escalationLevel?: string;
  }>;
  marRecords: Array<{
    medicationName: string;
    complianceRate: number;
    missedCount: number;
  }>;
  incidents: Array<{
    date: string;
    type: string;
    severity: string;
    description: string;
  }>;
}

export interface CareSummaryOutput {
  summary: string;
  keyObservations: string[];
  medicationCompliance: string;
  riskFlags: string[];
  recommendedActions: string[];
}

export interface ShiftSuggestion {
  careWorkerId: string;
  careWorkerName: string;
  distanceKm: number;
  matchScore: number;
  reason: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('app.anthropicApiKey'),
    });
  }

  async generateCareSummary(input: CareSummaryInput): Promise<CareSummaryOutput> {
    const visitNotesText = input.visitNotes
      .map(
        (v) =>
          `Date: ${v.date} | Care Worker: ${v.careWorker} | Mood: ${v.mood ?? 'not recorded'} | ` +
          `Fluid intake: ${v.fluidIntakeMl ? `${v.fluidIntakeMl}ml` : 'not recorded'} | ` +
          `${v.escalationLevel ? `ESCALATION (${v.escalationLevel}) | ` : ''}` +
          `Notes: ${v.narrative}`,
      )
      .join('\n\n');

    const marText = input.marRecords
      .map((m) => `${m.medicationName}: ${m.complianceRate}% compliance (${m.missedCount} missed)`)
      .join('\n');

    const incidentText =
      input.incidents.length > 0
        ? input.incidents
            .map((i) => `${i.date}: ${i.type} (${i.severity}) — ${i.description}`)
            .join('\n')
        : 'No incidents recorded';

    const prompt = `You are a professional care coordinator writing a weekly summary for a care agency in the UK.
Write a concise, factual, person-centred summary for the following service user and period.

Service User: ${input.serviceUserName}
Period: ${input.periodLabel}

VISIT NOTES:
${visitNotesText}

MEDICATION COMPLIANCE:
${marText || 'No medications recorded'}

INCIDENTS:
${incidentText}

Respond ONLY with a JSON object in this exact format:
{
  "summary": "2-3 paragraph professional narrative summary",
  "keyObservations": ["observation 1", "observation 2", "observation 3"],
  "medicationCompliance": "One sentence summary of medication compliance",
  "riskFlags": ["risk 1", "risk 2"],
  "recommendedActions": ["action 1", "action 2"]
}`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return JSON.parse(text) as CareSummaryOutput;
  }

  async detectMARAnomaly(
    medicationName: string,
    recentStatuses: string[],
    expectedFrequency: string,
  ): Promise<{ hasAnomaly: boolean; anomalyDescription?: string; severity?: 'low' | 'medium' | 'high' }> {
    const missedCount = recentStatuses.filter((s) => s === 'omitted' || s === 'refused').length;
    const total = recentStatuses.length;
    const missRate = total > 0 ? missedCount / total : 0;

    if (missRate >= 0.5) {
      return {
        hasAnomaly: true,
        anomalyDescription: `${medicationName} has been missed or refused ${missedCount} of the last ${total} doses (${Math.round(missRate * 100)}% miss rate)`,
        severity: missRate >= 0.75 ? 'high' : 'medium',
      };
    }

    return { hasAnomaly: false };
  }

  async suggestReplacementWorkers(
    shiftId: string,
    serviceUserLocation: { lat: number; lon: number },
    requiredSkills: string[],
    availableWorkers: Array<{
      id: string;
      name: string;
      lat: number;
      lon: number;
      skills: string[];
      hoursThisWeek: number;
    }>,
  ): Promise<ShiftSuggestion[]> {
    const suggestions: ShiftSuggestion[] = [];

    for (const worker of availableWorkers) {
      // Simple distance approximation (Haversine is in shared-utils but not available here)
      const dLat = (worker.lat - serviceUserLocation.lat) * (Math.PI / 180);
      const dLon = (worker.lon - serviceUserLocation.lon) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(serviceUserLocation.lat * (Math.PI / 180)) *
          Math.cos(worker.lat * (Math.PI / 180)) *
          Math.sin(dLon / 2) ** 2;
      const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      // Skill match score
      const matchedSkills = requiredSkills.filter((s) => worker.skills.includes(s));
      const skillScore = requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 1;

      // Hours score (penalise over 40h/week)
      const hoursScore = Math.max(0, 1 - (worker.hoursThisWeek - 30) / 20);

      // Distance score (0 = 30km+, 1 = 0km)
      const distScore = Math.max(0, 1 - distanceKm / 30);

      const matchScore = Math.round((skillScore * 0.5 + hoursScore * 0.2 + distScore * 0.3) * 100);

      if (matchScore >= 30) {
        suggestions.push({
          careWorkerId: worker.id,
          careWorkerName: worker.name,
          distanceKm: Math.round(distanceKm * 10) / 10,
          matchScore,
          reason: `${Math.round(skillScore * 100)}% skill match, ${Math.round(distanceKm)}km away, ${worker.hoursThisWeek}h this week`,
        });
      }
    }

    return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }
}
