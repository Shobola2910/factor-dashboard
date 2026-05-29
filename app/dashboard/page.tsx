"use client";
import { useState, useEffect } from "react";
import { fetchCompanies, fetchDriversSimple, fetchViolations } from "@/lib/client-api";
import { subDays, format } from "date-fns";
import Spinner from "@/components/Spinner";

interface Stats {
  companies: number;
  drivers: number;
  violations: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentViolations, setRecentViolations] = useState<any[]>([]);
  const today = format(new Date(), "yyyy-MM-dd");
  const d8 = format(subDays(new Date(), 8), "yyyy-MM-dd");

  async function runQuickScan() {
    setLoading(true);
    try {
      const companies = await fetchCompanies();
      let totalDrivers = 0;
      let totalViolations = 0;
      const allViol: any[] = [];

      // Quick: first 3 companies only
      for (const c of companies.slice(0, 3)) {
        const cid = c.uuid ?? c.company_uuid ?? c.company_id ?? c.external_id ?? String(c.id ?? "");
        try {
          const drivers = await fetchDriversSimple(cid);
          totalDrivers += drivers.length;
          const viols = await fetchViolations(cid, d8, today);
          totalViolations += viols.length;
          allViol.push(...viols.slice(0, 5));
        } catch { /* skip */ }
      }

      setStats({ companies: companies.length, drivers: totalDrivers, violations: totalViolations });
      setRecentViolations(allViol.slice(0, 10));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runFullScan() {
    setLoading(true);
    try {
      const companies = await fetchCompanies();
      let totalDrivers = 0;
      let totalViolations = 0;
      const allViol: any[] = [];

      for (const c of companies) {
        const cid = c.uuid ?? c.company_uuid ?? c.company_id ?? c.external_id ?? String(c.id ?? "");
        try {
          const drivers = await fetchDriversSimple(cid);
          totalDrivers += drivers.length;
          const viols = await fetchViolations(cid, d8, today);
          totalViolations += viols.length;
          allViol.push(...viols);
        } catch { /* skip */ }
      }

      setStats({ companies: companies.length, drivers: totalDrivers, violations: totalViolations });
      setRecentViolations(allViol.slice(0, 20));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: "Companies", value: stats?.companies ?? "—", color: "blue" },
    { label: "Active Drivers", value: stats?.drivers ?? "—", color: "green" },
    { label: "HOS Violations (8d)", value: stats?.violations ?? "—", color: stats?.violations ? "red" : "gray" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Factor ELD — Compliance Overview</p>
        </div>
        <div className="flex gap-3">
          <button onClick={runQuickScan} disabled={loading} className="btn-secondary">
            {loading ? <Spinner size={4} /> : null}
            Quick Scan
          </button>
          <button onClick={runFullScan} disabled={loading} className="btn-primary">
            {loading ? <Spinner size={4} /> : null}
            Full Scan
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-4xl font-bold ${
              s.color === "red" ? "text-red-400" :
              s.color === "green" ? "text-green-400" :
              s.color === "blue" ? "text-blue-400" : "text-gray-400"
            }`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent violations */}
      {recentViolations.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Violations</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                <th className="pb-2 pr-4">Driver</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {recentViolations.map((v, i) => (
                <tr key={i} className="border-b border-gray-800/50 table-row-hover">
                  <td className="py-2 pr-4 text-gray-200">{v.driver_name ?? v.driverName ?? "—"}</td>
                  <td className="py-2 pr-4 text-gray-400">{v.date ?? "—"}</td>
                  <td className="py-2 pr-4 text-gray-300 font-mono text-xs">{v.violation_type ?? v.type ?? "—"}</td>
                  <td className="py-2">
                    <span className={v.severity === "critical" ? "badge-red" : "badge-yellow"}>
                      {v.severity ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!stats && !loading && (
        <div className="card text-center text-gray-600 py-16">
          <p className="text-lg mb-2">No data yet</p>
          <p className="text-sm">Click Quick Scan or Full Scan to load compliance data</p>
        </div>
      )}
    </div>
  );
}
