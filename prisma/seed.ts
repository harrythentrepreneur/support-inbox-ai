import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // Create workspace
    const workspace = await prisma.workspace.upsert({
        where: { id: "ws_default" },
        update: {},
        create: {
            id: "ws_default",
            name: "Support Team",
        },
    });

    // Create users
    await prisma.user.upsert({
        where: { email: "admin@support.app" },
        update: {},
        create: {
            id: "u_admin",
            name: "Admin",
            email: "admin@support.app",
            passwordHash: "password123",
            workspace_id: workspace.id,
        },
    });

    await prisma.user.upsert({
        where: { email: "teammate@support.app" },
        update: {},
        create: {
            id: "u_teammate",
            name: "Teammate",
            email: "teammate@support.app",
            passwordHash: "password123",
            workspace_id: workspace.id,
        },
    });

    // Create tickets with messages
    const ticket1 = await prisma.ticket.upsert({
        where: { id: "t_1" },
        update: {},
        create: {
            id: "t_1",
            workspace_id: workspace.id,
            subject: "Cannot login to my account",
            status: "Need Reply",
            customer_email: "alice@example.com",
            summary_text:
                "Customer cannot log in. Password reset link is showing as expired. Requesting urgent access to download an invoice.",
        },
    });

    await prisma.message.upsert({
        where: { id: "m_1" },
        update: {},
        create: {
            id: "m_1",
            ticket_id: ticket1.id,
            sender_name: "Alice Smith",
            body_text:
                "Hi team,\n\nI tried resetting my password but the link says expired. I really need to get into my account today to download my invoice. Can you help?\n\nThanks,\nAlice",
            direction: "inbound",
        },
    });

    const ticket2 = await prisma.ticket.upsert({
        where: { id: "t_2" },
        update: {},
        create: {
            id: "t_2",
            workspace_id: workspace.id,
            subject: "Feature request: Dark mode",
            status: "Waiting on Customer",
            customer_email: "bob@jones.co",
            summary_text:
                "Customer is requesting a dark mode feature due to eye strain.",
        },
    });

    await prisma.message.upsert({
        where: { id: "m_2" },
        update: {},
        create: {
            id: "m_2",
            ticket_id: ticket2.id,
            sender_name: "Bob Jones",
            body_text:
                "Just wondering if you have plans to add dark mode? My eyes hurt when I use the app at night.",
            direction: "inbound",
        },
    });

    await prisma.message.upsert({
        where: { id: "m_3" },
        update: {},
        create: {
            id: "m_3",
            ticket_id: ticket2.id,
            sender_name: "Support",
            body_text:
                "Hi Bob,\n\nThanks for reaching out! We are currently tracking this request. Could you let us know if you use the web app or mobile app more often?\n\nBest,\nSupport Team",
            direction: "outbound",
        },
    });

    const ticket3 = await prisma.ticket.upsert({
        where: { id: "t_3" },
        update: {},
        create: {
            id: "t_3",
            workspace_id: workspace.id,
            subject: "Billing Issue - Double charged",
            status: "Need Reply",
            customer_email: "charlie@davis.inc",
            summary_text:
                "Customer reports being charged twice ($29 x 2) for the Pro plan and is requesting a refund for the duplicate charge.",
        },
    });

    await prisma.message.upsert({
        where: { id: "m_4" },
        update: {},
        create: {
            id: "m_4",
            ticket_id: ticket3.id,
            sender_name: "Charlie Davis",
            body_text:
                "Hello, I looked at my bank statement and saw two charges of $29 for the Pro plan on March 1st. Please refund the duplicate.",
            direction: "inbound",
        },
    });

    // Create issues
    await prisma.issue.upsert({
        where: { id: "iss_1" },
        update: {},
        create: {
            id: "iss_1",
            workspace_id: workspace.id,
            ticket_id: ticket1.id,
            title: "Password reset links expiring early",
            problem_summary:
                "Users report password reset links are showing as expired immediately after requesting them.",
            why_it_matters:
                "Customers are locked out of their accounts, impacting trust and activation.",
            fix_prompt:
                "Investigate token expiry settings in the auth service. Ensure reset links remain valid for at least 60 minutes.",
            status: "Backlog",
        },
    });

    await prisma.issue.upsert({
        where: { id: "iss_2" },
        update: {},
        create: {
            id: "iss_2",
            workspace_id: workspace.id,
            ticket_id: ticket2.id,
            title: "Add Dark Mode",
            problem_summary:
                "Multiple users requesting dark mode for better night-time visibility and reduced eye strain.",
            why_it_matters:
                "Common accessibility and comfort feature. Users may churn if app is uncomfortable to use at night.",
            fix_prompt:
                "Implement a dark color scheme toggle using CSS variables or Tailwind dark mode. Persist user preference.",
            status: "Backlog",
        },
    });

    console.log("✅ Seed data created successfully");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
