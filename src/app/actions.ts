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
  const targetBranchId = branchId || 1;

  const result = await prisma.$transaction(async (tx) => {
    const pb = await tx.productBranch.upsert({
      where: { productId_branchId: { productId: data.productId, branchId: targetBranchId } },
      update: {},
      create: { productId: data.productId, branchId: targetBranchId, stockCount: 0, movingAvgCost: 0 }
    });

    const oldStock = pb.stockCount;
    const oldMac = Number(pb.movingAvgCost || 0);
    const newStock = oldStock + actualQty;

    let newMac = oldMac;
    if (newStock > 0) {
       newMac = ((oldStock * oldMac) + (actualQty * avgCost)) / newStock;
    }

    const updatedPb = await tx.productBranch.update({
      where: { id: pb.id },
      data: {
        stockCount: newStock,
        movingAvgCost: newMac
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: data.productId,
        type: "IMPORT",
        quantity: actualQty,
        unitCost: avgCost,
        totalCost: data.unitCost * data.quantity,
        createdBy: "system",
      },
    });
    
    return updatedPb;
  });

  return { success: true, actualQty, avgCost, updatedProduct: result };
}

export async function createManualImport(data: {
  items: {
    productId: number;
    quantity: number;
    unitCost: number;
    conversionFactor?: number;
    note?: string;
  }[];
  createdBy: string;
}) {
  const branchId = getActiveBranchId();
  const targetBranchId = branchId || 1;

  if (!data.items || data.items.length === 0) {
    throw new Error("Danh sách nhập kho không được trống");
  }

  const results = await prisma.$transaction(async (tx) => {
    const movementsCreated = [];

    for (const item of data.items) {
      if (item.conversionFactor !== undefined && item.conversionFactor <= 0) {
        throw new Error("Hệ số quy đổi phải lớn hơn 0");
      }

      const factor = item.conversionFactor || 1;
      const actualQty = item.quantity * factor;
      const avgCost = item.unitCost / factor;

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại`);

      const pb = await tx.productBranch.upsert({
        where: { productId_branchId: { productId: item.productId, branchId: targetBranchId } },
        update: {},
        create: { productId: item.productId, branchId: targetBranchId, stockCount: 0, movingAvgCost: 0 }
      });

      const oldStock = pb.stockCount;
      const oldMac = Number(pb.movingAvgCost || 0);
      const newStock = oldStock + actualQty;

      let newMac = oldMac;
      if (newStock > 0) {
         newMac = ((oldStock * oldMac) + (actualQty * avgCost)) / newStock;
      }

      await tx.productBranch.update({
        where: { id: pb.id },
        data: {
          stockCount: newStock,
          movingAvgCost: newMac
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "IMPORT",
          quantity: actualQty,
          unitCost: avgCost,
          totalCost: item.unitCost * item.quantity,
          createdBy: data.createdBy,
          reason: item.note,
        },
      });
      movementsCreated.push(movement);
    }

    return { movements: movementsCreated };
  });

  const serializedMovements = results.movements.map((m) => ({
    ...m,
    unitCost: Number(m.unitCost),
    totalCost: Number(m.totalCost),
  }));

  return { success: true, movements: serializedMovements };
}

/**
 * Deduct stock on retail sale
 */
export async function sellItem(productId: number, quantity: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Sản phẩm không tồn tại");
  const branchId = getActiveBranchId();
  const targetBranchId = branchId || 1;

  const pb = await prisma.productBranch.findUnique({ where: { productId_branchId: { productId, branchId: targetBranchId } } });
  if (!pb || pb.stockCount < quantity) throw new Error("Không đủ hàng tồn kho");

  const updated = await prisma.productBranch.update({
    where: { id: pb.id },
    data: { stockCount: pb.stockCount - quantity },
  });

  return updated;
}




export async function createDirectExport(data: {
  items: {
    productId: number;
    quantity: number;
    conversionFactor?: number;
    note?: string;
  }[];
  createdBy: string;
  exportType?: "RETAIL" | "WHOLESALE";
}) {
  const branchId = getActiveBranchId();

  if (!data.items || data.items.length === 0) {
    throw new Error("Danh sách xuất kho không được trống");
  }

  const exportType = data.exportType || "RETAIL";

  const results = await prisma.$transaction(async (tx) => {
    const movementsCreated = [];

    const targetBranchId = branchId || 1;
    const productIds = Array.from(new Set(data.items.map(i => i.productId)));

    const [products, branches] = await Promise.all([
      tx.product.findMany({ where: { id: { in: productIds } }, include: { prices: true } }),
      tx.productBranch.findMany({ where: { productId: { in: productIds }, branchId: targetBranchId } })
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    const branchMap = new Map(branches.map(b => [b.productId, b]));

    for (const item of data.items) {
      if (item.conversionFactor !== undefined && item.conversionFactor <= 0) {
        throw new Error("Hệ số quy đổi phải lớn hơn 0");
      }

      const factor = item.conversionFactor || 1;
      const actualQty = item.quantity * factor;

      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại`);

      const pb = branchMap.get(item.productId);

      if (!pb || pb.stockCount < actualQty) {
        throw new Error(`Sản phẩm "${product.name}" không đủ tồn kho (hiện tại: ${pb?.stockCount || 0}, cần: ${actualQty})`);
      }

      const newStock = pb.stockCount - actualQty;

      await tx.productBranch.update({
        where: { id: pb.id },
        data: { stockCount: newStock },
      });

      const cogsUnit = Number(pb.movingAvgCost || 0);

      // Find the price based on export type
      const priceObj = product.prices.find((p) => p.type === exportType) ||
        product.prices.find((p) => p.type === "RETAIL");
      const unitPrice = priceObj ? Number(priceObj.amount) : 0;

      const exportTypeLabel = exportType === "RETAIL" ? "Bán lẻ" : "Bán buôn";
      const finalReason = item.note
        ? `[${exportTypeLabel}] ${item.note}`
        : `[${exportTypeLabel}]`;

      const movement = await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "EXPORT",
          quantity: actualQty,
          unitCost: cogsUnit,
          totalCost: cogsUnit * actualQty,
          reason: finalReason,
          createdBy: data.createdBy,
        },
      });
      movementsCreated.push(movement);
    }

    return { movements: movementsCreated };
  });

  const serializedMovements = results.movements.map((m) => ({
    ...m,
    unitCost: Number(m.unitCost),
    totalCost: Number(m.totalCost),
  }));

  return { success: true, movements: serializedMovements };
}

export async function createManualAdjust(data: {
  items: {
    productId: number;
    actualStock: number;
    note?: string;
  }[];
  createdBy: string;
}) {
  const branchId = getActiveBranchId();

  if (!data.items || data.items.length === 0) {
    throw new Error("Danh sách kiểm kê không được trống");
  }

  const results = await prisma.$transaction(async (tx) => {
    const movementsCreated = [];

    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại`);
      const targetBranchId = branchId || 1;

      const pb = await tx.productBranch.upsert({
        where: { productId_branchId: { productId: item.productId, branchId: targetBranchId } },
        update: {},
        create: { productId: item.productId, branchId: targetBranchId, stockCount: 0, movingAvgCost: 0 }
      });

      const diff = item.actualStock - pb.stockCount;
      if (diff !== 0) {
        await tx.productBranch.update({
          where: { id: pb.id },
          data: { stockCount: item.actualStock },
        });

        // Nếu tăng tồn, tính toán lại MAC
        if (diff > 0) {
           const oldStock = pb.stockCount;
           const oldMac = Number(pb.movingAvgCost || 0);
           const avgCost = 0; // Điều chỉnh thì giá vốn hàng nhập thường là 0 nếu không biết
           const newMac = item.actualStock > 0 ? ((oldStock * oldMac) + (diff * avgCost)) / item.actualStock : oldMac;
           await tx.productBranch.update({
             where: { id: pb.id },
             data: { movingAvgCost: newMac }
           });
        }

        const unitCost = Number(pb.movingAvgCost || 0);

        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "ADJUST",
            quantity: Math.abs(diff),
            unitCost: unitCost,
            totalCost: unitCost * Math.abs(diff),
            createdBy: data.createdBy,
            reason: item.note || `Kiểm kê lệch ${diff > 0 ? "+" : ""}${diff}`,
          },
        });
        movementsCreated.push(movement);
      }
    }

    return { movements: movementsCreated };
  }, { timeout: 15000, maxWait: 15000 });

  return { success: true, movements: results.movements };
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

  if (isFinalizing) {
    const tech = updatedRo.technician;
    if (tech) {
      // Update tech status back to idle
      await prisma.technician.update({
        where: { id: tech.id },
        data: { status: "IDLE" },
      });
    }

    // Add customer loyalty points
    const configPointsRate = await prisma.systemConfig.findUnique({
      where: { key: "points_rate" }
    });
    const pointsRatePercent = configPointsRate ? parseFloat(configPointsRate.value) : 1.0;
    const points = Math.max(0, Math.floor((Number(updatedRo.totalAmount) * (pointsRatePercent / 100)) / 1000));

    await prisma.customer.update({
      where: { id: updatedRo.customerId },
      data: {
        loyaltyPoints: { increment: points },
        totalSpent: { increment: updatedRo.totalAmount },
        lastVisit: new Date(),
      },
    });

    // Send ZNS live
    // Fetch updated customer to get new total points after increment
    const updatedCustomer = await prisma.customer.findUnique({
      where: { id: updatedRo.customerId },
      select: { loyaltyPoints: true },
    });
    const totalPoint = updatedCustomer?.loyaltyPoints ?? points;

    let znsStatus = "SUCCESS";
    let znsError: string | null = null;

    try {
      const { sendZaloZns, formatDateForZalo } = await import("@/lib/zalo");
      const custName = updatedRo.customer.name;
      const noteVal = updatedRo.vehicleModel || updatedRo.plateNumber || "Dịch vụ sửa chữa xe";
      const templateData = {
        customer_name: custName.length > 49 ? custName.substring(0, 49) : custName,
        order_date: formatDateForZalo(new Date()),
        note: noteVal.length > 29 ? noteVal.substring(0, 29) : noteVal,
        point: String(points),
        total_point: String(totalPoint),
      };
      const result = await sendZaloZns(updatedRo.customer.phone, "CRM_THANK_YOU_001", templateData);
      if (!result.success) {
        znsStatus = "FAILED";
        znsError = result.error || "Lỗi không xác định";
      }
    } catch (e: any) {
      znsStatus = "FAILED";
      znsError = e.message;
    }

    await prisma.znsLog.create({
      data: {
        customerId: updatedRo.customerId,
        phone: updatedRo.customer.phone,
        messageType: "THANK_YOU",
        templateId: "CRM_THANK_YOU_001",
        content: `Cảm ơn khách hàng ${updatedRo.customer.name} đã sửa chữa xe. Quý khách tích được +${points} điểm!`,
        status: znsStatus === "SUCCESS" ? "SUCCESS" : "FAILED",
        error: znsError,
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
  const targetBranchId = branchId || 1;

  const pb = await prisma.productBranch.findUnique({
    where: { productId_branchId: { productId: data.productId, branchId: targetBranchId } }
  });

  const ro = await prisma.repairOrder.findUnique({ where: { id: data.repairOrderId } });
  if (!ro) throw new Error("Lệnh sửa chữa không tồn tại");
  if (branchId && ro.branchId !== branchId) {
    throw new Error("Lệnh sửa chữa không thuộc chi nhánh hiện tại");
  }

  if (!pb || pb.stockCount < data.quantity) {
    throw new Error("Không đủ số lượng trong kho");
  }

  const selectedPrice = product.prices.find((p) => p.type === data.priceType);
  if (!selectedPrice) throw new Error(`Không tìm thấy bảng giá ${data.priceType}`);

  const unitPrice = Number(selectedPrice.amount);
  const totalPrice = unitPrice * data.quantity;
  const cogsUnit = Number(pb.movingAvgCost || 0);

  // Transaction to update inventory, create order item & create stock movement
  const [, item] = await prisma.$transaction([
    prisma.productBranch.update({
      where: { id: pb.id },
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
        unitCost: cogsUnit,
        totalCost: cogsUnit * data.quantity,
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

  const { sendZaloZns, formatDateForZalo } = await import("@/lib/zalo");
  const nextServiceDate = new Date();
  nextServiceDate.setMonth(nextServiceDate.getMonth() + 6);
  const nextServiceText = `Thay dầu (${formatDateForZalo(nextServiceDate)})`;

  const rawNote = `Thay dầu xe ${data.plateNumber}`;
  const truncatedNote = rawNote.length > 29 ? rawNote.substring(0, 29) : rawNote;
  const custName = customer.name;
  const truncatedCustName = custName.length > 49 ? custName.substring(0, 49) : custName;

  const templateData = {
    customer_name: truncatedCustName,
    order_date: formatDateForZalo(new Date()),
    note: truncatedNote,
    point: "0",
    total_point: String(customer.loyaltyPoints || 0),
  };

  const result = await sendZaloZns(data.phone, "CRM_OIL_REMIND_002", templateData);

  let status = "SUCCESS";
  let errorMsg: string | null = null;

  if (!result.success) {
    status = "FAILED";
    errorMsg = result.error || "Gửi ZNS thất bại";
  }

  await prisma.znsLog.create({
    data: {
      customerId: data.customerId,
      phone: data.phone,
      messageType: "OIL_CHANGE",
      templateId: "CRM_OIL_REMIND_002",
      content: `Nhắc lịch: Xe ${data.plateNumber} của quý khách đã đến kỳ thay dầu nhớt định kỳ. Vui lòng liên hệ AutoSmart để đặt lịch hẹn!`,
      status,
      error: errorMsg,
      branchId: customer.branchId,
    },
  });

  if (status === "FAILED") {
    throw new Error(errorMsg || "Gửi Zalo ZNS thất bại");
  }

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

    const targetBranchId = branchId || 1;
    const productIds = Array.from(new Set(data.items.map(i => i.productId)));

    const [products, branches] = await Promise.all([
      tx.product.findMany({ where: { id: { in: productIds } }, include: { prices: true } }),
      tx.productBranch.findMany({ where: { productId: { in: productIds }, branchId: targetBranchId } })
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    const branchMap = new Map(branches.map(b => [b.productId, b]));

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại`);

      const pb = branchMap.get(item.productId);

      if (!pb || pb.stockCount < item.quantity) {
        throw new Error(`Sản phẩm "${product.name}" không đủ số lượng trong kho (Tồn: ${pb?.stockCount || 0}, Yêu cầu: ${item.quantity})`);
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
      const cogsUnit = Number(pb.movingAvgCost || 0);

      // Update stock
      await tx.productBranch.update({
        where: { id: pb.id },
        data: { stockCount: { decrement: item.quantity } },
      });

      // Create Stock Movement
      const movement = await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "EXPORT",
          quantity: item.quantity,
          unitCost: cogsUnit,
          totalCost: cogsUnit * item.quantity,
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
  }, { timeout: 10000, maxWait: 10000 });

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

      const pb = await tx.productBranch.findUnique({
        where: { productId_branchId: { productId: item.productId, branchId: activeBranchId } }
      });

      if (!pb || pb.stockCount < item.quantity) {
        throw new Error(`Sản phẩm "${product.name}" không đủ số lượng trong kho (Tồn: ${pb?.stockCount || 0}, Yêu cầu: ${item.quantity})`);
      }

      // Decrement stock
      await tx.productBranch.update({
        where: { id: pb.id },
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
      const cogsUnit = Number(pb.movingAvgCost || 0);

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
          unitCost: cogsUnit,
          totalCost: cogsUnit * item.quantity,
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

export async function sendCustomZnsAction(data: {
  customerId: number;
  phone: string;
  messageType: string;
  templateId?: string;
  content: string;
}) {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new Error("Khách hàng không tồn tại");

  let status = "SUCCESS";
  let errorMsg: string | null = null;

  if (data.templateId) {
    // Compile template data dynamically for Zalo ZNS
    const lastRo = await prisma.repairOrder.findFirst({
      where: { customerId: data.customerId },
      orderBy: { createdAt: "desc" },
    });
    const plate = lastRo?.plateNumber || customer.vehiclePlates?.[0] || "N/A";
    const finalTotal = lastRo
      ? Number(lastRo.totalAmount).toLocaleString("vi-VN") + "đ"
      : Number(customer.totalSpent).toLocaleString("vi-VN") + "đ";

    const { sendZaloZns, formatDateForZalo } = await import("@/lib/zalo");
    const nextServiceDate = new Date();
    nextServiceDate.setMonth(nextServiceDate.getMonth() + 6);
    const nextServiceText = `${data.messageType === "GENERAL_INSPECT" ? "Kiểm tra" : "Thay dầu"} (${formatDateForZalo(nextServiceDate)})`;

    // Zalo note field has a strict 30-character limit. Shorten and enforce truncation.
    const actionLabel = data.messageType === "GENERAL_INSPECT" ? "Bảo dưỡng" : "Thay dầu";
    const rawNote = `${actionLabel} xe ${plate}`;
    const truncatedNote = rawNote.length > 29 ? rawNote.substring(0, 29) : rawNote;
    const custName = customer.name;
    const truncatedCustName = custName.length > 49 ? custName.substring(0, 49) : custName;

    const templateData = {
      customer_name: truncatedCustName,
      order_date: formatDateForZalo(new Date()),
      note: truncatedNote,
      point: "0",
      total_point: String(customer.loyaltyPoints || 0),
    };

    const result = await sendZaloZns(data.phone, data.templateId, templateData);

    if (!result.success) {
      status = "FAILED";
      errorMsg = result.error || "Lỗi gửi ZNS";
    }
  } else {
    // Falls back to mock SENT status if no templateId provided
    status = "SENT";
  }

  await prisma.znsLog.create({
    data: {
      customerId: data.customerId,
      phone: data.phone,
      messageType: data.messageType,
      templateId: data.templateId || null,
      content: data.content,
      status,
      error: errorMsg,
      branchId: customer.branchId,
    },
  });

  if (status === "FAILED") {
    return { success: false, error: errorMsg || "Gửi Zalo ZNS thất bại" };
  }

  return { success: true };
}


