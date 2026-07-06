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
  const [partsRequisitionCount, vehicleAccessoryExportCount] = await Promise.all([
    prisma.partsRequisition.count({
      where: {
        branchId,
        status: "PENDING",
      },
    }),
    prisma.inventoryOrder.count({
      where: {
        branchId,
        status: "PENDING",
        createdBy: "Hệ thống (Bán Xe)",
      },
    }),
  ]);

  return partsRequisitionCount + vehicleAccessoryExportCount;
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
