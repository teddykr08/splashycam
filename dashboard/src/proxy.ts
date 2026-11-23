import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PREVIEW_PASSWORD;
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!password) {
    return new NextResponse("Admin preview is awaiting password configuration.", { status: 503, headers });
  }

  const expected = "Basic " + Buffer.from("admin:" + password).toString("base64");
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(expected))) {
    return new NextResponse("Sign in to the admin preview.", {
      status: 401,
      headers: { ...headers, "WWW-Authenticate": 'Basic realm="Splashy Cam admin", charset="UTF-8"' },
    });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
