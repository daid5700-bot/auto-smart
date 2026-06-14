import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  const branchId = getActiveBranchId();
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
          }
        },
        items: {
          include: {
            product: {
              include: {
                prices: true
              }
            }
          }
        },
        branch: true
      }
    });

    // Handle Decimal serialization
    const serializedRequisitions = requisitions.map((req) => ({
      ...req,
      items: req.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          prices: item.product.prices.map((p) => ({
            ...p,
            amount: Number(p.amount)
          }))
        }
      })),
      repairOrder: {
        ...req.repairOrder,
        laborCost: Number(req.repairOrder.laborCost),
        partsCost: Number(req.repairOrder.partsCost),
        totalAmount: Number(req.repairOrder.totalAmount)
      }
    }));

    return NextResponse.json({ requisitions: serializedRequisitions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
