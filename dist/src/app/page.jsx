"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var store_1 = require("@/lib/store");
var rbac_1 = require("@/config/rbac");
function Home() {
    var router = (0, navigation_1.useRouter)();
    var _a = (0, store_1.useAuth)(), user = _a.user, isAuth = _a.isAuth, hydrate = _a.hydrate;
    var _b = (0, react_1.useState)(false), hydrated = _b[0], setHydrated = _b[1];
    (0, react_1.useEffect)(function () {
        hydrate();
        setHydrated(true);
    }, []);
    (0, react_1.useEffect)(function () {
        if (hydrated) {
            if (isAuth && user) {
                router.replace((0, rbac_1.getDefaultPath)(user.role));
            }
            else {
                router.replace("/login");
            }
        }
    }, [hydrated, isAuth, user, router]);
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full gradient-primary animate-pulse-glow"/></div>;
}
