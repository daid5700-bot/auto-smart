import { isVinFastBranchId } from "@/lib/branch-identity";
import { prisma } from "@/lib/prisma";
import { formatDateForZalo, sendZaloZns } from "@/lib/zalo";

const BIRTHDAY_TEMPLATE_ID = "CRM_BIRTHDAY_003";
const MAINTENANCE_TEMPLATE_ID = "CRM_SERVICE_REMIND_002";
const OIL_REMINDER_TEMPLATE_ID = "CRM_OIL_REMIND_002";
const REMINDER_INTERVAL_MONTHS = 3;
const MAINTENANCE_DEDUPLICATION_DAYS = 30;

type JobSummary = {
  processed: number;
  eligible: number;
  sent: number;
  failed: number;
  skipped: number;
};

function createSummary(): JobSummary {
  return { processed: 0, eligible: 0, sent: 0, failed: 0, skipped: 0 };
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function startAndEndOfToday(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isBirthdayToday(birthday: Date, today: Date) {
  return (
    (birthday.getMonth() === today.getMonth() &&
      birthday.getDate() === today.getDate()) ||
    (birthday.getUTCMonth() === today.getUTCMonth() &&
      birthday.getUTCDate() === today.getUTCDate())
  );
}

function maintenanceTemplate(branchId: number | null) {
  return isVinFastBranchId(branchId)
    ? MAINTENANCE_TEMPLATE_ID
    : OIL_REMINDER_TEMPLATE_ID;
}

function maintenanceType(branchId: number | null) {
  return isVinFastBranchId(branchId) ? "MAINTENANCE" : "OIL_CHANGE";
}

export function isAuthorizedCron(secret: string | null) {
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

export async function runBirthdayCron(now = new Date()): Promise<JobSummary> {
  const summary = createSummary();
  const { start, end } = startAndEndOfToday(now);
  const customers = await prisma.customer.findMany({
    where: { isDeleted: false, birthday: { not: null }, phone: { not: "" } },
    include: {
      branch: { select: { name: true } },
      znsLogs: {
        where: {
          messageType: "BIRTHDAY",
          status: { in: ["SUCCESS", "SENT", "DELIVERED"] },
          sentAt: { gte: start, lte: end },
        },
        take: 1,
      },
    },
  });

  summary.processed = customers.length;
  for (const customer of customers) {
    if (
      !customer.birthday ||
      !isBirthdayToday(customer.birthday, now) ||
      customer.znsLogs.length > 0
    ) {
      summary.skipped += 1;
      continue;
    }

    summary.eligible += 1;
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 7);
    const customerName = truncate(customer.name.trim(), 29);
    const storeName = customer.branch?.name || "cửa hàng";
    const content = `Chúc mừng sinh nhật Quý khách ${customer.name}. ${storeName} kính chúc Quý khách một tuổi mới nhiều sức khỏe, hạnh phúc và thành công!`;

    try {
      const result = await sendZaloZns(
        customer.phone,
        BIRTHDAY_TEMPLATE_ID,
        {
          customer_name: customerName,
          expiry_date: formatDateForZalo(expiryDate),
          phone_number: customer.phone,
        },
        customer.branchId,
      );
      const status = result.success ? "SUCCESS" : "FAILED";
      await prisma.znsLog.create({
        data: {
          customerId: customer.id,
          phone: customer.phone,
          messageType: "BIRTHDAY",
          templateId: BIRTHDAY_TEMPLATE_ID,
          content,
          status,
          error: result.success ? null : result.error || "Gửi ZNS thất bại",
          branchId: customer.branchId,
        },
      });
      if (result.success) summary.sent += 1;
      else summary.failed += 1;
    } catch (error) {
      summary.failed += 1;
      await prisma.znsLog.create({
        data: {
          customerId: customer.id,
          phone: customer.phone,
          messageType: "BIRTHDAY",
          templateId: BIRTHDAY_TEMPLATE_ID,
          content,
          status: "FAILED",
          error: error instanceof Error ? error.message : "Lỗi gửi ZNS không xác định",
          branchId: customer.branchId,
        },
      });
    }
  }

  return summary;
}

export async function runMaintenanceCron(
  now = new Date(),
): Promise<JobSummary> {
  const summary = createSummary();
  const duplicateThreshold = new Date(
    now.getTime() - MAINTENANCE_DEDUPLICATION_DAYS * 24 * 60 * 60 * 1000,
  );
  const customers = await prisma.customer.findMany({
    where: { isDeleted: false, phone: { not: "" } },
    include: {
      branch: { select: { name: true } },
      vehicles: { take: 1, orderBy: { createdAt: "desc" } },
      repairOrders: {
        where: { status: { in: ["DONE", "DELIVERED"] } },
        take: 1,
        orderBy: { completedAt: "desc" },
      },
      znsLogs: {
        where: {
          messageType: { in: ["MAINTENANCE", "OIL_CHANGE"] },
          status: { in: ["SUCCESS", "SENT", "DELIVERED"] },
          sentAt: { gte: duplicateThreshold },
        },
        take: 1,
      },
    },
  });

  summary.processed = customers.length;
  for (const customer of customers) {
    if (customer.znsLogs.length > 0) {
      summary.skipped += 1;
      continue;
    }

    const lastVehicle = customer.vehicles[0];
    const lastRepairOrder = customer.repairOrders[0];
    const vehicleDate = lastVehicle?.createdAt;
    const repairDate = lastRepairOrder?.completedAt || lastRepairOrder?.createdAt;
    const referenceDate =
      vehicleDate && repairDate
        ? vehicleDate > repairDate
          ? vehicleDate
          : repairDate
        : vehicleDate || repairDate;

    if (!referenceDate || addMonths(referenceDate, REMINDER_INTERVAL_MONTHS) > now) {
      summary.skipped += 1;
      continue;
    }

    summary.eligible += 1;
    const vinFast = isVinFastBranchId(customer.branchId);
    const vehicleName = truncate(
      lastRepairOrder?.vehicleModel || lastVehicle?.model || "xe máy",
      199,
    );
    const licensePlate = truncate(
      lastRepairOrder?.plateNumber || customer.vehiclePlates[0] || "N/A",
      29,
    );
    const customerName = truncate(customer.name.trim(), 29);
    const storeName = customer.branch?.name || "cửa hàng";
    const templateData = {
      customer_name: customerName,
      order_date: formatDateForZalo(referenceDate),
      vehicle_name: vehicleName,
      license_plate: licensePlate,
      ...(vinFast ? {} : { store_name: truncate(storeName, 199) }),
    };
    const messageLabel = vinFast ? "bảo dưỡng" : "thay dầu";
    const content = `Nhắc lịch ${messageLabel}: Xe ${licensePlate} của quý khách đã đến kỳ ${messageLabel} định kỳ. Vui lòng liên hệ ${storeName} để đặt lịch hẹn!`;
    const templateId = maintenanceTemplate(customer.branchId);

    try {
      const result = await sendZaloZns(
        customer.phone,
        templateId,
        templateData,
        customer.branchId,
      );
      const status = result.success ? "SUCCESS" : "FAILED";
      await prisma.znsLog.create({
        data: {
          customerId: customer.id,
          phone: customer.phone,
          messageType: maintenanceType(customer.branchId),
          templateId,
          content,
          status,
          error: result.success ? null : result.error || "Gửi ZNS thất bại",
          branchId: customer.branchId,
        },
      });
      if (result.success) summary.sent += 1;
      else summary.failed += 1;
    } catch (error) {
      summary.failed += 1;
      await prisma.znsLog.create({
        data: {
          customerId: customer.id,
          phone: customer.phone,
          messageType: maintenanceType(customer.branchId),
          templateId,
          content,
          status: "FAILED",
          error: error instanceof Error ? error.message : "Lỗi gửi ZNS không xác định",
          branchId: customer.branchId,
        },
      });
    }
  }

  return summary;
}

export async function runDailyZnsCron(now = new Date()) {
  const [birthday, maintenance] = await Promise.all([
    runBirthdayCron(now),
    runMaintenanceCron(now),
  ]);
  return { birthday, maintenance };
}
