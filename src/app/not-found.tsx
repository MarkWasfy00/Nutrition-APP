import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ background: "#0b0708", color: "#f5edee", fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <Link href="/" style={{ color: "#ff3b3b", fontWeight: 900 }}>404 — Home</Link>
      </body>
    </html>
  );
}
