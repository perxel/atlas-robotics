"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
// Leaf import, not the `@/cms/multilingual` barrel — this is a client
// component, and the barrel also re-exports dashboard/service code that has
// no business in the client bundle (same reasoning lib/registry.ts's own
// comment gives for why LanguageSwitcher.tsx avoids importing from
// lib/cms-server.ts). `translate-text.ts` itself has zero imports.
import { translateText } from "@/cms/multilingual/translate-text";

export type NavMenuLink = {
  label: string;
  url: string;
  openInNewTab?: boolean | null;
  children: NavMenuLink[];
};

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" width="0.75em" height="0.75em" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="1.25em" height="1.25em" fill="none" stroke="currentColor" strokeWidth={2}>
      {open ? (
        <path d="M5 5 15 15M15 5 5 15" strokeLinecap="round" />
      ) : (
        <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
      )}
    </svg>
  );
}

function linkProps(link: NavMenuLink) {
  return {
    href: link.url || "#",
    target: link.openInNewTab ? "_blank" : undefined,
    rel: link.openInNewTab ? "noopener noreferrer" : undefined,
  };
}

export default function NavMenu({ links, uiDictionary }: { links: NavMenuLink[]; uiDictionary: Record<string, string> }) {
  const t = (text: string) => translateText(uiDictionary, text);
  const navRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenIndex(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenIndex(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggleMobileExpanded(i: number) {
    setMobileExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <>
      <div ref={navRef} className="hidden items-center gap-6 text-sm md:flex" role="navigation" aria-label={t("Primary")}>
        {links.map((link, i) => {
          if (!link.children.length) {
            return (
              <Link key={i} {...linkProps(link)} className="text-foreground/80 hover:text-foreground">
                {link.label}
              </Link>
            );
          }
          const open = openIndex === i;
          return (
            <div key={i} className="relative" onMouseEnter={() => setOpenIndex(i)} onMouseLeave={() => setOpenIndex(null)}>
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex items-center gap-1 text-foreground/80 hover:text-foreground"
              >
                {link.label}
                <ChevronIcon className={open ? "rotate-180" : undefined} />
              </button>
              {open && (
                <div role="menu" className="absolute left-0 top-full z-50 mt-2 min-w-48 rounded-md border border-border bg-surface py-2 shadow-lg">
                  {link.children.map((child, j) => (
                    <Link
                      key={j}
                      role="menuitem"
                      {...linkProps(child)}
                      className="block px-4 py-2 text-foreground/80 hover:bg-surface-muted hover:text-foreground"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center text-foreground md:hidden"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? t("Close menu") : t("Open menu")}
        onClick={() => setMobileOpen((o) => !o)}
      >
        <HamburgerIcon open={mobileOpen} />
      </button>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-border bg-surface md:hidden">
          <nav className="flex flex-col px-4 py-2" aria-label={t("Primary")}>
            {links.map((link, i) => {
              if (!link.children.length) {
                return (
                  <Link
                    key={i}
                    {...linkProps(link)}
                    onClick={() => setMobileOpen(false)}
                    className="border-b border-border py-3 text-foreground/80 last:border-0 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                );
              }
              const expanded = mobileExpanded.has(i);
              return (
                <div key={i} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggleMobileExpanded(i)}
                    className="flex w-full items-center justify-between py-3 text-foreground/80 hover:text-foreground"
                  >
                    {link.label}
                    <ChevronIcon className={expanded ? "rotate-180" : undefined} />
                  </button>
                  {expanded && (
                    <div className="flex flex-col gap-1 pb-3 pl-4">
                      {link.children.map((child, j) => (
                        <Link
                          key={j}
                          {...linkProps(child)}
                          onClick={() => setMobileOpen(false)}
                          className="py-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
