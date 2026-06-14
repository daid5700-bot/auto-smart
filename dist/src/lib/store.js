"use strict";
"use client";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = void 0;
var zustand_1 = require("zustand");
var ROLE_ACCOUNTS = {
    ADMIN: { email: "admin@autosmart.vn", password: "admin123" },
    WAREHOUSE: { email: "kho@autosmart.vn", password: "kho123" },
    WORKSHOP: { email: "xuong@autosmart.vn", password: "xuong123" },
    SALES: { email: "sales@autosmart.vn", password: "sales123" },
    CRM: { email: "cskh@autosmart.vn", password: "cskh123" },
};
exports.useAuth = (0, zustand_1.create)(function (set) { return ({
    user: null,
    isAuth: false,
    login: function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
        var res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/auth/login", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: email, password: password }),
                        })];
                case 1:
                    res = _b.sent();
                    if (!res.ok)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _b.sent();
                    set({ user: data.user, isAuth: true });
                    if (typeof window !== "undefined") {
                        localStorage.setItem("user_session", JSON.stringify(data.user));
                    }
                    document.cookie = "user_role=".concat(data.user.role, "; path=/; max-age=86400");
                    return [2 /*return*/, true];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    loginAs: function (role) { return __awaiter(void 0, void 0, void 0, function () {
        var acc, res, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    acc = ROLE_ACCOUNTS[role];
                    return [4 /*yield*/, fetch("/api/auth/login", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(acc),
                        })];
                case 1:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    set({ user: data.user, isAuth: true });
                    if (typeof window !== "undefined") {
                        localStorage.setItem("user_session", JSON.stringify(data.user));
                    }
                    document.cookie = "user_role=".concat(data.user.role, "; path=/; max-age=86400");
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); },
    logout: function () {
        if (typeof window !== "undefined") {
            localStorage.removeItem("user_session");
        }
        document.cookie = "user_role=; path=/; max-age=0";
        set({ user: null, isAuth: false });
    },
    hydrate: function () {
        if (typeof window !== "undefined") {
            var saved = localStorage.getItem("user_session");
            if (saved) {
                try {
                    var parsed = JSON.parse(saved);
                    set({ user: parsed, isAuth: true });
                }
                catch (_a) {
                    // ignore
                }
            }
        }
    },
}); });
