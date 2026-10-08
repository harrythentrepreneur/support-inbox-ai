import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Email accounts (usernames only — never expose passwords)
        const emailAccounts = [];
        if (process.env.EMAIL_1_USER) {
            emailAccounts.push({
                email: process.env.EMAIL_1_USER,
                host: process.env.EMAIL_1_HOST || "mail.privateemail.com",
                imapPort: Number(process.env.EMAIL_1_PORT) || 993,
                smtpPort: Number(process.env.EMAIL_1_SMTP_PORT) || 587,
            });
        }
        if (process.env.EMAIL_2_USER) {
            emailAccounts.push({
                email: process.env.EMAIL_2_USER,
                host: process.env.EMAIL_2_HOST || "mail.privateemail.com",
                imapPort: Number(process.env.EMAIL_2_PORT) || 993,
                smtpPort: Number(process.env.EMAIL_2_SMTP_PORT) || 587,
            });
        }

        // AI config
        const openaiKey = process.env.OPENAI_API_KEY || "";
        const aiConfigured = openaiKey.length > 10;
        const aiKeyPreview = aiConfigured
            ? `${openaiKey.slice(0, 7)}...${openaiKey.slice(-4)}`
            : "Not configured";

        // Workspace stats
        const [ticketCount, messageCount, issueCount] = await Promise.all([
            prisma.ticket.count(),
            prisma.message.count(),
            prisma.issue.count(),
        ]);

        return NextResponse.json({
            emailAccounts,
            ai: {
                configured: aiConfigured,
                keyPreview: aiKeyPreview,
                model: "gpt-4o-mini",
            },
            stats: {
                tickets: ticketCount,
                messages: messageCount,
                issues: issueCount,
            },
        });
    } catch (error) {
        console.error("Settings API error:", error);
        return NextResponse.json(
            { error: "Failed to load settings" },
            { status: 500 }
        );
    }
}
