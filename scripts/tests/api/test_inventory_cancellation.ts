import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { cancelInventoryOrder } from "@/lib/inventory-order-cancellation";
import { cancelInventoryOrderSchema } from "@/lib/validation/inventory";
import { canCancelInventoryOrder } from "@/lib/inventory-order";
import { formatInventoryCancellationTime, parseInventoryCancellation } from "@/lib/inventory-cancellation-display";
import { InventoryCancellationNotice } from "@/components/InventoryCancellationNotice";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// In-memory transactional double: these tests never connect to any database.
function fixture(paidAmount = 0, debtAmount = 300_000) {
  const initialOrder = {
    id: 12, code: "PX-TEST", branchId: 3, type: "EXPORT_RETAIL", status: debtAmount > 0 ? "DEBT" : "PAID",
    vehicleId: null as number | null, createdBy: "Nhân viên kho", customerId: 7 as number | null,
    totalAmount: paidAmount + debtAmount, paidAmount, debtAmount, reason: "Bán phụ tùng",
    movements: [
      { productId: 8, branchId: 3, type: "EXPORT", quantity: 2, unitCost: 100_000, relatedRoId: null as number | null },
      { productId: 9, branchId: 3, type: "EXPORT", quantity: 1, unitCost: 100_000, relatedRoId: null as number | null },
    ],
  };
  let state = {
    order: initialOrder,
    stocks: [
      { productId: 8, branchId: 3, stockCount: 8, movingAvgCost: 60_000 },
      { productId: 9, branchId: 3, stockCount: 4, movingAvgCost: 70_000 },
      { productId: 8, branchId: 4, stockCount: 20, movingAvgCost: 50_000 },
    ],
    customer: { totalDebt: debtAmount + 500_000, totalSpent: paidAmount + 200_000 },
    returns: [] as Array<Record<string, any>>,
    refunds: [] as Array<Record<string, any>>,
  };
  let failRefund = false;
  const calls: string[] = [];
  const tx = {
    $queryRaw: async (sql: Prisma.Sql) => {
      assert.match(sql.sql, /FOR UPDATE/);
      if (sql.sql.includes('"InventoryOrder"')) {
        calls.push("lock-order");
        return sql.values[0] === state.order.id && sql.values[1] === state.order.branchId ? [{ id: state.order.id }] : [];
      }
      calls.push("lock-stock");
      const [branchId, ...ids] = sql.values;
      return state.stocks.filter((row) => row.branchId === branchId && ids.includes(row.productId));
    },
    inventoryOrder: {
      findUnique: async () => { assert.equal(calls.at(-1), "lock-order"); return structuredClone(state.order); },
      update: async ({ data }: any) => { Object.assign(state.order, data); return state.order; },
    },
    productBranch: {
      update: async ({ where, data }: any) => {
        const key = where.productId_branchId;
        const row = state.stocks.find((stock) => stock.productId === key.productId && stock.branchId === key.branchId)!;
        row.stockCount += data.stockCount.increment;
      },
    },
    stockMovement: { create: async ({ data }: any) => { state.returns.push(data); } },
    customer: { update: async ({ data }: any) => {
      state.customer.totalDebt -= Number(data.totalDebt.decrement);
      state.customer.totalSpent -= Number(data.totalSpent.decrement);
    } },
    paymentTransaction: { create: async ({ data }: any) => {
      if (failRefund) throw new Error("Simulated refund write failure");
      state.refunds.push(data);
    } },
  };
  // Serialize like the database order row lock, and restore the snapshot on failure.
  let queue = Promise.resolve();
  const run = (overrides: Partial<Parameters<typeof cancelInventoryOrder>[1]> = {}) => {
    const result = queue.then(async () => {
      const snapshot = structuredClone(state);
      try {
        return await cancelInventoryOrder(tx as unknown as Prisma.TransactionClient, {
          id: 12, branchId: 3, reason: "Khách không lấy hàng", createdBy: "Quản trị viên",
          refundConfirmed: false, expectedPaidAmount: paidAmount, refundMethod: "CASH", ...overrides,
        });
      } catch (error) { state = snapshot; throw error; }
    });
    queue = result.then(() => undefined, () => undefined);
    return result;
  };
  return { run, calls, get state() { return state; }, failRefund: () => { failRefund = true; } };
}

test("unpaid cancellation restores stock at the original branch, removes only this debt, preserves audit data", async () => {
  const f = fixture();
  assert.deepEqual(await f.run(), { alreadyCancelled: false, refundedAmount: 0 });
  assert.equal(f.state.stocks[0].stockCount, 10);
  assert.equal(f.state.stocks[1].stockCount, 5);
  assert.equal(f.state.stocks[2].stockCount, 20);
  assert.equal(f.state.stocks[0].movingAvgCost, 60_000);
  assert.equal(f.state.customer.totalDebt, 500_000);
  assert.equal(f.state.customer.totalSpent, 200_000);
  assert.equal(f.state.refunds.length, 0);
  assert.equal(f.state.order.status, "CANCELLED");
  assert.equal(f.state.order.debtAmount, 0);
  assert.equal(f.state.order.totalAmount, 300_000);
  assert.equal(f.state.order.movements.length, 2);
  assert.match(f.state.order.reason, /Bán phụ tùng.*Đã hủy.*Quản trị viên.*Khách không lấy hàng/);
  assert.equal(f.state.returns[0].inventoryOrderId, 12);
  assert.equal(f.state.returns[0].type, "IMPORT");
  assert.equal(f.state.returns[0].unitCost, 60_000); // NOT the 100,000 selling price
  assert.equal(f.state.returns[0].totalCost, 120_000);
  assert.deepEqual(f.calls, ["lock-order", "lock-stock"]);
});

for (const [label, paid, debt] of [["partly paid", 100_000, 200_000], ["fully paid", 300_000, 0]] as const) {
  test(`${label} cancellation requires refund confirmation then records exactly one expense`, async () => {
    const f = fixture(paid, debt);
    await assert.rejects(f.run(), { code: "REFUND_CONFIRMATION_REQUIRED" });
    assert.equal(f.state.stocks[0].stockCount, 8);
    const result = await f.run({ refundConfirmed: true, refundMethod: "BANK_TRANSFER" });
    assert.equal(result.refundedAmount, paid);
    assert.equal(f.state.order.paidAmount, paid);
    assert.equal(f.state.customer.totalDebt, 500_000);
    assert.equal(f.state.customer.totalSpent, 200_000);
    assert.equal(f.state.refunds.length, 1);
    assert.equal(f.state.refunds[0].amount, paid);
    assert.equal(f.state.refunds[0].type, "EXPENSE");
    assert.equal(f.state.refunds[0].method, "BANK_TRANSFER");
    assert.equal(f.state.refunds[0].referenceId, 12);
    assert.equal(f.state.refunds[0].referenceType, "INVENTORY_ORDER");
    assert.equal(f.state.refunds[0].branchId, 3);
  });
}

test("repeat/concurrent cancellation calls do not restore or refund twice", async () => {
  const f = fixture(100_000, 200_000);
  const results = await Promise.all([f.run({ refundConfirmed: true }), f.run({ refundConfirmed: true })]);
  assert.equal(results.filter((result) => result.alreadyCancelled).length, 1);
  assert.equal(f.state.stocks[0].stockCount, 10);
  assert.equal(f.state.returns.length, 2);
  assert.equal(f.state.refunds.length, 1);
  assert.equal(f.state.customer.totalDebt, 500_000);
});

test("wrong branch is rejected before touching stock or finances", async () => {
  const f = fixture();
  await assert.rejects(f.run({ branchId: 4 }), { code: "ORDER_NOT_FOUND" });
  assert.equal(f.state.stocks[0].stockCount, 8);
  assert.equal(f.state.returns.length, 0);
});

test("payment changed after opening dialog requires re-confirmation", async () => {
  const f = fixture(100_000, 200_000);
  await assert.rejects(f.run({ expectedPaidAmount: 0, refundConfirmed: true }), { code: "PAYMENT_CHANGED" });
  assert.equal(f.state.refunds.length, 0);
});

for (const source of ["vehicle", "repair", "pending"] as const) {
  test(`cannot cancel a ${source} voucher directly`, async () => {
    const f = fixture();
    if (source === "vehicle") f.state.order.vehicleId = 10;
    if (source === "repair") f.state.order.movements[0].relatedRoId = 10;
    if (source === "pending") f.state.order.status = "PENDING";
    await assert.rejects(f.run(), { code: source === "pending" ? "ORDER_NOT_EXPORTED" : "SYSTEM_ORDER_NOT_CANCELLABLE" });
    assert.equal(f.state.returns.length, 0);
    assert.equal(canCancelInventoryOrder(f.state.order), false);
  });
}

for (const creator of ["System", "Hệ thống"]) {
  test(`legacy manual voucher created by ${creator} remains cancellable without source relations`, async () => {
    const f = fixture();
    f.state.order.createdBy = creator;
    assert.equal(canCancelInventoryOrder(f.state.order), true);
    await f.run();
    assert.equal(f.state.order.status, "CANCELLED");
    assert.equal(f.state.stocks[0].stockCount, 10);
  });
}

test("a vehicle source stored only on a movement still blocks direct cancellation", () => {
  assert.equal(canCancelInventoryOrder({
    type: "EXPORT_RETAIL", status: "DEBT", vehicleId: null, createdBy: "System",
    movements: [{ relatedRoId: null, vehicleId: 10 }],
  }), false);
});

test("duplicate product lines aggregate into one return with fractional quantities", async () => {
  const f = fixture();
  f.state.order.movements.push({ ...f.state.order.movements[0], quantity: 0.5 });
  await f.run();
  assert.equal(f.state.stocks[0].stockCount, 10.5);
  assert.equal(f.state.returns.length, 2);
  assert.equal(f.state.returns[0].quantity, 2.5);
});

test("internal voucher without a customer restores stock without touching customer totals", async () => {
  const f = fixture(0, 0);
  f.state.order.type = "INTERNAL";
  f.state.order.customerId = null;
  const before = { ...f.state.customer };
  await f.run();
  assert.equal(f.state.stocks[0].stockCount, 10);
  assert.deepEqual(f.state.customer, before);
});

test("missing branch product prevents a partial return", async () => {
  const f = fixture();
  f.state.stocks.splice(1, 1);
  await assert.rejects(f.run(), { code: "PRODUCT_BRANCH_MISSING" });
  assert.equal(f.state.stocks[0].stockCount, 8);
  assert.equal(f.state.returns.length, 0);
});

for (const invalid of ["empty", "wrong-branch", "zero"] as const) {
  test(`invalid ${invalid} export data blocks cancellation`, async () => {
    const f = fixture();
    if (invalid === "empty") f.state.order.movements = [];
    if (invalid === "wrong-branch") f.state.order.movements[0].branchId = 4;
    if (invalid === "zero") f.state.order.movements[0].quantity = 0;
    await assert.rejects(f.run(), { code: "INVALID_EXPORT_MOVEMENTS" });
    assert.equal(f.state.returns.length, 0);
  });
}

test("refund write failure rolls back the entire transaction", async () => {
  const f = fixture(100_000, 200_000);
  const before = structuredClone(f.state);
  f.failRefund();
  await assert.rejects(f.run({ refundConfirmed: true }), /Simulated refund write failure/);
  assert.deepEqual(f.state, before);
});

test("cancellation validation rejects empty reasons, unexpected fields and invalid refund amounts", () => {
  const valid = { reason: " Khách đổi ý ", expectedPaidAmount: 0 };
  assert.equal(cancelInventoryOrderSchema.parse(valid).reason, "Khách đổi ý");
  assert.equal(cancelInventoryOrderSchema.parse(valid).refundConfirmed, false);
  assert.equal(cancelInventoryOrderSchema.safeParse({ ...valid, reason: " " }).success, false);
  assert.equal(cancelInventoryOrderSchema.safeParse({ ...valid, expectedPaidAmount: -1 }).success, false);
  assert.equal(cancelInventoryOrderSchema.safeParse({ ...valid, branchId: 4 }).success, false);
  assert.equal(cancelInventoryOrderSchema.safeParse({ ...valid, refundConfirmed: "true" }).success, false);
});

const auditReason = "Bán xuất kho | [Đã hủy 2026-10-09T16:51:03.935Z bởi Nguyễn Văn Admin] Khách không lấy hàng";

test("legacy cancellation audit text is split into readable fields", () => {
  assert.deepEqual(parseInventoryCancellation(auditReason), {
    originalReason: "Bán xuất kho", reason: "Khách không lấy hàng", cancelledBy: "Nguyễn Văn Admin", cancelledAt: "2026-10-09T16:51:03.935Z",
  });
});

test("cancellation display converts UTC to Vietnamese time without exposing seconds or milliseconds", () => {
  const formatted = formatInventoryCancellationTime("2026-10-09T16:51:03.935Z");
  assert.match(formatted, /23:51/);
  assert.match(formatted, /09\/10\/2026/);
  assert.doesNotMatch(formatted, /935|Z|:03/);
  assert.equal(formatInventoryCancellationTime("invalid"), "");
});

test("missing cancellation metadata and invalid dates are handled gracefully", () => {
  assert.equal(parseInventoryCancellation(null).reason, "");
  assert.equal(parseInventoryCancellation("Khách đổi ý").reason, "Khách đổi ý");
  assert.deepEqual(parseInventoryCancellation("[Đã hủy invalid bởi Thủ kho] Khách đổi ý"), {
    originalReason: "", reason: "Khách đổi ý", cancelledBy: "Thủ kho", cancelledAt: null,
  });
});

test("multiline notes, cancellation reasons and separators are preserved", () => {
  const parsed = parseInventoryCancellation("Ghi chú\nDòng 2 | [Đã hủy 2026-10-09T16:51:03.935Z bởi Admin] Đổi ý | Không lấy\nXin hủy");
  assert.equal(parsed.originalReason, "Ghi chú\nDòng 2");
  assert.equal(parsed.reason, "Đổi ý | Không lấy\nXin hủy");
});

test("notice renders labelled fields, human-readable time and refund amount without the raw audit line", () => {
  const html = renderToStaticMarkup(createElement(InventoryCancellationNotice, { reason: auditReason, refundedAmount: 100_000 }));
  assert.match(html, /Thông tin hủy phiếu/);
  assert.match(html, /Đã hủy/);
  assert.match(html, /Đã hoàn kho/);
  assert.match(html, /Người hủy/);
  assert.match(html, /Nguyễn Văn Admin/);
  assert.match(html, /Khách không lấy hàng/);
  assert.match(html, /23:51/);
  assert.match(html, /Hoàn tiền:/);
  assert.match(html, /<details class="group print:hidden">/);
  assert.match(html, /Chi tiết/);
  assert.doesNotMatch(html, /\[Đã hủy|Bán xuất kho|PHIẾU ĐÃ HỦY/);
});

test("notice safely escapes cancellation reasons and omits refund text when no money was collected", () => {
  const html = renderToStaticMarkup(createElement(InventoryCancellationNotice, { reason: "<script>alert(1)</script>" }));
  assert.doesNotMatch(html, /<script>|Hoàn tiền:/);
  assert.match(html, /&lt;script&gt;/);
});
