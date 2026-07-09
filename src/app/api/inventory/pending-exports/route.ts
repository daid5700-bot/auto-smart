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

    // Enrich with vehicle info from VIN embedded in reason in batch to avoid N+1 query crashes
    // 1. Gather all unique VINs
    const vinMatches = orders.map(order => {
      const match = order.reason?.match(/Xuất phụ kiện bán kèm xe VIN:\s*(.+)$/);
      return match ? match[1].trim() : null;
    });
    const uniqueVins = Array.from(new Set(vinMatches.filter(Boolean))) as string[];

    // 2. Fetch all vehicles in one batch query
    const vehiclesList = uniqueVins.length > 0
      ? await prisma.vehicle.findMany({
          where: { vin: { in: uniqueVins } },
          select: { id: true, vin: true, model: true, variant: true, color: true, year: true, accessoriesJson: true, branchId: true }
        })
      : [];

    const vehiclesMap = new Map<string, typeof vehiclesList[number]>();
    for (const v of vehiclesList) {
      vehiclesMap.set(v.vin.toUpperCase(), v);
    }

    // 3. Gather all productIds and branchIds to batch query product branch stocks
    const productBranchPairs: { productId: number; branchId: number }[] = [];
    for (const v of vehiclesList) {
      try {
        const rawAcc = typeof v.accessoriesJson === "string" ? JSON.parse(v.accessoriesJson) : (v.accessoriesJson as any) || [];
        for (const a of rawAcc) {
          const pid = Number(a.productId || a.id);
          if (!isNaN(pid)) {
            productBranchPairs.push({
              productId: pid,
              branchId: v.branchId || branchId || 1
            });
          }
        }
      } catch (err) {
        // ignore JSON parsing error
      }
    }

    // De-duplicate product branch search criteria
    const uniqueProductIds = Array.from(new Set(productBranchPairs.map(p => p.productId)));
    const uniqueBranchIds = Array.from(new Set(productBranchPairs.map(p => p.branchId)));

    const pbs = (uniqueProductIds.length > 0 && uniqueBranchIds.length > 0)
      ? await prisma.productBranch.findMany({
          where: {
            productId: { in: uniqueProductIds },
            branchId: { in: uniqueBranchIds }
          }
        })
      : [];

    // Map: key = `${branchId}_${productId}`, value = stockCount
    const stockMap = new Map<string, number>();
    for (const pb of pbs) {
      stockMap.set(`${pb.branchId}_${pb.productId}`, pb.stockCount);
    }

    // 4. Construct enriched response synchronously
    const enriched = orders.map((order, idx) => {
      const vin = vinMatches[idx];
      const vehicle = vin ? (vehiclesMap.get(vin.toUpperCase()) || null) : null;
      let accessories = [];
      if (vehicle) {
        try {
          const rawAcc = typeof vehicle.accessoriesJson === "string" ? JSON.parse(vehicle.accessoriesJson) : (vehicle.accessoriesJson as any) || [];
          accessories = rawAcc.map((a: any) => {
            const pid = Number(a.productId || a.id);
            const key = `${vehicle.branchId || branchId || 1}_${pid}`;
            return {
              ...a,
              stockCount: stockMap.get(key) || 0
            };
          });
        } catch {
          // ignore
        }
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
    });

    return NextResponse.json({ orders: enriched, total: enriched.length });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
