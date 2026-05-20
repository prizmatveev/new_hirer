"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { useAppStore } from "@/lib/store";
import { useEffect, useMemo, useState } from "react";

type Job = {
  id: string;
  title: string;
  category: string;
  location: string;
  employmentType: string;
};

const baseCategories = ["Web Development", "App Development", "Graphics Design", "Explore All Roles"];

export default function Home() {
  const { category, setCategory } = useAppStore();
  const [jobs, setJobs] = useState<Job[]>([]);

  const loadJobs = async () => {
    const res = await fetch('/api/jobs', { cache: 'no-store' });
    if (!res.ok) return;
    setJobs(await res.json());
  };

  useEffect(() => {
    void loadJobs();

    const intervalId = window.setInterval(() => {
      void loadJobs();
    }, 5000);

    const handleFocus = () => {
      void loadJobs();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const categories = useMemo(() => {
    const dynamic = Array.from(new Set(jobs.map((j) => j.category).filter(Boolean)));
    return Array.from(new Set([...baseCategories.slice(0, 3), ...dynamic, 'Explore All Roles']));
  }, [jobs]);

  const filtered = category === "Explore All Roles" ? jobs : jobs.filter((j) => j.category === category);

  return (
    <main className="pb-12">
      <Navbar />
      <section className="container shell p-8 md:p-12 grid lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl leading-tight font-medium">Work with Us</h1>
          <p className="text-zinc-600 text-lg max-w-xl">Find jobs that match your interests and abilities with a minimal, modern hiring experience.</p>
          <button className="btn-primary" onClick={() => document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" })}>Get Started</button>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[#e5f2f4] min-h-[360px]" />
      </section>

      <section className="container -mt-8 relative z-10">
        <div className="card p-4 md:p-5 grid md:grid-cols-4 gap-3">
          {categories.map((c) => (
            <button key={c} onClick={() => { setCategory(c); document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm hover:bg-zinc-50 transition">{c}</button>
          ))}
        </div>
      </section>

      <section id="jobs" className="container py-12 space-y-4">
        <div className="flex justify-end">
          <button className="border rounded-lg px-3 py-2 text-sm" onClick={() => void loadJobs()}>Refresh Jobs</button>
        </div>
        {filtered.map((job) => (
          <motion.article key={job.id} whileHover={{ scale: 1.01 }} className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">{job.title}</h3>
              <p className="text-sm text-zinc-600">{job.category} • {job.location} • {job.employmentType}</p>
            </div>
            <Link href={`/jobs/${job.id}`} className="btn-primary text-sm">Apply Now</Link>
          </motion.article>
        ))}
      </section>
    </main>
  );
}
