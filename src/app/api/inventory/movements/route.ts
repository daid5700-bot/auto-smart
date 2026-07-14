export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") || undefined;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const branchId = getActiveBranchId();

    const where: any = {};
    if (branchId) {
      where.branchId = branchId;
    }

    if (search) {
      where.OR = [
        { reason: { contains: search, mode: "insensitive" } },
        { createdBy: { contains: search, mode: "insensitive" } },
        { inventoryOrder: { customer: { name: { contains: search, mode: "insensitive" } } } },
        { inventoryOrder: { customer: { phone: { contains: search } } } },
        { inventoryOrder: { code: { contains: search, mode: "insensitive" } } }
      ];
      if (/^\d+$/.test(search.trim())) {
        const numId = parseInt(search.trim(), 10);
        where.OR.push(
          { id: numId },
          { inventoryOrderId: numId }
        );
      }
    }

    // Base filter applies branch and search query
    const baseFilter = { ...where };

    const allMovements = await prisma.stockMovement.findMany({
      where: baseFilter,
      select: {
        id: true,
        type: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        reason: true,
        vehicleId: true,
        createdBy: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
          }
        },
        inventoryOrder: {
          select: {
            id: true,
            code: true,
            totalAmount: true,
            paidAmount: true,
            debtAmount: true,
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const serializedMovements = allMovements.map((mov: any) => ({
      ...mov,
      quantity: Number(mov.quantity),
      unitCost: Number(mov.unitCost),
      totalCost: Number(mov.totalCost),
      inventoryOrder: mov.inventoryOrder ? {
        ...mov.inventoryOrder,
        totalAmount: Number(mov.inventoryOrder.totalAmount),
        paidAmount: Number(mov.inventoryOrder.paidAmount),
        debtAmount: Number(mov.inventoryOrder.debtAmount),
      } : null
    }));

    // Helper function to group movements into receipts (vouchers) exactly matching client logic
    const groupMovementsIntoReceipts = (movements: any[]) => {
      const groups: Record<string, {
        id: string;
        type: string;
        createdBy: string;
        createdAt: Date;
        reason: string;
        items: any[];
        totalAmount: number;
        inventoryOrder: any;
      }> = {};

      movements.forEach(m => {
        let key = "";
        if (m.vehicleId) {
          key = `VEHICLE-${m.vehicleId}`;
        } else if (m.inventoryOrder) {
          key = `ORDER-${m.inventoryOrder.id}`;
        } else {
          const dateVal = new Date(m.createdAt).getTime();
          const timeWindow = Math.floor(dateVal / 3000);
          key = `${m.type}-${m.createdBy}-${timeWindow}`;
        }
        
        if (!groups[key]) {
          groups[key] = {
            id: key,
            type: m.type,
            createdBy: m.createdBy,
            createdAt: m.createdAt,
            reason: m.reason || "",
            items: [],
            totalAmount: 0,
            inventoryOrder: m.inventoryOrder || null
          };
        }
        
        if (m.inventoryOrder && !groups[key].inventoryOrder) {
          groups[key].inventoryOrder = m.inventoryOrder;
          groups[key].type = "EXPORT";
          groups[key].createdBy = m.createdBy;
          groups[key].reason = m.reason || groups[key].reason;
        }
        
        groups[key].items.push(m);
        groups[key].totalAmount += Number(m.totalCost || 0);
      });

      return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };

    const allReceipts = groupMovementsIntoReceipts(serializedMovements);

    // Calculate counts of grouped receipts/vouchers
    const totalAll = allReceipts.length;
    const totalImport = allReceipts.filter(r => r.type === "IMPORT").length;
    const totalExport = allReceipts.filter(r => r.type === "EXPORT" || r.type === "EXPORT_GIFT").length;

    // Filter by type if requested
    let filteredReceipts = allReceipts;
    if (type) {
      if (type === "EXPORT") {
        filteredReceipts = allReceipts.filter(r => r.type === "EXPORT" || r.type === "EXPORT_GIFT");
      } else {
        filteredReceipts = allReceipts.filter(r => r.type === type);
      }
    }

    const total = filteredReceipts.length;
    const paginatedReceipts = limit > 0 
      ? filteredReceipts.slice((page - 1) * limit, page * limit)
      : filteredReceipts;

    // Flatten paginated receipts back to movements for client-side grouping
    const movementsForPage = paginatedReceipts.flatMap(r => r.items);

    return NextResponse.json({
      movements: movementsForPage,
      pagination: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1
      },
      counts: {
        all: totalAll,
        import: totalImport,
        export: totalExport,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
