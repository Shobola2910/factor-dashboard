"use client";
import { useState } from "react";
import { fetchDriversSimple, fetchDriverLogs } from "@/lib/client-api";
import CompanySelector from "@/components/CompanySelector";
import Spinner from "@/components/Spinner";
import { subDays, format } from "date-fns";

interface LogError {
  driverName: string;
  date: string;
  type: "DISCONNECTED_DRIVING" | "OVERSPEEDING" | "LOCATION_JUMP";
  description: string;
  detail: string;
}

const SPEED_LIMIT = 75; // mph
const LOCATION_JUMP_KM = 300; // km in 1 event = suspicious

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scanLogs(driverName: string, date: string, entries: any[]): LogError[] {
  const errors: LogError[] = [];
  let prevLat: number | null = null;
  let prevLon: number | null = null;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const status = (e.status ?? e.event_type ?? "").toUpperCase();
    const speed = e.speed ?? e.maxSpeed ?? e.avg_speed ?? 0;
    const lat = e.lat ?? e.latitude;
    const lon = e.lng ?? e.lon ?? e.longitude;

    // Disconnected driving: driving event with no GPS / device error flag
    if (
      (status === "D" || status === "DR" || status === "DRIVING") &&
      (e.malfunctions?.length > 0 || e.unidentified || e.is_unidentified)
    ) {
      errors.push({
        driverName,
        date,
        type: "DISCONNECTED_DRIVING",
        description: "Driving event with malfunction or unidentified flag",
        detail: `Event ${i + 1}: ${status} — ${e.malfunctions?.join(", ") ?? "unidentified"}`,
      });
    }

    // Overspeeding
    if (speed > SPEED_LIMIT) {
      errors.push({
        driverName,
        date,
        type: "OVERSPEEDING",
        description: `Speed ${speed} mph exceeds ${SPEED_LIMIT} mph limit`,
        detail: `Event ${i + 1}: ${status} at ${speed} mph`,
      });
    }

    // Location jump
    if (lat && lon && prevLat !== null && prevLon !== null) {
      const dist = haversineKm(prevLat, prevLon, lat, lon);
      if (dist > LOCATION_JUMP_KM) {
        errors.push({
          driverName,
          date,
          type: "LOCATION_JUMP",
          description: `GPS jump of ${Math.round(dist)} km between consecutive events`,
          detail: `Event ${i + 1}: (${prevLat.toFixed(2)},${prevLon.toFixed(2)}) → (${lat.toFixed(2)},${lon.toFixed(2)})`,
        });
      }
    }

    if (lat && lon) { prevLat = lat; prevLon = lon; }
  }
  return errors;
}

export default function ErrorsPage() {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errors, setErrors] = useState<LogError[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [days, setDays] = useState(3);

  async function runScan() {
    if (!companyId) return alert("Select a company");
    setLoading(true);
    setErrors([]);
    setProgress("Loading drivers…");

    try {
      const drivers = await fetchDriversSimple(companyId);
      const today = new Date();
      const dates = Array.from({ length: days }, (_, i) =>
        format(subDays(today, i + 1), "yyyy-MM-dd")
      );

      const allErrors: LogError[] = [];

      for (let i = 0; i < drivers.length; i++) {
        const drv = drivers[i];
        const driverId = drv.driver_id ?? drv.id;
        const driverName = drv.driver_name ?? drv.name ?? driverId;
        setProgress(`Scanning ${i + 1}/${drivers.length}: ${driverName}`);

        for (const date of dates) {
          try {
            const entries = await fetchDriverLogs(companyId, driverId, date);
            const found = scanLogs(driverName, date, entries);
            allErrors.push(...found);
          } catch { /* skip */ }
        }
      }

      setErrors(allErrors);
      setProgress(`Done — ${allErrors.length} errors found`);
    } catch (e: any) {
      setProgress(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const typeColors: Record<string, string> = {
    DISCONNECTED_DRIVING: "badge-red",
    OVERSPEEDING: "badge-yellow",
    LOCATION_JUMP: "badge-blue",
  };

  const byType = {
    DISCONNECTED_DRIVING: errors.filter((e) => e.type === "DISCONNECTED_DRIVING").length,
    OVERSPEEDING: errors.filter((e) => e.type === "OVERSPEEDING").length,
    LOCATION_JUMP: errors.filter((e) => e.type === "LOCATION_JUMP").length,
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Log Errors</h1>
          <p className="text-gray-500 text-sm mt-1">Disconnected driving · Overspeeding · GPS jumps</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CompanySelector value={companyId} onChange={(id, name) => { setCompanyId(id); setCompanyName(name); }} />
          <select className="field w-28" value={days} onChange={(e) => setDays(+e.target.value)}>
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
          </select>
          <button onClick={runScan} disabled={loading} className="btn-primary">
            {loading ? <Spinner size={4} /> : null} Scan
          </button>
        </div>
      </div>

      {progress && (
        <div className="mb-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg px-4 py-2">
          {loading && <span className="inline-block w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />}
          {progress}
        </div>
      )}

      {errors.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="card"><p className="text-xs text-gray-500 mb-1">Disconnected Driving</p><p className="text-3xl font-bold text-red-400">{byType.DISCONNECTED_DRIVING}</p></div>
            <div className="card"><p className="text-xs text-gray-500 mb-1">Overspeeding</p><p className="text-3xl font-bold text-yellow-400">{byType.OVERSPEEDING}</p></div>
            <div className="card"><p className="text-xs text-gray-500 mb-1">Location Jumps</p><p className="text-3xl font-bold text-blue-400">{byType.LOCATION_JUMP}</p></div>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-800/40">
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Error Type</th>
                  <th className="px-5 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={i} className="border-b border-gray-800/50 table-row-hover">
                    <td className="px-5 py-2 text-gray-200">{e.driverName}</td>
                    <td className="px-5 py-2 text-gray-400">{e.date}</td>
                    <td className="px-5 py-2"><span className={typeColors[e.type] ?? "badge-gray"}>{e.type}</span></td>
                    <td className="px-5 py-2 text-gray-400 text-xs">{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && errors.length === 0 && progress && (
        <div className="card text-center py-12 text-green-400">
          <p className="text-lg font-semibold">✓ No errors detected</p>
          <p className="text-sm text-gray-500 mt-1">All log events appear clean</p>
        </div>
      )}
    </div>
  );
}
