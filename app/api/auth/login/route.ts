import { NextRequest, NextResponse } from "next/server";
import { checkPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (!password || typeof password !== "string") {
            return NextResponse.json(
                { error: "Password is required" },
                { status: 400 }
            );
        }

        if (!checkPassword(password)) {
            return NextResponse.json(
                { error: "Invalid password" },
                { status: 401 }
            );
        }

        const token = signToken();
        const response = NextResponse.json({ success: true });

        response.cookies.set(AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return response;
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
