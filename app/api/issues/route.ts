import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const issues = await prisma.issue.findMany({
        include: {
            ticket: { select: { subject: true, customer_email: true } },
        },
        orderBy: { created_at: "desc" },
    });

    return NextResponse.json(issues);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (!body.title || !body.problem_summary) {
            return NextResponse.json(
                { error: "title and problem_summary are required" },
                { status: 400 }
            );
        }

        const issue = await prisma.issue.create({
            data: {
                workspace_id: "ws_default",
                ticket_id: body.ticket_id || null,
                title: body.title,
                problem_summary: body.problem_summary,
                why_it_matters: body.why_it_matters || null,
                fix_prompt: body.fix_prompt || null,
                status: body.status || "Backlog",
            },
            include: {
                ticket: { select: { subject: true, customer_email: true } },
            },
        });

        return NextResponse.json(issue, { status: 201 });
    } catch (error) {
        console.error("Failed to create issue:", error);
        return NextResponse.json(
            { error: "Failed to create issue" },
            { status: 500 }
        );
    }
}
