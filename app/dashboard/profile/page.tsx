"use client";
import { useState } from "react";
import { fetchDriversSimple, fetchDriverLogs } from "@/lib/client-api";
import CompanySelector from "@/components/CompanySelector";
import Spinner from "@/components/Spinner";
import { subDays, format, parseISO, differenceInDays } from "date-fns";

interface ProfileFlag {
  driverName: string;
  driverId: string;
  date: string;
  flag: "EMPTY_TRAILER" | "EMPTY_DOCUMENTS" | "SAME_PROFILE_5D" | "UNREVIEWED_NOTE";
  description: string;
}

export default function ProfileAuditPage() {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [flags, setFlags] = useState<ProfileFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  async function runAudit() {
    if (!companyId) return alert("Select a company");
    setLoading(true);
    setFlags([]);
    setProgress("Loading drivers…");

    try {
      const drivers = await fetchDriversSimple(companyId);
      const today = new Date();
      const dates = Array.from({ length: 8 }, (_, i) =>
        format(subDays(today, i + 1), "yyyy-MM-dd")
      );

      const allFlags: ProfileFlag[] = [];
      const profileHistory: Record<string, string[]> = {};

      for (let i = 0; i < drivers.length; i++) {
        const drv = drivers[i];
        const driverId = drv.driver_id ?? drv.id;
        const driverName = drv.driver_name ?? drv.name ?? driverId;
        setProgress(`Auditing ${i + 1}/${drivers.length}: ${driverName}`);

        profileHistory[driverId] = [];

        for (const date of dates) {
          try {
            const entries = await fetchDriverLogs(companyId, driverId, date);

            for (const e of entries) {
              const status = (e.status ?? "").toUpperCase();
              const trailer = e.trailer ?? e.trailer_number ?? e.trailer_id ?? "";
              const docs = e.documents ?? e.shipping_docs ?? e.manifest ?? "";
              const note = e.annotation ?? e.note ?? e.comment ?? "";
              const profileStr = `${trailer}|${docs}`;

              // Track profile string per day
              profileHistory[driverId].push(profileStr);

              // Empty trailer while on-duty/driving
              if ((status === "D" || status === "ON" || status === "OD") && !trailer) {
                allFlags.push({
                  driverName, driverId, date,
                  flag: "EMPTY_TRAILER",
                  description: "No trailer number while driving/on-duty",
                });
                break;
              }

              // Empty documents while on-duty/driving
              if ((status === "D" || status === "ON") && !docs) {
                allFlags.push({
                  driverName, driverId, date,
                  flag: "EMPTY_DOCUMENTS",
                  description: "No shipping documents while on-duty",
                });
                break;
              }

              // Note on Off/SB/PC status
              if ((status === "OFF" || status === "SB" || status === "PC") && note && !note.toLowerCase().includes("inspect")) {
                allFlags.push({
                  driverName, driverId, date,
                  flag: "UNREVIEWED_NOTE",
                  description: `Annotation on ${status} event: "${note.slice(0, 60)}"`,
                });
              }
            }

            // Check same profile ≥ 5 consecutive days
            if (profileHistory[driverId].length >= 5) {
              const last5 = profileHistory[driverId].slice(-5);
              if (last5.every((p) => p === last5[0]) && last5[0] !== "|") {
                allFlags.push({
                  driverName, driverId, date,
                  flag: "SAME_PROFILE_5D",
                  description: "Identical trailer/docs profile for ≥5 consecutive days",
                });
              }
            }
          } catch { /* skip */ }
        }
      }

      // Deduplicate same-flag same-driver
      const seen = new Set<string>();
      const deduped = allFlags.filter((f) => {
        const key = `${f.driverId}|${f.flag}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setFlags(deduped);
      setProgress(`Done — ${deduped.length} profile issues found`);
    } catch (e: any) {
      setProgress(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const flagColors: Record<string, string> = {
    EMPTY_TRAILER: "badge-red",
    EMPTY_DOCUMENTS: "badge-yellow",
    SAME_PROFILE_5D: "badge-blue",
    UNREVIEWED_NOTE: "badge-gray",
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Audit</h1>
          <p className="text-gray-500 text-sm mt-1">Last 8 days — trailer, docs, profile staleness, notes</p>
        </div>
        <div className="flex items-center gap-3">
          <CompanySelector value={companyId} onChange={(id, name) => { setCompanyId(id); setCompanyName(name); }} />
          <button onClick={runAudit} disabled={loading} className="btn-primary">
            {loading ? <Spinner size={4} /> : null} Audit
          </button>
        </div>
      </div>

      {progress && (
        <div className="mb-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg px-4 py-2">
          {loading && <span className="inline-block w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />}
          {progress}
        </div>
      )}

      {flags.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-800/40">
                <th className="px-5 py-3">Driver</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Flag</th>
                <th className="px-5 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f, i) => (
                <tr key={i} className="border-b border-gray-800/50 table-row-hover">
                  <td className="px-5 py-2 text-gray-200">{f.driverName}</td>
                  <td className="px-5 py-2 text-gray-400">{f.date}</td>
                  <td className="px-5 py-2"><span className={flagColors[f.flag] ?? "badge-gray"}>{f.flag}</span></td>
                  <td className="px-5 py-2 text-gray-400 text-xs">{f.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && flags.length === 0 && progress && (
        <div className="card text-center py-12 text-green-400">
          <p className="text-lg font-semibold">✓ No profile issues found</p>
          <p className="text-sm text-gray-500 mt-1">All driver profiles look clean</p>
        </div>
      )}
    </div>
  );
}
