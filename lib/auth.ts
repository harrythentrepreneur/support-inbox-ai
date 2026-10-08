import { createHmac, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "support_auth";
const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET environment variable is required");
    return secret;
}

export function signToken(): string {
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
    const payload = `authenticated:${expiresAt}`;
    const signature = createHmac("sha256", getSecret())
        .update(payload)
        .digest("hex");
    return `${payload}.${signature}`;
}

export function verifyToken(token: string): boolean {
    try {
        const lastDot = token.lastIndexOf(".");
        if (lastDot === -1) return false;

        const payload = token.substring(0, lastDot);
        const signature = token.substring(lastDot + 1);

        // Verify signature
        const expectedSignature = createHmac("sha256", getSecret())
            .update(payload)
            .digest("hex");

        const sigBuffer = Buffer.from(signature, "hex");
        const expectedBuffer = Buffer.from(expectedSignature, "hex");

        if (sigBuffer.length !== expectedBuffer.length) return false;
        if (!timingSafeEqual(sigBuffer, expectedBuffer)) return false;

        // Check expiry
        const parts = payload.split(":");
        const expiresAt = parseInt(parts[1], 10);
        if (isNaN(expiresAt)) return false;
        if (Math.floor(Date.now() / 1000) > expiresAt) return false;

        return true;
    } catch {
        return false;
    }
}

export function checkPassword(input: string): boolean {
    const password = process.env.AUTH_PASSWORD;
    if (!password) throw new Error("AUTH_PASSWORD environment variable is required");

    // Constant-time comparison
    const inputBuffer = Buffer.from(input);
    const passwordBuffer = Buffer.from(password);

    if (inputBuffer.length !== passwordBuffer.length) return false;
    return timingSafeEqual(inputBuffer, passwordBuffer);
}
