/**
 * FMCSA HOS rules engine — runs entirely in the browser on log data.
 * §395.3 Property-carrying rules:
 *   - 11-hour driving limit
 *   - 14-hour on-duty window
 *   - 70-hour/8-day limit
 *   - 30-minute break (after 8 hrs driving)
 *   - 10-hour off-duty reset
 */

export interface HosViolation {
  type: string;
  description: string;
  severity: "critical" | "warning";
  date: string;
  value?: number;
  limit?: number;
}

export interface DaySummary {
  date: string;
  drivingMin: number;
  onDutyMin: number;
  offDutyMin: number;
  sleeperMin: number;
  entries: { status: string; durationMin: number }[];
  violations: HosViolation[];
}

function statusToDuty(status: string): "driving" | "on_duty" | "off_duty" | "sleeper" | "pc" {
  const s = (status ?? "").toUpperCase().replace(/-/g, "").replace(/ /g, "");
  if (s === "D" || s === "DR" || s === "DRIVING") return "driving";
  if (s === "ON" || s === "ONDUTY" || s === "OD") return "on_duty";
  if (s === "SB" || s === "SLEEPER" || s === "SLEEPERBERTH") return "sleeper";
  if (s === "PC" || s === "PERSONALCONVEYANCE") return "pc";
  return "off_duty";
}

export function analyzeDays(days: DaySummary[]): HosViolation[] {
  const all: HosViolation[] = [];

  // Sorted chronologically
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i];
    const viol: HosViolation[] = [];

    // 11-hr driving
    if (day.drivingMin > 660) {
      viol.push({
        type: "11HR_DRIVING",
        description: `Driving ${(day.drivingMin / 60).toFixed(1)}h exceeds 11h limit`,
        severity: "critical",
        date: day.date,
        value: day.drivingMin,
        limit: 660,
      });
    }

    // 14-hr window
    const activeMin = day.drivingMin + day.onDutyMin;
    if (activeMin > 840) {
      viol.push({
        type: "14HR_WINDOW",
        description: `On-duty window ${(activeMin / 60).toFixed(1)}h exceeds 14h limit`,
        severity: "critical",
        date: day.date,
        value: activeMin,
        limit: 840,
      });
    }

    // 30-min break: if driving ≥ 8h, must have had ≥30 min off/SB break
    if (day.drivingMin >= 480) {
      const hasBreak = day.entries.some(
        (e) => (statusToDuty(e.status) === "off_duty" || statusToDuty(e.status) === "sleeper") && e.durationMin >= 30
      );
      if (!hasBreak) {
        viol.push({
          type: "30MIN_BREAK",
          description: `No 30-min break found after ≥8h driving`,
          severity: "warning",
          date: day.date,
        });
      }
    }

    // 70-hr / 8-day: sum previous 7 days + today
    const window8 = sorted.slice(Math.max(0, i - 7), i + 1);
    const total70 = window8.reduce((s, d) => s + d.drivingMin + d.onDutyMin, 0);
    if (total70 > 4200) {
      viol.push({
        type: "70HR_8DAY",
        description: `70-hr/8-day total ${(total70 / 60).toFixed(1)}h exceeds 70h limit`,
        severity: "critical",
        date: day.date,
        value: total70,
        limit: 4200,
      });
    }

    day.violations = viol;
    all.push(...viol);
  }

  return all;
}

export function buildDaySummary(date: string, entries: any[]): DaySummary {
  let drivingMin = 0, onDutyMin = 0, offDutyMin = 0, sleeperMin = 0;
  const normalized: { status: string; durationMin: number }[] = [];

  for (const e of entries) {
    const status = e.status ?? e.event_type ?? e.duty_status ?? "";
    const durMin =
      (e.duration ?? 0) > 0
        ? e.duration
        : e.duration_minutes ?? e.durationMinutes ?? 0;

    const duty = statusToDuty(status);
    if (duty === "driving") drivingMin += durMin;
    else if (duty === "on_duty") onDutyMin += durMin;
    else if (duty === "sleeper") sleeperMin += durMin;
    else offDutyMin += durMin;

    normalized.push({ status, durationMin: durMin });
  }

  return {
    date,
    drivingMin,
    onDutyMin,
    offDutyMin,
    sleeperMin,
    entries: normalized,
    violations: [],
  };
}
