"use client";
import { useState } from "react";
import { fetchCompanies, fetchDriversSimple, fetchDriverLogs } from "@/lib/client-api";
import { buildDaySummary, analyzeDays } from "@/lib/hos";
import CompanySelector from "@/components/CompanySelector";
import Spinner from "@/components/Spinner";
import { subDays, format, eachDayOfInterval } from "date-fns";

interface Result {
  driverName: string;
  driverId: string;
  violations: ReturnType<typeof analyzeDays>;
}

export default function ViolationsPage() {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [days, setDays] = useState(8);

  async function runScan() {
    if (!companyId) return alert("Select a company");
    setLoading(true);
    setResults([]);
    setProgress("Loading drivers…");

    try {
      const drivers = await fetchDriversSimple(companyId);
      const today = new Date();
      const dateRange = eachDayOfInterval({ start: subDays(today, days), end: today })
        .map((d) => format(d, "yyyy-MM-dd"));

      const out: Result[] = [];

      for (let i = 0; i < drivers.length; i++) {
        const drv = drivers[i];
        const driverId = drv.driver_id ?? drv.id;
        const driverName = drv.driver_name ?? drv.name ?? driverId;
        setProgress(`Scanning ${i + 1}/${drivers.length}: ${driverName}`);

        const days8: ReturnType<typeof buildDaySummary>[] = [];
        for (const date of dateRange) {
          try {
            const entries = await fetchDriverLogs(companyId, driverId, date);
            days8.push(buildDaySummary(date, entries));
          } catch { /* skip */ }
        }

        const viols = analyzeDays(days8);
        if (viols.length > 0) {
          out.push({ driverName, driverId, violations: viols });
        }
      }

      setResults(out.sort((a, b) => b.violations.length - a.violations.length));
      setProgress(`Done — ${out.length} drivers with violations`);
    } catch (e: any) {
      setProgress(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const totalViol = results.reduce((s, r) => s + r.violations.length, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">HOS Violations</h1>
          <p className="text-gray-500 text-sm mt-1">FMCSA §395.3 compliance check</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CompanySelector value={companyId} onChange={(id, name) => { setCompanyId(id); setCompanyName(name); }} />
          <select className="field w-32" value={days} onChange={(e) => setDays(+e.target.value)}>
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={8}>8 days</option>
            <option value={14}>14 days</option>
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

      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card"><p className="text-xs text-gray-500 mb-1">Drivers with Violations</p><p className="text-3xl font-bold text-red-400">{results.length}</p></div>
          <div className="card"><p className="text-xs text-gray-500 mb-1">Total Violations</p><p className="text-3xl font-bold text-yellow-400">{totalViol}</p></div>
          <div className="card"><p className="text-xs text-gray-500 mb-1">Critical</p><p className="text-3xl font-bold text-red-500">{results.flatMap(r=>r.violations).filter(v=>v.severity==="critical").length}</p></div>
        </div>
      )}

      {results.map((r) => (
        <div key={r.driverId} className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-100">{r.driverName}</h3>
            <div className="flex gap-2">
              <span className="badge-red">{r.violations.filter(v=>v.severity==="critical").length} critical</span>
              <span className="badge-yellow">{r.violations.filter(v=>v.severity==="warning").length} warnings</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left pb-2 pr-4">Date</th>
                <th className="text-left pb-2 pr-4">Type</th>
                <th className="text-left pb-2 pr-4">Description</th>
                <th className="text-left pb-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {r.violations.map((v, i) => (
                <tr key={i} className="border-b border-gray-800/40">
                  <td className="py-1.5 pr-4 text-gray-400">{v.date}</td>
                  <td className="py-1.5 pr-4 font-mono text-xs text-blue-300">{v.type}</td>
                  <td className="py-1.5 pr-4 text-gray-300">{v.description}</td>
                  <td className="py-1.5">
                    <span className={v.severity === "critical" ? "badge-red" : "badge-yellow"}>{v.severity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {!loading && results.length === 0 && progress && (
        <div className="card text-center py-12 text-green-400">
          <p className="text-lg font-semibold">✓ No violations found</p>
          <p className="text-sm text-gray-500 mt-1">All drivers are compliant for the selected period</p>
        </div>
      )}
    </div>
  );
}
