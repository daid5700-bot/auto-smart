"use client";
import { create } from "zustand";
import type { UserRole } from "@/config/rbac";

export interface Branch {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuth: boolean;
  branches: Branch[];
  activeBranch: Branch | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginAs: (role: UserRole) => Promise<void>;
  setActiveBranch: (branch: Branch) => void;
  logout: () => void;
  hydrate: () => void;
}

const ROLE_ACCOUNTS: Record<UserRole, { email: string; password: string }> = 
  process.env.NODE_ENV === "production"
    ? {
        ADMIN: { email: "", password: "" },
        WAREHOUSE: { email: "", password: "" },
        WORKSHOP: { email: "", password: "" },
        SALES: { email: "", password: "" },
      }
    : {
        ADMIN: { email: "admin@autosmart.vn", password: "admin123" },
        WAREHOUSE: { email: "kho@autosmart.vn", password: "kho123" },
        WORKSHOP: { email: "xuong@autosmart.vn", password: "xuong123" },
        SALES: { email: "sales@autosmart.vn", password: "sales123" },
      };

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuth: false,
  branches: [],
  activeBranch: null,

  login: async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      
      const user = data.user;
      const branches = data.branches || [];
      const activeBranch = branches.length === 1 ? branches[0] : null;

      set({ user, branches, activeBranch, isAuth: true });

      if (typeof window !== "undefined") {
        localStorage.setItem("user_session", JSON.stringify(user));
        localStorage.setItem("user_branches", JSON.stringify(branches));
        if (data.signedRole) localStorage.setItem("signed_role", data.signedRole);
        if (data.signedBranches) localStorage.setItem("signed_allowed_branches", data.signedBranches);

        // Ensure browser cookies are set with SameSite=Lax
        if (data.signedRole) {
          document.cookie = `user_role=${data.signedRole}; path=/; max-age=86400; SameSite=Lax`;
        }
        if (data.signedBranches) {
          document.cookie = `allowed_branches=${data.signedBranches}; path=/; max-age=86400; SameSite=Lax`;
        }

        if (activeBranch) {
          localStorage.setItem("active_branch", JSON.stringify(activeBranch));
          document.cookie = `active_branch_id=${activeBranch.id}; path=/; max-age=86400; SameSite=Lax`;
        } else {
          localStorage.removeItem("active_branch");
          document.cookie = "active_branch_id=; path=/; max-age=0; SameSite=Lax";
        }
      }
      return true;
    } catch {
      return false;
    }
  },

  loginAs: async (role) => {
    if (process.env.NODE_ENV === "production") return;
    const acc = ROLE_ACCOUNTS[role];
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(acc),
    });
    if (res.ok) {
      const data = await res.json();
      const user = data.user;
      const branches = data.branches || [];
      const activeBranch = branches.length === 1 ? branches[0] : null;

      set({ user, branches, activeBranch, isAuth: true });

      if (typeof window !== "undefined") {
        localStorage.setItem("user_session", JSON.stringify(user));
        localStorage.setItem("user_branches", JSON.stringify(branches));
        if (data.signedRole) localStorage.setItem("signed_role", data.signedRole);
        if (data.signedBranches) localStorage.setItem("signed_allowed_branches", data.signedBranches);

        if (data.signedRole) {
          document.cookie = `user_role=${data.signedRole}; path=/; max-age=86400; SameSite=Lax`;
        }
        if (data.signedBranches) {
          document.cookie = `allowed_branches=${data.signedBranches}; path=/; max-age=86400; SameSite=Lax`;
        }

        if (activeBranch) {
          localStorage.setItem("active_branch", JSON.stringify(activeBranch));
          document.cookie = `active_branch_id=${activeBranch.id}; path=/; max-age=86400; SameSite=Lax`;
        } else {
          localStorage.removeItem("active_branch");
          document.cookie = "active_branch_id=; path=/; max-age=0; SameSite=Lax";
        }
      }
    }
  },

  setActiveBranch: (branch: Branch) => {
    set({ activeBranch: branch });
    if (typeof window !== "undefined") {
      localStorage.setItem("active_branch", JSON.stringify(branch));
      document.cookie = `active_branch_id=${branch.id}; path=/; max-age=86400; SameSite=Lax`;
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_session");
      localStorage.removeItem("user_branches");
      localStorage.removeItem("active_branch");
      localStorage.removeItem("signed_role");
      localStorage.removeItem("signed_allowed_branches");
    }
    document.cookie = "user_role=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "allowed_branches=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "active_branch_id=; path=/; max-age=0; SameSite=Lax";
    set({ user: null, isAuth: false, branches: [], activeBranch: null });
  },

  hydrate: () => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user_session");
      const savedBranches = localStorage.getItem("user_branches");
      const savedActive = localStorage.getItem("active_branch");
      const signedRole = localStorage.getItem("signed_role");
      const signedAllowedBranches = localStorage.getItem("signed_allowed_branches");

      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          const branches = savedBranches ? JSON.parse(savedBranches) : [];
          let activeBranch = savedActive ? JSON.parse(savedActive) : null;

          // Re-write cookies if they disappeared from browser state
          if (signedRole) {
            document.cookie = `user_role=${signedRole}; path=/; max-age=86400; SameSite=Lax`;
          }
          if (signedAllowedBranches) {
            document.cookie = `allowed_branches=${signedAllowedBranches}; path=/; max-age=86400; SameSite=Lax`;
          }

          if (!activeBranch && branches.length === 1) {
            activeBranch = branches[0];
            localStorage.setItem("active_branch", JSON.stringify(activeBranch));
            document.cookie = `active_branch_id=${activeBranch.id}; path=/; max-age=86400; SameSite=Lax`;
          } else if (activeBranch) {
            document.cookie = `active_branch_id=${activeBranch.id}; path=/; max-age=86400; SameSite=Lax`;
          }

          set({ user, branches, activeBranch, isAuth: true });
        } catch {
          // ignore
        }
      }
    }
  },
}));
