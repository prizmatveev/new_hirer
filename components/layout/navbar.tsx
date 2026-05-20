"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";

const links = [
  ["About", "#about"],
  ["Contact Us", "#contact"],
  ["Jobs", "#jobs"],
  ["Login", "/admin/login"],
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 py-4">
      <nav className="container shell h-16 px-6 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          HireTech
        </Link>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          <Menu size={20} />
        </button>

        <div className="hidden md:flex gap-8 items-center">
          {links.map(([name, href]) => (
            <Link key={name} href={href} className="text-sm hover:text-zinc-600 transition-colors">
              {name}
            </Link>
          ))}
          <button className="rounded-xl border border-zinc-700/40 px-5 py-2 text-sm">Register Now</button>
        </div>
      </nav>

      {open && (
        <div className="container md:hidden mt-2 shell p-4 flex flex-col gap-2">
          {links.map(([name, href]) => (
            <Link key={name} href={href}>
              {name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
