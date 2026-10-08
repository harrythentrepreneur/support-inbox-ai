import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { NextResponse } from "next/server";

export const maxDuration = 120; // allow up to 2 min for bulk processing

export async function POST() {
    // Find all tickets that have at least one issue
    const ticketsWithIssues = await prisma.ticket.findMany({
        where: { issues: { some: {} } },
        include: {
            messages: { orderBy: { sent_at: "asc" } },
            issues: true,
        },
    });

    const results: { ticketId: string; subject: string; status: string; issueId?: string }[] = [];

    for (const ticket of ticketsWithIssues) {
        try {
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
                        content: `You are a senior product engineer reviewing customer support emails. Your job is to extract product issues and convert them into comprehensive, developer-ready issue cards.

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
  "problem_summary": "Comprehensive description preserving ALL relevant details from the customer. Include exact quotes of error messages, steps to reproduce, environment info, and any other specifics they shared. This should be multiple paragraphs if the customer provided a lot of detail.",
  "why_it_matters": "Business impact: who is affected, how many users might hit this, what's the risk if not fixed (churn, revenue, trust, etc.)",
  "fix_prompt": "Detailed developer prompt. Example format:\\n\\n## Issue\\n[What's broken]\\n\\n## Customer Context\\n[Key details from the report]\\n\\n## Investigation Steps\\n1. [First thing to check]\\n2. [Second thing]\\n\\n## Likely Root Cause\\n[Your hypothesis]\\n\\n## Suggested Fix\\n[What to change]\\n\\n## Testing\\n[How to verify the fix works]"
}

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
            const result = JSON.parse(raw);

            if (result.detected) {
                // Update the first (or only) issue for this ticket
                const existingIssue = ticket.issues[0];
                const updated = await prisma.issue.update({
                    where: { id: existingIssue.id },
                    data: {
                        title: result.title,
                        problem_summary: result.problem_summary,
                        why_it_matters: result.why_it_matters || null,
                        fix_prompt: result.fix_prompt || null,
                    },
                });
                results.push({
                    ticketId: ticket.id,
                    subject: ticket.subject,
                    status: "updated",
                    issueId: updated.id,
                });
            } else {
                results.push({
                    ticketId: ticket.id,
                    subject: ticket.subject,
                    status: "no_issue_detected",
                });
            }
        } catch (err) {
            console.error(`Failed to re-extract issue for ticket ${ticket.id}:`, err);
            results.push({
                ticketId: ticket.id,
                subject: ticket.subject,
                status: "error",
            });
        }
    }

    return NextResponse.json({
        total: ticketsWithIssues.length,
        results,
    });
}
