import { sendZaloZns } from "../src/lib/zalo";

async function testSendZns() {
  const phone = "0325459901";
  const templateId = "CRM_OIL_REMIND_002";
  const templateData = {
    customer_name: "Khách hàng Test",
    order_date: "23/06/2026",
    note: "Thay dầu máy định kỳ",
    point: "10",
    total_point: "100"
  };

  console.log("📤 Bắt đầu gọi hàm sendZaloZns...");
  const result = await sendZaloZns(phone, templateId, templateData);
  console.log("📥 Kết quả trả về từ sendZaloZns:", JSON.stringify(result, null, 2));
}

testSendZns();
