import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron, runMaintenanceCron } from "@/lib/zns-cron";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("Authorization")?.replace("Bearer ", "") ||
    req.nextUrl.searchParams.get("secret");
  if (!isAuthorizedCron(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runMaintenanceCron());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
