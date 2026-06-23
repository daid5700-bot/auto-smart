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

    // Handle completion logic (points, technician status, ZNS)
    if (body.status === "DONE" && currentRo.status !== "DONE") {
      if (ro.technicianId) {
        await prisma.technician.update({ where: { id: ro.technicianId }, data: { status: "IDLE" } });
      }
      
      // Send loyalty points & ZNS
      const configPointsRate = await prisma.systemConfig.findUnique({
        where: { key: "points_rate" }
      });
      const pointsRatePercent = configPointsRate ? parseFloat(configPointsRate.value) : 1.0;
      const points = Math.max(0, Math.floor((Number(ro.totalAmount) * (pointsRatePercent / 100)) / 1000));

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
          description: `Tích điểm từ lệnh sửa chữa #${ro.id} - ${ro.vehicleModel || ro.plateNumber} (tỷ lệ ${pointsRatePercent}%)`,
          relatedRoId: ro.id,
          branchId: ro.branchId,
        },
      });

      // Send Zalo ZNS Live
      let znsStatus = "SUCCESS";
      let znsError: string | null = null;
      try {
        const { sendZaloZns, formatDateForZalo } = await import("@/lib/zalo");
        const updatedCustomer = await prisma.customer.findUnique({
          where: { id: ro.customerId },
          select: { loyaltyPoints: true },
        });
        const totalPoint = updatedCustomer?.loyaltyPoints ?? (ro.customer.loyaltyPoints + points);
        
        const custName = ro.customer.name;
        const noteVal = ro.vehicleModel || ro.plateNumber || "Dịch vụ sửa chữa xe";
        const templateData = {
          customer_name: custName.length > 49 ? custName.substring(0, 49) : custName,
          order_date: formatDateForZalo(new Date()),
          note: noteVal.length > 29 ? noteVal.substring(0, 29) : noteVal,
          point: String(points),
          total_point: String(totalPoint),
        };
        const result = await sendZaloZns(ro.customer.phone, "CRM_THANK_YOU_001", templateData);
        if (!result.success) {
          znsStatus = "FAILED";
          znsError = result.error || "Lỗi không xác định";
        }
      } catch (e: any) {
        znsStatus = "FAILED";
        znsError = e.message;
      }

      await prisma.znsLog.create({
        data: {
          customerId: ro.customerId,
          phone: ro.customer.phone,
          messageType: "THANK_YOU",
          templateId: "CRM_THANK_YOU_001",
          content: `Cảm ơn khách hàng ${ro.customer.name} đã sửa chữa xe ${ro.vehicleModel || ro.plateNumber}. Quý khách tích được +${points} điểm!`,
          status: znsStatus === "SUCCESS" ? "SUCCESS" : "FAILED",
          error: znsError,
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
