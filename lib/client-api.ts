/**
 * Client-side API helpers — call Next.js /api/proxy which forwards to drivehos.app
 */

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("factor_token") ?? "";
}

async function proxy(path: string, companyId?: string, method = "GET", body?: any) {
  const token = getToken();
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ path, method, body, companyId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? data?.message ?? `HTTP ${res.status}`);
  return data;
}

// ─── Companies ───────────────────────────────────────────────────────────────

export async function fetchCompanies() {
  const data = await proxy("/companies?status=active&limit=100&page=1&group=all");
  const raw = data?.data ?? data;
  if (Array.isArray(raw)) return raw;
  return raw?.items ?? raw?.companies ?? raw?.data ?? [];
}

export async function fetchCompany(companyId: string) {
  const data = await proxy(`/companies/${companyId}`, companyId);
  return data?.data ?? data;
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export async function fetchDriversSimple(companyId: string) {
  const data = await proxy("/drivers/simple-with-vehicles", companyId);
  const raw = data?.data ?? data;
  if (Array.isArray(raw)) return raw;
  // handle { items: [...] }
  return raw?.items ?? raw?.drivers ?? [];
}

export async function fetchDriversFull(companyId: string, page = 1) {
  const data = await proxy(`/drivers?status=active&limit=100&page=${page}`, companyId);
  const raw = data?.data ?? data;
  if (Array.isArray(raw)) return raw;
  const inner = raw?.drivers ?? raw?.items ?? raw?.data ?? [];
  return inner;
}

// ─── Logs ────────────────────────────────────────────────────────────────────

const LOG_PATTERNS = [
  (id: string, date: string) => `/drivers/${id}/logs?date=${date}`,
  (id: string, date: string) => `/driver/logs?driverId=${id}&date=${date}`,
  (id: string, date: string) => `/elogs?driverId=${id}&date=${date}`,
  (id: string, date: string) => `/driver/daily-logs-by-driver?driverId=${id}&date=${date}`,
  (id: string, date: string) => `/reports/driver-log?driverId=${id}&date=${date}`,
];

let _workingLogPattern: typeof LOG_PATTERNS[0] | null = null;

export async function fetchDriverLogs(companyId: string, driverId: string, date: string) {
  const patterns = _workingLogPattern ? [_workingLogPattern] : LOG_PATTERNS;
  for (const pat of patterns) {
    try {
      const data = await proxy(pat(driverId, date), companyId);
      const raw = data?.data ?? data;
      const entries = Array.isArray(raw)
        ? raw
        : raw?.entries ?? raw?.logs ?? raw?.events ?? raw?.items ?? [];
      _workingLogPattern = pat;
      return entries as any[];
    } catch {
      // try next pattern
    }
  }
  return [];
}

export async function fetchDriverHOS(
  companyId: string,
  driverId: string,
  startDate: string,
  endDate: string
) {
  const eps = [
    `/drivers/${driverId}/hos?startDate=${startDate}&endDate=${endDate}`,
    `/driver/hos?driverId=${driverId}&startDate=${startDate}&endDate=${endDate}`,
  ];
  for (const ep of eps) {
    try {
      const data = await proxy(ep, companyId);
      const raw = data?.data ?? data;
      return Array.isArray(raw) ? raw : (raw?.items ?? raw?.records ?? []);
    } catch {
      // try next
    }
  }
  return [];
}

// ─── Certify ─────────────────────────────────────────────────────────────────

export async function certifyDriverLog(companyId: string, driverId: string, date: string) {
  const eps = [
    { path: `/drivers/${driverId}/certify`, body: { date } },
    { path: `/drivers/${driverId}/logs/certify`, body: { date } },
    { path: `/certify`, body: { driver_id: driverId, date } },
  ];
  for (const { path, body } of eps) {
    try {
      const data = await proxy(path, companyId, "POST", body);
      return { ok: true, message: data?.message ?? "Certified" };
    } catch (e: any) {
      if (!e.message?.includes("404")) return { ok: false, message: e.message };
    }
  }
  return { ok: false, message: "Certify endpoint not found" };
}

// ─── Violations ──────────────────────────────────────────────────────────────

export async function fetchViolations(companyId: string, startDate: string, endDate: string) {
  const eps = [
    `/violations?startDate=${startDate}&endDate=${endDate}`,
    `/driver/violations?startDate=${startDate}&endDate=${endDate}`,
    `/hos-violations?from=${startDate}&to=${endDate}`,
  ];
  for (const ep of eps) {
    try {
      const data = await proxy(ep, companyId);
      const raw = data?.data ?? data;
      return Array.isArray(raw) ? raw : (raw?.violations ?? raw?.items ?? []);
    } catch {
      // try next
    }
  }
  return [];
}

// ─── Disconnected ────────────────────────────────────────────────────────────

export async function fetchDisconnected(companyId: string) {
  const eps = [
    `/drivers/disconnected`,
    `/devices/disconnected`,
    `/driver/disconnected`,
  ];
  for (const ep of eps) {
    try {
      const data = await proxy(ep, companyId);
      const raw = data?.data ?? data;
      return Array.isArray(raw) ? raw : (raw?.items ?? raw?.drivers ?? []);
    } catch {
      // try next
    }
  }
  return [];
}
