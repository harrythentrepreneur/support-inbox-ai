import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
            messages: { orderBy: { sent_at: "asc" } },
            issues: true,
        },
    });

    if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();

    const ticket = await prisma.ticket.update({
        where: { id },
        data: {
            status: body.status,
            summary_text: body.summary_text,
        },
        include: {
            messages: { orderBy: { sent_at: "asc" } },
            issues: true,
        },
    });

    return NextResponse.json(ticket);
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // Delete attachments on messages for this ticket
        await prisma.attachment.deleteMany({
            where: { message: { ticket_id: id } },
        });
        // Delete messages
        await prisma.message.deleteMany({ where: { ticket_id: id } });
        // Delete linked issues
        await prisma.issue.deleteMany({ where: { ticket_id: id } });
        // Delete the ticket
        await prisma.ticket.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete ticket:", error);
        return NextResponse.json(
            { error: "Failed to delete ticket" },
            { status: 500 }
        );
    }
}
