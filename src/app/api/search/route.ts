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

    // Determine if query is mostly numeric (likely a phone number search)
    const isNumericSearch = /^\d+$/.test(cleanQuery.replace(/\s+/g, ''));

    const [customers, vehicles, repairOrders] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: cleanQuery, mode: "insensitive" } },
            { phone: isNumericSearch ? { startsWith: cleanQuery } : { contains: cleanQuery } },
            { email: { contains: cleanQuery, mode: "insensitive" } },
          ],
        },
        take: 20,
      }),
      prisma.vehicle.findMany({
        where: {
          OR: [
            { model: { contains: cleanQuery, mode: "insensitive" } },
            { vin: { contains: cleanQuery, mode: "insensitive" } },
          ],
        },
        take: 5,
      }),
      prisma.repairOrder.findMany({
        where: {
          isDeleted: false,
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
      })
    ]);

    return NextResponse.json({ customers, vehicles, repairOrders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
