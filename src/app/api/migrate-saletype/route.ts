import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "saleType" TEXT NOT NULL DEFAULT 'RETAIL';`);
    return NextResponse.json({ success: true, message: "Added saleType to Vehicle table" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
