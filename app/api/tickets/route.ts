import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");

        const where: Record<string, unknown> = {};
        if (status) where.status = status;

        const tickets = await prisma.ticket.findMany({
            where,
            include: {
                messages: {
                    orderBy: { sent_at: "asc" },
                    include: {
                        attachments: {
                            select: {
                                id: true,
                                filename: true,
                                content_type: true,
                                size: true,
                            },
                        },
                    },
                },
                issues: true,
            },
            orderBy: { latest_message_at: "desc" },
        });

        return NextResponse.json(tickets);
    } catch (error) {
        console.error("Failed to fetch tickets:", error);
        return NextResponse.json(
            { error: "Failed to fetch tickets" },
            { status: 500 }
        );
    }
}
