import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  for (const cookieName of [
    "user_id",
    "user_role",
    "allowed_branches",
    "active_branch_id",
  ]) {
    response.cookies.set(cookieName, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: cookieName === "user_id" || cookieName === "allowed_branches",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
