import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
export async function middleware(req: NextRequest) {
  const t = req.cookies.get("token")?.value;
  const login = new URL("/login", req.url);
  if (!t) return NextResponse.redirect(login);
  try {
    const { payload } = await jwtVerify(t, new TextEncoder().encode(process.env.JWT_SECRET!));
    const p = req.nextUrl.pathname;
    if (payload.role === "employee") return /^\/(overtime|reimburse|profile)/.test(p) ? NextResponse.next() : NextResponse.redirect(new URL("/overtime", req.url));
    if (payload.role === "user" && /^\/(dashboard|assets|maintenance|users|finance|employees|payroll|withdrawals|stock-opname|overtime|reimburse)/.test(p)) return NextResponse.redirect(new URL("/catalog", req.url));
    if (payload.role === "finance" && !/^\/(finance|profile)/.test(p)) return NextResponse.redirect(new URL("/finance", req.url));
    if (payload.role === "staff" && /^\/finance/.test(p)) return NextResponse.redirect(new URL("/dashboard", req.url));
    if (payload.role !== "admin" && /^\/(users|employees|payroll|overtime|reimburse)/.test(p)) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  } catch { return NextResponse.redirect(login); }
}
export const config = { matcher: ["/dashboard/:path*", "/catalog/:path*", "/loans/:path*", "/purchases/:path*", "/overtime/:path*", "/reimburse/:path*", "/buy-checkout/:path*", "/assets/:path*", "/maintenance/:path*", "/users/:path*", "/finance/:path*", "/portal/:path*", "/profile/:path*", "/pay/:path*", "/checkout/:path*", "/employees/:path*", "/payroll/:path*", "/receipt/:path*", "/wallet/:path*", "/withdrawals/:path*", "/stock-opname/:path*"] };
