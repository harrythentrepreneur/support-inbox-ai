import { prisma } from "@/lib/prisma";
import { mapStatusToGithub } from "@/lib/github";
import { NextRequest, NextResponse } from "next/server";

/**
 * Repo mapping for target_repos classification.
 * Maps short names ("core", "web") to full GitHub repo identifiers.
 */
const TARGET_REPO_MAP: Record<string, { full: string; label: string }> = {
    core: {
        full: process.env.GH_REPO_CORE || "your-org/core",
        label: "area:core",
    },
    web: {
        full: process.env.GH_REPO_WEB || "your-org/web",
        label: "area:web",
    },
};

/**
 * Create a GitHub issue in the softwaresupport repo.
 * The issue is labeled with area:core / area:web based on the AI classification
 * so that simili-bot can transfer it to the correct repo.
 */
export async function POST(req: NextRequest) {
    const ghToken = process.env.GH_PAT;
    const ghRepo = process.env.GH_REPO; // e.g. "owner/repo"

    if (!ghToken || !ghRepo) {
        return NextResponse.json(
            { error: "GH_PAT and GH_REPO must be set in environment variables" },
            { status: 500 }
        );
    }

    try {
        const { issueId } = await req.json();

        if (!issueId) {
            return NextResponse.json(
                { error: "issueId is required" },
                { status: 400 }
            );
        }

        // Fetch the issue from the database
        const issue = await prisma.issue.findUnique({
            where: { id: issueId },
            include: {
                ticket: {
                    select: {
                        subject: true,
                        customer_email: true,
                    },
                },
            },
        });

        if (!issue) {
            return NextResponse.json(
                { error: "Issue not found" },
                { status: 404 }
            );
        }

        // If already pushed to GitHub, return the existing URL
        if (issue.github_issue_url) {
            return NextResponse.json({
                html_url: issue.github_issue_url,
                number: issue.github_issue_number,
                already_exists: true,
            });
        }

        // Build a well-formatted Markdown body
        const bodyParts: string[] = [];

        bodyParts.push(`## Problem Summary\n\n${issue.problem_summary}`);

        if (issue.why_it_matters) {
            bodyParts.push(`## Why It Matters\n\n${issue.why_it_matters}`);
        }

        if (issue.fix_prompt) {
            bodyParts.push(`## Suggested Fix\n\n${issue.fix_prompt}`);
        }

        if (issue.ticket) {
            bodyParts.push(
                `## Linked Support Ticket\n\n` +
                `- **Subject:** ${issue.ticket.subject}\n` +
                `- **Customer:** ${issue.ticket.customer_email}`
            );
        }

        // Add target repo info for cross-referencing
        const targetRepos = issue.target_repos || [];
        if (targetRepos.length > 0) {
            const repoList = targetRepos
                .map((r: string) => TARGET_REPO_MAP[r]?.full || r)
                .join(", ");
            bodyParts.push(`## Target Repositories\n\n${repoList}`);
        }

        bodyParts.push(
            `---\n\n` +
            `> _This issue was auto-generated from the internal support dashboard._`
        );

        const markdownBody = bodyParts.join("\n\n");

        // Map status to GitHub labels + add area labels based on target_repos
        const { labels: statusLabels } = mapStatusToGithub(issue.status);
        const areaLabels = targetRepos
            .map((r: string) => TARGET_REPO_MAP[r]?.label)
            .filter(Boolean) as string[];
        const allLabels = [...statusLabels, ...areaLabels];

        // Create the GitHub issue via REST API
        const ghResponse = await fetch(
            `https://api.github.com/repos/${ghRepo}/issues`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${ghToken}`,
                    Accept: "application/vnd.github+json",
                    "Content-Type": "application/json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                body: JSON.stringify({
                    title: issue.title,
                    body: markdownBody,
                    labels: allLabels.length > 0 ? allLabels : undefined,
                }),
            }
        );

        if (!ghResponse.ok) {
            const errData = await ghResponse.json().catch(() => null);
            console.error("GitHub API error:", ghResponse.status, errData);
            return NextResponse.json(
                {
                    error: `GitHub API returned ${ghResponse.status}`,
                    details: errData,
                },
                { status: 502 }
            );
        }

        const ghIssue = await ghResponse.json();

        // Save GitHub issue number and URL back to the database
        await prisma.issue.update({
            where: { id: issueId },
            data: {
                github_issue_number: ghIssue.number,
                github_issue_url: ghIssue.html_url,
            },
        });

        // Also create a GithubIssueLink record for tracking
        await prisma.githubIssueLink.create({
            data: {
                issue_id: issueId,
                repo_name: "softwaresupport",
                repo_full: ghRepo,
                issue_number: ghIssue.number,
                issue_url: ghIssue.html_url,
            },
        });

        return NextResponse.json({
            html_url: ghIssue.html_url,
            number: ghIssue.number,
            target_repos: targetRepos,
        });
    } catch (error) {
        console.error("Failed to create GitHub issue:", error);
        return NextResponse.json(
            { error: "Failed to create GitHub issue" },
            { status: 500 }
        );
    }
}
