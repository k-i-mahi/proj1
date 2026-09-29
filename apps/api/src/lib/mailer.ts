import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const transport = env.SMTP_URL
  ? nodemailer.createTransport(env.SMTP_URL)
  : nodemailer.createTransport({ jsonTransport: true });

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Test hook: the last messages sent, newest last. Only populated outside production. */
export const outbox: Mail[] = [];

export const sendMail = async (mail: Mail): Promise<void> => {
  if (!env.isProd) outbox.push(mail);
  if (!env.SMTP_URL) {
    // No SMTP configured (local development): print the message so links can be followed.
    logger.info(
      { to: mail.to, subject: mail.subject },
      `Email (not sent, no SMTP_URL):\n${mail.text}`,
    );
    return;
  }
  await transport.sendMail({ from: env.MAIL_FROM, ...mail });
};

const layout = (title: string, body: string, cta?: { href: string; label: string }) => `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f172a">
  <div style="font-weight:700;font-size:20px;margin-bottom:24px">Civita</div>
  <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
  <div style="font-size:15px;line-height:1.6;color:#334155">${body}</div>
  ${
    cta
      ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;padding:12px 20px;border-radius:8px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">${cta.label}</a>`
      : ''
  }
  <p style="margin-top:32px;font-size:12px;color:#94a3b8">You received this because of activity on your Civita account.</p>
</div>`;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const passwordResetMail = (to: string, name: string, link: string): Mail => ({
  to,
  subject: 'Reset your Civita password',
  text: `Hi ${name},\n\nUse this link to reset your password. It expires in 30 minutes and can only be used once:\n\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
  html: layout(
    'Reset your password',
    `<p>Hi ${escapeHtml(name)},</p><p>Use the button below to choose a new password. The link expires in 30 minutes and can only be used once.</p><p>If you did not ask for this, you can ignore this email.</p>`,
    { href: link, label: 'Reset password' },
  ),
});
