import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.FACTOR_API_BASE!;
const TENANT_ID = process.env.FACTOR_TENANT_ID!;

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-factor-token") ?? "";
  try {
    const res = await fetch(`${API_BASE}/companies?status=active&limit=10&page=1&group=all`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        tenant_id: TENANT_ID,
      },
    });
    const data = await res.json();
    return NextResponse.json({ status: res.status, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
