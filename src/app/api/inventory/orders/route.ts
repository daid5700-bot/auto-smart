import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/inventory/orders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const branchId = getActiveBranchId();

    const where: any = {};
    if (branchId) where.branchId = branchId;
    
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await prisma.inventoryOrder.count({ where });
    const orders = await prisma.inventoryOrder.findMany({
      where,
      include: {
        customer: true,
        movements: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/inventory/orders
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    const userName = req.cookies.get("user_name")?.value || "System";

    // Build the inventory order
    const { customerId, type, items, paidAmount, reason } = body;
    
    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const debtAmount = Math.max(0, totalAmount - Number(paidAmount || 0));
    const status = debtAmount > 0 ? "DEBT" : "PAID";

    // Generate code
    const code = `PX-${Date.now().toString().slice(-6)}`;

    const order = await prisma.$transaction(async (tx) => {
      let finalCustomerId = customerId ? parseInt(customerId) : null;
      
      // Auto-create customer if phone & name provided but no ID
      if (!finalCustomerId && body.phone && body.customerName) {
        const newCustomer = await tx.customer.create({
          data: {
            phone: body.phone,
            name: body.customerName,
            branchId,
          }
        });
        finalCustomerId = newCustomer.id;
      }

      const newOrder = await tx.inventoryOrder.create({
        data: {
          code,
          customerId: finalCustomerId,
          type: type || "EXPORT_RETAIL",
          totalAmount,
          paidAmount: Number(paidAmount || 0),
          debtAmount,
          status,
          reason,
          branchId,
          createdBy: userName,
          movements: {
            create: items.map((item: any) => ({
              productId: item.productId,
              type: "EXPORT",
              quantity: item.quantity,
              unitCost: item.unitPrice,
              totalCost: Number(item.quantity) * Number(item.unitPrice),
              reason: reason || "Bán xuất kho",
              createdBy: userName
            }))
          }
        }
      });

      // Update product stocks
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockCount: { decrement: item.quantity } }
        });
      }

      // Update customer debt and spent if customer exists
      if (finalCustomerId) {
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: {
            totalSpent: { increment: totalAmount },
            totalDebt: { increment: debtAmount },
            lastVisit: new Date(),
          }
        });
      }

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
