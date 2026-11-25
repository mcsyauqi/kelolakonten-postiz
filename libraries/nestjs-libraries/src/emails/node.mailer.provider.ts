import nodemailer from 'nodemailer';
import { EmailInterface } from '@gitroom/nestjs-libraries/emails/email.interface';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: +process.env.EMAIL_PORT!,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export class NodeMailerProvider implements EmailInterface {
  name = 'nodemailer';
  validateEnvKeys = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_SECURE',
    'EMAIL_USER',
    'EMAIL_PASS',
  ];
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    emailFromName: string,
    emailFromAddress: string,
    replyTo?: string
  ) {
    // Kelola Konten: versi teks biasa + reply-to resmi (sama seperti ResendProvider).
    const text = html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h1|h2)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();
    const sends = await transporter.sendMail({
      from: `${emailFromName} <${emailFromAddress}>`,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || process.env.EMAIL_REPLY_TO || undefined,
    });

    return sends;
  }
}
