const BASE_URL = "http://localhost:3000";

async function verifyCrud() {
  console.log("⚡ BẮT ĐẦU KIỂM TRA CRUD QUA HTTP API CỦA AUTO-SMART DEV SERVER...");
  let successCount = 0;
  let failCount = 0;

  function logPass(msg: string) {
    successCount++;
    console.log(`✅ [THÀNH CÔNG] ${msg}`);
  }

  function logFail(msg: string, err: any) {
    failCount++;
    console.error(`❌ [THẤT BẠI] ${msg}`);
    console.error(`   Error details:`, err);
  }

  // 1. CRM Lead CRUD
  try {
    // POST (Create)
    const postRes = await fetch(`${BASE_URL}/api/crm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Khách Hàng Test CRUD API",
        phone: "0999888777",
        source: "WEBSITE",
        interest: "Test Model X",
        notes: "Ghi chú test CRUD",
      }),
    });
    if (!postRes.ok) throw new Error(`POST /api/crm returned status ${postRes.status}`);
    const postData = await postRes.json() as any;
    const createdId = postData.id;
    logPass(`Tạo Lead mới thành công qua POST /api/crm (ID: ${createdId})`);

    // PATCH (Update)
    const patchRes = await fetch(`${BASE_URL}/api/crm/${createdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interest: "Test Model Y",
        status: "POTENTIAL",
      }),
    });
    if (!patchRes.ok) throw new Error(`PATCH /api/crm/${createdId} returned status ${patchRes.status}`);
    logPass(`Cập nhật Lead thành công qua PATCH /api/crm/[id]`);

    // DELETE (Delete)
    const delRes = await fetch(`${BASE_URL}/api/crm/${createdId}`, {
      method: "DELETE",
    });
    if (!delRes.ok) throw new Error(`DELETE /api/crm/${createdId} returned status ${delRes.status}`);
    logPass(`Xóa Lead thành công qua DELETE /api/crm/[id]`);
  } catch (e) {
    logFail("Quy trình CRUD CRM Lead", e);
  }

  // 1b. CRM Customer CRUD
  try {
    // POST (Create)
    const postRes = await fetch(`${BASE_URL}/api/crm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "customer",
        name: "Khách Hàng VIP Test CRUD",
        phone: "0988777666",
        source: "REFERRAL",
        email: "testcustomer@autosmart.vn",
        address: "456 Lạc Long Quân, Hà Nội",
        tags: "VIP, Test",
      }),
    });
    if (!postRes.ok) throw new Error(`POST /api/crm (customer) returned status ${postRes.status}`);
    const postData = await postRes.json() as any;
    const createdId = postData.id;
    logPass(`Tạo Khách hàng mới thành công qua POST /api/crm (ID: ${createdId})`);

    // PATCH (Update)
    const patchRes = await fetch(`${BASE_URL}/api/crm/${createdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "customer",
        address: "789 Lạc Long Quân, Hà Nội",
        tags: "VIP, Active, Test",
      }),
    });
    if (!patchRes.ok) throw new Error(`PATCH /api/crm/${createdId} (customer) returned status ${patchRes.status}`);
    logPass(`Cập nhật Khách hàng thành công qua PATCH /api/crm/[id]`);

    // DELETE (Delete)
    const delRes = await fetch(`${BASE_URL}/api/crm/${createdId}?type=customer`, {
      method: "DELETE",
    });
    if (!delRes.ok) throw new Error(`DELETE /api/crm/${createdId}?type=customer returned status ${delRes.status}`);
    logPass(`Xóa Khách hàng thành công qua DELETE /api/crm/[id]`);
  } catch (e) {
    logFail("Quy trình CRUD Khách hàng", e);
  }

  // 2. Vehicle Sales CRUD
  try {
    // POST (Create)
    const postRes = await fetch(`${BASE_URL}/api/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vin: "VIN-TEST-CRUD-1234",
        model: "VinFast VF9",
        variant: "Plus",
        color: "Đen",
        year: 2026,
        listPrice: 1500000000,
        floorPrice: 1400000000,
        status: "AVAILABLE",
      }),
    });
    if (!postRes.ok) throw new Error(`POST /api/sales returned status ${postRes.status}`);
    const postData = await postRes.json() as any;
    const createdId = postData.id;
    logPass(`Tạo Xe mới thành công qua POST /api/sales (ID: ${createdId})`);

    // PATCH (Update)
    const patchRes = await fetch(`${BASE_URL}/api/sales/${createdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "RESERVED",
      }),
    });
    if (!patchRes.ok) throw new Error(`PATCH /api/sales/${createdId} returned status ${patchRes.status}`);
    logPass(`Cập nhật Xe thành công qua PATCH /api/sales/[id]`);

    // DELETE (Delete)
    const delRes = await fetch(`${BASE_URL}/api/sales/${createdId}`, {
      method: "DELETE",
    });
    if (!delRes.ok) throw new Error(`DELETE /api/sales/${createdId} returned status ${delRes.status}`);
    logPass(`Xóa Xe thành công qua DELETE /api/sales/[id]`);
  } catch (e) {
    logFail("Quy trình CRUD Xe Bán", e);
  }

  // 3. Technician CRUD
  try {
    // POST (Create)
    const postRes = await fetch(`${BASE_URL}/api/technicians`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "KTV-CRUD",
        name: "Thợ Test CRUD",
        phone: "0999111222",
        commissionRate: 15,
      }),
    });
    if (!postRes.ok) throw new Error(`POST /api/technicians returned status ${postRes.status}`);
    const postData = await postRes.json() as any;
    const createdId = postData.id;
    logPass(`Tạo KTV mới thành công qua POST /api/technicians (ID: ${createdId})`);

    // PATCH (Update)
    const patchRes = await fetch(`${BASE_URL}/api/technicians/${createdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "WORKING",
      }),
    });
    if (!patchRes.ok) throw new Error(`PATCH /api/technicians/${createdId} returned status ${patchRes.status}`);
    logPass(`Cập nhật KTV thành công qua PATCH /api/technicians/[id]`);

    // DELETE (Delete)
    const delRes = await fetch(`${BASE_URL}/api/technicians/${createdId}`, {
      method: "DELETE",
    });
    if (!delRes.ok) throw new Error(`DELETE /api/technicians/${createdId} returned status ${delRes.status}`);
    logPass(`Xóa KTV thành công qua DELETE /api/technicians/[id]`);
  } catch (e) {
    logFail("Quy trình CRUD Kỹ thuật viên", e);
  }

  // 4. Workshop Repair Order CRUD
  try {
    // Lấy khách hàng có sẵn từ database
    const cRes = await fetch(`${BASE_URL}/api/crm?tab=customers`);
    if (!cRes.ok) throw new Error(`GET /api/crm?tab=customers returned status ${cRes.status}`);
    const cData = await cRes.json() as any;
    if (!cData.customers || cData.customers.length === 0) {
      throw new Error("Không tìm thấy khách hàng nào trong database để test Workshop CRUD");
    }
    const customerId = cData.customers[0].id;

    // POST (Create)
    const postRes = await fetch(`${BASE_URL}/api/workshop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        plateNumber: "29A-CRUD.12",
        vehicleModel: "Mazda CX-5",
        kmIn: 12000,
        symptoms: "Lệch lái nhẹ",
        laborCost: 300000,
      }),
    });
    if (!postRes.ok) throw new Error(`POST /api/workshop returned status ${postRes.status}`);
    const postData = await postRes.json() as any;
    const createdId = postData.id;
    logPass(`Tạo Lệnh sửa chữa thành công qua POST /api/workshop (ID: ${createdId})`);

    // PATCH (Update)
    const patchRes = await fetch(`${BASE_URL}/api/workshop/${createdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
      }),
    });
    if (!patchRes.ok) throw new Error(`PATCH /api/workshop/${createdId} returned status ${patchRes.status}`);
    logPass(`Cập nhật Lệnh sửa chữa thành công qua PATCH /api/workshop/[id]`);

    // DELETE (Delete)
    const delRes = await fetch(`${BASE_URL}/api/workshop/${createdId}`, {
      method: "DELETE",
    });
    if (!delRes.ok) throw new Error(`DELETE /api/workshop/${createdId} returned status ${delRes.status}`);
    logPass(`Xóa Lệnh sửa chữa thành công qua DELETE /api/workshop/[id]`);
  } catch (e) {
    logFail("Quy trình CRUD Lệnh sửa chữa", e);
  }

  // 5. System User CRUD
  try {
    // POST (Create)
    const postRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Nhân Viên Test CRUD API",
        email: "apicruduser@autosmart.vn",
        password: "securepassword123",
        role: "SALES",
      }),
    });
    if (!postRes.ok) throw new Error(`POST /api/users returned status ${postRes.status}`);
    const postData = await postRes.json() as any;
    const createdId = postData.id;
    logPass(`Tạo Người dùng mới thành công qua POST /api/users (ID: ${createdId})`);

    // PATCH (Update)
    const patchRes = await fetch(`${BASE_URL}/api/users/${createdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Nhân Viên Test CRUD API (Updated)",
        role: "WAREHOUSE",
      }),
    });
    if (!patchRes.ok) throw new Error(`PATCH /api/users/${createdId} returned status ${patchRes.status}`);
    logPass(`Cập nhật Người dùng thành công qua PATCH /api/users/[id]`);

    // DELETE (Delete)
    const delRes = await fetch(`${BASE_URL}/api/users/${createdId}`, {
      method: "DELETE",
    });
    if (!delRes.ok) throw new Error(`DELETE /api/users/${createdId} returned status ${delRes.status}`);
    logPass(`Xóa Người dùng thành công qua DELETE /api/users/[id]`);
  } catch (e) {
    logFail("Quy trình CRUD Người dùng hệ thống", e);
  }

  console.log(`\n🎉 HOÀN THÀNH: Đã kiểm tra xong! ${successCount} Pass, ${failCount} Fail.`);
}

verifyCrud();
