import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Migrate old issue statuses to the new 4-status system:
 *   "New"        → "Backlog"
 *   "Reviewed"   → "Backlog"
 *   "Planned"    → "Backlog"
 *   "In Progress"→ "In Progress" (unchanged)
 *   "Done"       → "Done" (unchanged)
 *   "Ignored"    → "Dismissed"
 */
async function main() {
    const migrations: [string, string][] = [
        ["New", "Backlog"],
        ["Reviewed", "Backlog"],
        ["Planned", "Backlog"],
        ["Ignored", "Dismissed"],
    ];

    for (const [oldStatus, newStatus] of migrations) {
        const result = await prisma.issue.updateMany({
            where: { status: oldStatus },
            data: { status: newStatus },
        });
        if (result.count > 0) {
            console.log(`  ✅ "${oldStatus}" → "${newStatus}": ${result.count} issue(s)`);
        }
    }

    console.log("\n✅ Issue status migration complete!");
}

main()
    .catch((e) => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
