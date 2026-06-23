import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/crm — leads, customers, zns logs
export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab") || "leads";
  const branchId = getActiveBranchId();

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50")));
  const skip = (page - 1) * limit;

  if (tab === "leads") {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: branchId ? { branchId } : {},
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { customer: true, assignedTo: true },
      }),
      prisma.lead.count({ where: branchId ? { branchId } : {} })
    ]);
    return NextResponse.json({ leads, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }

  if (tab === "customers") {
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: (branchId ? { branchId } : {}) as any,
        orderBy: { totalSpent: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where: (branchId ? { branchId } : {}) as any })
    ]);
    return NextResponse.json({ customers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }

  if (tab === "reminders") {
    const customers = await prisma.customer.findMany({
      where: (branchId ? { branchId } : {}) as any,
      take: 150, // Limit to prevent massive memory usage
      include: {
        repairOrders: {
          where: { status: { in: ["DONE", "DELIVERED"] } },
          include: {
            items: {
              include: {
                product: true
              }
            }
          },
          orderBy: { completedAt: "desc" }
        },
        znsLogs: {
          orderBy: { sentAt: "desc" }
        }
      }
    });

    const reminders = [];
    const today = new Date();

    for (const c of customers) {
      if (!c.vehiclePlates || c.vehiclePlates.length === 0) continue;

      const plate = c.vehiclePlates[0];
      const baseDate = c.lastVisit ? new Date(c.lastVisit) : new Date(c.createdAt);

      let lastOilChangeDate = baseDate;
      let lastBrakeChangeDate = baseDate;
      let lastInspectDate = baseDate;

      for (const ro of c.repairOrders) {
        const hasOil = ro.items.some(item => 
          item.product?.name?.toLowerCase().includes("dầu") || 
          item.product?.name?.toLowerCase().includes("nhớt") || 
          item.product?.name?.toLowerCase().includes("oil")
        );
        const hasBrake = ro.items.some(item => 
          item.product?.name?.toLowerCase().includes("phanh") || 
          item.product?.name?.toLowerCase().includes("thắng") || 
          item.product?.name?.toLowerCase().includes("brake")
        );

        if (hasOil && lastOilChangeDate === baseDate && ro.completedAt) {
          lastOilChangeDate = new Date(ro.completedAt);
        }
        if (hasBrake && lastBrakeChangeDate === baseDate && ro.completedAt) {
          lastBrakeChangeDate = new Date(ro.completedAt);
        }
        if (ro.completedAt && lastInspectDate === baseDate) {
          lastInspectDate = new Date(ro.completedAt);
        }
      }

      // 1. Oil change (6 months)
      const oilDueDate = new Date(lastOilChangeDate);
      oilDueDate.setMonth(oilDueDate.getMonth() + 6);
      const oilDiff = Math.ceil((oilDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // 2. Brake change (9 months)
      const brakeDueDate = new Date(lastBrakeChangeDate);
      brakeDueDate.setMonth(brakeDueDate.getMonth() + 9);
      const brakeDiff = Math.ceil((brakeDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // 3. General inspect (12 months)
      const inspectDueDate = new Date(lastInspectDate);
      inspectDueDate.setMonth(inspectDueDate.getMonth() + 12);
      const inspectDiff = Math.ceil((inspectDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const hasRecentOilZns = c.znsLogs.some(log => 
        (log.messageType === "OIL_CHANGE" || log.messageType === "MAINTENANCE") &&
        new Date(log.sentAt).getTime() > today.getTime() - (30 * 24 * 60 * 60 * 1000)
      );
      const hasRecentBrakeZns = c.znsLogs.some(log => 
        log.messageType === "BRAKE_CHANGE" &&
        new Date(log.sentAt).getTime() > today.getTime() - (30 * 24 * 60 * 60 * 1000)
      );
      const hasRecentInspectZns = c.znsLogs.some(log => 
        log.messageType === "GENERAL_INSPECT" &&
        new Date(log.sentAt).getTime() > today.getTime() - (30 * 24 * 60 * 60 * 1000)
      );

      reminders.push({
        id: `${c.id}-OIL_CHANGE`,
        customer: { id: c.id, name: c.name, phone: c.phone, loyaltyPoints: c.loyaltyPoints, totalSpent: Number(c.totalSpent) },
        plate,
        serviceType: "OIL_CHANGE",
        serviceLabel: "THAY DẦU",
        dueDate: oilDueDate,
        daysRemaining: oilDiff,
        isOverdue: oilDiff < 0,
        isUpcoming: oilDiff >= 0 && oilDiff <= 14,
        isFarther: oilDiff > 14,
        isReminded: hasRecentOilZns
      });

      reminders.push({
        id: `${c.id}-BRAKE_CHANGE`,
        customer: { id: c.id, name: c.name, phone: c.phone, loyaltyPoints: c.loyaltyPoints, totalSpent: Number(c.totalSpent) },
        plate,
        serviceType: "BRAKE_CHANGE",
        serviceLabel: "THAY MÁ PHANH",
        dueDate: brakeDueDate,
        daysRemaining: brakeDiff,
        isOverdue: brakeDiff < 0,
        isUpcoming: brakeDiff >= 0 && brakeDiff <= 14,
        isFarther: brakeDiff > 14,
        isReminded: hasRecentBrakeZns
      });

      reminders.push({
        id: `${c.id}-GENERAL_INSPECT`,
        customer: { id: c.id, name: c.name, phone: c.phone, loyaltyPoints: c.loyaltyPoints, totalSpent: Number(c.totalSpent) },
        plate,
        serviceType: "GENERAL_INSPECT",
        serviceLabel: "KIỂM TRA TỔNG QUÁT",
        dueDate: inspectDueDate,
        daysRemaining: inspectDiff,
        isOverdue: inspectDiff < 0,
        isUpcoming: inspectDiff >= 0 && inspectDiff <= 14,
        isFarther: inspectDiff > 14,
        isReminded: hasRecentInspectZns
      });
    }

    return NextResponse.json({ reminders });
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
          vehiclePlates: body.vehiclePlates ? (typeof body.vehiclePlates === "string" ? body.vehiclePlates.split(",").map((p: string) => p.trim()) : body.vehiclePlates) : [],
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
