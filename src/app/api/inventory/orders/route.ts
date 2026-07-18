export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { ensureCustomerBranch, getOrCreateCustomerForBranch } from "@/lib/customer-branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { requireAuth } from "@/lib/guard";
import { createInventoryOrderSchema } from "@/lib/validation/inventory";

// GET /api/inventory/orders
export async function GET(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const customerId = searchParams.get("customerId");
    const branchId = getActiveBranchId();

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (customerId) where.customerId = parseInt(customerId);
    
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
      ];
      if (/^\d+$/.test(search.trim())) {
        where.OR.push({ id: parseInt(search.trim(), 10) });
      }
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

    const serializedOrders = orders.map((order: any) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      paidAmount: Number(order.paidAmount),
      debtAmount: Number(order.debtAmount),
      movements: order.movements?.map((m: any) => ({
        ...m,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost)
      })) || []
    }));

    return NextResponse.json({
      orders: serializedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return handleApiError(error, "INVENTORY_ORDERS_GET", "Không thể tải danh sách đơn kho");
  }
}

// POST /api/inventory/orders
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const body = await parseJson(req, createInventoryOrderSchema);
    const branchId = getActiveBranchId();
    if (!branchId) throw new ApiError("Không xác định được chi nhánh hiện tại", 400, "BRANCH_REQUIRED");
    const userName = req.cookies.get("user_name")?.value || "System";

    // Build the inventory order
    const { customerId, type, items, address, reason } = body;
    
    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const paidAmount = Number(body.paidAmount || 0);
    if (paidAmount > totalAmount) {
      throw new ApiError("Số tiền đã trả không được lớn hơn tổng đơn hàng", 400, "OVERPAYMENT");
    }
    const debtAmount = Math.max(0, totalAmount - paidAmount);
    const status = debtAmount <= 0 ? "PAID" : "DEBT";

    // Generate unique code
    const code = `PX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await prisma.$transaction(async (tx) => {
      let finalCustomerId = customerId || null;
      
      if (finalCustomerId && address) {
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: { address }
        });
      }
      
      // Auto-create customer if phone & name provided but no ID
      if (!finalCustomerId && body.phone && body.customerName) {
        const customer = await getOrCreateCustomerForBranch({
          name: body.customerName,
          phone: body.phone,
          branchId,
          address,
        }, tx);
        if (customer) {
          finalCustomerId = customer.id;
        }
      }

      if (finalCustomerId) {
        await ensureCustomerBranch(finalCustomerId, branchId, tx);
      }

      const newOrder = await tx.inventoryOrder.create({
        data: {
          code,
          customerId: finalCustomerId,
          type: type || "EXPORT_RETAIL",
          totalAmount,
          paidAmount,
          debtAmount,
          status,
          reason,
          branchId,
          createdBy: userName,
          movements: {
            create: items.map((item: any) => ({
              productId: item.productId,
              branchId: branchId,
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

      // Fetch all required product branches in a single query
      const targetBranchId = branchId;
      const productIds = items.map((item) => item.productId);
      const productBranches = await tx.productBranch.findMany({
        where: {
          branchId: targetBranchId,
          productId: { in: productIds }
        },
        include: { product: true }
      });

      // Create a map for O(1) lookups
      const pbMap = new Map(productBranches.map(pb => [pb.productId, pb]));

      // Validation and update phase sequentially with row locking
      for (const item of items) {
        const pId = item.productId;
        const pb = pbMap.get(pId);
        
        if (!pb) {
          throw new Error(`Sản phẩm không tồn tại trong kho (ID: ${pId})`);
        }
        
        // Obtain write lock on product branch row
        const lockedRows: any[] = await tx.$queryRaw`
          SELECT id, "stockCount" FROM "ProductBranch"
          WHERE id = ${pb.id} FOR UPDATE
        `;
        const freshPb = lockedRows[0];
        const currentStock = Number(freshPb?.stockCount || 0);

        if (currentStock < item.quantity) {
          throw new Error(`Sản phẩm [${pb.product.sku}] ${pb.product.name} không đủ tồn (Cần ${item.quantity}, Hiện có ${currentStock}).`);
        }

        // Decrement within transaction
        await tx.productBranch.update({
          where: { id: pb.id },
          data: { stockCount: { decrement: item.quantity } }
        });
      }

      if (paidAmount > 0) {
        await tx.paymentTransaction.create({
          data: {
            code: `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: paidAmount,
            method: "CASH",
            type: "INCOME",
            referenceId: newOrder.id,
            referenceType: "INVENTORY_ORDER",
            note: `Thu tiền ngay khi tạo đơn kho ${newOrder.code}`,
            branchId: targetBranchId,
            createdBy: userName || "system"
          }
        });
      }

      // Update customer debt and spent (by paidAmount) if customer exists
      if (finalCustomerId) {
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: {
            totalSpent: { increment: paidAmount },
            totalDebt: { increment: debtAmount },
            lastVisit: new Date(),
          }
        });
      }

      return newOrder;
    });

    const serializedOrder = {
      ...order,
      totalAmount: Number(order.totalAmount),
      paidAmount: Number(order.paidAmount),
      debtAmount: Number(order.debtAmount)
    };

    return NextResponse.json(serializedOrder, { status: 201 });
  } catch (error) {
    return handleApiError(error, "INVENTORY_ORDERS_CREATE", "Không thể tạo đơn kho");
  }
}
