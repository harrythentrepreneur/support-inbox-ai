import { syncAllMailboxes } from "@/lib/email-sync";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const results = await syncAllMailboxes(50);
        return NextResponse.json({
            success: true,
            accounts: results,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
