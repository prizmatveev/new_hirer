"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";

const links = [
  ["About", "#about"],
  ["Contact Us", "#contact"],
  ["Jobs", "#jobs"],
] as const;


export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 py-3">
      <nav className="container shell h-16 px-6 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <Image src="/localsm-logo.svg" alt="LocalSM logo" width={28} height={28} />
          <span>LocalSM</span>
        </Link>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          <Menu size={20} />
        </button>

        <div className="hidden md:flex gap-8 items-center">
          {links.map(([name, href]) => {
            const isActive = name === "Jobs";
            return (
              <Link key={name} href={href} className={`text-sm transition-colors ${isActive ? "font-semibold text-zinc-900" : "hover:text-zinc-600"}`}>
                <span className="relative inline-flex items-center">
                  {name}
                  {isActive && <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]" />}
                </span>
              </Link>
            );
          })}
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
