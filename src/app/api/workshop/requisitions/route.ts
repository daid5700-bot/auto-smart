export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  const branchId = await getActiveBranchId();
  if (!branchId) {
    return NextResponse.json({ error: "Không xác định được chi nhánh hiện tại" }, { status: 400 });
  }

  try {
    const requisitions = await prisma.partsRequisition.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      include: {
        repairOrder: {
          include: {
            customer: true,
            technician: true,
          }
        },
        vehicle: {
          include: {
            customer: true
          }
        },
        items: {
          include: {
            product: {
              include: {
                prices: true,
                productBranches: {
                  where: { branchId }
                }
              }
            }
          }
        },
        branch: true
      }
    });

    const serializedRequisitions = requisitions.map((req) => {
      // A requisition carries the price agreed on the repair order in its
      // metadata. Return it explicitly so the pending-export screen does not
      // fall back to the product catalogue's current retail price.
      let priceByProductId = new Map<number, number>();
      const metadataMarker = " | METADATA:";
      const metadataIndex = req.reason?.indexOf(metadataMarker) ?? -1;
      if (metadataIndex >= 0) {
        try {
          const metadata = JSON.parse(req.reason!.slice(metadataIndex + metadataMarker.length));
          if (Array.isArray(metadata)) {
            priceByProductId = new Map(
              metadata.flatMap((entry) => {
                const price = entry?.unitPrice ?? entry?.customUnitPrice;
                return Number.isFinite(Number(price)) && Number(price) >= 0
                  ? [[Number(entry.productId), Number(price)] as const]
                  : [];
              }),
            );
          }
        } catch {
          // Old or manually entered reasons may not contain valid metadata.
        }
      }

      return {
        ...req,
        items: req.items.map((item) => {
        const pb = item.product?.productBranches?.[0];
        return {
          ...item,
          quantity: Number(item.quantity),
          // `undefined` intentionally means this is a legacy request and the
          // UI should display the current retail-price fallback.
          unitPrice: priceByProductId.get(item.productId),
          product: item.product ? {
            ...item.product,
            stockCount: pb ? Number(pb.stockCount) : 0,
            prices: (item.product.prices || []).map((p) => ({
              ...p,
              amount: Number(p.amount)
            }))
          } : null
        };
      }),
        repairOrder: req.repairOrder ? {
        ...req.repairOrder,
        laborCost: Number(req.repairOrder.laborCost),
        partsCost: Number(req.repairOrder.partsCost),
        discountAmount: Number(req.repairOrder.discountAmount || 0),
        totalAmount: Number(req.repairOrder.totalAmount),
        paidAmount: Number(req.repairOrder.paidAmount || 0),
        debtAmount: Number(req.repairOrder.debtAmount || 0)
        } : null,
      };
    });

    return NextResponse.json({ requisitions: serializedRequisitions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
