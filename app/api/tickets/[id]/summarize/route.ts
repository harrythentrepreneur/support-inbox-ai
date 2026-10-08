import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: ticketId } = await params;

    const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { messages: { orderBy: { sent_at: "asc" } } },
    });

    if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const threadText = ticket.messages
        .map(
            (m) =>
                `[${m.direction === "inbound" ? "Customer" : "Support"}] ${m.sender_name}:\n${m.body_text}`
        )
        .join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You are a support inbox assistant. Summarize the following email thread in 2-3 concise sentences. Focus on:
1. What the customer is saying
2. What the current issue or request is
3. What action is likely needed

Be direct and actionable. Do not use fluff.`,
            },
            {
                role: "user",
                content: `Email thread for ticket "${ticket.subject}":\n\n${threadText}`,
            },
        ],
        max_tokens: 200,
    });

    const summary = completion.choices[0]?.message?.content || "Unable to generate summary.";

    // Save summary to ticket
    await prisma.ticket.update({
        where: { id: ticketId },
        data: { summary_text: summary },
    });

    return NextResponse.json({ summary });
}
