import nodemailer from "nodemailer";

interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
}

/**
 * Get SMTP config for a specific mailbox account
 */
function getSmtpConfig(mailbox: string): SmtpConfig | null {
    if (mailbox === process.env.EMAIL_1_USER) {
        return {
            host: process.env.EMAIL_1_SMTP_HOST || "mail.privateemail.com",
            port: Number(process.env.EMAIL_1_SMTP_PORT) || 587,
            user: process.env.EMAIL_1_USER!,
            pass: process.env.EMAIL_1_PASSWORD!,
        };
    }
    if (mailbox === process.env.EMAIL_2_USER) {
        return {
            host: process.env.EMAIL_2_SMTP_HOST || "mail.privateemail.com",
            port: Number(process.env.EMAIL_2_SMTP_PORT) || 587,
            user: process.env.EMAIL_2_USER!,
            pass: process.env.EMAIL_2_PASSWORD!,
        };
    }
    return null;
}

interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType: string;
}

interface SendEmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
    mailbox: string; // which account to send from
    inReplyTo?: string;
    references?: string;
    attachments?: EmailAttachment[];
    isNewEmail?: boolean;
}

export async function sendEmail(options: SendEmailOptions) {
    const config = getSmtpConfig(options.mailbox);
    if (!config) {
        throw new Error(`No SMTP config found for mailbox: ${options.mailbox}`);
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: false,
        auth: { user: config.user, pass: config.pass },
    });

    const subject = options.isNewEmail
        ? options.subject
        : options.subject.startsWith("Re:") ? options.subject : `Re: ${options.subject}`;

    const mailAttachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
    }));

    const info = await transporter.sendMail({
        from: `"Support" <${config.user}>`,
        to: options.to,
        subject,
        text: options.text,
        ...(options.html ? { html: options.html } : {}),
        ...(options.inReplyTo ? { inReplyTo: options.inReplyTo } : {}),
        ...(options.references ? { references: options.references } : {}),
        ...(mailAttachments && mailAttachments.length > 0 ? { attachments: mailAttachments } : {}),
    });

    return info;
}
