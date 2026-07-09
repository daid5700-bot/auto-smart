export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/inventory/pending-exports — list all pending vehicle accessory export orders
export async function GET(req: NextRequest) {
  try {
    const branchId = getActiveBranchId();
    const { searchParams } = req.nextUrl;
    const statusFilter = searchParams.get("status") || "PENDING";

    const where: any = {
      createdBy: "Hệ thống (Bán Xe)",
    };
    if (statusFilter !== "ALL") where.status = statusFilter;
    if (branchId) where.branchId = branchId;

    const orders = await prisma.inventoryOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } }
      }
    });

    // Enrich with vehicle info from VIN embedded in reason
    const enriched = await Promise.all(orders.map(async (order) => {
      const vinMatch = order.reason?.match(/Xuất phụ kiện bán kèm xe VIN:\s*(.+)$/);
      const vin = vinMatch ? vinMatch[1].trim() : null;
      let vehicle = null;
      let accessories = [];
      if (vin) {
        vehicle = await prisma.vehicle.findUnique({
          where: { vin },
          select: { id: true, vin: true, model: true, variant: true, color: true, year: true, accessoriesJson: true, branchId: true }
        });
      }
      if (vehicle) {
        const rawAcc = JSON.parse(vehicle.accessoriesJson || "[]");
        const productIds = rawAcc.map((a: any) => Number(a.productId || a.id)).filter((id: number) => !isNaN(id));
        const pbs = await prisma.productBranch.findMany({
          where: {
            productId: { in: productIds },
            branchId: vehicle.branchId || branchId || 1
          }
        });
        const stockMap = new Map(pbs.map(pb => [pb.productId, pb.stockCount]));
        accessories = rawAcc.map((a: any) => ({
          ...a,
          stockCount: stockMap.get(Number(a.productId || a.id)) || 0
        }));
      }
      return {
        id: order.id,
        code: order.code,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        reason: order.reason,
        createdAt: order.createdAt,
        customer: order.customer,
        branch: order.branch,
        vehicle,
        accessories,
      };
    }));

    return NextResponse.json({ orders: enriched, total: enriched.length });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
