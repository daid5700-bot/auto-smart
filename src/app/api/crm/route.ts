export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { requireAuth } from "@/lib/guard";

// GET /api/crm — leads, customers, zns logs
export async function GET(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

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
    const search = req.nextUrl.searchParams.get("search") || "";
    const baseWhere = {
      isDeleted: false,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          ...(/^\d+$/.test(search.trim()) ? [{ id: parseInt(search.trim(), 10) }] : []),
        ],
      } : {}),
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
    const serializedCustomers = customers.map((c: any) => ({
      ...c,
      totalSpent: Number(c.totalSpent || 0),
      totalDebt: Number(c.totalDebt || 0),
      vehicles: c.vehicles?.map((v: any) => ({
        ...v,
        importPrice: v.importPrice ? Number(v.importPrice) : null,
        listPrice: v.listPrice ? Number(v.listPrice) : 0,
        floorPrice: v.floorPrice ? Number(v.floorPrice) : 0,
        paidAmount: v.paidAmount ? Number(v.paidAmount) : 0,
        debtAmount: v.debtAmount ? Number(v.debtAmount) : 0,
        plateCost: v.plateCost ? Number(v.plateCost) : null
      })) || [],
      repairOrders: c.repairOrders?.map((ro: any) => ({
        ...ro,
        laborCost: Number(ro.laborCost || 0),
        partsCost: Number(ro.partsCost || 0),
        discountAmount: Number(ro.discountAmount || 0),
        totalAmount: Number(ro.totalAmount || 0),
        paidAmount: Number(ro.paidAmount || 0),
        debtAmount: Number(ro.debtAmount || 0)
      })) || []
    }));
    return NextResponse.json({ customers: serializedCustomers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }

  if (tab === "reminders") {
    // Count total active customers
    const totalCustomers = await prisma.customer.count({
      where: {
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      }
    });

    // Fetch up to 500 most recent active customers (configurable via ?limit=N, max 1000)
    const reminderLimit = Math.min(1000, Math.max(50, parseInt(req.nextUrl.searchParams.get("limit") || "500")));
    const customers = await prisma.customer.findMany({
      where: {
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      } as any,
      take: reminderLimit,
      orderBy: { lastVisit: "desc" },
      include: {
        vehicles: { take: 1, orderBy: { createdAt: "desc" } },
        branch: true,
        repairOrders: {
          where: { status: { in: ["DONE", "DELIVERED"] } },
          take: 1,
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
          take: 5,
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
      warning: totalCustomers > reminderLimit ? `Chỉ hiển thị nhắc nhở của ${reminderLimit} khách hàng hoạt động gần đây nhất trên tổng số ${totalCustomers} khách hàng.` : null,
      totalCustomers
    });
  }


  if (tab === "zns") {
    const search = req.nextUrl.searchParams.get("search") || "";
    const baseWhere = {
      ...(branchId ? { branchId } : {}),
      ...(search ? {
        OR: [
          { phone: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
          { messageType: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
          ...(/^\d+$/.test(search.trim()) ? [{ id: parseInt(search.trim(), 10) }] : []),
        ],
      } : {}),
    } as any;

    const [znsLogs, total] = await Promise.all([
      prisma.znsLog.findMany({
        where: baseWhere,
        orderBy: { sentAt: "desc" },
        skip,
        take: limit,
        include: { customer: true },
      }),
      prisma.znsLog.count({ where: baseWhere })
    ]);
    return NextResponse.json({ znsLogs, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }

  if (tab === "loyalty") {
    const search = req.nextUrl.searchParams.get("search") || "";
    const baseWhere = {
      type: "REDEEM",
      ...(branchId ? { branchId } : {}),
      ...(search ? {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
          { customer: { phone: { contains: search, mode: "insensitive" } } },
          ...(/^\d+$/.test(search.trim()) ? [{ id: parseInt(search.trim(), 10) }] : []),
        ],
      } : {}),
    } as any;

    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: baseWhere,
        include: {
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.loyaltyTransaction.count({ where: baseWhere })
    ]);
    return NextResponse.json({ transactions, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
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
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    if (body.type === "customer") {
      if (!body.name || !body.name.trim()) throw new Error("Tên khách hàng không được để trống");
      if (!body.phone || !/^0[0-9]{9}$/.test(body.phone)) throw new Error("Số điện thoại không hợp lệ");

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
      const serializedCustomer = {
        ...customer,
        totalSpent: Number(customer.totalSpent || 0),
        totalDebt: Number(customer.totalDebt || 0)
      };
      return NextResponse.json(serializedCustomer, { status: 201 });
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
    if (error.code === 'P2002') return NextResponse.json({ error: "Số điện thoại này đã được đăng ký" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
