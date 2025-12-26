"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavProps = {
  adminLabel?: string;
};

const AdminNav = ({ adminLabel }: AdminNavProps) => {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/investor-pulse/investors", label: "Investors" },
    { href: "/admin/investor-pulse/update-site", label: "Update Site" },
    { href: "/admin/investor-pulse/update-schedule", label: "Update Schedule" },
    { href: "/admin/investor-pulse/pitch-deck", label: "Pitch Deck" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#060606]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#cb6b1e]">
                Investor Pulse
              </p>
              {adminLabel && (
                <p className="text-xs text-[#a3a3a3]">Signed in as {adminLabel}</p>
              )}
            </div>
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-[#cb6b1e] text-black"
                      : "text-[#f6e1bd] hover:bg-[#1a1a1a]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/admin"
            className="text-xs text-[#a3a3a3] underline-offset-4 hover:underline"
          >
            ← Back to Admin Hub
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AdminNav;
