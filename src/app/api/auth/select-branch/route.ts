import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { signData } from "@/lib/auth";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể chọn chi nhánh.";
}

/** Select and validate the active branch before client-side navigation. */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body: unknown = await req.json();
    const branchId =
      typeof body === "object" && body !== null && "branchId" in body
        ? Number((body as { branchId: unknown }).branchId)
        : NaN;

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return NextResponse.json(
        { error: "Chi nhánh được chọn không hợp lệ." },
        { status: 400 },
      );
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, isDeleted: false },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        logoUrl: true,
      },
    });
    if (!branch) {
      return NextResponse.json(
        { error: "Chi nhánh không tồn tại hoặc đã ngừng hoạt động." },
        { status: 404 },
      );
    }

    const assignments = await prisma.userBranch.findMany({
      where: {
        userId: auth.userId,
        branch: { isDeleted: false },
      },
      select: { branchId: true },
      orderBy: { branchId: "asc" },
    });
    const assignedBranchIds = assignments.map(({ branchId }) => branchId);

    if (auth.role !== "ADMIN") {
      if (!assignedBranchIds.includes(branchId)) {
        return NextResponse.json(
          { error: "Bạn không có quyền truy cập chi nhánh này." },
          { status: 403 },
        );
      }
    }

    const allowedBranches =
      auth.role === "ADMIN" && assignedBranchIds.length === 0
        ? "ALL"
        : assignedBranchIds.join(",");
    if (allowedBranches !== "ALL" && !assignedBranchIds.includes(branchId)) {
      // An administrator with explicit assignments must only use those.
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập chi nhánh này." },
        { status: 403 },
      );
    }

    const response = NextResponse.json({ branch });
    response.cookies.set("allowed_branches", await signData(allowedBranches), {
      path: "/",
      maxAge: 86400,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.set("active_branch_id", String(branch.id), {
      path: "/",
      maxAge: 86400,
      // Other in-app branch switchers update this same preference client-side.
      // Authorization remains enforced by the signed allowed_branches cookie in
      // proxy.ts, and this route validates the initial explicit selection.
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
