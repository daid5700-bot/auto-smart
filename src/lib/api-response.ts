import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("Dữ liệu JSON không hợp lệ", 400, "INVALID_JSON");
  }
  return schema.parse(body);
}

export function validationResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Dữ liệu không hợp lệ",
      code: "VALIDATION_ERROR",
      fields: error.flatten().fieldErrors,
    },
    { status: 400 },
  );
}

export function handleApiError(
  error: unknown,
  context: string,
  fallbackMessage = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại.",
) {
  if (error instanceof ZodError) return validationResponse(error);
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  const requestId = crypto.randomUUID();
  console.error(`[${context}] requestId=${requestId}`, error);
  return NextResponse.json(
    { error: fallbackMessage, code: "INTERNAL_ERROR", requestId },
    { status: 500 },
  );
}
