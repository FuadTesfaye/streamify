import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { Duplex } from "node:stream";
import { redisCommand } from "../src/lib/redis";
import { sendMail } from "../src/lib/mail";
// Script the peer at the socket boundary; exercise real encoding and response parsing without a listening port.
class PeerSocket extends Duplex {
  constructor(private respond: (message: string, socket: PeerSocket) => void) {
    super();
    queueMicrotask(() => this.emit("connect"));
  }
  _read() {}
  _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    this.respond(chunk.toString(), this);
    callback();
  }
  setTimeout() {
    return this;
  }
  receive(reply: string) {
    queueMicrotask(() => this.push(reply));
  }
}
test("Redis transport handles fragmented replies and authenticated connections", async (t) => {
  const commands: string[] = [];
  t.mock.method(
    net,
    "createConnection",
    () =>
      new PeerSocket((command, socket) => {
        commands.push(command);
        if (command.includes("AUTH") || command.includes("SELECT"))
          socket.receive("+OK\r\n");
        else {
          socket.receive(":");
          socket.receive("7\r\n");
        }
      }),
  );
  assert.equal(
    await redisCommand("redis://user:password@localhost:6379/2", [
      "EVAL",
      "return 7",
      "0",
    ]),
    7,
  );
  assert.match(commands[0], /AUTH/);
  assert.match(commands[1], /SELECT/);
  assert.match(commands[2], /EVAL/);
});
test("Redis errors never return a successful limiting result", async (t) => {
  t.mock.method(
    net,
    "createConnection",
    () =>
      new PeerSocket((_command, socket) =>
        socket.receive("-ERR unavailable\r\n"),
      ),
  );
  await assert.rejects(
    redisCommand("redis://localhost:6379", ["PING"]),
    /failed/,
  );
});
test("Redis disconnects reject pending commands", async (t) => {
  t.mock.method(
    net,
    "createConnection",
    () => new PeerSocket((_command, socket) => socket.destroy()),
  );
  await assert.rejects(
    redisCommand("redis://localhost:6379", ["PING"]),
    /disconnected/,
  );
});
test("SMTP handles multiline greeting, encodes content, and rejects header injection", async (t) => {
  let message = "";
  t.mock.method(net, "createConnection", () => {
    const peer = new PeerSocket((command, socket) => {
      if (command.startsWith("EHLO"))
        socket.receive("250-localhost\r\n250 OK\r\n");
      else if (command === "DATA\r\n") socket.receive("354 send\r\n");
      else if (command === "QUIT\r\n") socket.receive("221 bye\r\n");
      else {
        if (command.startsWith("From:")) message = command;
        socket.receive("250 OK\r\n");
      }
    });
    peer.receive("220 localhost\r\n");
    return peer;
  });
  Object.assign(process.env, {
    NODE_ENV: "test",
    APP_ORIGIN: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-only-secret-32-characters-long",
    DATABASE_URL: "postgresql://test:test@localhost/test",
    REDIS_URL: "redis://localhost:6379",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    SMTP_SECURE: "false",
    MAIL_FROM: "Streamify <test@example.test>",
  });
  await sendMail(
    "student@example.test",
    "Verification",
    "Your code is 123456.",
  );
  assert.match(message, /Content-Transfer-Encoding: base64/);
  assert.match(message, /To: student@example.test/);
  assert.ok(
    message.includes(Buffer.from("Your code is 123456.").toString("base64")),
  );
  await assert.rejects(
    sendMail("student@example.test\r\nBcc: other@example.test", "Test", "body"),
    /Invalid mail header/,
  );
});
