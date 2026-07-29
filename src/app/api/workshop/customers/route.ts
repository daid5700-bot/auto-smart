export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { parseAppDateRange } from "@/lib/date-range";

type CustomerDebtRow = {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  totalAmount: Prisma.Decimal | number;
  latestOrderAmount: Prisma.Decimal | number;
  totalPaid: Prisma.Decimal | number;
  totalDebt: Prisma.Decimal | number;
  debtOrdersCount: number | bigint;
  latestOrderAt: Date;
  filteredTotal: number | bigint;
};

const PAYMENT_STATUSES = new Set(["all", "debt", "unpaid", "partial", "paid"]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = (searchParams.get("search") || "").trim();
    const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const rawLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 20;
    const skip = (page - 1) * limit;

    const requestedPaymentStatus = searchParams.get("paymentStatus") || "all";
    const paymentStatus = PAYMENT_STATUSES.has(requestedPaymentStatus) ? requestedPaymentStatus : "all";

    const { startDate, endDate } = parseAppDateRange(
      searchParams.get("dateFrom"),
      searchParams.get("dateTo"),
    );
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { error: "Ngày bắt đầu không được lớn hơn ngày kết thúc" },
        { status: 400 },
      );
    }

    const branchId = await getActiveBranchId();
    const orderFilters: Prisma.Sql[] = [
      Prisma.sql`c."isDeleted" = false`,
      Prisma.sql`ro."isDeleted" = false`,
      Prisma.sql`ro.status IN ('DONE', 'DELIVERED')`,
    ];

    if (branchId) orderFilters.push(Prisma.sql`ro."branchId" = ${branchId}`);
    if (startDate) orderFilters.push(Prisma.sql`ro."createdAt" >= ${startDate}`);
    if (endDate) orderFilters.push(Prisma.sql`ro."createdAt" <= ${endDate}`);

    if (search) {
      const pattern = `%${search}%`;
      const numericId = /^\d+$/.test(search) ? Number(search) : null;
      if (numericId !== null && Number.isSafeInteger(numericId) && numericId <= 2_147_483_647) {
        orderFilters.push(
          Prisma.sql`(c.name ILIKE ${pattern} OR c.phone ILIKE ${pattern} OR c.id = ${numericId})`,
        );
      } else {
        orderFilters.push(Prisma.sql`(c.name ILIKE ${pattern} OR c.phone ILIKE ${pattern})`);
      }
    }

    const summaryFilters: Prisma.Sql[] = [];
    if (paymentStatus === "debt") {
      summaryFilters.push(Prisma.sql`"totalDebt" > 0`);
    } else if (paymentStatus === "unpaid") {
      summaryFilters.push(Prisma.sql`"totalDebt" > 0 AND "totalPaid" <= 0`);
    } else if (paymentStatus === "partial") {
      summaryFilters.push(Prisma.sql`"totalDebt" > 0 AND "totalPaid" > 0`);
    } else if (paymentStatus === "paid") {
      summaryFilters.push(Prisma.sql`"totalDebt" <= 0`);
    }

    const summaryWhere = summaryFilters.length
      ? Prisma.sql`WHERE ${Prisma.join(summaryFilters, " AND ")}`
      : Prisma.empty;

    const customerDebtCte = Prisma.sql`
      WITH customer_debts AS (
        SELECT
          c.id,
          c.name,
          c.phone,
          c.address,
          COALESCE(SUM(ro."totalAmount"), 0) AS "totalAmount",
          COALESCE((ARRAY_AGG(ro."totalAmount" ORDER BY ro."createdAt" DESC))[1], 0) AS "latestOrderAmount",
          COALESCE(SUM(ro."paidAmount"), 0) AS "totalPaid",
          COALESCE(SUM(ro."debtAmount"), 0) AS "totalDebt",
          COUNT(*) FILTER (WHERE ro."debtAmount" > 0)::int AS "debtOrdersCount",
          MAX(ro."createdAt") AS "latestOrderAt"
        FROM "Customer" c
        INNER JOIN "RepairOrder" ro ON ro."customerId" = c.id
        WHERE ${Prisma.join(orderFilters, " AND ")}
        GROUP BY c.id, c.name, c.phone, c.address
      )
    `;

    const rows = await prisma.$queryRaw<CustomerDebtRow[]>`
      ${customerDebtCte}
      SELECT *, COUNT(*) OVER()::int AS "filteredTotal"
      FROM customer_debts
      ${summaryWhere}
      ORDER BY "debtOrdersCount" DESC, "totalDebt" DESC, "latestOrderAt" DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    // The window count avoids running the aggregation twice in the normal path.
    // Only count separately when a now-out-of-range page returns no rows.
    let total = Number(rows[0]?.filteredTotal || 0);
    if (rows.length === 0 && page > 1) {
      const countRows = await prisma.$queryRaw<Array<{ total: number | bigint }>>`
        ${customerDebtCte}
        SELECT COUNT(*)::int AS total
        FROM customer_debts
        ${summaryWhere}
      `;
      total = Number(countRows[0]?.total || 0);
    }

    const customers = rows.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      totalAmount: Number(customer.totalAmount),
      latestOrderAmount: Number(customer.latestOrderAmount),
      totalPaid: Number(customer.totalPaid),
      totalDebt: Number(customer.totalDebt),
      debtOrdersCount: Number(customer.debtOrdersCount),
      latestOrderAt: customer.latestOrderAt,
    }));

    return NextResponse.json({
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.error("Workshop customers API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
