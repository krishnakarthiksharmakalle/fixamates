import { NextResponse } from "next/server";
import { KINDS, searchNearby, type Kind } from "@/lib/places";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat")), lng = Number(q.get("lng")), kind = q.get("kind") as Kind;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !(kind in KINDS)) {
    return NextResponse.json({ error: "Invalid location or type." }, { status: 400 });
  }
  try {
    return NextResponse.json({ places: await searchNearby(lat, lng, kind) });
  } catch {
    return NextResponse.json({ error: "Nearby search unavailable." }, { status: 502 });
  }
}
