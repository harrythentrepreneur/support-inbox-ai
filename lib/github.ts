/**
 * Shared helpers for GitHub REST API interactions
 */

interface GithubConfig {
    token: string;
    repo: string; // "owner/repo"
}

function getGithubConfig(): GithubConfig {
    const token = process.env.GH_PAT;
    const repo = process.env.GH_REPO;
    if (!token || !repo) {
        throw new Error("GH_PAT and GH_REPO must be set in environment variables");
    }
    return { token, repo };
}

/**
 * Map internal issue status to GitHub state + labels
 */
export function mapStatusToGithub(status: string): { state: "open" | "closed"; labels: string[] } {
    switch (status) {
        case "Done":
            return { state: "closed", labels: [] };
        case "Dismissed":
            return { state: "closed", labels: ["wontfix"] };
        case "In Progress":
            return { state: "open", labels: ["in progress"] };
        case "Backlog":
        default:
            return { state: "open", labels: ["backlog"] };
    }
}

/**
 * Update a GitHub issue's state (open/closed) and labels
 */
export async function updateGithubIssue(
    issueNumber: number,
    status: string
): Promise<void> {
    const { token, repo } = getGithubConfig();
    const { state, labels } = mapStatusToGithub(status);

    const response = await fetch(
        `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify({
                state,
                labels,
            }),
        }
    );

    if (!response.ok) {
        const errData = await response.json().catch(() => null);
        console.error("GitHub API error updating issue:", response.status, errData);
        throw new Error(`GitHub API returned ${response.status}`);
    }
}
