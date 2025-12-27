import crypto from "crypto";
import nodemailer from "nodemailer";
import twilio from "twilio";
import { env } from "@/config/env";
import { IngestionNotificationSettings } from "@/models/IngestionNotificationSettings";
import type { IngestionRunDocument } from "@/models/IngestionRun";

const safe = (v: any) => (v === undefined || v === null ? "" : String(v));

const isEmailConfigured = () => {
  return !!(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFrom);
};

const isSmsConfigured = () => {
  return !!(env.twilioAccountSid && env.twilioAuthToken && env.twilioFrom);
};

const buildSubject = (run: IngestionRunDocument) => {
  return `[KMRL] Ingestion ${run.source} ${run.status}`;
};

const buildBody = (run: IngestionRunDocument) => {
  const lines: string[] = [];
  lines.push(`Source: ${run.source}`);
  lines.push(`Status: ${run.status}`);
  lines.push(`Started: ${safe(run.startedAt)}`);
  lines.push(`Finished: ${safe(run.finishedAt)}`);
  lines.push(`Read: ${safe(run.recordsRead)}`);
  lines.push(`Upserted: ${safe(run.recordsUpserted)}`);
  lines.push(`Trainsets: ${safe(run.trainsetsUpdated)}`);
  if (run.error) lines.push(`Error: ${run.error}`);
  if (run.metadata) lines.push(`Metadata: ${JSON.stringify(run.metadata)}`);
  lines.push(`RunId: ${safe(run._id)}`);
  return lines.join("\n");
};

export const notifyIngestionRun = async (run: IngestionRunDocument) => {
  try {
    const settings = await IngestionNotificationSettings.findOne({ key: "default" }).lean();
    if (!settings) return;

    const shouldNotify =
      (run.status === "SUCCESS" && settings.notifyOnSuccess) ||
      (run.status === "FAILED" && settings.notifyOnFailure);

    if (!shouldNotify) return;

    const subject = buildSubject(run);
    const body = buildBody(run);

    if (settings.email && isEmailConfigured()) {
      const port = Number(env.smtpPort);
      const secure = env.smtpSecure === "true" || port === 465;

      const transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port,
        secure,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      });

      await transporter.sendMail({
        from: env.smtpFrom,
        to: settings.email,
        subject,
        text: body,
      });
    }

    if (settings.phone && isSmsConfigured()) {
      const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
      const smsBody = `${subject}\n${body}`.slice(0, 1500);
      await client.messages.create({
        from: env.twilioFrom,
        to: settings.phone,
        body: smsBody,
      });
    }
  } catch (e) {
    console.error("notifyIngestionRun error:", e);
  }
};

export const verifyUnsSignature = (opts: {
  token: string;
  timestamp: string;
  signature: string;
  maxSkewMs: number;
}) => {
  const ts = Number(opts.timestamp);
  if (!Number.isFinite(ts)) return false;
  const skew = Math.abs(Date.now() - ts);
  if (skew > opts.maxSkewMs) return false;

  const expected = crypto.createHmac("sha256", env.unsIngestToken).update(opts.timestamp).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};
