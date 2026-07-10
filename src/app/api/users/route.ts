import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { verifyRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        branches: {
          select: {
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedUsers = users.map((u) => {
      const { branches, ...rest } = u;
      return {
        ...rest,
        branches: (branches || []).map((b: any) => b.branch),
      };
    });

    return NextResponse.json({ users: formattedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email đã tồn tại trên hệ thống" }, { status: 400 });
    }

    // Parse branchIds as array of numbers
    const branchIds = Array.isArray(body.branchIds)
      ? body.branchIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
      : [];

    const hashedPassword = bcrypt.hashSync(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role || "SALES",
        branches: {
          create: branchIds.map((branchId: number) => ({
            branchId,
          })),
        },
      },
    });

    const { password: _, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

