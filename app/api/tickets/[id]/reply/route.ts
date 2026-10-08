import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-send";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: ticketId } = await params;

    const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
    });

    if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Parse FormData (supports file uploads)
    const formData = await req.formData();
    const bodyText = formData.get("body_text") as string || "";
    const sendFrom = formData.get("send_from") as string || ticket.mailbox;
    const subject = formData.get("subject") as string || ticket.subject;

    // Collect file attachments
    const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
        if (key === "files" && value instanceof File) {
            files.push(value);
            const buffer = Buffer.from(await value.arrayBuffer());
            attachments.push({
                filename: value.name,
                content: buffer,
                contentType: value.type || "application/octet-stream",
            });
        }
    }

    // Send via SMTP
    try {
        await sendEmail({
            to: ticket.customer_email,
            subject: subject,
            text: bodyText,
            mailbox: sendFrom,
            attachments: attachments.length > 0 ? attachments : undefined,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to send email";
        console.error("SMTP send error:", message);
    }

    // Save message to DB
    const message = await prisma.message.create({
        data: {
            ticket_id: ticketId,
            sender_name: "Support",
            body_text: bodyText,
            direction: "outbound",
        },
    });

    // Save attachments to DB
    for (const att of attachments) {
        await prisma.attachment.create({
            data: {
                message_id: message.id,
                filename: att.filename,
                content_type: att.contentType,
                data: new Uint8Array(att.content),
                size: att.content.length,
            },
        });
    }

    // Update ticket subject if changed
    const updateData: Record<string, unknown> = {
        latest_message_at: new Date(),
        ...(ticket.status === "Open" ? { status: "Pending" } : {}),
    };
    if (subject !== ticket.subject) {
        updateData.subject = subject;
    }

    await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
    });

    return NextResponse.json(message);
}
