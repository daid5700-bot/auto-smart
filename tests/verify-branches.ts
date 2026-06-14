import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("🔍 BẮT ĐẦU VERIFY CÁC CHỨC NĂNG CHI NHÁNH & BẢO MẬT DỮ LIỆU...\n");

  let passes = 0;
  let fails = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      passes++;
      console.log(`✅ [PASS] ${message}`);
    } else {
      fails++;
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // 1. Kiểm tra tài khoản Admin có quyền truy cập cả 2 chi nhánh
  try {
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@autosmart.vn" },
      include: { branches: { include: { branch: true } } },
    });
    
    assert(!!adminUser, "Tìm thấy tài khoản admin@autosmart.vn");
    assert(adminUser?.branches.length === 2, `Tài khoản Admin có đúng 2 chi nhánh gán quyền (Thực tế: ${adminUser?.branches.length})`);
    
    const branchNames = adminUser?.branches.map((b) => b.branch.name) || [];
    assert(branchNames.includes("Chi nhánh Quận 1") && branchNames.includes("Chi nhánh Quận 7"), "Danh sách chi nhánh của Admin bao gồm Quận 1 và Quận 7");
  } catch (error: any) {
    assert(false, `Lỗi kiểm tra tài khoản Admin: ${error.message}`);
  }

  // 2. Kiểm tra tài khoản Sales chỉ thuộc Chi nhánh Quận 7
  try {
    const salesUser = await prisma.user.findUnique({
      where: { email: "sales@autosmart.vn" },
      include: { branches: { include: { branch: true } } },
    });

    assert(!!salesUser, "Tìm thấy tài khoản sales@autosmart.vn");
    assert(salesUser?.branches.length === 1, `Tài khoản Sales chỉ có đúng 1 chi nhánh gán quyền (Thực tế: ${salesUser?.branches.length})`);
    assert(salesUser?.branches[0].branch.name === "Chi nhánh Quận 7", `Tài khoản Sales thuộc chi nhánh: ${salesUser?.branches[0].branch.name}`);
  } catch (error: any) {
    assert(false, `Lỗi kiểm tra tài khoản Sales: ${error.message}`);
  }

  // 3. Kiểm tra phân bổ dữ liệu mẫu theo chi nhánh (Isolation)
  try {
    const q1Branch = await prisma.branch.findFirst({ where: { name: "Chi nhánh Quận 1" } });
    const q7Branch = await prisma.branch.findFirst({ where: { name: "Chi nhánh Quận 7" } });

    if (!q1Branch || !q7Branch) {
      throw new Error("Không tìm thấy các chi nhánh Quận 1 hoặc Quận 7 trong DB!");
    }

    // A. Lọc Leads theo chi nhánh
    const leadsQ1 = await prisma.lead.count({ where: { branchId: q1Branch.id } });
    const leadsQ7 = await prisma.lead.count({ where: { branchId: q7Branch.id } });
    assert(leadsQ1 > 0 && leadsQ7 > 0, `Phân tách Lead theo chi nhánh hoạt động tốt (Q1: ${leadsQ1} leads, Q7: ${leadsQ7} leads)`);

    // B. Lọc Lệnh sửa chữa (RepairOrder) theo chi nhánh
    const ordersQ1 = await prisma.repairOrder.count({ where: { branchId: q1Branch.id } });
    const ordersQ7 = await prisma.repairOrder.count({ where: { branchId: q7Branch.id } });
    assert(ordersQ1 > 0 && ordersQ7 > 0, `Phân tách Lệnh sửa chữa theo chi nhánh tốt (Q1: ${ordersQ1} orders, Q7: ${ordersQ7} orders)`);

    // C. Lọc Phụ tùng (Product) theo chi nhánh
    const productsQ1 = await prisma.product.count({ where: { branchId: q1Branch.id } });
    const productsQ7 = await prisma.product.count({ where: { branchId: q7Branch.id } });
    assert(productsQ1 > 0 && productsQ7 > 0, `Phân tách Phụ tùng trong kho theo chi nhánh tốt (Q1: ${productsQ1} items, Q7: ${productsQ7} items)`);

  } catch (error: any) {
    assert(false, `Lỗi kiểm tra phân tách dữ liệu chi nhánh: ${error.message}`);
  }

  console.log(`\n📊 KẾT QUẢ VERIFY: ${passes} PASS, ${fails} FAIL.`);
  process.exit(fails > 0 ? 1 : 0);
}

runVerification();
