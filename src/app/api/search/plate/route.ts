export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Search RepairOrders by plate number prefix or match (case-insensitive)
    const repairOrders = await prisma.repairOrder.findMany({
      where: {
        isDeleted: false,
        plateNumber: {
          contains: cleanQuery,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        customer: true,
      },
    });

    // De-duplicate suggestions by plateNumber, picking the latest one
    const seenPlates = new Set<string>();
    const suggestions: any[] = [];

    for (const ro of repairOrders) {
      const plate = ro.plateNumber.toUpperCase();
      if (!seenPlates.has(plate)) {
        seenPlates.add(plate);
        suggestions.push({
          plateNumber: ro.plateNumber,
          vehicleModel: ro.vehicleModel || "",
          customerName: ro.customer?.name || "Khách vãng lai",
          phone: ro.customer?.phone || "",
          customerId: ro.customerId,
          loyaltyPoints: ro.customer?.loyaltyPoints || 0,
          birthday: ro.customer?.birthday ? ro.customer.birthday.toISOString().substring(0, 10) : "",
        });
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
