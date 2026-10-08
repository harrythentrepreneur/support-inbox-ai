import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Get all tickets that have at least one outbound message
        const tickets = await prisma.ticket.findMany({
            where: {
                messages: {
                    some: { direction: "outbound" },
                },
            },
            include: {
                messages: {
                    where: { direction: "outbound" },
                    orderBy: { sent_at: "desc" },
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
            },
            orderBy: { latest_message_at: "desc" },
        });

        // Flatten to a list of sent messages with ticket context
        const sentMessages = tickets.flatMap((ticket) =>
            ticket.messages.map((msg) => ({
                ...msg,
                ticket: {
                    id: ticket.id,
                    subject: ticket.subject,
                    customer_email: ticket.customer_email,
                    mailbox: ticket.mailbox,
                    status: ticket.status,
                },
            }))
        );

        // Sort by sent_at descending
        sentMessages.sort(
            (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        );

        return NextResponse.json(sentMessages);
    } catch (error) {
        console.error("Failed to fetch sent messages:", error);
        return NextResponse.json(
            { error: "Failed to fetch sent messages" },
            { status: 500 }
        );
    }
}
