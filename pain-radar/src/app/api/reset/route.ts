import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { commentCount, clusterCount } = await seedDemoData();
    return NextResponse.json({ ok: true, commentCount, clusterCount });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
