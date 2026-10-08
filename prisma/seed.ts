// Demo data for Support Inbox AI.
// Every customer, company and message below is invented. Addresses use the
// reserved example.* and .test domains so nothing points at a real mailbox.
// "Fernway" is a made-up booking SaaS used as the demo product.
//
// Run with:  npx prisma db seed
// The script resets the demo workspace each time, and all timestamps are
// relative to "now" so the inbox always looks fresh.

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const WS = "ws_default";
const SUPPORT = "support@fernway.example";
const FOUNDER = "hello@fernway.example";

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

type Msg = { from: string; body: string; out?: boolean; at: number };
type TicketSeed = {
    id: string;
    subject: string;
    status: string;
    customer: string;
    mailbox: string;
    summary?: string;
    messages: Msg[];
};

const tickets: TicketSeed[] = [
    {
        id: "t_csv_export",
        subject: "CSV export stops at 1,000 rows",
        status: "Open",
        customer: "maya.chen@example.com",
        mailbox: SUPPORT,
        summary:
            "Maya's team exports bookings to CSV for payroll. Every export since Monday ends at exactly 1,000 rows, so about 340 bookings are missing. She needs a full export before Friday's pay run.",
        messages: [
            {
                from: "Maya Chen",
                at: 12,
                body:
                    "Hi Fernway team,\n\nOur bookings export has started cutting off at exactly 1,000 rows. We have 1,342 bookings this month and the CSV always ends at row 1,000, no error message. It worked fine last month.\n\nWe use this file for payroll, and the pay run is on Friday. Is there a way to get the full export before then?\n\nThanks,\nMaya\nOperations Lead, Larkspur Studios",
            },
        ],
    },
    {
        id: "t_calendar_dup",
        subject: "Google Calendar sync creating duplicate events",
        status: "Open",
        customer: "dev.patel@northwind.test",
        mailbox: SUPPORT,
        summary:
            "Since enabling two-way calendar sync, every booking shows up twice in Dev's calendar. Deleting one copy deletes both. Affects his whole team of six.",
        messages: [
            {
                from: "Dev Patel",
                at: 47,
                body:
                    "Hey,\n\nAfter turning on two-way Google Calendar sync, every new booking appears twice in my calendar. If I delete one, both disappear. Same for the other five people on my team.\n\nAny idea what's going on?\n\nDev",
            },
        ],
    },
    {
        id: "t_invoice_vat",
        subject: "Invoice is missing our VAT number",
        status: "Open",
        customer: "accounts@harbourline.test",
        mailbox: FOUNDER,
        summary:
            "Harbourline's finance team added their VAT number in billing settings, but the October invoice PDF doesn't show it. They need a corrected invoice to reclaim VAT.",
        messages: [
            {
                from: "Sofia Marin",
                at: 95,
                body:
                    "Hello,\n\nWe added our VAT number under Billing > Company details last week, but the October invoice PDF still doesn't include it. Our accountant can't process it without the number.\n\nCould you re-issue the invoice?\n\nKind regards,\nSofia Marin\nFinance, Harbourline Logistics",
            },
        ],
    },
    {
        id: "t_timezone",
        subject: "Reminder emails go out an hour early",
        status: "Open",
        customer: "j.okafor@example.org",
        mailbox: SUPPORT,
        summary:
            "Reminder emails arrive one hour early for clients in Europe/Lisbon since the clocks changed. Customer suspects a daylight saving bug.",
        messages: [
            {
                from: "James Okafor",
                at: 180,
                body:
                    "Hi there,\n\nSince the clocks changed on Sunday, our appointment reminders go out an hour early. Clients in Lisbon are getting the 24-hour reminder 25 hours before. Our account timezone is set to Europe/Lisbon.\n\nLooks like a daylight saving thing?\n\nJames",
            },
        ],
    },
    {
        id: "t_seats",
        subject: "Can we add 3 more seats mid-cycle?",
        status: "Open",
        customer: "priya@quillworks.test",
        mailbox: FOUNDER,
        summary:
            "Priya wants to add three seats to her annual plan part-way through the year and asks how proration works.",
        messages: [
            {
                from: "Priya Raman",
                at: 260,
                body:
                    "Hi,\n\nWe're hiring three new coordinators next week. Can we add three seats to our annual plan now, and how is that charged? Do we pay the full year or just the remaining months?\n\nThanks!\nPriya",
            },
        ],
    },
    {
        id: "t_mobile_login",
        subject: "Magic link opens the browser instead of the app",
        status: "Open",
        customer: "leo.brandt@example.net",
        mailbox: SUPPORT,
        summary:
            "On iOS, tapping the sign-in magic link opens Safari instead of the Fernway app, so the user ends up signed in on the web only.",
        messages: [
            {
                from: "Leo Brandt",
                at: 410,
                body:
                    "When I tap the login link in the email on my iPhone it opens Safari, not the Fernway app. I'm then logged in on the website but the app still asks me to sign in. iOS 18, app version 4.2.",
            },
        ],
    },
    {
        id: "t_widget_color",
        subject: "Booking widget ignores our brand colour",
        status: "Open",
        customer: "amara@saltandfern.test",
        mailbox: SUPPORT,
        messages: [
            {
                from: "Amara Lewis",
                at: 720,
                body:
                    "Hi! I set our brand colour to #0F766E in Settings > Widget, but the embedded booking widget on our site is still the default blue. Cleared cache, tried two browsers. Am I missing a step?\n\nAmara",
            },
        ],
    },
    {
        id: "t_api_rate",
        subject: "API returning 429 well under the documented limit",
        status: "Pending",
        customer: "tomasz@corvid.test",
        mailbox: SUPPORT,
        summary:
            "Corvid's integration gets HTTP 429 at roughly 40 requests per minute, below the documented 120/min. Support asked for request IDs and is waiting on the customer.",
        messages: [
            {
                from: "Tomasz Nowak",
                at: 1500,
                body:
                    "We're seeing 429 Too Many Requests at about 40 req/min on /v2/bookings. Your docs say 120/min. Is our key on a different tier?",
            },
            {
                from: "Support Team",
                out: true,
                at: 1380,
                body:
                    "Hi Tomasz,\n\nThanks for the detail. Your key is on the standard 120/min tier, so this shouldn't happen. Could you send two or three X-Request-Id values from the failing calls? That lets us trace them on our side.\n\nSupport Team",
            },
        ],
    },
    {
        id: "t_refund",
        subject: "Refund for accidental annual upgrade",
        status: "Pending",
        customer: "nina.k@example.com",
        mailbox: FOUNDER,
        messages: [
            {
                from: "Nina Kowalski",
                at: 2900,
                body:
                    "I meant to click monthly but upgraded to the annual plan by mistake. Can I get a refund and switch back to monthly?",
            },
            {
                from: "Support Team",
                out: true,
                at: 2800,
                body:
                    "Hi Nina,\n\nNo problem. I've started the refund for the annual charge; it should reach your card in 5 to 10 business days. Can you confirm you'd like the monthly plan to start today?\n\nSupport Team",
            },
        ],
    },
    {
        id: "t_sso",
        subject: "SAML SSO for our Okta tenant",
        status: "On Hold",
        customer: "rafael@meridianhealth.test",
        mailbox: FOUNDER,
        messages: [
            {
                from: "Rafael Ortiz",
                at: 5200,
                body:
                    "Do you support SAML SSO with Okta? Our security team requires it before we roll Fernway out to 80 staff.",
            },
        ],
    },
    {
        id: "t_password",
        subject: "Password reset link says expired",
        status: "Solved",
        customer: "alice@example.com",
        mailbox: SUPPORT,
        summary:
            "Password reset link showed as expired immediately. Fixed by the token expiry patch; customer confirmed she could sign in.",
        messages: [
            {
                from: "Alice Smith",
                at: 9000,
                body:
                    "Hi team,\n\nI tried resetting my password but the link says expired. I really need to get into my account today to download my invoice. Can you help?\n\nThanks,\nAlice",
            },
            {
                from: "Support Team",
                out: true,
                at: 8900,
                body:
                    "Hi Alice,\n\nSorry about that. We found a bug that expired reset links too early and have just fixed it. Please request a new link and it will work for 60 minutes.\n\nSupport Team",
            },
            { from: "Alice Smith", at: 8850, body: "That worked, thank you!" },
        ],
    },
    {
        id: "t_darkmode",
        subject: "Feature request: dark mode",
        status: "Solved",
        customer: "bob@jones.test",
        mailbox: SUPPORT,
        messages: [
            {
                from: "Bob Jones",
                at: 12000,
                body:
                    "Just wondering if you have plans to add dark mode? My eyes hurt when I use the app at night.",
            },
            {
                from: "Support Team",
                out: true,
                at: 11900,
                body:
                    "Hi Bob,\n\nGood news: dark mode shipped this week. You'll find it under Settings > Appearance.\n\nSupport Team",
            },
        ],
    },
    {
        id: "t_spam",
        subject: "Boost your SEO ranking in 7 days",
        status: "Spam",
        customer: "offers@growthblast.test",
        mailbox: SUPPORT,
        messages: [
            {
                from: "Growth Blast",
                at: 600,
                body: "Dear website owner, we guarantee first page rankings...",
            },
        ],
    },
];

type IssueSeed = {
    id: string;
    ticket: string | null;
    title: string;
    problem_summary: string;
    why_it_matters: string;
    fix_prompt: string;
    status: string;
    target_repos: string[];
    github?: number;
    at: number;
};

const issues: IssueSeed[] = [
    {
        id: "iss_csv_limit",
        ticket: "t_csv_export",
        title: "Bookings CSV export truncated at 1,000 rows",
        problem_summary:
            "The bookings export returns at most 1,000 rows with no warning. Accounts with more bookings in the selected range silently lose data. Started after Monday's release.",
        why_it_matters:
            "Customers use the export for payroll and invoicing. Silent data loss is worse than an error, and at least one customer has a pay run on Friday.",
        fix_prompt:
            "The export query reuses the list API's default `take: 1000`. Stream the export in pages of 1,000 using a cursor on `id` until no rows remain, write rows to the CSV as they arrive, and add a test that exports 2,500 seeded bookings and asserts 2,500 data rows.",
        status: "In Progress",
        target_repos: ["core"],
        github: 214,
        at: 10,
    },
    {
        id: "iss_calendar_dup",
        ticket: "t_calendar_dup",
        title: "Two-way calendar sync duplicates every booking",
        problem_summary:
            "With two-way Google Calendar sync on, each booking is created twice in the user's calendar. Deleting one copy deletes both, which suggests both events share one booking reference.",
        why_it_matters:
            "Calendar sync is a top reason teams upgrade. Duplicates make every team calendar look broken and push customers to switch sync off.",
        fix_prompt:
            "The push-notification handler re-imports the event Fernway just exported and then exports it again. Store the Google event ID on the booking at first export, skip inbound events whose ID is already linked, and add an idempotency test for the round trip.",
        status: "Backlog",
        target_repos: ["core"],
        at: 44,
    },
    {
        id: "iss_dst",
        ticket: "t_timezone",
        title: "Reminders fire one hour early after DST change",
        problem_summary:
            "Reminder jobs are scheduled with a fixed UTC offset captured when the booking is made, so bookings that cross a daylight saving change are reminded an hour early.",
        why_it_matters:
            "Clients turn up at the wrong time and the business blames the product. It affects every account in a DST timezone twice a year.",
        fix_prompt:
            "Schedule reminders from the booking's local time and IANA timezone, not a stored offset. Convert to UTC at enqueue time and add tests for bookings that cross the March and October changes in Europe/Lisbon and America/New_York.",
        status: "Backlog",
        target_repos: ["core"],
        at: 170,
    },
    {
        id: "iss_widget_color",
        ticket: "t_widget_color",
        title: "Embedded widget ignores custom brand colour",
        problem_summary:
            "The booking widget reads the brand colour from a cached config that only refreshes on publish, so changes in Settings > Widget never reach live embeds.",
        why_it_matters:
            "Brand matching is a paid-plan feature. Customers think the setting is broken and open tickets.",
        fix_prompt:
            "Invalidate the widget config cache when the brand colour is saved, and have the widget fetch `/widget/config` with an ETag so it picks up changes within a minute. Add a visual check that the primary button uses the configured colour.",
        status: "Backlog",
        target_repos: ["web"],
        at: 700,
    },
    {
        id: "iss_magic_link",
        ticket: "t_mobile_login",
        title: "iOS magic links open Safari instead of the app",
        problem_summary:
            "Sign-in links use a path that is missing from the associated-domains file, so iOS opens Safari and the app session is never created.",
        why_it_matters:
            "Mobile sign-in is the first thing new users do. Every failed attempt is a support ticket or a lost user.",
        fix_prompt:
            "Add `/auth/magic/*` to the apple-app-site-association file, list the path under associated domains in the iOS app, and show an 'Open in app' fallback page when the link is opened in a browser.",
        status: "Backlog",
        target_repos: ["web"],
        at: 400,
    },
    {
        id: "iss_reset_expiry",
        ticket: "t_password",
        title: "Password reset links expiring early",
        problem_summary:
            "Reset tokens were created with an expiry in seconds but checked in milliseconds, so links expired almost immediately.",
        why_it_matters:
            "Locked-out customers cannot reach invoices or bookings, and every case needs manual help.",
        fix_prompt:
            "Store token expiry as a timestamp, compare in one unit, and keep links valid for 60 minutes. Add a test that a link is valid at 59 minutes and invalid at 61.",
        status: "Done",
        target_repos: ["core"],
        github: 198,
        at: 8950,
    },
    {
        id: "iss_seo_spam",
        ticket: null,
        title: "Filter marketing spam before it reaches Open",
        problem_summary:
            "Cold SEO and growth offers land in the Open queue and have to be marked as spam by hand.",
        why_it_matters: "Low priority; a few clicks a week.",
        fix_prompt:
            "Consider a sender allow-list or a lightweight classifier on sync. Parked for now.",
        status: "Dismissed",
        target_repos: [],
        at: 590,
    },
];

async function main() {
    await prisma.workspace.upsert({
        where: { id: WS },
        update: { name: "Fernway Support" },
        create: { id: WS, name: "Fernway Support" },
    });

    // Reset demo content so repeated runs stay clean.
    await prisma.githubIssueLink.deleteMany({});
    await prisma.issue.deleteMany({ where: { workspace_id: WS } });
    await prisma.attachment.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.ticket.deleteMany({ where: { workspace_id: WS } });

    for (const t of tickets) {
        const times = t.messages.map((m) => m.at);
        await prisma.ticket.create({
            data: {
                id: t.id,
                workspace_id: WS,
                subject: t.subject,
                status: t.status,
                customer_email: t.customer,
                mailbox: t.mailbox,
                summary_text: t.summary ?? null,
                latest_message_at: ago(Math.min(...times)),
                created_at: ago(Math.max(...times)),
                messages: {
                    create: t.messages.map((m) => ({
                        sender_name: m.from,
                        body_text: m.body,
                        direction: m.out ? "outbound" : "inbound",
                        sent_at: ago(m.at),
                    })),
                },
            },
        });
    }

    for (const i of issues) {
        await prisma.issue.create({
            data: {
                id: i.id,
                workspace_id: WS,
                ticket_id: i.ticket,
                title: i.title,
                problem_summary: i.problem_summary,
                why_it_matters: i.why_it_matters,
                fix_prompt: i.fix_prompt,
                status: i.status,
                target_repos: i.target_repos,
                created_at: ago(i.at),
                ...(i.github
                    ? {
                          github_issue_number: i.github,
                          github_issue_url: `https://github.com/example-org/fernway-issues/issues/${i.github}`,
                      }
                    : {}),
            },
        });
    }

    console.log(`Seeded ${tickets.length} tickets and ${issues.length} issues (invented demo data).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
