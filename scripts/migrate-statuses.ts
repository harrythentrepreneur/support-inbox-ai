import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Migrate old ticket statuses to the new 5-status system:
 *   "Need Reply"           → "Open"
 *   "Waiting on Customer"  → "Pending"
 *   "Follow Up"            → "On Hold"
 *   "Bug / Technical Issue" → "Open"
 *   "Feature Request"      → "Open"
 *   "Done"                 → "Solved"
 *   "Spam"                 → "Spam" (unchanged)
 */
async function main() {
    const migrations: [string, string][] = [
        ["Need Reply", "Open"],
        ["Waiting on Customer", "Pending"],
        ["Follow Up", "On Hold"],
        ["Bug / Technical Issue", "Open"],
        ["Feature Request", "Open"],
        ["Done", "Solved"],
    ];

    for (const [oldStatus, newStatus] of migrations) {
        const result = await prisma.ticket.updateMany({
            where: { status: oldStatus },
            data: { status: newStatus },
        });
        if (result.count > 0) {
            console.log(`  ✅ "${oldStatus}" → "${newStatus}": ${result.count} ticket(s)`);
        }
    }

    console.log("\n✅ Status migration complete!");
}

main()
    .catch((e) => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
