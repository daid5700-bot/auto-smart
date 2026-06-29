export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/crm — leads, customers, zns logs
export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab") || "leads";
  const allBranches = req.nextUrl.searchParams.get("allBranches") === "true";
  const branchId = allBranches ? null : getActiveBranchId();

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50")));
  const skip = (page - 1) * limit;

  if (tab === "leads") {
    const baseWhere = {
      ...(branchId ? { branchId } : {}),
    };
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { customer: true, assignedTo: true },
      }),
      prisma.lead.count({ where: baseWhere })
    ]);
    return NextResponse.json({ leads, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }

  if (tab === "customers") {
    // FIX #6: Filter out soft-deleted customers
    const baseWhere = {
      isDeleted: false,
      ...(branchId ? { branchId } : {}),
    } as any;
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: baseWhere,
        include: {
          vehicles: true,
          repairOrders: true,
        },
        orderBy: { totalSpent: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where: baseWhere })
    ]);
    return NextResponse.json({ customers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }

  if (tab === "reminders") {
    // Count total active customers
    const totalCustomers = await prisma.customer.count({
      where: {
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      }
    });

    // Fetch up to 150 most recent active customers
    const customers = await prisma.customer.findMany({
      where: {
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      } as any,
      take: 150, // Limit to prevent massive memory usage
      orderBy: { lastVisit: "desc" },
      include: {
        vehicles: true,
        branch: true,
        repairOrders: {
          where: { status: { in: ["DONE", "DELIVERED"] } },
          include: {
            technician: true,
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
      const lastVehicle = c.vehicles && c.vehicles[0];
      const lastRo = c.repairOrders && c.repairOrders[0];

      const customerDetails = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        loyaltyPoints: c.loyaltyPoints,
        totalSpent: Number(c.totalSpent),
        birthday: c.birthday ? c.birthday.toISOString() : null,
        branch: c.branch ? { id: c.branch.id, name: c.branch.name } : null,
        lastRepairOrder: lastRo ? {
          id: lastRo.id,
          plateNumber: lastRo.plateNumber,
          vehicleModel: lastRo.vehicleModel,
          createdAt: lastRo.createdAt,
          laborCost: Number(lastRo.laborCost),
          partsCost: Number(lastRo.partsCost),
          totalAmount: Number(lastRo.totalAmount),
          symptoms: lastRo.symptoms || null,
          kmIn: lastRo.kmIn || 0,
          technician: lastRo.technician ? {
            name: lastRo.technician.name,
            phone: lastRo.technician.phone
          } : null,
          items: lastRo.items.map((i: any) => ({
            id: i.id,
            productName: i.product.name,
            quantity: i.quantity,
            totalPrice: Number(i.totalPrice)
          }))
        } : null,
        lastVehicle: lastVehicle ? {
          model: lastVehicle.model,
          variant: lastVehicle.variant,
          color: lastVehicle.color,
          vin: lastVehicle.vin,
          createdAt: lastVehicle.createdAt,
          listPrice: Number(lastVehicle.listPrice)
        } : null
      };

      // FIX #1: Chỉ tạo vehicle reminder nếu KH thực sự mua xe qua hệ thống
      if (lastVehicle) {
        const purchaseDate = new Date(lastVehicle.createdAt);
        const vehicleDueDate = new Date(purchaseDate);
        vehicleDueDate.setMonth(vehicleDueDate.getMonth() + 3);
        const vehicleDiff = Math.ceil((vehicleDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const hasRecentVehicleZns = c.znsLogs.some(log =>
          log.messageType === "VEHICLE_PURCHASE" &&
          new Date(log.sentAt).getTime() > today.getTime() - (30 * 24 * 60 * 60 * 1000)
        );

        reminders.push({
          id: `${c.id}-VEHICLE_PURCHASE`,
          customer: customerDetails,
          plate: c.vehiclePlates[0] || (lastVehicle.color ? `${lastVehicle.model} (${lastVehicle.color})` : lastVehicle.model),
          serviceType: "VEHICLE_PURCHASE",
          serviceLabel: "MUA XE",
          dueDate: vehicleDueDate,
          daysRemaining: vehicleDiff,
          isOverdue: vehicleDiff < 0,
          isUpcoming: vehicleDiff >= 0 && vehicleDiff <= 14,
          isFarther: vehicleDiff > 14,
          isReminded: hasRecentVehicleZns
        });
      }

      // FIX #4: Chỉ tạo repair reminder nếu KH có ít nhất 1 lệnh sửa chữa đã hoàn thành
      if (lastRo) {
        const repairDate = lastRo.completedAt ? new Date(lastRo.completedAt) : (c.lastVisit ? new Date(c.lastVisit) : new Date(lastRo.createdAt));
        const repairDueDate = new Date(repairDate);
        repairDueDate.setMonth(repairDueDate.getMonth() + 3);
        const repairDiff = Math.ceil((repairDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const hasRecentRepairZns = c.znsLogs.some(log =>
          log.messageType === "REPAIR_SERVICE" &&
          new Date(log.sentAt).getTime() > today.getTime() - (30 * 24 * 60 * 60 * 1000)
        );

        reminders.push({
          id: `${c.id}-REPAIR_SERVICE`,
          customer: customerDetails,
          plate: c.vehiclePlates[0] || lastRo.plateNumber || (lastVehicle ? lastVehicle.vin : "Chưa có"),
          serviceType: "REPAIR_SERVICE",
          serviceLabel: "DỊCH VỤ SỬA CHỮA",
          dueDate: repairDueDate,
          daysRemaining: repairDiff,
          isOverdue: repairDiff < 0,
          isUpcoming: repairDiff >= 0 && repairDiff <= 14,
          isFarther: repairDiff > 14,
          isReminded: hasRecentRepairZns
        });
      }
    }

    return NextResponse.json({
      reminders,
      warning: totalCustomers > 150 ? `Chỉ hiển thị nhắc nhở của 150 khách hàng hoạt động gần đây nhất trên tổng số ${totalCustomers} khách hàng.` : null,
      totalCustomers
    });
  }


  if (tab === "zns") {
    const znsLogs = await prisma.znsLog.findMany({
      where: (branchId ? { branchId } : {}) as any,
      orderBy: { sentAt: "desc" },
      include: { customer: true },
    });
    return NextResponse.json({ znsLogs });
  }

  if (tab === "loyalty") {
    const transactions = await prisma.loyaltyTransaction.findMany({
      where: {
        type: "REDEEM",
        ...(branchId ? { branchId } : {}),
      } as any,
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json({ transactions });
  }

  // stats — FIX: also filter isDeleted customers
  const baseCustomerWhere = { isDeleted: false, ...(branchId ? { branchId } : {}) } as any;
  const [leadCount, customerCount, znsCount, convertedCount, totalLeads] = await Promise.all([
    prisma.lead.count({ where: branchId ? { branchId } : {} }),
    prisma.customer.count({ where: baseCustomerWhere }),
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
      // Release phone numbers of any old soft-deleted customers to avoid unique constraint failures
      try {
        const oldDeleted = await prisma.customer.findMany({
          where: {
            isDeleted: true,
            NOT: {
              phone: {
                startsWith: "DELETED-",
              },
            },
          },
        });
        for (const c of oldDeleted) {
          await prisma.customer.update({
            where: { id: c.id },
            data: { phone: `DELETED-${c.id}-${c.phone}` },
          });
        }
      } catch (e) {
        console.error("Error auto-releasing customer phone:", e);
      }

      const customer = await prisma.customer.create({
        data: {
          name: body.name,
          phone: body.phone,
          email: body.email || null,
          address: body.address || null,
          source: body.source || "WALKIN",
          birthday: body.birthday ? new Date(body.birthday) : null,
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
