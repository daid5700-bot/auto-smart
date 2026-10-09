type InventoryOrderLike = {
  type?: string;
  status?: string;
  vehicleId?: number | null;
  createdBy?: string | null;
  movements?: Array<{ relatedRoId?: number | null; vehicleId?: number | null }>;
};

export function isManualInventoryOrder(order: InventoryOrderLike) {
  return ["EXPORT_RETAIL", "EXPORT_WHOLESALE", "INTERNAL"].includes(order.type || "")
    && !order.vehicleId
    // Legacy manual vouchers also used "System" as the creator. It is an audit
    // label, not a reliable source discriminator: inspect the source relations.
    && !order.movements?.some((movement) => movement.relatedRoId != null || movement.vehicleId != null);
}

export function canCancelInventoryOrder(order: InventoryOrderLike) {
  return isManualInventoryOrder(order) && ["PAID", "DEBT"].includes(order.status || "");
}
