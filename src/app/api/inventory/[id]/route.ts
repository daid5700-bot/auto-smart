import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { verifyRole } from "@/lib/auth";

// PATCH /api/inventory/[id] — update product details & prices
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const userRole = await verifyRole(req.cookies.get("user_role")?.value);
    const isAdmin = userRole === "ADMIN";
    const branchId = getActiveBranchId();

    // Release SKUs of any old INACTIVE products to avoid unique constraint failures on update
    try {
      const oldInactive = await prisma.product.findMany({
        where: {
          status: "INACTIVE",
          NOT: {
            sku: {
              startsWith: "INACTIVE-",
            },
          },
        },
      });
      for (const p of oldInactive) {
        await prisma.product.update({
          where: { id: p.id },
          data: { sku: `INACTIVE-${p.id}-${p.sku}` },
        });
      }
    } catch (e) {
      console.error("Error auto-releasing INACTIVE SKUs:", e);
    }

    const currentProduct = await prisma.product.findFirst({
      where: {
        id,
        ...((branchId && !isAdmin) ? { productBranches: { some: { branchId } } } : {}),
      },
    });
    if (!currentProduct) return NextResponse.json({ error: "Phụ tùng không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    if (body.sku && body.sku !== currentProduct.sku) {
      const existingActive = await prisma.product.findFirst({
        where: {
          sku: body.sku,
          status: { not: "INACTIVE" },
          id: { not: id }
        }
      });
      if (existingActive) {
        return NextResponse.json({ error: `Mã sản phẩm (SKU) '${body.sku}' đã tồn tại và đang hoạt động.` }, { status: 400 });
      }
    }

    // Update product 
    const product = await prisma.product.update({
      where: { id },
      data: {
        sku: body.sku,
        name: body.name,
        category: body.category,
        unit: body.unit,
        conversionUnit: body.conversionUnit,
        conversionFactor: body.conversionFactor,
        parentId: body.parentId ? parseInt(body.parentId) : null,
      },
    });

    // Update product branch
    const targetBranchId = body.branchId ? Number(body.branchId) : branchId;
    if (targetBranchId && (body.stockCount !== undefined || body.stockMin !== undefined || body.stockMax !== undefined)) {
      await prisma.productBranch.upsert({
        where: { productId_branchId: { productId: id, branchId: targetBranchId } },
        update: {
          ...(body.stockCount !== undefined ? { stockCount: body.stockCount } : {}),
          ...(body.stockMin !== undefined ? { stockMin: body.stockMin } : {}),
          ...(body.stockMax !== undefined ? { stockMax: body.stockMax } : {}),
        },
        create: {
          productId: id,
          branchId: targetBranchId,
          stockCount: body.stockCount || 0,
          stockMin: body.stockMin || 0,
          stockMax: body.stockMax || 100,
        }
      })
    }

    if (body.prices && Array.isArray(body.prices)) {
      for (const p of body.prices) {
        await prisma.price.upsert({
          where: {
            productId_type: { productId: id, type: p.type },
          },
          update: { amount: p.amount },
          create: { productId: id, type: p.type, amount: p.amount },
        });
      }
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/inventory/[id] — soft delete product
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const userRole = await verifyRole(req.cookies.get("user_role")?.value);
    const isAdmin = userRole === "ADMIN";
    const branchId = getActiveBranchId();

    const currentProduct = await prisma.product.findFirst({
      where: {
        id,
        ...((branchId && !isAdmin) ? { productBranches: { some: { branchId } } } : {}),
      },
    });
    if (!currentProduct) return NextResponse.json({ error: "Phụ tùng không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    await prisma.product.update({
      where: { id },
      data: {
        status: "INACTIVE",
        sku: currentProduct.sku.startsWith("INACTIVE-") ? currentProduct.sku : `INACTIVE-${currentProduct.id}-${currentProduct.sku}`
      },
    });
    return NextResponse.json({ success: true, message: "Xóa phụ tùng thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
