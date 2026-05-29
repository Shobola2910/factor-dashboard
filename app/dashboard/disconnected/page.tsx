"use client";
import { useState } from "react";
import { fetchDriversSimple } from "@/lib/client-api";
import CompanySelector from "@/components/CompanySelector";
import Spinner from "@/components/Spinner";
import { subHours, parseISO, formatDistanceToNow } from "date-fns";

export default function DisconnectedPage() {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  async function runScan() {
    if (!companyId) return alert("Select a company");
    setLoading(true);
    setScanned(false);
    try {
      // Get all drivers and flag those with no recent ELD data
      const drivers = await fetchDriversSimple(companyId);

      // Drivers with no vehicle or inactive are likely disconnected
      const disconnected = drivers.filter((d: any) => {
        const inactive = d.status === false || d.status === "inactive";
        const noVehicle = !d.vehicle_id || d.vehicle_id === "";
        const lastSeen = d.last_seen ?? d.lastSeen ?? d.last_activity;
        const stale = lastSeen
          ? new Date(lastSeen) < subHours(new Date(), 24)
          : false;
        return inactive || noVehicle || stale;
      });

      setResults(disconnected);
      setScanned(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Disconnected Drivers</h1>
          <p className="text-gray-500 text-sm mt-1">ELD devices with no recent activity</p>
        </div>
        <div className="flex items-center gap-3">
          <CompanySelector value={companyId} onChange={(id, name) => { setCompanyId(id); setCompanyName(name); }} />
          <button onClick={runScan} disabled={loading} className="btn-primary">
            {loading ? <Spinner size={4} /> : null} Scan
          </button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner size={8} /></div>}

      {scanned && !loading && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Disconnected</p>
              <p className={`text-4xl font-bold ${results.length > 0 ? "text-red-400" : "text-green-400"}`}>{results.length}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className={`text-lg font-semibold mt-2 ${results.length > 0 ? "text-red-400" : "text-green-400"}`}>
                {results.length > 0 ? "⚠ Action Required" : "✓ All Connected"}
              </p>
            </div>
          </div>

          {results.length > 0 ? (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-800/40">
                    <th className="px-5 py-3">Driver Name</th>
                    <th className="px-5 py-3">Vehicle #</th>
                    <th className="px-5 py-3">Last Seen</th>
                    <th className="px-5 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((d, i) => {
                    const lastSeen = d.last_seen ?? d.lastSeen ?? d.last_activity;
                    const noVehicle = !d.vehicle_id || d.vehicle_id === "";
                    const inactive = d.status === false || d.status === "inactive";
                    const reason = inactive ? "Inactive status" : noVehicle ? "No vehicle assigned" : "No recent activity";
                    return (
                      <tr key={i} className="border-b border-gray-800/50 table-row-hover">
                        <td className="px-5 py-3 font-medium text-gray-100">{d.driver_name ?? d.name}</td>
                        <td className="px-5 py-3 text-gray-300">{d.vehicle_number ?? "—"}</td>
                        <td className="px-5 py-3 text-gray-500">
                          {lastSeen ? formatDistanceToNow(parseISO(lastSeen), { addSuffix: true }) : "Unknown"}
                        </td>
                        <td className="px-5 py-3"><span className="badge-red">{reason}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card text-center py-12 text-green-400">
              <p className="text-lg font-semibold">✓ All drivers appear connected</p>
              <p className="text-sm text-gray-500 mt-1">No disconnected ELD devices detected</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
