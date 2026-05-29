"use client";
import { useState } from "react";
import { fetchDriversSimple, fetchDriverLogs } from "@/lib/client-api";
import CompanySelector from "@/components/CompanySelector";
import Spinner from "@/components/Spinner";
import { format } from "date-fns";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  D: "bg-green-700 text-green-100",
  DRIVING: "bg-green-700 text-green-100",
  ON: "bg-blue-700 text-blue-100",
  OD: "bg-blue-700 text-blue-100",
  OFF: "bg-gray-700 text-gray-300",
  SB: "bg-yellow-800 text-yellow-200",
  PC: "bg-purple-800 text-purple-200",
};

function statusColor(s: string) {
  const k = s.toUpperCase().replace(/-/g, "").replace(/ /g, "");
  return STATUS_COLORS[k] ?? "bg-gray-800 text-gray-400";
}

function normalizeStatus(s: string) {
  const k = s.toUpperCase().replace(/-/g, "").replace(/ /g, "");
  if (k === "D" || k === "DRIVING" || k === "DR") return "D";
  if (k === "ON" || k === "ONDUTY" || k === "OD") return "ON";
  if (k === "SB" || k === "SLEEPERBERTH") return "SB";
  if (k === "PC" || k === "PERSONALCONVEYANCE") return "PC";
  return "OFF";
}

export default function SwapPage() {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDrivers(cid: string) {
    const list = await fetchDriversSimple(cid);
    setDrivers(list);
    if (list.length) setSelectedDriver(list[0].driver_id ?? list[0].id);
  }

  async function loadLogs() {
    if (!companyId || !selectedDriver) return;
    setLoading(true);
    setSelected([]);
    setMessage("");
    try {
      const logs = await fetchDriverLogs(companyId, selectedDriver, date);
      setEntries(logs);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (prev.length >= 2) return [prev[1], i];
      return [...prev, i];
    });
  }

  async function doSwap() {
    if (selected.length !== 2) return alert("Select exactly 2 events to swap");
    setSwapLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem("factor_token") ?? "";
      const [a, b] = selected;
      const eA = entries[a];
      const eB = entries[b];

      // Try PATCH both events swapping their statuses/durations
      const patch = async (id: string, body: any) => {
        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            path: `/events/${id}`,
            method: "PATCH",
            body,
            companyId,
          }),
        });
        return res.json();
      };

      if (eA.id && eB.id) {
        await Promise.all([
          patch(eA.id, { status: normalizeStatus(eB.status ?? eB.event_type ?? ""), duration: eB.duration ?? eB.duration_minutes }),
          patch(eB.id, { status: normalizeStatus(eA.status ?? eA.event_type ?? ""), duration: eA.duration ?? eA.duration_minutes }),
        ]);
        // Refresh logs
        const updated = [...entries];
        const tmpStatus = updated[a].status;
        const tmpDuration = updated[a].duration;
        updated[a] = { ...updated[a], status: updated[b].status, duration: updated[b].duration };
        updated[b] = { ...updated[b], status: tmpStatus, duration: tmpDuration };
        setEntries(updated);
        setSelected([]);
        setMessage("✓ Events swapped successfully");
      } else {
        setMessage("⚠ These events have no IDs — swap not supported via API for this endpoint");
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setSwapLoading(false);
    }
  }

  const driverName = drivers.find((d) => (d.driver_id ?? d.id) === selectedDriver)?.driver_name ?? "";

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">SWAP</h1>
        <p className="text-gray-500 text-sm mt-1">Select two log events and swap their status/duration</p>
      </div>

      {/* Controls */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Company</label>
            <CompanySelector
              value={companyId}
              onChange={(id, name) => {
                setCompanyId(id);
                setCompanyName(name);
                loadDrivers(id);
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Driver</label>
            <select
              className="field"
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              {drivers.map((d) => (
                <option key={d.driver_id ?? d.id} value={d.driver_id ?? d.id}>
                  {d.driver_name ?? d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={loadLogs} disabled={loading} className="btn-secondary w-full justify-center">
              {loading ? <Spinner size={4} /> : null} Load Logs
            </button>
          </div>
        </div>
      </div>

      {/* Events table */}
      {entries.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400">
              <span className="text-white font-medium">{driverName}</span> — {date} — {entries.length} events
              {selected.length === 2 && <span className="ml-2 text-blue-400">(2 selected)</span>}
            </p>
            <button
              onClick={doSwap}
              disabled={selected.length !== 2 || swapLoading}
              className="btn-primary"
            >
              {swapLoading ? <Spinner size={4} /> : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              )}
              Swap Events
            </button>
          </div>

          {message && (
            <div className={clsx(
              "mb-3 px-4 py-2 rounded-lg text-sm",
              message.startsWith("✓") ? "bg-green-900/30 border border-green-700 text-green-300" :
              message.startsWith("⚠") ? "bg-yellow-900/30 border border-yellow-700 text-yellow-300" :
              "bg-red-900/30 border border-red-700 text-red-300"
            )}>
              {message}
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-800/40">
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Select</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const isSelected = selected.includes(i);
                  const status = e.status ?? e.event_type ?? e.duty_status ?? "?";
                  const duration = e.duration ?? e.duration_minutes ?? 0;
                  const time = e.start_time ?? e.timestamp ?? e.time ?? "—";
                  const location = e.location ?? e.location_text ?? `${e.lat ?? ""},${e.lng ?? ""}`;
                  return (
                    <tr
                      key={i}
                      className={clsx(
                        "border-b border-gray-800/50 cursor-pointer transition-colors",
                        isSelected ? "bg-blue-900/30 border-blue-700" : "hover:bg-gray-800/40"
                      )}
                      onClick={() => toggleSelect(i)}
                    >
                      <td className="px-4 py-2.5 text-gray-600">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-300 font-mono text-xs">{String(time).slice(11, 19) || String(time).slice(0, 8)}</td>
                      <td className="px-4 py-2.5">
                        <span className={clsx("px-2 py-0.5 rounded text-xs font-bold", statusColor(status))}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-300">
                        {duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs truncate max-w-[200px]">{location || "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className={clsx(
                          "w-5 h-5 rounded border-2 flex items-center justify-center",
                          isSelected ? "border-blue-400 bg-blue-600" : "border-gray-600"
                        )}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-600 mt-2">Click two rows to select them, then press Swap Events.</p>
        </>
      )}

      {!loading && entries.length === 0 && companyId && (
        <div className="card text-center py-12 text-gray-600">
          <p>Load logs for a driver and date to see events</p>
        </div>
      )}
    </div>
  );
}
