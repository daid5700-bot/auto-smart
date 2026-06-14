/**
 * AUTO-SMART CRM & ERP — API Test Suite
 * Chạy: npx tsx tests/api-test-suite.ts
 * Yêu cầu: npm run dev đang chạy + PostgreSQL online
 */

const BASE = "http://localhost:3000";

// Màu cho terminal
const c = {
  ok:   (s: string) => `\x1b[32m✅ ${s}\x1b[0m`,
  fail: (s: string) => `\x1b[31m❌ ${s}\x1b[0m`,
  info: (s: string) => `\x1b[36m🔍 ${s}\x1b[0m`,
  head: (s: string) => `\x1b[33m\n━━━ ${s} ━━━\x1b[0m`,
};

let passed = 0, failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(c.ok(name));
    passed++;
  } catch (e: any) {
    console.log(c.fail(`${name} → ${e.message}`));
    failed++;
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function api(path: string, opts: RequestInit = {}, cookie = "user_role=ADMIN; active_branch_id=1") {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...(opts.headers || {}) },
  });
  const data = await res.json();
  return { res, data };
}

// ─── AUTH ───────────────────────────────────────────────
async function runAuthTests() {
  console.log(c.head("AUTH"));

  await test("Đăng nhập đúng credentials → 200 + token", async () => {
    const { res, data } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@autosmart.vn", password: "admin123" }),
    }, "");
    assert(res.status === 200, `status=${res.status}`);
    assert(data.user?.role === "ADMIN", "role phải là ADMIN");
  });

  await test("Đăng nhập sai password → 401", async () => {
    const { res } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@autosmart.vn", password: "wrongpwd" }),
    }, "");
    assert(res.status === 401, `status=${res.status}`);
  });

  await test("Đăng nhập email không tồn tại → 401", async () => {
    const { res } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "notexist@test.vn", password: "abc" }),
    }, "");
    assert(res.status === 401, `status=${res.status}`);
  });
}

// ─── BRANCHES ───────────────────────────────────────────
async function runBranchTests() {
  console.log(c.head("BRANCHES"));
  let branchId: number;

  await test("GET /api/branches → danh sách chi nhánh", async () => {
    const { res, data } = await api("/api/branches");
    assert(res.status === 200, `status=${res.status}`);
    assert(Array.isArray(data.branches), "branches phải là array");
  });

  await test("POST /api/branches → tạo chi nhánh mới", async () => {
    const { res, data } = await api("/api/branches", {
      method: "POST",
      body: JSON.stringify({ name: "TEST Branch " + Date.now(), address: "123 Test St", phone: "0900000000" }),
    });
    assert(res.status === 201, `status=${res.status}`);
    assert(data.id > 0, "id phải > 0");
    branchId = data.id;
  });

  await test("PATCH /api/branches/[id] → cập nhật chi nhánh", async () => {
    if (!branchId) return;
    const { res } = await api(`/api/branches/${branchId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "TEST Branch Updated" }),
    });
    assert(res.status === 200, `status=${res.status}`);
  });

  await test("DELETE /api/branches/[id] → xóa chi nhánh test", async () => {
    if (!branchId) return;
    const { res } = await api(`/api/branches/${branchId}`, { method: "DELETE" });
    assert(res.status === 200, `status=${res.status}`);
  });
}

// ─── USERS ──────────────────────────────────────────────
async function runUserTests() {
  console.log(c.head("USERS"));
  let userId: number;

  await test("GET /api/users → danh sách users", async () => {
    const { res, data } = await api("/api/users");
    assert(res.status === 200, `status=${res.status}`);
    assert(Array.isArray(data.users), "users phải là array");
  });

  await test("POST /api/users → tạo user mới", async () => {
    const { res, data } = await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: `test_${Date.now()}@test.vn`,
        password: "test123",
        role: "CRM",
        branchIds: [1],
      }),
    });
    assert(res.status === 201, `status=${res.status}`);
    userId = data.user?.id;
  });

  await test("PATCH /api/users/[id] → cập nhật user", async () => {
    if (!userId) return;
    const { res } = await api(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Test User Updated" }),
    });
    assert(res.status === 200, `status=${res.status}`);
  });

  await test("DELETE /api/users/[id] → xóa user test", async () => {
    if (!userId) return;
    const { res } = await api(`/api/users/${userId}`, { method: "DELETE" });
    assert(res.status === 200, `status=${res.status}`);
  });

  await test("Không thể xóa admin@autosmart.vn", async () => {
    const { data: usersData } = await api("/api/users");
    const adminUser = usersData.users?.find((u: any) => u.email === "admin@autosmart.vn");
    if (!adminUser) return;
    const { res } = await api(`/api/users/${adminUser.id}`, { method: "DELETE" });
    assert(res.status === 403, `status=${res.status} (nên là 403)`);
  });
}

// ─── INVENTORY ──────────────────────────────────────────
async function runInventoryTests() {
  console.log(c.head("INVENTORY — Phụ tùng & Kho"));
  let productId: number;
  const testSku = `TEST-SKU-${Date.now()}`;

  await test("GET /api/inventory → danh sách phụ tùng (branchId=1)", async () => {
    const { res, data } = await api("/api/inventory");
    assert(res.status === 200, `status=${res.status}`);
    assert(Array.isArray(data.products), "products phải là array");
    assert(typeof data.totalCount === "number", "totalCount phải là number");
    assert(typeof data.totalPages === "number", "totalPages phải là number (phân trang)");
  });

  await test("GET /api/inventory?page=1&limit=5 → phân trang đúng", async () => {
    const { res, data } = await api("/api/inventory?page=1&limit=5");
    assert(res.status === 200, `status=${res.status}`);
    assert(data.products.length <= 5, `phải trả tối đa 5 sản phẩm, nhận ${data.products.length}`);
    assert(data.currentPage === 1, "currentPage phải là 1");
    assert(data.limit === 5, "limit phải là 5");
  });

  await test("POST /api/inventory → thêm phụ tùng mới", async () => {
    const { res, data } = await api("/api/inventory", {
      method: "POST",
      body: JSON.stringify({
        sku: testSku,
        name: "Lọc dầu test",
        category: "Lọc",
        unit: "Cái",
        stockCount: 10,
        stockMin: 2,
        stockMax: 50,
        prices: [
          { type: "RETAIL", amount: 120000 },
          { type: "WHOLESALE", amount: 100000 },
          { type: "INSURANCE", amount: 110000 },
        ],
      }),
    });
    assert(res.status === 201, `status=${res.status}`);
    productId = data.id;
  });

  await test("PATCH /api/inventory/[id] → cập nhật phụ tùng", async () => {
    if (!productId) return;
    const { res, data } = await api(`/api/inventory/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Lọc dầu test (đã cập nhật)", stockMin: 3 }),
    });
    assert(res.status === 200, `status=${res.status}`);
    assert(data.stockMin === 3, "stockMin phải được cập nhật thành 3");
  });

  await test("GET /api/inventory?search=Lọc dầu test → tìm kiếm đúng", async () => {
    const { res, data } = await api("/api/inventory?search=L%E1%BB%8Dc+d%E1%BA%A7u+test");
    assert(res.status === 200, `status=${res.status}`);
    assert(data.products.length > 0, "phải tìm thấy ít nhất 1 sản phẩm");
  });

  await test("DELETE /api/inventory/[id] → xóa phụ tùng test", async () => {
    if (!productId) return;
    const { res } = await api(`/api/inventory/${productId}`, { method: "DELETE" });
    assert(res.status === 200, `status=${res.status}`);
  });
}

// ─── CRM ────────────────────────────────────────────────
async function runCrmTests() {
  console.log(c.head("CRM — Khách hàng & Leads"));
  let customerId: number;
  let leadId: number;

  await test("GET /api/crm → danh sách khách hàng + leads", async () => {
    const { res, data } = await api("/api/crm");
    assert(res.status === 200, `status=${res.status}`);
    assert(Array.isArray(data.customers), "customers phải là array");
    assert(Array.isArray(data.leads), "leads phải là array");
  });

  await test("POST /api/crm → tạo khách hàng mới", async () => {
    const phone = `090${Date.now().toString().slice(-7)}`;
    const { res, data } = await api("/api/crm", {
      method: "POST",
      body: JSON.stringify({
        type: "customer",
        name: "Khách Test",
        phone,
        source: "WALKIN",
      }),
    });
    assert(res.status === 201, `status=${res.status}`);
    customerId = data.id;
  });

  await test("POST /api/crm → tạo lead mới", async () => {
    const { res, data } = await api("/api/crm", {
      method: "POST",
      body: JSON.stringify({
        type: "lead",
        name: "Lead Test",
        phone: `091${Date.now().toString().slice(-7)}`,
        source: "FACEBOOK",
        interest: "Toyota Camry",
      }),
    });
    assert(res.status === 201, `status=${res.status}`);
    leadId = data.id;
  });

  await test("PATCH /api/crm/[id] → cập nhật lead status", async () => {
    if (!leadId) return;
    const { res } = await api(`/api/crm/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({ type: "lead", status: "POTENTIAL" }),
    });
    assert(res.status === 200, `status=${res.status}`);
  });

  await test("DELETE /api/crm/[id] → xóa lead test", async () => {
    if (!leadId) return;
    const { res } = await api(`/api/crm/${leadId}`, {
      method: "DELETE",
      body: JSON.stringify({ type: "lead" }),
    });
    assert(res.status === 200, `status=${res.status}`);
  });

  await test("DELETE /api/crm/[id] → xóa khách hàng test", async () => {
    if (!customerId) return;
    const { res } = await api(`/api/crm/${customerId}`, {
      method: "DELETE",
      body: JSON.stringify({ type: "customer" }),
    });
    assert(res.status === 200, `status=${res.status}`);
  });
}

// ─── WORKSHOP ───────────────────────────────────────────
async function runWorkshopTests() {
  console.log(c.head("WORKSHOP — Lệnh sửa chữa"));

  await test("GET /api/workshop → danh sách lệnh sửa chữa", async () => {
    const { res, data } = await api("/api/workshop");
    assert(res.status === 200, `status=${res.status}`);
    assert(Array.isArray(data.repairOrders), "repairOrders phải là array");
    assert(Array.isArray(data.technicians), "technicians phải là array");
  });

  await test("GET /api/workshop/[id] → lấy chi tiết lệnh (nếu có)", async () => {
    const { data: list } = await api("/api/workshop");
    const ros = list.repairOrders || [];
    if (ros.length === 0) { console.log("   ⚠️  Không có RO nào để test GET detail"); return; }
    const roId = ros[0].id;
    const { res, data } = await api(`/api/workshop/${roId}`);
    assert(res.status === 200, `status=${res.status}`);
    assert(data.id === roId, "id phải khớp");
    assert(Array.isArray(data.items), "items phải là array");
    assert(data.branch !== undefined, "branch phải được include");
  });

  await test("GET /api/workshop/99999 → 404", async () => {
    const { res } = await api("/api/workshop/99999");
    assert(res.status === 404, `status=${res.status}`);
  });
}

// ─── TECHNICIANS ────────────────────────────────────────
async function runTechnicianTests() {
  console.log(c.head("TECHNICIANS — Kỹ thuật viên"));
  let techId: number;

  await test("GET /api/technicians → danh sách KTV theo chi nhánh", async () => {
    const { res, data } = await api("/api/technicians");
    assert(res.status === 200, `status=${res.status}`);
    assert(Array.isArray(data.technicians), "technicians phải là array");
  });

  await test("POST /api/technicians → thêm KTV mới", async () => {
    const { res, data } = await api("/api/technicians", {
      method: "POST",
      body: JSON.stringify({
        code: `KTV-TEST-${Date.now()}`,
        name: "KTV Test",
        phone: "0909000001",
        commissionRate: 10,
        status: "IDLE",
      }),
    });
    assert(res.status === 201, `status=${res.status}`);
    techId = data.id;
  });

  await test("PATCH /api/technicians/[id] → cập nhật tỷ lệ hoa hồng", async () => {
    if (!techId) return;
    const { res, data } = await api(`/api/technicians/${techId}`, {
      method: "PATCH",
      body: JSON.stringify({ commissionRate: 12 }),
    });
    assert(res.status === 200, `status=${res.status}`);
    assert(data.commissionRate === 12, "commissionRate phải là 12");
  });

  await test("DELETE /api/technicians/[id] → xóa KTV test", async () => {
    if (!techId) return;
    const { res } = await api(`/api/technicians/${techId}`, { method: "DELETE" });
    assert(res.status === 200, `status=${res.status}`);
  });
}

// ─── SALES ──────────────────────────────────────────────
async function runSalesTests() {
  console.log(c.head("SALES — Kho xe"));
  let vehicleId: number;

  await test("GET /api/sales → danh sách xe theo chi nhánh", async () => {
    const { res, data } = await api("/api/sales");
    assert(res.status === 200, `status=${res.status}`);
    assert(Array.isArray(data.vehicles), "vehicles phải là array");
    assert(typeof data.counts === "object", "counts phải là object");
  });

  await test("POST /api/sales → thêm xe mới", async () => {
    const { res, data } = await api("/api/sales", {
      method: "POST",
      body: JSON.stringify({
        vin: `VIN-TEST-${Date.now()}`,
        model: "Toyota Test",
        variant: "1.5G",
        color: "Đen",
        year: 2024,
        listPrice: 800000000,
        floorPrice: 750000000,
        status: "AVAILABLE",
      }),
    });
    assert(res.status === 201, `status=${res.status}`);
    vehicleId = data.id;
  });

  await test("PATCH /api/sales/[id] → cập nhật trạng thái xe", async () => {
    if (!vehicleId) return;
    const { res, data } = await api(`/api/sales/${vehicleId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "RESERVED" }),
    });
    assert(res.status === 200, `status=${res.status}`);
    assert(data.status === "RESERVED", "status phải là RESERVED");
  });

  await test("DELETE /api/sales/[id] → xóa xe test", async () => {
    if (!vehicleId) return;
    const { res } = await api(`/api/sales/${vehicleId}`, { method: "DELETE" });
    assert(res.status === 200, `status=${res.status}`);
  });
}

// ─── CONFIG / SETTINGS ──────────────────────────────────
async function runConfigTests() {
  console.log(c.head("SETTINGS — Cấu hình hệ thống"));

  await test("GET /api/config → trả về config (có thể từ default)", async () => {
    const { res, data } = await api("/api/config");
    assert(res.status === 200, `status=${res.status}`);
    assert(typeof data.config === "object", "config phải là object");
    assert(typeof data.config.zns_template === "string", "zns_template phải tồn tại");
    assert(typeof data.config.lease_rate === "string", "lease_rate phải tồn tại");
    assert(typeof data.config.points_rate === "string", "points_rate phải tồn tại");
  });

  await test("POST /api/config → lưu settings vào DB (Admin)", async () => {
    const { res, data } = await api("/api/config", {
      method: "POST",
      body: JSON.stringify({ zns_template: "Template test [NAME] [PLATE]", lease_rate: "8.5", points_rate: "2" }),
    });
    assert(res.status === 200, `status=${res.status}`);
    assert(data.success === true, "success phải là true");
  });

  await test("GET /api/config sau khi lưu → trả đúng giá trị mới", async () => {
    const { res, data } = await api("/api/config");
    assert(res.status === 200, `status=${res.status}`);
    assert(data.config.lease_rate === "8.5", `lease_rate phải là 8.5, nhận ${data.config.lease_rate}`);
    assert(data.config.points_rate === "2", `points_rate phải là 2, nhận ${data.config.points_rate}`);
  });

  await test("POST /api/config với role CRM → 403 Forbidden", async () => {
    const { res } = await api(
      "/api/config",
      { method: "POST", body: JSON.stringify({ lease_rate: "99" }) },
      "user_role=CRM; active_branch_id=1"
    );
    assert(res.status === 403, `status=${res.status}`);
  });

  // Khôi phục lại giá trị mặc định
  await api("/api/config", {
    method: "POST",
    body: JSON.stringify({ lease_rate: "7.9", points_rate: "1" }),
  });
}

// ─── BRANCH ISOLATION ───────────────────────────────────
async function runBranchIsolationTests() {
  console.log(c.head("BRANCH ISOLATION — Phân tách dữ liệu"));

  await test("GET /api/inventory branch 1 chỉ trả data branch 1", async () => {
    const { data } = await api("/api/inventory", {}, "user_role=WAREHOUSE; active_branch_id=1");
    const wrongBranch = (data.products || []).filter((p: any) => p.branchId && p.branchId !== 1);
    assert(wrongBranch.length === 0, `Có ${wrongBranch.length} phụ tùng sai branch`);
  });

  await test("GET /api/workshop branch 1 chỉ trả RO của branch 1", async () => {
    const { data } = await api("/api/workshop", {}, "user_role=WORKSHOP; active_branch_id=1");
    const wrongBranch = (data.repairOrders || []).filter((ro: any) => ro.branchId && ro.branchId !== 1);
    assert(wrongBranch.length === 0, `Có ${wrongBranch.length} RO sai branch`);
  });

  await test("GET /api/crm branch 1 chỉ trả khách hàng của branch 1", async () => {
    const { data } = await api("/api/crm", {}, "user_role=CRM; active_branch_id=1");
    const wrongBranch = (data.customers || []).filter((c: any) => c.branchId && c.branchId !== 1);
    assert(wrongBranch.length === 0, `Có ${wrongBranch.length} khách hàng sai branch`);
  });

  await test("GET /api/technicians branch 1 chỉ trả KTV của branch 1", async () => {
    const { data } = await api("/api/technicians", {}, "user_role=WORKSHOP; active_branch_id=1");
    const wrongBranch = (data.technicians || []).filter((t: any) => t.branchId && t.branchId !== 1);
    assert(wrongBranch.length === 0, `Có ${wrongBranch.length} KTV sai branch`);
  });
}

// ─── DASHBOARD & REPORTS ────────────────────────────────
async function runDashboardTests() {
  console.log(c.head("DASHBOARD & REPORTS"));

  await test("GET /api/dashboard → trả đúng cấu trúc", async () => {
    const { res, data } = await api("/api/dashboard");
    assert(res.status === 200, `status=${res.status}`);
    assert(typeof data.repairOrdersCount === "number", "repairOrdersCount phải là number");
    assert(typeof data.productsCount === "number", "productsCount phải là number");
  });

  await test("GET /api/reports → báo cáo đầy đủ", async () => {
    const { res, data } = await api("/api/reports");
    assert(res.status === 200, `status=${res.status}`);
    assert(typeof data.summary === "object", "summary phải là object");
    assert(Array.isArray(data.monthlyRevenue), "monthlyRevenue phải là array");
    assert(Array.isArray(data.topProducts), "topProducts phải là array");
    assert(Array.isArray(data.recentOrders), "recentOrders phải là array");
  });

  await test("GET /api/search?q=test → global search", async () => {
    const { res, data } = await api("/api/search?q=test");
    assert(res.status === 200, `status=${res.status}`);
    assert(typeof data === "object", "phải trả về object kết quả");
  });
}

// ─── INVOICE ENDPOINT ───────────────────────────────────
async function runInvoiceTests() {
  console.log(c.head("INVOICE — Hóa đơn"));

  await test("GET /api/workshop/[id] với RO có sẵn → đủ fields cho invoice", async () => {
    const { data: list } = await api("/api/workshop");
    const ros = list.repairOrders || [];
    if (ros.length === 0) { console.log("   ⚠️  Không có RO để test invoice"); return; }
    const { res, data } = await api(`/api/workshop/${ros[0].id}`);
    assert(res.status === 200, `status=${res.status}`);
    assert("customer" in data, "phải có customer");
    assert("items" in data, "phải có items");
    assert("branch" in data, "phải có branch");
    assert("laborCost" in data, "phải có laborCost");
    assert("totalAmount" in data, "phải có totalAmount");
  });
}

// ─── MAIN ───────────────────────────────────────────────
async function main() {
  console.log("\x1b[1m\n🚀 AUTO-SMART API Test Suite\x1b[0m");
  console.log(`   Target: ${BASE}`);
  console.log(`   Time: ${new Date().toLocaleString("vi-VN")}\n`);

  await runAuthTests();
  await runBranchTests();
  await runUserTests();
  await runInventoryTests();
  await runCrmTests();
  await runWorkshopTests();
  await runTechnicianTests();
  await runSalesTests();
  await runConfigTests();
  await runBranchIsolationTests();
  await runDashboardTests();
  await runInvoiceTests();

  const total = passed + failed;
  console.log(`\n${"─".repeat(50)}`);
  console.log(`\x1b[1mKẾT QUẢ: ${passed}/${total} tests passed\x1b[0m`);
  if (failed > 0) {
    console.log(`\x1b[31m         ${failed} tests FAILED\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m         Tất cả tests PASSED ✅\x1b[0m`);
  }
}

main().catch((e) => {
  console.error("\x1b[31mTest runner crashed:", e.message, "\x1b[0m");
  process.exit(1);
});
