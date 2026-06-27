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

      if (typeof updateData.tags === "string") {
        updateData.tags = updateData.tags.trim() ? updateData.tags.split(",").map((t: string) => t.trim()) : [];
      }
      if (updateData.birthday) {
        updateData.birthday = new Date(updateData.birthday);
      } else if (updateData.hasOwnProperty("birthday")) {
        updateData.birthday = null;
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

      // FIX #2: Strip `type` field to prevent it from being passed to the DB
      const { type, ...leadData } = body;
      const lead = await prisma.lead.update({
        where: { id },
        data: leadData,
      });
      return NextResponse.json(lead);
    }
  } catch (error: any) {
    console.error("❌ PATCH CRM ERROR:", error);
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

      // Soft delete: keep all financial and repair history intact, just hide the customer from UI
      await prisma.customer.update({ 
        where: { id },
        data: { isDeleted: true }
      });
      return NextResponse.json({ success: true, message: "Xóa Khách hàng thành công (ẩn khỏi hệ thống)" });
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
