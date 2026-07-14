import { NextResponse } from "next/server";

export async function withApiHandler<T>(
  handler: () => Promise<T>,
  errorMessage = "服务器错误"
) {
  try {
    return await handler();
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function parseJsonResponse<T>(res: Response, fallback: T): Promise<T> {
  if (!res.ok) return fallback;
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
