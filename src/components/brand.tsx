import Link from "next/link";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} href="/">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      streamify<span className="brand-dot">.</span>
    </Link>
  );
}
