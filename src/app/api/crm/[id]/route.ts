import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// PATCH /api/crm/[id] — update lead/customer details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const branchId = getActiveBranchId();

    if (body.type === "customer") {
      const { type, ...updateData } = body;
      const currentCust = await prisma.customer.findFirst({
        where: {
          id,
          ...(branchId ? { branchId } : {}),
        },
      });
      if (!currentCust) return NextResponse.json({ error: "Khách hàng không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

      if (updateData.tags && typeof updateData.tags === "string") {
        updateData.tags = updateData.tags.split(",").map((t: string) => t.trim());
      }
      const customer = await prisma.customer.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(customer);
    } else {
      const currentLead = await prisma.lead.findFirst({
        where: {
          id,
          ...(branchId ? { branchId } : {}),
        },
      });
      if (!currentLead) return NextResponse.json({ error: "Lead không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

      const lead = await prisma.lead.update({
        where: { id },
        data: body,
      });
      return NextResponse.json(lead);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/crm/[id] — delete lead or customer
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const type = req.nextUrl.searchParams.get("type");
    const branchId = getActiveBranchId();

    if (type === "customer") {
      const currentCust = await prisma.customer.findFirst({
        where: {
          id,
          ...(branchId ? { branchId } : {}),
        },
      });
      if (!currentCust) return NextResponse.json({ error: "Khách hàng không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

      // Cascade delete related records first to prevent foreign key errors (or let schema cascading deal with it)
      await prisma.loyaltyTransaction.deleteMany({ where: { customerId: id } });
      await prisma.znsLog.deleteMany({ where: { customerId: id } });
      await prisma.repairOrder.deleteMany({ where: { customerId: id } });
      await prisma.vehicle.updateMany({ where: { customerId: id }, data: { customerId: null } });
      await prisma.customer.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Xóa Khách hàng thành công" });
    } else {
      const currentLead = await prisma.lead.findFirst({
        where: {
          id,
          ...(branchId ? { branchId } : {}),
        },
      });
      if (!currentLead) return NextResponse.json({ error: "Lead không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

      await prisma.lead.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Xóa Lead thành công" });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
