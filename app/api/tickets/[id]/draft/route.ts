import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: ticketId } = await params;

    let customPrompt: string | undefined;
    let existingText: string | undefined;
    let sendFrom: string | undefined;
    try {
        const body = await req.json();
        customPrompt = body.customPrompt;
        existingText = body.existingText;
        sendFrom = body.sendFrom;
    } catch {
        // No body or invalid JSON — that's fine, proceed without custom prompt
    }

    // Determine sign-off based on sending email
    const signOffName = (process.env.FOUNDER_EMAIL_PREFIX && sendFrom?.toLowerCase().includes(process.env.FOUNDER_EMAIL_PREFIX.toLowerCase()))
        ? (process.env.FOUNDER_SIGNOFF || "The Founder")
        : "Support Team";

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

    const hasExistingText = existingText && existingText.trim().length > 0;
    const hasCustomPrompt = customPrompt && customPrompt.trim().length > 0;

    // Build a flexible system prompt that prioritizes the agent's instructions
    let systemContent = `You are a helpful support agent assistant. You write email replies for a support team.

IMPORTANT: If the agent gives you specific instructions, ALWAYS follow them — they override any default behavior. Be flexible and do exactly what's asked.

Writing style (ALWAYS follow these):
- Write like a real human, not like AI. Sound natural and conversational.
- NEVER use em dashes (—). Use commas, periods, or just restructure the sentence.
- Avoid filler phrases like "I hope this email finds you well", "Thank you for reaching out", "I completely understand your frustration", "I'd be happy to help"
- Don't overuse exclamation marks. One max per email, if any.
- Don't start sentences with "I understand" or "I appreciate"
- Keep language simple and direct. No corporate buzzwords.
- Vary sentence length. Short sentences are fine.

Default behavior (only when no specific instructions are given):
- Write a professional, friendly reply to the customer
- Address their concern and suggest next steps
- Keep it concise but thorough
- Don't include subject lines or email headers
- Output just the email body text, ready to send
- Sign off as "${signOffName}"`;

    if (hasCustomPrompt) {
        systemContent += `\n\nThe agent's instructions (FOLLOW THESE CLOSELY): ${customPrompt}`;
    }

    // Build the user message with context
    let userContent = `Email thread for ticket "${ticket.subject}":\n\n${threadText}`;

    if (hasExistingText) {
        userContent += `\n\nThe agent has already written this draft:\n\n---\n${existingText}\n---\n\n`;
        if (hasCustomPrompt) {
            userContent += `Follow the agent's instructions using their draft as a starting point.`;
        } else {
            userContent += `Improve and polish this draft while keeping the agent's intent and key points.`;
        }
    } else {
        if (hasCustomPrompt) {
            userContent += `\n\nFollow the agent's instructions to write a reply.`;
        } else {
            userContent += `\n\nDraft a reply to the customer.`;
        }
    }

    const completion = await openai.chat.completions.create({
        model: "gpt-5-mini-2025-08-07",
        messages: [
            {
                role: "system",
                content: systemContent,
            },
            {
                role: "user",
                content: userContent,
            },
        ],
        max_completion_tokens: 4000,
    });

    const draft = completion.choices[0]?.message?.content || "Unable to generate draft.";

    return NextResponse.json({ draft });
}
