"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type BizDevNavProps = {
  adminLabel?: string;
};

const BizDevNav = ({ adminLabel }: BizDevNavProps) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/admin/biz-dev", label: "Overview", exact: true, icon: "◇" },
    { href: "/admin/biz-dev/north-star", label: "North Star", icon: "★" },
    { href: "/admin/biz-dev/time-horizons", label: "Time Horizons", icon: "◎" },
    { href: "/admin/biz-dev/quarterly", label: "Quarterly", icon: "◆" },
    { href: "/admin/biz-dev/experiments", label: "Experiments", icon: "⚗" },
    { href: "/admin/biz-dev/weekly", label: "Weekly", icon: "▣" },
    { href: "/admin/biz-dev/system-map", label: "System Map", icon: "⬡" },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const currentPage = navItems.find((item) => isActive(item.href, item.exact));

  return (
    <header className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#060606]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and nav */}
          <div className="flex items-center gap-4 lg:gap-8">
            {/* Logo/Title */}
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#cb6b1e]">
                  Biz Dev
                </p>
                {adminLabel && (
                  <p className="text-xs text-[#a3a3a3] hidden sm:block">
                    Signed in as {adminLabel}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Nav - hidden on mobile */}
            <nav className="hidden lg:flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(item.href, item.exact)
                      ? "bg-[#cb6b1e] text-black"
                      : "text-[#f6e1bd] hover:bg-[#1a1a1a]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Tablet Nav - scrollable on medium screens */}
            <nav className="hidden md:flex lg:hidden gap-1 overflow-x-auto scrollbar-hide max-w-[400px]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive(item.href, item.exact)
                      ? "bg-[#cb6b1e] text-black"
                      : "text-[#f6e1bd] hover:bg-[#1a1a1a]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile - Current page indicator */}
            <div className="md:hidden flex items-center gap-2">
              <span className="text-[#cb6b1e]">{currentPage?.icon}</span>
              <span className="text-sm text-[#f6e1bd]">{currentPage?.label}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Back to Admin link - hidden on mobile */}
            <Link
              href="/admin"
              className="hidden sm:block text-xs text-[#a3a3a3] underline-offset-4 hover:underline"
            >
              ← Back to Admin Hub
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-[#f6e1bd] hover:bg-[#1a1a1a]"
              aria-label="Toggle menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1f1f1f] bg-[#0a0a0a]">
          <nav className="px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href, item.exact)
                    ? "bg-[#cb6b1e] text-black"
                    : "text-[#f6e1bd] hover:bg-[#1a1a1a]"
                }`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#a3a3a3] hover:bg-[#1a1a1a]"
            >
              <span className="w-5 text-center">←</span>
              Back to Admin Hub
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default BizDevNav;
