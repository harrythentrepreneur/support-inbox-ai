import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "support_auth";

// Paths that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/waitlist"]; 

// Exact paths that are public (not prefix-matched)
const PUBLIC_EXACT_PATHS = ["/"];

// Static file extensions and Next.js internals to skip
const SKIP_PREFIXES = ["/_next", "/favicon.ico"];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static assets and Next.js internals
    if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // Allow public paths (prefix match)
    if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Allow exact public paths
    if (PUBLIC_EXACT_PATHS.includes(pathname)) {
        return NextResponse.next();
    }

    // Check for auth cookie
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
        return redirectToLogin(request);
    }

    // Verify the token structure and expiry
    try {
        const lastDot = token.lastIndexOf(".");
        if (lastDot === -1) return redirectToLogin(request);

        const payload = token.substring(0, lastDot);
        const parts = payload.split(":");
        if (parts.length !== 2 || parts[0] !== "authenticated") {
            return redirectToLogin(request);
        }

        const expiresAt = parseInt(parts[1], 10);
        if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
            return redirectToLogin(request);
        }
    } catch {
        return redirectToLogin(request);
    }

    return NextResponse.next();
}

function redirectToLogin(request: NextRequest): NextResponse {
    // For API routes, return 401 instead of redirecting
    if (request.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: [
        // Match all paths except static files
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
