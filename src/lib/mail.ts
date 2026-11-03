import net from "node:net";
import tls from "node:tls";
import { config } from "./config";
// SMTP over implicit TLS in production; plaintext is for local Mailpit only.
export async function sendMail(to: string, subject: string, text: string) {
  const cfg = config();
  if ([to, subject].some((v) => /[\r\n]/.test(v)))
    throw new Error("Invalid mail header");
  const socket = cfg.SMTP_SECURE
    ? tls.connect({
        host: cfg.SMTP_HOST,
        port: cfg.SMTP_PORT,
        servername: cfg.SMTP_HOST,
      })
    : net.createConnection({ host: cfg.SMTP_HOST, port: cfg.SMTP_PORT });
  socket.setTimeout(10000, () => socket.destroy(new Error("SMTP timeout")));
  let buffered = "";
  const replies: number[] = [];
  let waiter:
    | { resolve: (code: number) => void; reject: (error: Error) => void }
    | undefined;
  let failure: Error | undefined;
  socket.on("data", (chunk) => {
    buffered += chunk.toString();
    if (buffered.length > 65536) {
      socket.destroy(new Error("SMTP response too large"));
      return;
    }
    let index: number;
    while ((index = buffered.indexOf("\r\n")) >= 0) {
      const line = buffered.slice(0, index);
      buffered = buffered.slice(index + 2);
      if (/^\d{3} /.test(line)) {
        const code = Number(line.slice(0, 3));
        if (waiter) {
          const w = waiter;
          waiter = undefined;
          w.resolve(code);
        } else replies.push(code);
      }
    }
  });
  const fail = (error: Error) => {
    failure = error;
    waiter?.reject(error);
    waiter = undefined;
  };
  socket.on("error", fail);
  socket.on("close", () => fail(new Error("SMTP disconnected")));
  const reply = () =>
    new Promise<number>((resolve, reject) => {
      if (failure) reject(failure);
      else if (replies.length) resolve(replies.shift()!);
      else waiter = { resolve, reject };
    });
  const expect = async (expected: number) => {
    if ((await reply()) !== expected) throw new Error("SMTP delivery failed");
  };
  const send = async (line: string, code = 250) => {
    socket.write(line + "\r\n");
    await expect(code);
  };
  try {
    await expect(220);
    await send("EHLO streamify");
    if (cfg.SMTP_USER) {
      await send("AUTH LOGIN", 334);
      await send(Buffer.from(cfg.SMTP_USER).toString("base64"), 334);
      await send(Buffer.from(cfg.SMTP_PASSWORD ?? "").toString("base64"), 235);
    }
    const from = cfg.MAIL_FROM.match(/<([^>]+)>/)?.[1] ?? cfg.MAIL_FROM;
    await send(`MAIL FROM:<${from}>`);
    await send(`RCPT TO:<${to}>`);
    await send("DATA", 354);
    const body =
      Buffer.from(text)
        .toString("base64")
        .match(/.{1,76}/g)
        ?.join("\r\n") ?? "";
    await send(
      `From: ${cfg.MAIL_FROM}\r\nTo: ${to}\r\nSubject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${body}\r\n.`,
    );
    await send("QUIT", 221);
  } finally {
    socket.destroy();
  }
}
