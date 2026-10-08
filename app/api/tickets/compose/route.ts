import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-send";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const to = formData.get("to") as string;
        const subject = formData.get("subject") as string;
        const bodyText = formData.get("body_text") as string;
        const sendFrom = formData.get("send_from") as string;

        if (!to || !subject || !bodyText || !sendFrom) {
            return NextResponse.json(
                { error: "Missing required fields: to, subject, body_text, send_from" },
                { status: 400 }
            );
        }

        // Collect file attachments
        const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
        for (const [key, value] of formData.entries()) {
            if (key === "files" && value instanceof File) {
                const buffer = Buffer.from(await value.arrayBuffer());
                attachments.push({
                    filename: value.name,
                    content: buffer,
                    contentType: value.type || "application/octet-stream",
                });
            }
        }

        // Send via SMTP
        await sendEmail({
            to,
            subject,
            text: bodyText,
            mailbox: sendFrom,
            isNewEmail: true,
            attachments: attachments.length > 0 ? attachments : undefined,
        });

        // Create ticket + message in DB
        const ticket = await prisma.ticket.create({
            data: {
                workspace_id: "ws_default",
                subject,
                status: "Pending",
                customer_email: to,
                mailbox: sendFrom,
                latest_message_at: new Date(),
                messages: {
                    create: {
                        sender_name: "Support",
                        body_text: bodyText,
                        direction: "outbound",
                    },
                },
            },
            include: {
                messages: true,
            },
        });

        // Save file attachments to DB
        if (attachments.length > 0 && ticket.messages[0]) {
            for (const att of attachments) {
                await prisma.attachment.create({
                    data: {
                        message_id: ticket.messages[0].id,
                        filename: att.filename,
                        content_type: att.contentType,
                        data: new Uint8Array(att.content),
                        size: att.content.length,
                    },
                });
            }
        }

        return NextResponse.json({ success: true, ticket });
    } catch (error) {
        console.error("Compose error:", error);
        const message = error instanceof Error ? error.message : "Failed to compose email";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
