import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/crm — leads, customers, zns logs
export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab") || "leads";
  const branchId = getActiveBranchId();

  if (tab === "leads") {
    const leads = await prisma.lead.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { createdAt: "desc" },
      include: { customer: true, assignedTo: true },
    });
    return NextResponse.json({ leads });
  }

  if (tab === "customers") {
    const customers = await prisma.customer.findMany({
      where: (branchId ? { branchId } : {}) as any,
      orderBy: { totalSpent: "desc" },
    });
    return NextResponse.json({ customers });
  }

  if (tab === "zns") {
    const znsLogs = await prisma.znsLog.findMany({
      where: (branchId ? { branchId } : {}) as any,
      orderBy: { sentAt: "desc" },
      include: { customer: true },
    });
    return NextResponse.json({ znsLogs });
  }

  // stats
  const [leadCount, customerCount, znsCount, convertedCount, totalLeads] = await Promise.all([
    prisma.lead.count({ where: branchId ? { branchId } : {} }),
    prisma.customer.count({ where: (branchId ? { branchId } : {}) as any }),
    prisma.znsLog.count({ where: (branchId ? { branchId } : {}) as any }),
    prisma.lead.count({ where: { status: "CONVERTED", ...(branchId ? { branchId } : {}) } }),
    prisma.lead.count({ where: branchId ? { branchId } : {} }),
  ]);

  return NextResponse.json({
    leadCount, customerCount, znsCount,
    conversionRate: totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0,
  });
}

// POST /api/crm — create lead or customer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    if (body.type === "customer") {
      const customer = await prisma.customer.create({
        data: {
          name: body.name,
          phone: body.phone,
          email: body.email || null,
          address: body.address || null,
          source: body.source || "WALKIN",
          tags: body.tags ? (typeof body.tags === "string" ? body.tags.split(",").map((t: string) => t.trim()) : body.tags) : [],
          branchId,
        } as any
      });
      return NextResponse.json(customer, { status: 201 });
    } else {
      const lead = await prisma.lead.create({
        data: {
          name: body.name,
          phone: body.phone,
          source: body.source || "WALKIN",
          interest: body.interest,
          notes: body.notes,
          assignedToId: body.assignedToId,
          branchId,
        }
      });
      return NextResponse.json(lead, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
