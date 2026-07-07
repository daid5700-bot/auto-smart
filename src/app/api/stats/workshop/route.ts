export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;

    if (startDateStr) {
      const parsed = new Date(startDateStr);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }
    if (endDateStr) {
      const parsed = new Date(endDateStr);
      if (!isNaN(parsed.getTime())) {
        endDate = parsed;
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const branchId = getActiveBranchId();

    const roWhere: any = { isDeleted: false, ...(branchId ? { branchId } : {}) };
    if (startDate || endDate) {
      roWhere.createdAt = {};
      if (startDate) roWhere.createdAt.gte = startDate;
      if (endDate) roWhere.createdAt.lte = endDate;
    }

    // 1. Basic Counts
    const [totalROs, activeROs] = await Promise.all([
      prisma.repairOrder.count({
        where: roWhere,
      }),
      prisma.repairOrder.count({
        where: {
          status: { notIn: ["DELIVERED"] },
          ...roWhere,
        },
      }),
    ]);

    // 2. Status Distribution
    // 2. Status Distribution
    const roList = await prisma.repairOrder.findMany({
      where: roWhere,
      select: {
        status: true,
        laborCost: true,
        partsCost: true,
        totalAmount: true,
        paidAmount: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const statusMap: Record<string, number> = {
      PENDING: 0,
      DIAGNOSING: 0,
      DOING: 0,
      WAITING_PARTS: 0,
      DONE: 0,
      DELIVERED: 0,
    };

    let totalRevenue = 0;
    let laborRevenue = 0;
    let partsRevenue = 0;

    roList.forEach((ro) => {
      if (statusMap[ro.status] !== undefined) {
        statusMap[ro.status]++;
      }
      if (ro.status === "DONE" || ro.status === "DELIVERED") {
        const ratio = Number(ro.totalAmount) > 0 ? Number(ro.paidAmount || 0) / Number(ro.totalAmount) : 0;
        totalRevenue += Number(ro.paidAmount || 0);
        laborRevenue += Number(ro.laborCost) * ratio;
        partsRevenue += Number(ro.partsCost) * ratio;
      }
    });

    const statusCounts = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    // 3. Technician Performance
    const techROWhere: any = {
      status: { in: ["DONE", "DELIVERED"] },
      isDeleted: false,
    };
    if (startDate || endDate) {
      techROWhere.createdAt = {};
      if (startDate) techROWhere.createdAt.gte = startDate;
      if (endDate) techROWhere.createdAt.lte = endDate;
    }

    const technicians = await prisma.technician.findMany({
      where: branchId ? { branchId } : {},
      include: {
        repairOrders: {
          where: techROWhere,
          select: {
            laborCost: true,
            partsCost: true,
            totalAmount: true,
            paidAmount: true,
          },
        },
      },
    });

    const technicianPerformance = technicians.map((tech) => {
      const completedCount = tech.repairOrders.length;
      let totalTechRevenue = 0;
      let laborTechRevenue = 0;
      let partsTechRevenue = 0;

      tech.repairOrders.forEach((ro) => {
        const ratio = Number(ro.totalAmount) > 0 ? Number(ro.paidAmount || 0) / Number(ro.totalAmount) : 0;
        totalTechRevenue += Number(ro.paidAmount || 0);
        laborTechRevenue += Number(ro.laborCost) * ratio;
        partsTechRevenue += Number(ro.partsCost) * ratio;
      });

      return {
        id: tech.id,
        name: tech.name,
        status: tech.status,
        completedCount,
        totalRevenue: totalTechRevenue,
        laborRevenue: laborTechRevenue,
        partsRevenue: partsTechRevenue,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 4. Monthly Trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const monthLabel = `${d.getMonth() + 1}/${d.getFullYear()}`;
      
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthROs = roList.filter((ro) => {
        const date = ro.completedAt || ro.createdAt;
        return date >= startOfMonth && date <= endOfMonth && (ro.status === "DONE" || ro.status === "DELIVERED");
      });

      const count = monthROs.length;
      const amount = monthROs.reduce((sum, ro) => sum + Number(ro.paidAmount || 0), 0);

      monthlyTrends.push({
        label: monthLabel,
        count,
        amount,
      });
    }

    return NextResponse.json({
      totalROs,
      activeROs,
      statusCounts,
      revenue: {
        total: totalRevenue,
        labor: laborRevenue,
        parts: partsRevenue,
      },
      technicianPerformance,
      monthlyTrends,
    });
  } catch (error) {
    console.error("Workshop Stats API error:", error);
    return NextResponse.json({ error: "Failed to load workshop stats" }, { status: 500 });
  }
}
