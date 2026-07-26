import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";

const REQUISITION_CHANGED = "requisition-count-changed";

type RequisitionEventPayload = {
  branchId: number;
};

const globalForRequisitionEvents = globalThis as typeof globalThis & {
  requisitionEvents?: EventEmitter;
};

export const requisitionEvents =
  globalForRequisitionEvents.requisitionEvents ?? new EventEmitter();

if (!globalForRequisitionEvents.requisitionEvents) {
  requisitionEvents.setMaxListeners(100);
  globalForRequisitionEvents.requisitionEvents = requisitionEvents;
}

export async function getPendingRequisitionCount(branchId: number) {
  const [pendingWorkshopCount, giftReqs, pendingVehicleOrders] = await Promise.all([
    prisma.partsRequisition.count({
      where: {
        branchId,
        status: "PENDING",
        repairOrderId: { not: null },
      },
    }),
    prisma.partsRequisition.findMany({
      where: {
        branchId,
        status: "PENDING",
        vehicleId: { not: null },
      },
      select: {
        vehicle: {
          select: {
            vin: true,
          },
        },
      },
    }),
    prisma.inventoryOrder.findMany({
      where: {
        branchId,
        status: "PENDING",
        createdBy: "Hệ thống (Bán Xe)",
      },
      select: {
        reason: true,
        vehicle: { select: { vin: true } },
      },
    }),
  ]);

  const uniqueVins = new Set<string>();
  let noVinCount = 0;

  for (const order of pendingVehicleOrders) {
    let vin = null;
    if (order.vehicle) {
      vin = order.vehicle.vin;
    } else {
      const vinMatch = order.reason?.match(/Xuất phụ kiện bán kèm xe VIN:\s*(.+)$/);
      vin = vinMatch ? vinMatch[1].trim() : null;
    }
    if (vin) {
      uniqueVins.add(vin);
    } else {
      noVinCount++;
    }
  }

  for (const gift of giftReqs) {
    const vin = gift.vehicle?.vin;
    if (vin) {
      uniqueVins.add(vin);
    } else {
      noVinCount++;
    }
  }

  const pendingVehicleCount = uniqueVins.size + noVinCount;

  return pendingWorkshopCount + pendingVehicleCount;
}

export function notifyRequisitionCountChanged(branchId: number | null | undefined) {
  if (!branchId) return;
  requisitionEvents.emit(REQUISITION_CHANGED, { branchId } satisfies RequisitionEventPayload);
}

export function onRequisitionCountChanged(
  listener: (payload: RequisitionEventPayload) => void
) {
  requisitionEvents.on(REQUISITION_CHANGED, listener);
  return () => requisitionEvents.off(REQUISITION_CHANGED, listener);
}
