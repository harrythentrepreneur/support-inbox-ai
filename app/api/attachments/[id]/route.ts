import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const attachment = await prisma.attachment.findUnique({
        where: { id },
    });

    if (!attachment) {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(attachment.data), {
        headers: {
            "Content-Type": attachment.content_type,
            "Content-Disposition": `inline; filename="${attachment.filename}"`,
            "Cache-Control": "public, max-age=86400",
        },
    });
}
