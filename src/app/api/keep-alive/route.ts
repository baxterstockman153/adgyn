import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Simple query to keep the Supabase free tier database awake
  const count = await prisma.venue.count();
  return NextResponse.json({ ok: true, venues: count, ts: new Date().toISOString() });
}
