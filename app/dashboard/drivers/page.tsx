"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchDriversSimple, fetchCompanies } from "@/lib/client-api";
import CompanySelector from "@/components/CompanySelector";
import Spinner from "@/components/Spinner";

function DriversContent() {
  const params = useSearchParams();
  const [companyId, setCompanyId] = useState(params.get("company") ?? "");
  const [companyName, setCompanyName] = useState(params.get("name") ?? "");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetchDriversSimple(companyId)
      .then(setDrivers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  const filtered = drivers.filter((d) =>
    (d.driver_name ?? d.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.vehicle_number ?? "").includes(search)
  );

  function statusColor(s: any) {
    if (s === true || s === "active") return "badge-green";
    if (s === false || s === "inactive") return "badge-gray";
    return "badge-yellow";
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {companyName || "Select a company"} — {drivers.length} drivers
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CompanySelector
            value={companyId}
            onChange={(id, name) => { setCompanyId(id); setCompanyName(name); }}
          />
          <input
            className="field w-52"
            placeholder="Search drivers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={8} /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-800/40">
                <th className="px-5 py-3">Driver Name</th>
                <th className="px-5 py-3">Vehicle #</th>
                <th className="px-5 py-3">VIN</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Driver ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.driver_id ?? i} className="border-b border-gray-800/50 table-row-hover">
                  <td className="px-5 py-3 font-medium text-gray-100">{d.driver_name ?? d.name ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-300">{d.vehicle_number ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{d.vin ? d.vin.slice(-6) : "—"}</td>
                  <td className="px-5 py-3">
                    <span className={statusColor(d.status)}>
                      {d.status === true ? "Active" : d.status === false ? "Inactive" : String(d.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{(d.driver_id ?? "").slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <p className="text-center text-gray-600 py-12">
              {companyId ? "No drivers found" : "Select a company to view drivers"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DriversPage() {
  return (
    <Suspense fallback={<div className="p-8"><Spinner size={8} /></div>}>
      <DriversContent />
    </Suspense>
  );
}
