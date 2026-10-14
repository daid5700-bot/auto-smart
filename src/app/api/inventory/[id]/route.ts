import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { parseOptionalVehicleModels, parseProductPrices } from "@/lib/validation/inventory";
import { requireAuth } from "@/lib/guard";

// PATCH /api/inventory/[id] — update product details & prices
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(req, ["ADMIN", "WAREHOUSE"]);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt((await params).id);
    const body = await req.json();
    const prices = parseProductPrices(body.prices);
    const branchId = await getActiveBranchId();
    const hasVehicleModels =
      Object.prototype.hasOwnProperty.call(body, "vehicleModels") ||
      Object.prototype.hasOwnProperty.call(body, "vehicleModel");
    const vehicleModels = hasVehicleModels
      ? parseOptionalVehicleModels(
          Object.prototype.hasOwnProperty.call(body, "vehicleModels")
            ? body.vehicleModels
            : body.vehicleModel,
        )
      : undefined;

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
        ...(branchId ? { productBranches: { some: { branchId } } } : {}),
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

    // Product details, branch stock and both price keys must commit together.
    const product = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          sku: body.sku,
          name: body.name,
          ...(vehicleModels
            ? {
                vehicleModel: vehicleModels.length > 0 ? vehicleModels.join(", ") : null,
                vehicleModels,
              }
            : {}),
          category: body.category,
          unit: body.unit,
          conversionUnit: body.conversionUnit,
          conversionFactor: body.conversionFactor,
          parentId: body.parentId ? parseInt(body.parentId) : null,
        },
      });

      const targetBranchId = branchId;
      if (targetBranchId && (body.stockCount !== undefined || body.stockMin !== undefined || body.stockMax !== undefined)) {
        await tx.productBranch.upsert({
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
          },
        });
      }

      if (prices) {
        for (const price of prices) {
          await tx.price.upsert({
            where: { productId_type: { productId: id, type: price.type } },
            update: { amount: price.amount },
            create: { productId: id, type: price.type, amount: price.amount },
          });
        }
      }

      return updatedProduct;
    });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/inventory/[id] — soft delete product
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(req, ["ADMIN", "WAREHOUSE"]);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt((await params).id);
    const branchId = await getActiveBranchId();

    const currentProduct = await prisma.product.findFirst({
      where: {
        id,
        ...(branchId ? { productBranches: { some: { branchId } } } : {}),
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
