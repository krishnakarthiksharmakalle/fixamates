"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/repair", label: "Repair" },
  { href: "/cooking", label: "Cooking" },
  { href: "/results", label: "Saved" },
  { href: "/services", label: "Nearby help" },
  { href: "/plans", label: "Plans" },
];

export default function Navbar() {
  const path = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("fm-theme", next); } catch {}
    setDark(!dark);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)]" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z" />
            </svg>
          </span>
          Fixmate
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm ${path === l.href ? "bg-[var(--surface-2)] font-semibold" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <button onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="fm-ghost ml-auto grid size-9 place-items-center sm:ml-0">
          {dark ? "☀" : "☾"}
        </button>
      </div>

      {/* Phones: scrollable link row */}
      <nav aria-label="Main mobile" className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${path === l.href ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
