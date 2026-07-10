import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { verifyRole } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const id = parseInt(params.id);
    const body = await req.json();

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.password !== undefined && body.password !== "") {
      data.password = bcrypt.hashSync(body.password, 10);
    }
    if (body.role !== undefined) data.role = body.role;

    const user = await prisma.$transaction(async (tx) => {
      if (body.branchIds !== undefined && Array.isArray(body.branchIds)) {
        const branchIds = body.branchIds.map((bid: any) => parseInt(bid, 10)).filter((bid: number) => !isNaN(bid));
        
        await tx.userBranch.deleteMany({
          where: { userId: id },
        });

        data.branches = {
          create: branchIds.map((branchId: number) => ({
            branchId,
          })),
        };
      }

      return await tx.user.update({
        where: { id },
        data,
      });
    });

    const { password: _, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const id = parseInt(params.id);

    // Get target user to check safety
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    if (user.email === "admin@autosmart.vn") {
      return NextResponse.json({ error: "Không thể xóa tài khoản Quản trị viên tối cao" }, { status: 400 });
    }

    // Safely update associations
    await prisma.repairOrder.updateMany({ where: { createdById: id }, data: { createdById: null } });
    await prisma.lead.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Xóa người dùng thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
