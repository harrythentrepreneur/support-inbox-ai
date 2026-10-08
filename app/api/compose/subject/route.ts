import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { bodyText, prompt } = body as {
            bodyText?: string;
            prompt?: string;
        };

        if (!bodyText || !bodyText.trim()) {
            return NextResponse.json(
                { error: "Email body text is required to generate a subject" },
                { status: 400 }
            );
        }

        const hasPrompt = prompt && prompt.trim().length > 0;

        let systemContent = `You generate concise, clear email subject lines.

Rules:
- Output ONLY the subject line text, nothing else
- Keep it under 10 words
- Be specific and descriptive, not generic
- No quotes around the subject
- Don't start with "Re:" or "Fwd:"
- Match the tone of the email body`;

        if (hasPrompt) {
            systemContent += `\n\nAdditional instructions: ${prompt}`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-5-mini-2025-08-07",
            messages: [
                { role: "system", content: systemContent },
                {
                    role: "user",
                    content: `Generate a subject line for this email:\n\n${bodyText}`,
                },
            ],
            max_completion_tokens: 100,
        });

        const subject = completion.choices[0]?.message?.content?.trim() || "No subject";

        return NextResponse.json({ subject });
    } catch (error) {
        console.error("Compose subject error:", error);
        const message = error instanceof Error ? error.message : "Failed to generate subject";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
