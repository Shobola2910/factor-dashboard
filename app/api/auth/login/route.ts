import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.FACTOR_API_BASE!;
const TENANT_ID = process.env.FACTOR_TENANT_ID!;

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", tenant_id: TENANT_ID },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.message ?? "Login failed" }, { status: 401 });
    const raw = data?.data ?? data;
    const token = raw?.token ?? raw?.access_token ?? raw?.jwt;
    if (!token) return NextResponse.json({ error: "No token in response" }, { status: 401 });
    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
