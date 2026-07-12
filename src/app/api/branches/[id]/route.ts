import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/auth";

// PATCH /api/branches/[id] — update branch details (Admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const id = parseInt(params.id);
    const body = await req.json();

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        address: body.address,
        phone: body.phone,
        logoUrl: body.logoUrl,
      },
    });

    return NextResponse.json(branch);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/branches/[id] — delete branch (Admin only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const id = parseInt(params.id);

    // Safety checks: check if branch has related data
    const [productsCount, ordersCount, leadsCount, vehiclesCount, usersCount] = await Promise.all([
      prisma.productBranch.count({ where: { branchId: id } }),
      prisma.repairOrder.count({ where: { branchId: id } }),
      prisma.lead.count({ where: { branchId: id } }),
      prisma.vehicle.count({ where: { branchId: id } }),
      prisma.userBranch.count({ where: { branchId: id } }),
    ]);

    if (productsCount > 0 || ordersCount > 0 || leadsCount > 0 || vehiclesCount > 0 || usersCount > 0) {
      return NextResponse.json(
        { error: "Không thể xóa cơ sở đã có dữ liệu phát sinh (phụ tùng, lệnh sửa chữa, leads, xe, nhân viên)." },
        { status: 400 }
      );
    }

    await prisma.branch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Xóa chi nhánh thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
