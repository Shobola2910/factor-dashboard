"use client";
import { useEffect, useState } from "react";
import { fetchCompanies } from "@/lib/client-api";

interface Props {
  value: string;
  onChange: (id: string, name: string) => void;
}

export default function CompanySelector({ value, onChange }: Props) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies()
      .then((list) => {
        setCompanies(list);
        if (list.length > 0 && !value) {
          const c = list[0];
          onChange(c.id ?? c.uuid ?? c.company_id, c.name ?? c.company_name);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 whitespace-nowrap">Company</label>
      <select
        className="field text-sm max-w-xs"
        value={value}
        onChange={(e) => {
          const c = companies.find((x) => (x.id ?? x.uuid ?? x.company_id) === e.target.value);
          if (c) onChange(e.target.value, c.name ?? c.company_name ?? e.target.value);
        }}
        disabled={loading}
      >
        {loading && <option>Loading…</option>}
        {companies.map((c) => {
          const id = c.id ?? c.uuid ?? c.company_id;
          const name = c.name ?? c.company_name ?? id;
          return <option key={id} value={id}>{name}</option>;
        })}
      </select>
    </div>
  );
}
