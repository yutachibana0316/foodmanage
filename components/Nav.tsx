"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "記録" },
  { href: "/charts", label: "グラフ" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="メインメニュー">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="nav-link"
          aria-current={pathname === link.href ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
