import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, code: true }
    });

    const product = await prisma.product.findUnique({
      where: { sku: "N-CAST-1L" },
      include: {
        productBranches: {
          include: {
            branch: {
              select: { id: true, name: true, code: true }
            }
          }
        }
      }
    });

    const requisitions = await prisma.partsRequisition.findMany({
      where: {
        reason: { contains: "YCT-GIFT-75" }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Let's also search by vehicleId if any partsRequisition exists with Nhớt Castrol
    const castrolRequisitions = await prisma.partsRequisition.findMany({
      where: {
        items: {
          some: {
            product: { sku: "N-CAST-1L" }
          }
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        vehicle: true
      },
      orderBy: { id: "desc" },
      take: 5
    });

    return NextResponse.json({
      branches,
      product,
      requisitions,
      castrolRequisitions
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
