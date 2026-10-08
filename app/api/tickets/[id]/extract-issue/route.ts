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
                content: `You are a senior product engineer reviewing customer support emails for ${process.env.PRODUCT_NAME || "our product"}. Your job is to extract product issues and convert them into comprehensive, developer-ready issue cards.

PRODUCT ARCHITECTURE — Use this to classify issues:
${process.env.PRODUCT_ARCHITECTURE || `**core** (backend): APIs, background jobs, data processing, generation pipelines, integrations.
- TYPICAL ISSUES: API errors, failed jobs, wrong output, slow processing, crashes, timeouts

**web** (frontend): dashboard, editors, billing/subscriptions UI, authentication, page layout.
- TYPICAL ISSUES: UI bugs, pages not loading, broken buttons, checkout/payment failures, login problems, mobile layout`}

When an issue clearly requires changes in BOTH repos (e.g., "images are wrong AND the preview doesn't show them"), set target_repos to ["core", "web"].

IMPORTANT: Preserve ALL useful technical details from the customer's message. Do NOT summarize away important context. The "problem_summary" should be thorough and include:
- Exact steps the customer described
- Error messages, screenshots references, or specific behaviors they mentioned
- Environment details (browser, device, OS) if mentioned
- Frequency of the issue
- Any workarounds they tried

The "fix_prompt" should be a detailed, actionable prompt that a developer AI with full codebase access could use to investigate and fix the issue. It should include:
- What to look for in the codebase
- Which components/services/files are likely involved
- Specific debugging steps
- The expected vs actual behavior
- Edge cases to consider
- Testing approach after the fix

Analyze this email thread and determine if it contains any of:
- Bug reports or technical failures
- UX confusion or friction
- Login/authentication issues
- Billing/payment problems
- Feature requests with specific use cases
- Performance issues
- Data integrity problems

If you detect an issue, respond with valid JSON in exactly this format:
{
  "detected": true,
  "title": "Clear, specific issue title",
  "target_repos": ["core"],
  "problem_summary": "Comprehensive description preserving ALL relevant details...",
  "why_it_matters": "Business impact: who is affected, how many users might hit this, what's the risk if not fixed...",
  "fix_prompt": "Detailed developer prompt..."
}

target_repos must be one of: ["core"], ["web"], or ["core", "web"].
- Use ["core"] for backend/generation/API/image/PDF issues
- Use ["web"] for frontend/UI/billing/auth/display issues
- Use ["core", "web"] when the fix clearly requires changes in both

If no actionable issue is detected (e.g. it's spam, a newsletter, or just a greeting), respond with:
{ "detected": false }

Respond ONLY with valid JSON, no markdown or extra text.`,
            },
            {
                role: "user",
                content: `Email thread for ticket "${ticket.subject}" from customer ${ticket.customer_email}:\n\n${threadText}`,
            },
        ],
        max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content || '{ "detected": false }';

    try {
        const result = JSON.parse(raw);

        if (result.detected) {
            // Determine target repos
            const targetRepos: string[] = result.target_repos || ["core"];

            // Check if issue already exists for this ticket
            const existing = await prisma.issue.findFirst({
                where: { ticket_id: ticketId },
            });

            if (existing) {
                // Update existing issue with richer content
                const updated = await prisma.issue.update({
                    where: { id: existing.id },
                    data: {
                        title: result.title,
                        problem_summary: result.problem_summary,
                        why_it_matters: result.why_it_matters || null,
                        fix_prompt: result.fix_prompt || null,
                        target_repos: targetRepos,
                    },
                    include: {
                        ticket: { select: { subject: true, customer_email: true } },
                    },
                });
                return NextResponse.json({
                    detected: true,
                    issue: updated,
                    message: "Issue updated with enriched content",
                });
            }

            const issue = await prisma.issue.create({
                data: {
                    workspace_id: "ws_default",
                    ticket_id: ticketId,
                    title: result.title,
                    problem_summary: result.problem_summary,
                    why_it_matters: result.why_it_matters || null,
                    fix_prompt: result.fix_prompt || null,
                    target_repos: targetRepos,
                    status: "Backlog",
                },
                include: {
                    ticket: { select: { subject: true, customer_email: true } },
                },
            });
            return NextResponse.json({ detected: true, issue });
        }

        return NextResponse.json({ detected: false });
    } catch {
        return NextResponse.json({ detected: false, error: "Failed to parse AI response" });
    }
}
