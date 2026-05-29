"use client";
import { useEffect, useState } from "react";
import { fetchCompanies } from "@/lib/client-api";

interface Props {
  value: string;
  onChange: (id: string, name: string) => void;
}

/** Extract UUID string from a company object — never return numeric id */
function extractUuid(c: any): string {
  return c.uuid ?? c.company_uuid ?? c.company_id ?? c.external_id ?? String(c.id ?? "");
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
          onChange(extractUuid(c), c.name ?? c.company_name);
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
          const c = companies.find((x) => extractUuid(x) === e.target.value);
          if (c) onChange(e.target.value, c.name ?? c.company_name ?? e.target.value);
        }}
        disabled={loading}
      >
        {loading && <option>Loading…</option>}
        {companies.map((c) => {
          const id = extractUuid(c);
          const name = c.name ?? c.company_name ?? id;
          return <option key={id} value={id}>{name}</option>;
        })}
      </select>
    </div>
  );
}
