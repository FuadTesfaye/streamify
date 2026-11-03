import Link from "next/link";

export function Brand({
  light = false,
  tagline = true,
}: {
  light?: boolean;
  tagline?: boolean;
}) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} href="/">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        streamify<span className="brand-dot">.</span>
        {tagline && (
          <span
            style={{
              marginLeft: "8px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: "4px",
              background: light ? "rgba(255,255,255,0.15)" : "rgba(41, 76, 60, 0.15)",
              color: light ? "#e4edb7" : "#294c3c",
              verticalAlign: "middle",
            }}
          >
            GATEWAY
          </span>
        )}
      </span>
    </Link>
  );
}
