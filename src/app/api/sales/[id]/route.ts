import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// PATCH /api/sales/[id] — update vehicle details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const branchId = getActiveBranchId();

    const currentVehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentVehicle) return NextResponse.json({ error: "Thông tin xe không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(vehicle);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/sales/[id] — delete vehicle
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const branchId = getActiveBranchId();

    const currentVehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentVehicle) return NextResponse.json({ error: "Thông tin xe không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Xóa thông tin xe thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
