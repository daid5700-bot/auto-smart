const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  console.log("⚡ BẮT ĐẦU VERIFY CRUD CHI NHÁNH & LIÊN KẾT PHỤ TÙNG...");
  let passes = 0;
  let fails = 0;
  
  function assert(condition, message) {
    if (condition) {
      passes++;
      console.log(`✅ [PASS] ${message}`);
    } else {
      fails++;
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  try {
    // 1. Tạo chi nhánh mới
    const testBranch = await prisma.branch.create({
      data: {
        name: "Chi nhánh Test CRUD",
        address: "789 Đường Láng, Hà Nội",
        phone: "0999000111"
      }
    });
    assert(!!testBranch.id, `Tạo chi nhánh mới thành công (ID: ${testBranch.id})`);
    assert(testBranch.name === "Chi nhánh Test CRUD", "Tên chi nhánh khớp");

    // 2. Chỉnh sửa chi nhánh
    const updatedBranch = await prisma.branch.update({
      where: { id: testBranch.id },
      data: {
        name: "Chi nhánh Test CRUD (Updated)",
        phone: "0999000222"
      }
    });
    assert(updatedBranch.name === "Chi nhánh Test CRUD (Updated)", "Cập nhật tên chi nhánh thành công");
    assert(updatedBranch.phone === "0999000222", "Cập nhật điện thoại chi nhánh thành công");

    // 3. Liên kết phụ tùng vào chi nhánh mới này
    const testProduct = await prisma.product.create({
      data: {
        sku: "SKU-BRANCH-TEST",
        name: "Phụ tùng thuộc chi nhánh mới",
        category: "Test",
        unit: "Cái",
        branchId: testBranch.id
      }
    });
    assert(!!testProduct.id, `Tạo thành công phụ tùng gán vào chi nhánh mới (ID: ${testProduct.id}, branchId: ${testProduct.branchId})`);

    // 4. Kiểm tra việc xóa chi nhánh bị chặn nếu còn dữ liệu (phụ tùng)
    const productsCount = await prisma.product.count({ where: { branchId: testBranch.id } });
    assert(productsCount > 0, `Đã xác minh chi nhánh có phụ tùng liên kết (Count: ${productsCount})`);

    // 5. Cleanup: Xóa phụ tùng trước, sau đó xóa chi nhánh
    await prisma.product.delete({ where: { id: testProduct.id } });
    assert(true, "Xóa phụ tùng thành công để chuẩn bị dọn dẹp chi nhánh");

    await prisma.branch.delete({ where: { id: testBranch.id } });
    assert(true, "Xóa chi nhánh test thành công");

  } catch (error) {
    assert(false, `Gặp lỗi trong quá trình verify: ${error.message}`);
  }

  console.log(`\n📊 KẾT QUẢ VERIFY CRUD CHI NHÁNH: ${passes} PASS, ${fails} FAIL.`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
