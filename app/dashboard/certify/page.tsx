"use client";
import { useState } from "react";
import { fetchDriversSimple, certifyDriverLog } from "@/lib/client-api";
import CompanySelector from "@/components/CompanySelector";
import Spinner from "@/components/Spinner";
import { subDays, format } from "date-fns";

interface CertifyResult {
  driverName: string;
  driverId: string;
  date: string;
  ok: boolean;
  message: string;
}

export default function CertifyPage() {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [results, setResults] = useState<CertifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [windowDays, setWindowDays] = useState(9);

  async function runCertify() {
    if (!companyId) return alert("Select a company");
    setLoading(true);
    setResults([]);
    setProgress("Loading drivers…");

    try {
      const drivers = await fetchDriversSimple(companyId);
      const today = new Date();

      // Build date range: today - windowDays to today - 1 (don't certify today)
      const dates: string[] = [];
      for (let i = 1; i <= windowDays; i++) {
        dates.push(format(subDays(today, i), "yyyy-MM-dd"));
      }

      const out: CertifyResult[] = [];

      for (let i = 0; i < drivers.length; i++) {
        const drv = drivers[i];
        const driverId = drv.driver_id ?? drv.id;
        const driverName = drv.driver_name ?? drv.name ?? driverId;
        setProgress(`Certifying ${i + 1}/${drivers.length}: ${driverName}`);

        for (const date of dates) {
          const result = await certifyDriverLog(companyId, driverId, date);
          out.push({ driverName, driverId, date, ok: result.ok, message: result.message ?? "" });
        }
      }

      setResults(out);
      const ok = out.filter((r) => r.ok).length;
      setProgress(`Done — ${ok}/${out.length} certified successfully`);
    } catch (e: any) {
      setProgress(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Auto-Certify</h1>
          <p className="text-gray-500 text-sm mt-1">Automatically certify driver logs for the past N days</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CompanySelector value={companyId} onChange={(id, name) => { setCompanyId(id); setCompanyName(name); }} />
          <select className="field w-36" value={windowDays} onChange={(e) => setWindowDays(+e.target.value)}>
            <option value={3}>3-day window</option>
            <option value={7}>7-day window</option>
            <option value={9}>9-day window</option>
            <option value={14}>14-day window</option>
          </select>
          <button onClick={runCertify} disabled={loading} className="btn-success">
            {loading ? <Spinner size={4} /> : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Auto-Certify
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="card bg-blue-900/10 border-blue-800/40 mb-6">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div className="text-sm text-gray-400">
            <p className="text-blue-300 font-medium mb-1">Smart {windowDays}-Day Window</p>
            <p>Certifies logs from <strong className="text-gray-200">{format(subDays(new Date(), windowDays), "MMM d")} to {format(subDays(new Date(), 1), "MMM d")}</strong> for all active drivers in <strong className="text-gray-200">{companyName || "selected company"}</strong>.</p>
          </div>
        </div>
      </div>

      {progress && (
        <div className="mb-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg px-4 py-2">
          {loading && <span className="inline-block w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />}
          {progress}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="card"><p className="text-xs text-gray-500 mb-1">Certified</p><p className="text-4xl font-bold text-green-400">{ok}</p></div>
            <div className="card"><p className="text-xs text-gray-500 mb-1">Failed</p><p className={`text-4xl font-bold ${fail > 0 ? "text-red-400" : "text-gray-600"}`}>{fail}</p></div>
          </div>

          <div className="card p-0 overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-800/80">
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800/50 table-row-hover">
                    <td className="px-5 py-2 text-gray-200">{r.driverName}</td>
                    <td className="px-5 py-2 text-gray-400">{r.date}</td>
                    <td className="px-5 py-2">
                      <span className={r.ok ? "badge-green" : "badge-red"}>{r.ok ? "✓ OK" : "✗ Fail"}</span>
                    </td>
                    <td className="px-5 py-2 text-gray-500 text-xs">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
