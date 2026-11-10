import nodemailer from "nodemailer";

let transport: nodemailer.Transporter | null = null;

export async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_URL) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  transport ??= nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
}
