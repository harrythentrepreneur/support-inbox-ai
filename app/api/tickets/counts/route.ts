import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const groups = await prisma.ticket.groupBy({
            by: ["status"],
            _count: { id: true },
        });

        const counts: Record<string, number> = {};
        for (const g of groups) {
            counts[g.status] = g._count.id;
        }

        return NextResponse.json(counts);
    } catch (error) {
        console.error("Failed to fetch ticket counts:", error);
        return NextResponse.json(
            { error: "Failed to fetch ticket counts" },
            { status: 500 }
        );
    }
}
