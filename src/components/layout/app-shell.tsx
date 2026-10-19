"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

type ShellUser = {
  name: string;
};

const workspaceLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/estimates", label: "Estimates" },
  { href: "/quotations", label: "Quotations" },
  { href: "/rate-book", label: "Rate book" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <div className="px-4 py-5">
      <p className="text-sm font-semibold tracking-tight">EstiForge</p>
      <p className="text-xs text-muted-foreground">Electrical estimation</p>
    </div>
  );
}

function Nav({
  links,
  onNavigate,
}: {
  links: Array<{ href: string; label: string }>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-2" aria-label="Primary">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground"
                : "rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: ShellUser | null;
}) {
  const [open, setOpen] = useState(false);
  const links = user ? workspaceLinks : [{ href: "/", label: "Overview" }];

  return (
    <div className="flex min-h-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Brand />
        <Suspense fallback={null}>
          <Nav links={links} />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </Button>
          <p className="text-sm font-medium md:hidden">EstiForge</p>
          <p className="hidden text-sm text-muted-foreground md:block">
            {user ? user.name : "Electrical estimation"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Log out
                </Button>
              </form>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
        </header>
        {open ? (
          <div className="border-b border-border bg-sidebar p-3 md:hidden">
            <Suspense fallback={null}>
              <Nav links={links} onNavigate={() => setOpen(false)} />
            </Suspense>
          </div>
        ) : null}
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
