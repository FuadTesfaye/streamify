import net from "node:net";
import tls from "node:tls";
// Deliberately small RESP2 transport: the limiter only needs simple strings and integers.
export async function redisCommand(
  urlString: string,
  command: string[],
): Promise<string | number> {
  const url = new URL(urlString);
  if (!["redis:", "rediss:"].includes(url.protocol))
    throw new Error("Unsupported Redis protocol");
  const socket =
    url.protocol === "rediss:"
      ? tls.connect({
          host: url.hostname,
          port: Number(url.port || 6379),
          servername: url.hostname,
        })
      : net.createConnection({
          host: url.hostname,
          port: Number(url.port || 6379),
        });
  socket.setTimeout(5000, () => socket.destroy(new Error("Redis timed out")));
  let buffer = Buffer.alloc(0);
  let pending:
    | { resolve: (v: string | number) => void; reject: (e: Error) => void }
    | undefined;
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > 4096) {
      socket.destroy(new Error("Redis response too large"));
      return;
    }
    const end = buffer.indexOf("\r\n");
    if (end < 0 || !pending) return;
    const line = buffer.subarray(0, end).toString();
    buffer = buffer.subarray(end + 2);
    const waiter = pending;
    pending = undefined;
    if (line[0] === "+") waiter.resolve(line.slice(1));
    else if (line[0] === ":" && /^-?\d+$/.test(line.slice(1)))
      waiter.resolve(Number(line.slice(1)));
    else waiter.reject(new Error("Redis command failed"));
  });
  socket.on("error", (error) => {
    pending?.reject(error);
    pending = undefined;
  });
  socket.on("close", () => {
    pending?.reject(new Error("Redis disconnected"));
    pending = undefined;
  });
  const send = (args: string[]) =>
    new Promise<string | number>((resolve, reject) => {
      pending = { resolve, reject };
      socket.write(
        `*${args.length}\r\n` +
          args.map((v) => `$${Buffer.byteLength(v)}\r\n${v}\r\n`).join(""),
      );
    });
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once(
        url.protocol === "rediss:" ? "secureConnect" : "connect",
        resolve,
      );
      socket.once("error", reject);
    });
    if (url.password)
      await send(
        url.username
          ? [
              "AUTH",
              decodeURIComponent(url.username),
              decodeURIComponent(url.password),
            ]
          : ["AUTH", decodeURIComponent(url.password)],
      );
    if (url.pathname.length > 1) await send(["SELECT", url.pathname.slice(1)]);
    return await send(command);
  } finally {
    socket.destroy();
  }
}
