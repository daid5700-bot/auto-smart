import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { updateCrmEntrySchema } from "@/lib/validation/crm";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/guard";

// PATCH /api/crm/[id] — update lead/customer details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID không hợp lệ", 400, "INVALID_ID");
    const body = await parseJson(req, updateCrmEntrySchema);
    const branchId = getActiveBranchId();

    if (body.type === "customer") {

      const { type: _type, ...customerInput } = body;
      const currentCust = await prisma.customer.findFirst({
        where: {
          id,
          ...(branchId ? { customerBranches: { some: { branchId } } } : {}),
        },
      });
      if (!currentCust) throw new ApiError("Khách hàng không tồn tại hoặc không thuộc cơ sở này", 404, "CUSTOMER_NOT_FOUND");

      const updateData: Prisma.CustomerUpdateInput = {
        ...(customerInput.name !== undefined ? { name: customerInput.name } : {}),
        ...(customerInput.phone !== undefined ? { phone: customerInput.phone } : {}),
        ...(customerInput.email !== undefined ? { email: customerInput.email || null } : {}),
        ...(customerInput.address !== undefined ? { address: customerInput.address || null } : {}),
        ...(customerInput.source !== undefined ? { source: customerInput.source } : {}),
        ...(customerInput.birthday !== undefined
          ? { birthday: customerInput.birthday ? new Date(customerInput.birthday) : null }
          : {}),
        ...(customerInput.tags !== undefined
          ? { tags: typeof customerInput.tags === "string"
              ? customerInput.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
              : customerInput.tags }
          : {}),
        ...(customerInput.vehiclePlates !== undefined
          ? { vehiclePlates: typeof customerInput.vehiclePlates === "string"
              ? customerInput.vehiclePlates.split(",").map((plate) => plate.trim()).filter(Boolean)
              : customerInput.vehiclePlates }
          : {}),
      };
      const customer = await prisma.customer.update({
        where: { id },
        data: updateData,
      });
      const serializedCustomer = {
        ...customer,
        totalSpent: Number(customer.totalSpent || 0),
        totalDebt: Number(customer.totalDebt || 0)
      };
      return NextResponse.json(serializedCustomer);
    } else {
      const currentLead = await prisma.lead.findFirst({
        where: {
          id,
          ...(branchId ? { branchId } : {}),
        },
      });
      if (!currentLead) return NextResponse.json({ error: "Lead không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

      // FIX #2: Strip `type` field to prevent it from being passed to the DB
      const { type: _type, ...leadData } = body;
      const lead = await prisma.lead.update({
        where: { id },
        data: leadData,
      });
      return NextResponse.json(lead);
    }
  } catch (error: unknown) {
    return handleApiError(error, "API_CRM_PATCH", "Không thể cập nhật dữ liệu CRM");
  }
}

// DELETE /api/crm/[id] — delete lead or customer
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID không hợp lệ", 400, "INVALID_ID");
    const type = req.nextUrl.searchParams.get("type");
    const branchId = getActiveBranchId();

    if (type === "customer") {
      const currentCust = await prisma.customer.findFirst({
        where: {
          id,
          ...(branchId ? { customerBranches: { some: { branchId } } } : {}),
        },
      });
      if (!currentCust) return NextResponse.json({ error: "Khách hàng không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

      // Soft delete: keep all financial and repair history intact, just hide the customer from UI
      await prisma.customer.update({ 
        where: { id },
        data: { 
          isDeleted: true,
          phone: currentCust.phone.startsWith("DELETED-") ? currentCust.phone : `DELETED-${currentCust.id}-${currentCust.phone}`
        }
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
  } catch (error: unknown) {
    return handleApiError(error, "API_CRM_DELETE", "Không thể xóa dữ liệu CRM");
  }
}
