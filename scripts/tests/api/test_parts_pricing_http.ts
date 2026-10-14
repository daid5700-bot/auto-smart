import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// This test writes fixtures, so require the disposable database explicitly.
const databaseUrl = process.env.TEST_DATABASE_URL;
const appUrl = process.env.TEST_APP_URL;
if (!databaseUrl || !appUrl) throw new Error("Set TEST_DATABASE_URL and TEST_APP_URL to the disposable test database/application");
const db = new URL(databaseUrl);
const app = new URL(appUrl);
if (db.hostname !== "127.0.0.1" || db.pathname !== "/autosmart_pricing_test" || app.hostname !== "127.0.0.1") {
  throw new Error("HTTP integration tests require a local autosmart_pricing_test database and local application");
}
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const prefix = `pricing-http-${Date.now()}`;
const cookieJar = new Map<string, string>();

async function request(path: string, method = "GET", body?: unknown, expected = 200) {
  const response = await fetch(new URL(path, appUrl), {
    method,
    headers: { "Content-Type": "application/json", Cookie: [...cookieJar].map(([key, value]) => `${key}=${value}`).join("; ") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [entry] = cookie.split(";");
    const separator = entry.indexOf("=");
    cookieJar.set(entry.slice(0, separator), entry.slice(separator + 1));
  }
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const branch = await prisma.branch.create({ data: { name: prefix } });
  const user = await prisma.user.create({ data: {
    name: prefix, email: `${prefix}@example.invalid`, password: bcrypt.hashSync(prefix, 10), role: "ADMIN",
    branches: { create: { branchId: branch.id } },
  } });
  await request("/api/auth/login", "POST", { email: user.email, password: prefix });
  await request("/api/auth/select-branch", "POST", { branchId: branch.id });

  const created = await request("/api/inventory", "POST", {
    sku: prefix, name: prefix, unit: "Cái", stockCount: 100,
    prices: [{ type: "RETAIL", amount: 180000 }, { type: "WHOLESALE", amount: 155000 }],
  }, 201);
  const id = created.id as number;
  assert.equal(Number(created.prices.find((price: any) => price.type === "DEALER").amount), 155000);
  assert.equal(Number(created.prices.find((price: any) => price.type === "WHOLESALE").amount), 155000);

  await request(`/api/inventory/${id}`, "PATCH", {
    prices: [{ type: "DEALER", amount: 160000 }, { type: "DISTRIBUTOR", amount: 140000 }, { type: "TECHNICIAN", amount: 145000 }],
  });
  const prices = await prisma.price.findMany({ where: { productId: id } });
  assert.equal(Number(prices.find((price) => price.type === "WHOLESALE")?.amount), 160000);
  assert.equal(Number(prices.find((price) => price.type === "RETAIL")?.amount), 180000);

  // A price validation failure must not partially change product/stock data.
  await request(`/api/inventory/${id}`, "PATCH", {
    name: "Must not persist", stockCount: 0, prices: [{ type: "DEALER", amount: -1 }],
  }, 400);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id } })).name, prefix);
  assert.equal(Number((await prisma.productBranch.findUniqueOrThrow({ where: { productId_branchId: { productId: id, branchId: branch.id } } })).stockCount), 100);

  // A database failure after updating the product must roll the whole PATCH back.
  await request(`/api/inventory/${id}`, "PATCH", { name: "Must roll back", stockCount: "invalid-decimal" }, 400);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id } })).name, prefix);

  const customer = await prisma.customer.create({ data: {
    name: prefix, phone: `090${String(Date.now()).slice(-7)}`, branchId: branch.id,
  } });
  const cases = [
    { metadata: { priceType: "WHOLESALE" }, expected: 160000 },
    { metadata: { priceType: "DISTRIBUTOR" }, expected: 140000 },
    { metadata: { priceType: "TECHNICIAN" }, expected: 145000 },
    { metadata: { priceType: "TECHNICIAN", unitPrice: 130000 }, expected: 130000 },
    { metadata: { priceType: "DEALER", customUnitPrice: 0 }, expected: 0 },
  ];
  for (const scenario of cases) {
    const ro = await prisma.repairOrder.create({ data: {
      customerId: customer.id, plateNumber: prefix, branchId: branch.id, status: "WAITING_PARTS",
    } });
    const requisition = await prisma.partsRequisition.create({ data: {
      branchId: branch.id, repairOrderId: ro.id, createdBy: prefix,
      reason: `Test | METADATA:${JSON.stringify([{ productId: id, ...scenario.metadata }])}`,
      items: { create: { productId: id, quantity: 2 } },
    } });
    await prisma.productBranch.update({
      where: { productId_branchId: { productId: id, branchId: branch.id } },
      data: { reservedStock: { increment: 2 } },
    });
    await request(`/api/workshop/requisitions/${requisition.id}/approve`, "POST");
    const line = await prisma.orderItem.findUniqueOrThrow({ where: { repairOrderId_productId: { repairOrderId: ro.id, productId: id } } });
    assert.equal(Number(line.unitPrice), scenario.expected);
    assert.equal(Number(line.totalPrice), scenario.expected * 2);
    const finalRo = await prisma.repairOrder.findUniqueOrThrow({ where: { id: ro.id } });
    assert.equal(Number(finalRo.totalAmount), scenario.expected * 2);
    // The second approval must not deduct stock or add debt twice.
    await request(`/api/workshop/requisitions/${requisition.id}/approve`, "POST", undefined, 400);
  }
  const stock = await prisma.productBranch.findUniqueOrThrow({ where: { productId_branchId: { productId: id, branchId: branch.id } } });
  assert.equal(Number(stock.stockCount), 90);
  assert.equal(Number(stock.reservedStock), 0);
  const finalCustomer = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
  assert.equal(Number(finalCustomer.totalDebt), cases.reduce((sum, item) => sum + item.expected * 2, 0));

  const existingRo = await prisma.repairOrder.create({ data: {
    customerId: customer.id, plateNumber: prefix, branchId: branch.id, status: "WAITING_PARTS",
    partsCost: 180000, totalAmount: 180000, paidAmount: 180000,
    items: { create: { productId: id, quantity: 1, unitPrice: 180000, totalPrice: 180000 } },
  } });
  const extraRequest = await prisma.partsRequisition.create({ data: {
    branchId: branch.id, repairOrderId: existingRo.id, createdBy: prefix,
    reason: `Test | METADATA:${JSON.stringify([{ productId: id, priceType: "TECHNICIAN", unitPrice: 140000 }])}`,
    items: { create: { productId: id, quantity: 1 } },
  } });
  await prisma.productBranch.update({
    where: { productId_branchId: { productId: id, branchId: branch.id } },
    data: { reservedStock: { increment: 1 } },
  });
  await request(`/api/workshop/requisitions/${extraRequest.id}/approve`, "POST");
  const merged = await prisma.orderItem.findUniqueOrThrow({ where: { repairOrderId_productId: { repairOrderId: existingRo.id, productId: id } } });
  assert.equal(Number(merged.quantity), 2);
  assert.equal(Number(merged.totalPrice), 320000, "Adding a different price tier must not reprice earlier items");
  assert.equal(Number(merged.unitPrice), 160000);
  assert.equal(Number((await prisma.repairOrder.findUniqueOrThrow({ where: { id: existingRo.id } })).debtAmount), 140000);

  await request("/api/inventory/orders", "POST", { type: "INTERNAL", items: [{ productId: id, quantity: 1, unitPrice: "" }] }, 400);
  console.log("Production HTTP checks passed: login, branch, old/new prices, atomic PATCH, approval by price type, snapshot/zero prices, stock and debt.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
