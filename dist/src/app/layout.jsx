"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
exports.metadata = {
    title: "AUTO-SMART CRM & ERP",
    description: "Hệ thống quản lý toàn diện cho đại lý và garage ô tô",
};
function RootLayout(_a) {
    var children = _a.children;
    return (<html lang="vi" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>);
}
