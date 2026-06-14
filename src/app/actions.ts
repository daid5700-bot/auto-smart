"use server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// ===== INVENTORY LOGIC =====

/**
 * Weighted Average Cost (WAC) & Unit Conversion
 */
export async function importStock(data: {
  productId: number;
  quantity: number;
  unitCost: number;
  conversionFactor?: number;
}) {
  if (data.conversionFactor !== undefined && data.conversionFactor <= 0) {
    throw new Error("Conversion factor must be greater than 0");
  }

  const factor = data.conversionFactor || 1;
  const actualQty = data.quantity * factor;
  const avgCost = data.unitCost / factor;

  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw new Error("Sản phẩm không tồn tại");
  const branchId = getActiveBranchId();
  if (branchId && product.branchId !== branchId) {
    throw new Error("Sản phẩm không thuộc chi nhánh hiện tại");
  }

  const newStock = product.stockCount + actualQty;

  const updatedProduct = await prisma.product.update({
    where: { id: data.productId },
    data: {
      stockCount: newStock,
      lastImportDate: new Date(),
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: data.productId,
      type: "IMPORT",
      quantity: actualQty,
      unitCost: avgCost,
      totalCost: data.unitCost * data.quantity,
      createdBy: "system",
    },
  });

  return { success: true, actualQty, avgCost, updatedProduct };
}

/**
 * Deduct stock on retail sale
 */
export async function sellItem(productId: number, quantity: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Sản phẩm không tồn tại");
  const branchId = getActiveBranchId();
  if (branchId && product.branchId !== branchId) {
    throw new Error("Sản phẩm không thuộc chi nhánh hiện tại");
  }
  if (product.stockCount < quantity) throw new Error("Không đủ hàng tồn kho");

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { stockCount: product.stockCount - quantity },
  });

  return updated;
}




// ===== WORKSHOP LOGIC =====

/**
 * Update RO status & handle commission/loyalty point triggers
 */
export async function updateROStatus(data: {
  repairOrderId: number;
  newStatus: string;
}) {
  const ro = await prisma.repairOrder.findUnique({
    where: { id: data.repairOrderId },
    include: { customer: true },
  });

  if (!ro) throw new Error("Lệnh sửa chữa không tồn tại");
  const branchId = getActiveBranchId();
  if (branchId && ro.branchId !== branchId) {
    throw new Error("Lệnh sửa chữa không thuộc chi nhánh hiện tại");
  }

  const isFinalizing = data.newStatus === "DONE" && ro.status !== "DONE";

  const updatedRo = await prisma.repairOrder.update({
    where: { id: data.repairOrderId },
    data: {
      status: data.newStatus,
      ...(isFinalizing ? { completedAt: new Date() } : {}),
    },
    include: { customer: true, technician: true, items: true },
  });

  if (isFinalizing && updatedRo.technicianId) {
    const tech = updatedRo.technician;
    if (tech) {
      // Calculate and save technician commission
      const commission = Number(updatedRo.totalAmount) * tech.commissionRate / 100;
      await prisma.techPerformance.create({
        data: {
          technicianId: tech.id,
          repairOrderId: updatedRo.id,
          commissionAmount: commission,
        },
      });

      // Update tech status back to idle
      await prisma.technician.update({
        where: { id: tech.id },
        data: { status: "IDLE" },
      });
    }

    // Add customer loyalty points
    const points = Math.floor(Number(updatedRo.totalAmount) * 0.01 / 1000); // 1% rate, 1 point per 1k VND
    await prisma.customer.update({
      where: { id: updatedRo.customerId },
      data: {
        loyaltyPoints: { increment: points },
        totalSpent: { increment: updatedRo.totalAmount },
        lastVisit: new Date(),
      },
    });

    // Send ZNS
    await prisma.znsLog.create({
      data: {
        customerId: updatedRo.customerId,
        phone: updatedRo.customer.phone,
        messageType: "THANK_YOU",
        content: `Cảm ơn khách hàng ${updatedRo.customer.name} đã sửa chữa xe. Quý khách tích được +${points} điểm!`,
        status: "SENT",
        branchId: updatedRo.branchId,
      },
    });
  }

  return { success: true, ro: updatedRo };
}

/**
 * Export stock for a Repair Order
 */
export async function exportStockForRO(data: {
  repairOrderId: number;
  productId: number;
  quantity: number;
  priceType: "RETAIL" | "WHOLESALE" | "INSURANCE";
}) {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    include: { prices: true },
  });

  if (!product) throw new Error("Sản phẩm không tồn tại");
  const branchId = getActiveBranchId();
  if (branchId && product.branchId !== branchId) {
    throw new Error("Sản phẩm không thuộc chi nhánh hiện tại");
  }

  const ro = await prisma.repairOrder.findUnique({ where: { id: data.repairOrderId } });
  if (!ro) throw new Error("Lệnh sửa chữa không tồn tại");
  if (branchId && ro.branchId !== branchId) {
    throw new Error("Lệnh sửa chữa không thuộc chi nhánh hiện tại");
  }

  if (product.stockCount < data.quantity) {
    throw new Error("Không đủ số lượng trong kho");
  }

  const selectedPrice = product.prices.find((p) => p.type === data.priceType);
  if (!selectedPrice) throw new Error(`Không tìm thấy bảng giá ${data.priceType}`);

  const unitPrice = Number(selectedPrice.amount);
  const totalPrice = unitPrice * data.quantity;

  // Transaction to update inventory, create order item & create stock movement
  const [, item] = await prisma.$transaction([
    prisma.product.update({
      where: { id: data.productId },
      data: { stockCount: { decrement: data.quantity } },
    }),
    prisma.orderItem.create({
      data: {
        repairOrderId: data.repairOrderId,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice,
        totalPrice,
      },
    }),
    prisma.stockMovement.create({
      data: {
        productId: data.productId,
        type: "EXPORT",
        quantity: data.quantity,
        unitCost: unitPrice,
        totalCost: totalPrice,
        reason: "Xuất kho sửa chữa",
        relatedRoId: data.repairOrderId,
        createdBy: "system",
      },
    }),
  ]);

  // Recalculate bill
  const roItems = await prisma.orderItem.findMany({
    where: { repairOrderId: data.repairOrderId },
  });

  const partsCost = roItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
  const laborCost = ro ? Number(ro.laborCost) : 0;

  await prisma.repairOrder.update({
    where: { id: data.repairOrderId },
    data: {
      partsCost,
      totalAmount: laborCost + partsCost,
    },
  });

  return { success: true, item };
}

// ===== CRM LOGIC =====



/**
 * Mock ZNS sending
 */
export async function sendZNSMock(phone: string, templateId: string, payload: any) {
  // Simply mock successful network response returning sent payload
  return {
    success: true,
    sentTo: phone,
    templateId,
    payload,
    sentAt: new Date(),
  };
}

export async function redeemPointsDb(data: { customerId: number; points: number }) {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new Error("Khách hàng không tồn tại");
  const branchId = getActiveBranchId();
  if (branchId && customer.branchId !== branchId) {
    throw new Error("Khách hàng không thuộc chi nhánh hiện tại");
  }
  if (customer.loyaltyPoints < data.points) throw new Error("Không đủ điểm tích lũy");

  const updated = await prisma.customer.update({
    where: { id: data.customerId },
    data: { loyaltyPoints: customer.loyaltyPoints - data.points },
  });

  // Ghi log giao dịch điểm (audit trail)
  await prisma.loyaltyTransaction.create({
    data: {
      customerId: data.customerId,
      type: "REDEEM",
      points: -data.points,
      description: `Đổi ${data.points} điểm thành ${(data.points * 1000).toLocaleString("vi-VN")}đ giảm giá hóa đơn`,
      branchId: customer.branchId,
    },
  });

  await prisma.znsLog.create({
    data: {
      customerId: data.customerId,
      phone: customer.phone,
      messageType: "PROMO",
      content: `Khách hàng ${customer.name} đã đổi thành công ${data.points} điểm tích lũy thành giảm giá hóa đơn!`,
      status: "SENT",
      branchId: customer.branchId,
    },
  });

  return data.points * 1000; // 1 point = 1,000 VND
}

export async function sendOilChangeReminderAction(data: { customerId: number; phone: string; plateNumber: string }) {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new Error("Khách hàng không tồn tại");
  const branchId = getActiveBranchId();
  if (branchId && customer.branchId !== branchId) {
    throw new Error("Khách hàng không thuộc chi nhánh hiện tại");
  }

  await prisma.znsLog.create({
    data: {
      customerId: data.customerId,
      phone: data.phone,
      messageType: "OIL_CHANGE",
      content: `Nhắc lịch: Xe ${data.plateNumber} của quý khách đã đến kỳ thay dầu nhớt định kỳ. Vui lòng liên hệ AutoSmart để đặt lịch hẹn!`,
      status: "SENT",
      branchId: customer.branchId,
    },
  });
  return { success: true };
}

export async function createManualExport(data: {
  items: {
    productId: number;
    quantity: number;
    priceType: "RETAIL" | "WHOLESALE" | "INSURANCE";
    customUnitPrice?: number;
  }[];
  exportType: "REPAIR" | "RETAIL";
  repairOrderId?: number;
  reason?: string;
  createdBy: string;
}) {
  const branchId = getActiveBranchId();

  if (!data.items || data.items.length === 0) {
    throw new Error("Danh sách xuất kho không được trống");
  }

  const reasonText = data.reason || (data.exportType === "REPAIR" ? "Xuất kho sửa chữa" : "Xuất kho bán lẻ");

  // Run everything inside a transaction to ensure atomic execution
  const results = await prisma.$transaction(async (tx) => {
    const movementsCreated = [];
    const orderItemsCreated = [];

    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { prices: true },
      });

      if (!product) throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại`);
      if (branchId && product.branchId !== branchId) {
        throw new Error(`Sản phẩm "${product.name}" không thuộc chi nhánh hiện tại`);
      }
      if (product.stockCount < item.quantity) {
        throw new Error(`Sản phẩm "${product.name}" không đủ số lượng trong kho (Tồn: ${product.stockCount}, Yêu cầu: ${item.quantity})`);
      }

      // Determine selling price
      let unitPrice = 0;
      if (item.customUnitPrice !== undefined && item.customUnitPrice !== null) {
        unitPrice = item.customUnitPrice;
      } else {
        const selectedPrice = product.prices.find((p) => p.type === item.priceType);
        if (!selectedPrice) throw new Error(`Không tìm thấy bảng giá ${item.priceType} cho sản phẩm ${product.name}`);
        unitPrice = Number(selectedPrice.amount);
      }

      const totalPrice = unitPrice * item.quantity;

      // Update stock
      await tx.product.update({
        where: { id: item.productId },
        data: { stockCount: { decrement: item.quantity } },
      });

      // Create Stock Movement
      const movement = await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "EXPORT",
          quantity: item.quantity,
          unitCost: unitPrice,
          totalCost: totalPrice,
          reason: reasonText,
          relatedRoId: data.exportType === "REPAIR" ? data.repairOrderId : null,
          createdBy: data.createdBy,
        },
      });
      movementsCreated.push(movement);

      // Create OrderItem if RO repair export
      if (data.exportType === "REPAIR") {
        if (!data.repairOrderId) throw new Error("Yêu cầu mã lệnh sửa chữa (RO) để xuất kho sửa chữa");
        
        const ro = await tx.repairOrder.findUnique({ where: { id: data.repairOrderId } });
        if (!ro) throw new Error("Lệnh sửa chữa không tồn tại");
        if (branchId && ro.branchId !== branchId) {
          throw new Error("Lệnh sửa chữa không thuộc chi nhánh hiện tại");
        }

        const orderItem = await tx.orderItem.create({
          data: {
            repairOrderId: data.repairOrderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            totalPrice,
          },
        });
        orderItemsCreated.push(orderItem);
      }
    }

    return { movements: movementsCreated, items: orderItemsCreated };
  });

  // Recalculate bill if REPAIR
  if (data.exportType === "REPAIR" && data.repairOrderId) {
    const roItems = await prisma.orderItem.findMany({
      where: { repairOrderId: data.repairOrderId },
    });

    const partsCost = roItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
    const ro = await prisma.repairOrder.findUnique({ where: { id: data.repairOrderId } });
    const laborCost = ro ? Number(ro.laborCost) : 0;

    await prisma.repairOrder.update({
      where: { id: data.repairOrderId },
      data: {
        partsCost,
        totalAmount: laborCost + partsCost,
      },
    });
  }

  // Convert Decimals to Numbers to make the objects fully serializable in Next.js Server Actions
  const serializedMovements = results.movements.map((m) => ({
    ...m,
    unitCost: Number(m.unitCost),
    totalCost: Number(m.totalCost),
  }));

  const serializedItems = results.items.map((i) => ({
    ...i,
    unitPrice: Number(i.unitPrice),
    totalPrice: Number(i.totalPrice),
  }));

  return {
    success: true,
    movements: serializedMovements,
    items: serializedItems,
  };
}

/**
 * Create a Parts Requisition for a Repair Order
 */
export async function createPartsRequisition(data: {
  repairOrderId: number;
  items: {
    productId: number;
    quantity: number;
    priceType: "RETAIL" | "WHOLESALE" | "INSURANCE";
    customUnitPrice?: number;
  }[];
  reason?: string;
  createdBy: string;
}) {
  const activeBranchId = getActiveBranchId();
  if (!activeBranchId) {
    throw new Error("Không xác định được chi nhánh hiện tại");
  }

  if (!data.items || data.items.length === 0) {
    throw new Error("Danh sách phụ tùng yêu cầu không được trống");
  }

  // 1. Fetch and validate Repair Order
  const ro = await prisma.repairOrder.findUnique({
    where: { id: data.repairOrderId },
  });

  if (!ro) {
    throw new Error("Lệnh sửa chữa (RO) không tồn tại");
  }

  if (ro.branchId !== activeBranchId) {
    throw new Error("Lệnh sửa chữa không thuộc chi nhánh hiện tại");
  }

  // 2. Transaction to process everything atomically
  const result = await prisma.$transaction(async (tx) => {
    // A. Create the PartsRequisition record
    const requisition = await tx.partsRequisition.create({
      data: {
        repairOrderId: data.repairOrderId,
        branchId: activeBranchId,
        reason: data.reason || "Xin phụ tùng sửa chữa",
        createdBy: data.createdBy,
      },
    });

    const requisitionItemsCreated = [];
    const orderItemsCreated = [];
    const movementsCreated = [];

    // B. Process each item
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { prices: true },
      });

      if (!product) {
        throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại`);
      }

      if (product.branchId !== activeBranchId) {
        throw new Error(`Sản phẩm "${product.name}" không thuộc chi nhánh hiện tại`);
      }

      if (product.stockCount < item.quantity) {
        throw new Error(`Sản phẩm "${product.name}" không đủ số lượng trong kho (Tồn: ${product.stockCount}, Yêu cầu: ${item.quantity})`);
      }

      // Decrement stock
      await tx.product.update({
        where: { id: item.productId },
        data: { stockCount: { decrement: item.quantity } },
      });

      // Create PartsRequisitionItem
      const reqItem = await tx.partsRequisitionItem.create({
        data: {
          requisitionId: requisition.id,
          productId: item.productId,
          quantity: item.quantity,
        },
      });
      requisitionItemsCreated.push(reqItem);

      // Determine selling price
      let unitPrice = 0;
      if (item.customUnitPrice !== undefined && item.customUnitPrice !== null) {
        unitPrice = item.customUnitPrice;
      } else {
        const selectedPrice = product.prices.find((p) => p.type === item.priceType);
        if (!selectedPrice) {
          throw new Error(`Không tìm thấy bảng giá ${item.priceType} cho sản phẩm ${product.name}`);
        }
        unitPrice = Number(selectedPrice.amount);
      }

      const totalPrice = unitPrice * item.quantity;

      // Create OrderItem
      const orderItem = await tx.orderItem.create({
        data: {
          repairOrderId: data.repairOrderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        },
      });
      orderItemsCreated.push(orderItem);

      // Create StockMovement (EXPORT)
      const movement = await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "EXPORT",
          quantity: item.quantity,
          unitCost: unitPrice,
          totalCost: totalPrice,
          reason: data.reason || `Xuất kho xin phụ tùng cho RO #${data.repairOrderId}`,
          relatedRoId: data.repairOrderId,
          createdBy: data.createdBy,
        },
      });
      movementsCreated.push(movement);
    }

    return { requisition, requisitionItemsCreated, orderItemsCreated, movementsCreated };
  });

  // 3. Recalculate bill for the RO
  const roItems = await prisma.orderItem.findMany({
    where: { repairOrderId: data.repairOrderId },
  });

  const partsCost = roItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
  const laborCost = Number(ro.laborCost);

  await prisma.repairOrder.update({
    where: { id: data.repairOrderId },
    data: {
      partsCost,
      totalAmount: laborCost + partsCost,
    },
  });

  // Convert Decimals to Numbers to make serialized responses fully serializable
  return {
    success: true,
    requisition: {
      ...result.requisition,
      items: result.requisitionItemsCreated.map(i => ({
        ...i,
        product: undefined // UI can fetch separately or we can query it later
      })),
    },
  };
}

