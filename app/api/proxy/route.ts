/**
 * Generic proxy: POST { path, method?, body?, companyId? }
 * Forwards to drivehos.app with correct auth headers.
 */
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.FACTOR_API_BASE!;
const TENANT_ID = process.env.FACTOR_TENANT_ID!;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { path, method = "GET", body, companyId } = await req.json();
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    tenant_id: TENANT_ID,
  };
  if (companyId) headers.company_id = companyId;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
