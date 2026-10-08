import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, existingBody, to, subject, sendFrom } = body as {
            prompt?: string;
            existingBody?: string;
            to?: string;
            subject?: string;
            sendFrom?: string;
        };

        // Determine sign-off based on sending email
        const signOffName = (process.env.FOUNDER_EMAIL_PREFIX && sendFrom?.toLowerCase().includes(process.env.FOUNDER_EMAIL_PREFIX.toLowerCase()))
            ? (process.env.FOUNDER_SIGNOFF || "The Founder")
            : "Support Team";

        const hasExisting = existingBody && existingBody.trim().length > 0;
        const hasPrompt = prompt && prompt.trim().length > 0;

        if (!hasExisting && !hasPrompt) {
            return NextResponse.json(
                { error: "Provide a prompt or existing body text" },
                { status: 400 }
            );
        }

        let systemContent = `You are a helpful support agent assistant. You write outbound emails for a support team.

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
- Write a professional, friendly email
- Keep it concise but thorough
- Don't include subject lines or email headers
- Output just the email body text, ready to send
- Sign off as "${signOffName}"`;

        if (hasPrompt) {
            systemContent += `\n\nThe agent's instructions (FOLLOW THESE CLOSELY): ${prompt}`;
        }

        // Build user message with available context
        let userContent = "";

        if (to) userContent += `Recipient: ${to}\n`;
        if (subject) userContent += `Subject: ${subject}\n`;
        if (userContent) userContent += "\n";

        if (hasExisting) {
            userContent += `The agent has already written this draft:\n\n---\n${existingBody}\n---\n\n`;
            if (hasPrompt) {
                userContent += `Follow the agent's instructions using their draft as a starting point.`;
            } else {
                userContent += `Improve and polish this draft while keeping the agent's intent and key points.`;
            }
        } else {
            userContent += `Write a new outbound email based on the agent's instructions.`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-5-mini-2025-08-07",
            messages: [
                { role: "system", content: systemContent },
                { role: "user", content: userContent },
            ],
            max_completion_tokens: 4000,
        });

        const draft = completion.choices[0]?.message?.content || "Unable to generate draft.";

        return NextResponse.json({ draft });
    } catch (error) {
        console.error("Compose draft error:", error);
        const message = error instanceof Error ? error.message : "Failed to generate draft";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
