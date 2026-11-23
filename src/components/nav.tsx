"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Icon, type IconName } from "./icon";

export interface NavItem {
  href: string;
  icon: IconName;
  label: string;
  tab: boolean;
}

/** Longest matching prefix wins, so /ar/jobs/123 highlights "jobs". */
function currentOf(items: NavItem[], path: string) {
  return items.filter((i) => path === i.href || path.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function SideLinks({ items, current }: { items: NavItem[]; current?: string }) {
  return items.map((i) => (
    <Link key={i.href} className="nav-item" href={i.href} aria-current={current === i.href ? "page" : undefined}>
      <Icon name={i.icon} />
      <span>{i.label}</span>
    </Link>
  ));
}

function TabLinks({ items, current, label }: { items: NavItem[]; current?: string; label: string }) {
  return (
    <nav className="tabbar" aria-label={label}>
      {items
        .filter((i) => i.tab)
        .map((i) => (
          <Link key={i.href} className="tab" href={i.href} aria-current={current === i.href ? "page" : undefined}>
            <Icon name={i.icon} />
            <span>{i.label}</span>
          </Link>
        ))}
    </nav>
  );
}

function LiveSide({ items }: { items: NavItem[] }) {
  return <SideLinks items={items} current={currentOf(items, usePathname() ?? "")} />;
}

function LiveTabs({ items, label }: { items: NavItem[]; label: string }) {
  return <TabLinks items={items} label={label} current={currentOf(items, usePathname() ?? "")} />;
}

/** The highlight depends on the URL, so it streams in; the links themselves render right away. */
export function SideNav({ items }: { items: NavItem[] }) {
  return (
    <Suspense fallback={<SideLinks items={items} />}>
      <LiveSide items={items} />
    </Suspense>
  );
}

export function TabBar({ items, label }: { items: NavItem[]; label: string }) {
  return (
    <Suspense fallback={<TabLinks items={items} label={label} />}>
      <LiveTabs items={items} label={label} />
    </Suspense>
  );
}
