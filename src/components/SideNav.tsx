"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Sidebar điều hướng theo mẫu UI Shu gửi (tin 238): Trang chủ, Việc làm mới,
// CV của tôi, Email đã gửi, Cài đặt. Active state theo pathname hiện tại.
const ITEMS = [
  { href: "/", label: "Trang chủ", icon: "home", exact: true },
  { href: "/?matched=1", label: "Việc làm mới", icon: "briefcase", matched: true },
  { href: "/cv", label: "CV của tôi", icon: "file" },
  { href: "/ung-tuyen", label: "Email đã gửi", icon: "mail" },
  { href: "/cai-dat", label: "Cài đặt", icon: "gear" },
];

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home":
      return (<svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
    case "briefcase":
      return (<svg {...common}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
    case "file":
      return (<svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>);
    case "mail":
      return (<svg {...common}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6L22 7" /></svg>);
    case "gear":
      return (<svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>);
    default:
      return null;
  }
}

export default function SideNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const matchedOnly = searchParams.get("matched") === "1";
  return (
    <nav className="side-nav">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === "/" && !matchedOnly
          : item.matched
            ? pathname === "/" && matchedOnly
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link key={item.href + item.label} href={item.href} className={`side-nav-link${active ? " active" : ""}`}>
            <Icon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
