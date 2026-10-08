import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "./prisma";

interface MailboxConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
}

interface SyncResult {
    newTickets: number;
    updatedTickets: number;
    totalMessages: number;
    account: string;
}

/**
 * Get all configured mailbox accounts from env
 */
function getMailboxConfigs(): MailboxConfig[] {
    const configs: MailboxConfig[] = [];

    // Account 1
    if (process.env.EMAIL_1_USER && process.env.EMAIL_1_PASSWORD) {
        configs.push({
            host: process.env.EMAIL_1_HOST || "mail.privateemail.com",
            port: Number(process.env.EMAIL_1_PORT) || 993,
            user: process.env.EMAIL_1_USER,
            pass: process.env.EMAIL_1_PASSWORD,
        });
    }

    // Account 2
    if (process.env.EMAIL_2_USER && process.env.EMAIL_2_PASSWORD) {
        configs.push({
            host: process.env.EMAIL_2_HOST || "mail.privateemail.com",
            port: Number(process.env.EMAIL_2_PORT) || 993,
            user: process.env.EMAIL_2_USER,
            pass: process.env.EMAIL_2_PASSWORD,
        });
    }

    return configs;
}

function normalizeSubject(subject: string | undefined): string {
    if (!subject) return "(No Subject)";
    return subject.replace(/^(Re|Fwd|FW|RE):\s*/gi, "").trim();
}

/**
 * Process messages from a single IMAP folder
 */
async function syncFolder(
    client: InstanceType<typeof ImapFlow>,
    folderName: string,
    config: MailboxConfig,
    result: SyncResult,
    limit: number
): Promise<void> {
    let lock;
    try {
        lock = await client.getMailboxLock(folderName);
    } catch {
        // Folder doesn't exist, skip silently
        return;
    }

    try {
        const mailboxInfo = client.mailbox;
        const totalExists = (mailboxInfo && typeof mailboxInfo === "object" && "exists" in mailboxInfo) ? (mailboxInfo as { exists: number }).exists : limit;
        if (totalExists === 0) return;
        const startSeq = Math.max(1, totalExists - limit + 1);

        const messages = client.fetch(`${startSeq}:*`, {
            envelope: true,
            source: true,
            uid: true,
        });

        for await (const msg of messages) {
            if (!msg.source) continue;
            const parsed = await simpleParser(msg.source as Buffer);
            const messageId = parsed.messageId || `uid-${config.user}-${msg.uid}`;
            const subject = normalizeSubject(parsed.subject);
            const senderEmail = parsed.from?.value?.[0]?.address || "unknown@unknown.com";
            const senderName = parsed.from?.value?.[0]?.name || senderEmail.split("@")[0];
            const bodyText = parsed.text || (typeof parsed.html === "string" ? parsed.html.replace(/<[^>]*>/g, "") : "") || "";
            const sentAt = parsed.date || new Date();

            const isOutbound = senderEmail.toLowerCase() === config.user.toLowerCase();

            // Skip if message already exists
            const existingMsg = await prisma.message.findFirst({
                where: { id: messageId },
            });
            if (existingMsg) continue;

            // Find existing ticket by subject + customer
            const toAddr = parsed.to && !Array.isArray(parsed.to) ? parsed.to.value?.[0]?.address : undefined;
            const customerEmail = isOutbound
                ? (toAddr || "unknown")
                : senderEmail;

            let ticket = await prisma.ticket.findFirst({
                where: {
                    subject: subject,
                    customer_email: customerEmail,
                    mailbox: config.user,
                },
            });

            if (!ticket) {
                ticket = await prisma.ticket.create({
                    data: {
                        workspace_id: "ws_default",
                        subject: subject,
                        status: "Open",
                        customer_email: customerEmail,
                        mailbox: config.user,
                        latest_message_at: sentAt,
                    },
                });
                result.newTickets++;
            } else {
                if (sentAt > ticket.latest_message_at) {
                    await prisma.ticket.update({
                        where: { id: ticket.id },
                        data: {
                            latest_message_at: sentAt,
                        },
                    });
                }
                result.updatedTickets++;
            }

            const createdMessage = await prisma.message.create({
                data: {
                    id: messageId,
                    ticket_id: ticket.id,
                    sender_name: senderName,
                    body_text: bodyText.substring(0, 10000),
                    direction: isOutbound ? "outbound" : "inbound",
                    sent_at: sentAt,
                },
            });

            // Save attachments
            if (parsed.attachments && parsed.attachments.length > 0) {
                for (const att of parsed.attachments) {
                    try {
                        await prisma.attachment.create({
                            data: {
                                message_id: createdMessage.id,
                                filename: att.filename || "attachment",
                                content_type: att.contentType || "application/octet-stream",
                                data: new Uint8Array(Buffer.from(att.content)),
                                size: att.size || att.content.length,
                            },
                        });
                    } catch (attError) {
                        console.error("Failed to save attachment:", attError);
                    }
                }
            }

            result.totalMessages++;
        }
    } finally {
        lock.release();
    }
}

// Common names for the Sent folder across email providers
const SENT_FOLDER_NAMES = ["Sent", "Sent Items", "INBOX.Sent", "Sent Messages"];

/**
 * Sync a single mailbox account (INBOX + Sent folder)
 */
async function syncAccount(config: MailboxConfig, limit = 50): Promise<SyncResult> {
    const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: true,
        auth: { user: config.user, pass: config.pass },
        logger: false,
    });

    const result: SyncResult = {
        newTickets: 0,
        updatedTickets: 0,
        totalMessages: 0,
        account: config.user,
    };

    try {
        await client.connect();

        // Sync INBOX
        await syncFolder(client, "INBOX", config, result, limit);

        // Sync Sent folder — try common names
        for (const sentName of SENT_FOLDER_NAMES) {
            try {
                await syncFolder(client, sentName, config, result, limit);
                break; // Stop after first successful sent folder
            } catch {
                // Try next name
            }
        }

        await client.logout();
    } catch (error) {
        console.error(`IMAP sync error for ${config.user}:`, error);
        throw error;
    }

    return result;
}

/**
 * Sync all configured mailbox accounts
 */
export async function syncAllMailboxes(limit = 50): Promise<SyncResult[]> {
    const configs = getMailboxConfigs();
    if (configs.length === 0) {
        throw new Error("No email accounts configured. Check your .env file.");
    }

    const results: SyncResult[] = [];
    for (const config of configs) {
        try {
            const result = await syncAccount(config, limit);
            results.push(result);
        } catch (error) {
            console.error(`Failed to sync ${config.user}:`, error);
            results.push({
                newTickets: 0,
                updatedTickets: 0,
                totalMessages: 0,
                account: config.user,
            });
        }
    }

    return results;
}
