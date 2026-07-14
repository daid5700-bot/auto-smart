import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const branchId = getActiveBranchId();
    const searchParams = req.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type"); // INCOME or EXPENSE
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isDeleted: false,
      ...(branchId ? { branchId } : {}),
      ...(type ? { type } : {})
    };

    const transactions = await prisma.paymentTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        branch: { select: { name: true } }
      }
    });

    const totalCount = await prisma.paymentTransaction.count({ where: whereClause });

    const serializedTransactions = transactions.map((t: any) => ({
      ...t,
      amount: Number(t.amount)
    }));

    return NextResponse.json({
      data: serializedTransactions,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
