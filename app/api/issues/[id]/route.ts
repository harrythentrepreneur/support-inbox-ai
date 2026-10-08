import { prisma } from "@/lib/prisma";
import { updateGithubIssue } from "@/lib/github";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.title !== undefined) data.title = body.title;
    if (body.problem_summary !== undefined) data.problem_summary = body.problem_summary;
    if (body.why_it_matters !== undefined) data.why_it_matters = body.why_it_matters;
    if (body.fix_prompt !== undefined) data.fix_prompt = body.fix_prompt;
    if (body.priority_rank !== undefined) data.priority_rank = body.priority_rank;

    const issue = await prisma.issue.update({
        where: { id },
        data,
        include: {
            ticket: { select: { subject: true, customer_email: true } },
        },
    });

    // If status changed and issue is linked to GitHub, sync the state
    if (body.status !== undefined && issue.github_issue_number) {
        try {
            await updateGithubIssue(issue.github_issue_number, body.status);
        } catch (error) {
            console.error("Failed to sync status to GitHub:", error);
            // Don't fail the whole request — local update succeeded
        }
    }

    return NextResponse.json(issue);
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // If linked to GitHub, close the issue before deleting locally
        const issue = await prisma.issue.findUnique({ where: { id } });
        if (issue?.github_issue_number) {
            try {
                await updateGithubIssue(issue.github_issue_number, "Dismissed");
            } catch (error) {
                console.error("Failed to close GitHub issue on delete:", error);
            }
        }

        await prisma.issue.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete issue:", error);
        return NextResponse.json(
            { error: "Failed to delete issue" },
            { status: 500 }
        );
    }
}
