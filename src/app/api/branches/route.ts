export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/auth";

// GET /api/branches — list all branches
export async function GET(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/branches — create a new branch (Admin only)
export async function POST(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Tên chi nhánh là bắt buộc" }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: {
        code: body.code || null,
        name: body.name,
        address: body.address || "",
        phone: body.phone || "",
        logoUrl: body.logoUrl || null,
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
