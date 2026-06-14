import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/workshop/[id] — get single repair order with full detail
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const ro = await prisma.repairOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        technician: true,
        items: { include: { product: { include: { prices: true } } } },
        branch: true,
      },
    });
    if (!ro) return NextResponse.json({ error: "Không tìm thấy lệnh sửa chữa" }, { status: 404 });
    return NextResponse.json(ro);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/workshop/[id] — update Repair Order
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const branchId = getActiveBranchId();

    const currentRo = await prisma.repairOrder.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentRo) return NextResponse.json({ error: "Lệnh sửa chữa không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    const data: any = {
      plateNumber: body.plateNumber,
      vehicleModel: body.vehicleModel,
      kmIn: body.kmIn,
      symptoms: body.symptoms,
      status: body.status,
      technicianId: body.technicianId,
      laborCost: body.laborCost,
      partsCost: body.partsCost,
      totalAmount: (body.laborCost ?? Number(currentRo.laborCost)) + (body.partsCost ?? Number(currentRo.partsCost)),
      photos: body.photos,
    };

    if (body.status === "DONE" && currentRo.status !== "DONE") {
      data.completedAt = new Date();
    }

    const ro = await prisma.repairOrder.update({
      where: { id },
      data,
      include: { customer: true, technician: true },
    });

    // Handle KTV performance commission if completed
    if (body.status === "DONE" && ro.technicianId && currentRo.status !== "DONE") {
      await prisma.technician.update({ where: { id: ro.technicianId }, data: { status: "IDLE" } });
      const tech = await prisma.technician.findUnique({ where: { id: ro.technicianId } });
      if (tech) {
        const commission = Number(ro.totalAmount) * tech.commissionRate / 100;
        await prisma.techPerformance.create({
          data: { technicianId: tech.id, repairOrderId: ro.id, commissionAmount: commission },
        });
      }
      // Send loyalty points & ZNS
      const points = Math.floor(Number(ro.totalAmount) / 1000); // 1 point per 1k VND
      await prisma.customer.update({
        where: { id: ro.customerId },
        data: {
          loyaltyPoints: { increment: points },
          totalSpent: { increment: ro.totalAmount },
          lastVisit: new Date(),
        },
      });
      // Ghi log tích điểm (audit trail)
      await prisma.loyaltyTransaction.create({
        data: {
          customerId: ro.customerId,
          type: "EARN",
          points: points,
          description: `Tích điểm từ lệnh sửa chữa #${ro.id} - ${ro.vehicleModel || ro.plateNumber}`,
          relatedRoId: ro.id,
          branchId: ro.branchId,
        },
      });
      await prisma.znsLog.create({
        data: {
          customerId: ro.customerId,
          phone: ro.customer.phone,
          messageType: "THANK_YOU",
          content: `Cảm ơn khách hàng ${ro.customer.name} đã sửa chữa xe ${ro.vehicleModel}. Quý khách tích được +${points} điểm!`,
          status: "SENT",
          branchId: ro.branchId,
        },
      });
    }

    return NextResponse.json(ro);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/workshop/[id] — delete Repair Order
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const branchId = getActiveBranchId();
    const currentRo = await prisma.repairOrder.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentRo) return NextResponse.json({ error: "Lệnh sửa chữa không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    await prisma.repairOrder.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Xóa lệnh sửa chữa thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
