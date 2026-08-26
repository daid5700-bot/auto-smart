/**
 * Tiện ích in nội dung một phần tử HTML (hóa đơn, phiếu xuất nhập kho, báo giá) qua iframe ẩn,
 * tự động loại bỏ Header và Footer mặc định của trình duyệt (URL website, ngày giờ in, số trang)
 * khi người dùng bấm Lưu file PDF hoặc In.
 */
export function printHtmlElement(elementId: string, docTitle: string = "Phiếu in") {
  if (typeof window === "undefined") return;

  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  // Tạo iframe ẩn để in riêng phần tử mà không làm hỏng DOM của React
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Thu thập styles từ trang hiện tại (Tailwind + custom CSS)
  const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
    .map((s) => s.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${docTitle}</title>
        ${styles}
        <style>
          @page {
            size: auto;
            margin: 0mm !important; /* Xóa bỏ toàn bộ URL chân trang và tiêu đề ngày tháng của trình duyệt */
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: Tahoma, Arial, "Noto Sans", sans-serif !important;
            font-variant-numeric: tabular-nums;
          }
          .print-wrapper {
            padding: 8mm 10mm;
            box-sizing: border-box;
            width: 100%;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print\\:hidden, button {
            display: none !important;
          }
          .print-code {
            font-family: "Courier New", Courier, monospace !important;
            font-variant-numeric: tabular-nums;
          }
          .print-numeric {
            font-family: Tahoma, Arial, "Noto Sans", sans-serif !important;
            font-variant-numeric: tabular-nums;
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${elem.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Đợi DOM iframe nạp xong style và font rồi gọi print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print error:", e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 300);
}
