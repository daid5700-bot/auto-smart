import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const customerId = Number((await params).id);
    const branchId = await getActiveBranchId();
    if (!Number.isInteger(customerId) || customerId <= 0) {
      throw new ApiError("Khách hàng không hợp lệ.", 400, "CUSTOMER_INVALID");
    }
    if (!branchId) {
      throw new ApiError("Vui lòng chọn chi nhánh hiện tại.", 400, "BRANCH_REQUIRED");
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (!customer) {
      throw new ApiError("Không tìm thấy khách hàng tại chi nhánh này.", 404, "CUSTOMER_NOT_FOUND");
    }

    const [inventory, sales, workshop] = await Promise.all([
      prisma.inventoryOrder.aggregate({
        where: { customerId, branchId, status: { not: "CANCELLED" } },
        _sum: { debtAmount: true },
      }),
      prisma.vehicle.aggregate({
        where: {
          customerId,
          branchId,
          status: { in: ["RESERVED", "SOLD"] },
        },
        _sum: { debtAmount: true },
      }),
      prisma.repairOrder.aggregate({
        where: { customerId, branchId, isDeleted: false },
        _sum: { debtAmount: true },
      }),
    ]);

    const inventoryDebt = Number(inventory._sum.debtAmount || 0);
    const salesDebt = Number(sales._sum.debtAmount || 0);
    const workshopDebt = Number(workshop._sum.debtAmount || 0);

    return NextResponse.json({
      inventoryDebt,
      salesDebt,
      workshopDebt,
      totalDebt: inventoryDebt + salesDebt + workshopDebt,
    });
  } catch (error) {
    return handleApiError(error, "CUSTOMER_DEBT_SUMMARY", "Không thể tải công nợ khách hàng.");
  }
}
