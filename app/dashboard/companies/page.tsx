"use client";
import { useState, useEffect } from "react";
import { fetchCompanies, fetchDriversSimple } from "@/lib/client-api";
import Spinner from "@/components/Spinner";
import Link from "next/link";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [driverCounts, setDriverCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCompanies()
      .then((list) => {
        setCompanies(list);
        // Load driver counts in background
        list.forEach(async (c: any) => {
          const cid = c.id ?? c.uuid ?? c.company_id;
          try {
            const drivers = await fetchDriversSimple(cid);
            setDriverCounts((prev) => ({ ...prev, [cid]: drivers.length }));
          } catch { /* skip */ }
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter((c) =>
    (c.name ?? c.company_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-gray-500 text-sm mt-1">{companies.length} active companies</p>
        </div>
        <input
          className="field w-64"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={8} /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-800/40">
                <th className="px-5 py-3">Company Name</th>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Drivers</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const cid = c.id ?? c.uuid ?? c.company_id;
                const name = c.name ?? c.company_name ?? cid;
                return (
                  <tr key={cid} className="border-b border-gray-800/50 table-row-hover">
                    <td className="px-5 py-3 font-medium text-gray-100">{name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{cid?.slice(0, 8)}…</td>
                    <td className="px-5 py-3">
                      {driverCounts[cid] !== undefined ? (
                        <span className="badge-blue">{driverCounts[cid]} drivers</span>
                      ) : (
                        <Spinner size={3} />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge-green">{c.status ?? "active"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/drivers?company=${cid}&name=${encodeURIComponent(name)}`}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        View Drivers →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-600 py-12">No companies found</p>
          )}
        </div>
      )}
    </div>
  );
}
