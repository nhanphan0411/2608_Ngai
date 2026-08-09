import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function middleware(req: NextRequest) {
  const isAdminPath =
    req.nextUrl.pathname.startsWith("/admin") ||
    req.nextUrl.pathname.startsWith("/api/admin");

  if (!isAdminPath) {
    return NextResponse.next();
  }

  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as Cloudflare.Env;

  const validUser = cfEnv.ADMIN_USER;
  const validPassword = cfEnv.ADMIN_PASSWORD;

  if (!validUser || !validPassword) {
    return new NextResponse("Admin credentials not configured on the server.", {
      status: 500,
    });
  }

  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    const encoded = authHeader.split(" ")[1] || "";
    const decoded = atob(encoded);
    const [user, pass] = decoded.split(":");

    if (user === validUser && pass === validPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin area"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};