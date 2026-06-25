export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/branches — list all branches
export async function GET(req: NextRequest) {
  try {
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
    const role = req.cookies.get("user_role")?.value;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền thực hiện thao tác này" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Tên chi nhánh là bắt buộc" }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: {
        name: body.name,
        address: body.address || "",
        phone: body.phone || "",
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
