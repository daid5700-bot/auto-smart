import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const branchId = getActiveBranchId();

    const currentTech = await prisma.technician.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentTech) return NextResponse.json({ error: "Kỹ thuật viên không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    const tech = await prisma.technician.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        phone: body.phone,
        status: body.status,
      },
    });
    return NextResponse.json(tech);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const branchId = getActiveBranchId();

    const currentTech = await prisma.technician.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentTech) return NextResponse.json({ error: "Kỹ thuật viên không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    await prisma.technician.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
