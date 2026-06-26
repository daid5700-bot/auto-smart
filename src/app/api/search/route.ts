export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ customers: [], vehicles: [], repairOrders: [] });
    }

    const cleanQuery = query.trim();

    // Search Customers
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: cleanQuery, mode: "insensitive" } },
          { phone: { contains: cleanQuery } },
          { email: { contains: cleanQuery, mode: "insensitive" } },
        ],
      },
      take: 20,
    });

    // Search Vehicles (Sales)
    const vehicles = await prisma.vehicle.findMany({
      where: {
        OR: [
          { model: { contains: cleanQuery, mode: "insensitive" } },
          { vin: { contains: cleanQuery, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    // Search Repair Orders
    const repairOrders = await prisma.repairOrder.findMany({
      where: {
        OR: [
          { plateNumber: { contains: cleanQuery, mode: "insensitive" } },
          { symptoms: { contains: cleanQuery, mode: "insensitive" } },
          { vehicleModel: { contains: cleanQuery, mode: "insensitive" } },
        ],
      },
      include: {
        customer: true,
      },
      take: 5,
    });

    return NextResponse.json({ customers, vehicles, repairOrders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
