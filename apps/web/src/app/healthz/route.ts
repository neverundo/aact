import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();

  return NextResponse.json({
    status: "ok",
    service: "aact-web",
    timestamp: new Date().toISOString(),
  });
}
