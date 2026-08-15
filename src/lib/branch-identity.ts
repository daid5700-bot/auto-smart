/**
 * Stable branch identities shared by client and server.
 *
 * Names are editable business data, therefore brand-specific behavior must
 * never be determined from a branch name or code.
 */
export const BRANCH_ID = {
  VINFAST_TOAN_THANG: 3,
  YAMAHA_TOAN_THANG: 4,
} as const;

export function isVinFastBranchId(branchId: number | null | undefined) {
  return branchId === BRANCH_ID.VINFAST_TOAN_THANG;
}

export function isYamahaBranchId(branchId: number | null | undefined) {
  return branchId === BRANCH_ID.YAMAHA_TOAN_THANG;
}
