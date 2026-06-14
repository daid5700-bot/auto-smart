import { cookies } from "next/headers";

export function getActiveBranchId(): number | null {
  try {
    const cookieStore = cookies();
    const branchIdStr = cookieStore.get("active_branch_id")?.value;
    if (!branchIdStr) return null;
    const id = parseInt(branchIdStr, 10);
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}
