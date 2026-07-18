import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CustomerBranchClient = PrismaClient | Prisma.TransactionClient;

/**
 * Records that a customer has interacted with a branch.
 * Safe to call repeatedly; the composite primary key makes the operation idempotent.
 */
export async function ensureCustomerBranch(
  customerId: number,
  branchId: number | null | undefined,
  db: CustomerBranchClient = prisma,
) {
  if (!branchId) return;

  await db.customerBranch.upsert({
    where: {
      customerId_branchId: { customerId, branchId },
    },
    create: {
      customerId,
      branchId,
    },
    update: {
      lastSeenAt: new Date(),
    },
  });
}

export async function customerBelongsToBranch(
  customerId: number,
  branchId: number | null | undefined,
  db: CustomerBranchClient = prisma,
) {
  if (!branchId) return true;
  return Boolean(
    await db.customerBranch.findUnique({
      where: { customerId_branchId: { customerId, branchId } },
      select: { customerId: true },
    }),
  );
}

export async function getOrCreateCustomerForBranch(options: {
  name: string;
  phone: string;
  branchId?: number | null;
  birthday?: string | Date | null;
  address?: string | null;
  vehiclePlate?: string | null;
}, db: CustomerBranchClient = prisma) {
  const { name, phone, branchId, address } = options;
  if (!name.trim() || !phone.trim()) return null;

  const birthday = options.birthday ? new Date(options.birthday) : null;
  const existing = await db.customer.findUnique({ where: { phone: phone.trim() } });
  const vehiclePlate = options.vehiclePlate?.trim();
  const vehiclePlates = vehiclePlate
    ? Array.from(new Set([...(existing?.vehiclePlates ?? []), vehiclePlate]))
    : existing?.vehiclePlates;
  const customer = await db.customer.upsert({
    where: { phone: phone.trim() },
    update: {
      name: name.trim(),
      ...(birthday ? { birthday } : {}),
      ...(address !== undefined ? { address: address || null } : {}),
      ...(vehiclePlates ? { vehiclePlates } : {}),
    },
    create: {
      name: name.trim(),
      phone: phone.trim(),
      source: "WALKIN",
      birthday,
      branchId,
      address: address || null,
      vehiclePlates: vehiclePlate ? [vehiclePlate] : [],
    },
  });

  await ensureCustomerBranch(customer.id, branchId, db);
  return customer;
}
