/**
 * Factor ELD API client
 * Base: https://api.drivehos.app/api/v1
 * Auth: Bearer JWT + tenant_id header + company_id header
 */

const API_BASE = process.env.FACTOR_API_BASE || "https://api.drivehos.app/api/v1";
const DEFAULT_TENANT = process.env.FACTOR_TENANT_ID || "96335ac3-5a93-4a29-af8b-08d874801325";

export function buildHeaders(token: string, companyId?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    tenant_id: DEFAULT_TENANT,
  };
  if (companyId) h.company_id = companyId;
  return h;
}

async function req<T>(
  path: string,
  token: string,
  companyId?: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...buildHeaders(token, companyId), ...(opts.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${path}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function loginWithPassword(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", tenant_id: DEFAULT_TENANT },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  // token may be in data.data.token, data.token, or data.access_token
  const raw = data?.data ?? data;
  return (raw?.token ?? raw?.access_token ?? raw?.jwt) as string;
}

// ─── Companies ──────────────────────────────────────────────────────────────

export async function getCompanies(token: string) {
  const data = await req<any>(
    "/companies?status=active&limit=100&page=1&group=all",
    token
  );
  const raw = data?.data ?? data;
  if (Array.isArray(raw)) return raw;
  return (raw?.items ?? raw?.companies ?? raw?.data ?? []) as any[];
}

export async function getCompany(token: string, companyId: string) {
  const data = await req<any>(`/companies/${companyId}`, token, companyId);
  return (data?.data ?? data) as any;
}

// ─── Drivers ────────────────────────────────────────────────────────────────

export async function getDriversSimple(token: string, companyId: string) {
  const data = await req<any>("/drivers/simple-with-vehicles", token, companyId);
  const raw = data?.data ?? data;
  if (Array.isArray(raw)) return raw;
  return (raw?.items ?? raw?.drivers ?? []) as any[];
}

export async function getDriversFull(
  token: string,
  companyId: string,
  page = 1,
  limit = 100
) {
  const data = await req<any>(
    `/drivers?status=active&limit=${limit}&page=${page}`,
    token,
    companyId
  );
  const raw = data?.data ?? data;
  if (Array.isArray(raw)) return raw;
  const items = raw?.drivers ?? raw?.items ?? raw?.data ?? [];
  return items as any[];
}

export async function getDriver(token: string, companyId: string, driverId: string) {
  const data = await req<any>(`/drivers/${driverId}`, token, companyId);
  return (data?.data ?? data) as any;
}

// ─── Logs / HOS ─────────────────────────────────────────────────────────────
// We try several known endpoint patterns and return the first that works.

const LOG_ENDPOINT_CANDIDATES = [
  (driverId: string, date: string) => `/drivers/${driverId}/logs?date=${date}`,
  (driverId: string, date: string) => `/driver/logs?driverId=${driverId}&date=${date}`,
  (driverId: string, date: string) => `/elogs?driverId=${driverId}&date=${date}`,
  (driverId: string, date: string) => `/driver/daily-logs-by-driver?driverId=${driverId}&date=${date}`,
  (driverId: string, date: string) => `/reports/driver-log?driverId=${driverId}&date=${date}`,
  (driverId: string, date: string) => `/logs/activity-logs?driverId=${driverId}&date=${date}`,
];

// Cache: once we find the working pattern, reuse it
let _workingLogPattern: ((id: string, date: string) => string) | null = null;

export async function getDriverLogs(
  token: string,
  companyId: string,
  driverId: string,
  date: string // YYYY-MM-DD
): Promise<any[]> {
  const patterns = _workingLogPattern
    ? [_workingLogPattern]
    : LOG_ENDPOINT_CANDIDATES;

  for (const pattern of patterns) {
    try {
      const data = await req<any>(pattern(driverId, date), token, companyId);
      const raw = data?.data ?? data;
      const entries = Array.isArray(raw)
        ? raw
        : (raw?.entries ?? raw?.logs ?? raw?.events ?? raw?.items ?? []);
      _workingLogPattern = pattern;
      return entries;
    } catch {
      // try next
    }
  }
  return [];
}

export async function getDriverHOS(
  token: string,
  companyId: string,
  driverId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const endpoints = [
    `/drivers/${driverId}/hos?startDate=${startDate}&endDate=${endDate}`,
    `/driver/hos?driverId=${driverId}&startDate=${startDate}&endDate=${endDate}`,
    `/hos?driverId=${driverId}&startDate=${startDate}&endDate=${endDate}`,
  ];
  for (const ep of endpoints) {
    try {
      const data = await req<any>(ep, token, companyId);
      const raw = data?.data ?? data;
      return Array.isArray(raw) ? raw : (raw?.items ?? raw?.records ?? []);
    } catch {
      // try next
    }
  }
  return [];
}

// ─── Certify ─────────────────────────────────────────────────────────────────

export async function certifyLog(
  token: string,
  companyId: string,
  driverId: string,
  date: string
): Promise<{ ok: boolean; message?: string }> {
  const endpoints = [
    `/drivers/${driverId}/certify`,
    `/drivers/${driverId}/logs/certify`,
    `/certify`,
  ];
  for (const ep of endpoints) {
    try {
      const body = ep === "/certify"
        ? JSON.stringify({ driver_id: driverId, date })
        : JSON.stringify({ date });
      const data = await req<any>(ep, token, companyId, { method: "POST", body });
      return { ok: true, message: data?.message ?? "Certified" };
    } catch (e: any) {
      if (!e.message?.includes("404")) return { ok: false, message: e.message };
    }
  }
  return { ok: false, message: "Endpoint not found" };
}

// ─── HOS Violations ──────────────────────────────────────────────────────────

export async function getViolations(
  token: string,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const endpoints = [
    `/violations?startDate=${startDate}&endDate=${endDate}`,
    `/driver/violations?startDate=${startDate}&endDate=${endDate}`,
    `/hos-violations?from=${startDate}&to=${endDate}`,
  ];
  for (const ep of endpoints) {
    try {
      const data = await req<any>(ep, token, companyId);
      const raw = data?.data ?? data;
      return Array.isArray(raw) ? raw : (raw?.items ?? raw?.violations ?? []);
    } catch {
      // try next
    }
  }
  return [];
}
