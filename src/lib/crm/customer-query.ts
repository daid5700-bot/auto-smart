import { Prisma } from "@prisma/client";

export type CustomerCategory = "" | "all" | "service" | "purchase" | "vip" | "inactive";

export const customerSummarySelect = Prisma.validator<Prisma.CustomerSelect>()({
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  source: true,
  loyaltyPoints: true,
  totalSpent: true,
  totalDebt: true,
  lastVisit: true,
  birthday: true,
  vehiclePlates: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true } },
  customerBranches: {
    select: { branch: { select: { id: true, name: true } } },
    orderBy: { lastSeenAt: "desc" },
  },
  _count: { select: { vehicles: true, repairOrders: true } },
});

type CustomerSummaryRecord = Prisma.CustomerGetPayload<{
  select: typeof customerSummarySelect;
}>;

export function buildCustomerWhere(options: {
  branchId: number | null;
  category: CustomerCategory;
  search: string;
  inactiveBefore?: Date;
}): Prisma.CustomerWhereInput {
  const { branchId, category, search } = options;
  const filters: Prisma.CustomerWhereInput[] = [{ isDeleted: false }];
  const inactiveBefore = options.inactiveBefore ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  if (branchId) {
    if (category === "service") {
      filters.push({ repairOrders: { some: { branchId, isDeleted: false } } });
    } else if (category === "purchase") {
      filters.push({ vehicles: { some: { branchId } } });
    } else if (category === "inactive") {
      filters.push({ customerBranches: { some: { branchId, lastSeenAt: { lt: inactiveBefore } } } });
    } else {
      filters.push({ customerBranches: { some: { branchId } } });
    }
  }

  if (category === "vip") {
    filters.push({ OR: [{ totalSpent: { gte: 20_000_000 } }, { tags: { has: "VIP" } }] });
  } else if (category === "inactive" && !branchId) {
    filters.push({ OR: [{ lastVisit: null }, { lastVisit: { lt: inactiveBefore } }] });
  }

  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { vehiclePlates: { has: search } },
        { repairOrders: { some: { plateNumber: { contains: search, mode: "insensitive" } } } },
        ...(/^\d+$/.test(search) ? [{ id: Number(search) }] : []),
      ],
    });
  }

  return { AND: filters };
}

export function serializeCustomerSummary(customer: CustomerSummaryRecord) {
  return {
    ...customer,
    totalSpent: Number(customer.totalSpent),
    totalDebt: Number(customer.totalDebt),
    vehicleCount: customer._count.vehicles,
    repairOrderCount: customer._count.repairOrders,
    branches: customer.customerBranches.map(({ branch }) => branch),
    customerBranches: undefined,
    _count: undefined,
  };
}
