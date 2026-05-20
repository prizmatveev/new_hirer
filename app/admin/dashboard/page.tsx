"use client";

import { useEffect, useMemo, useState } from "react";

type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  salary: string;
  experience: string;
  employmentType: string;
  skills: string[];
  isOpen: boolean;
};

type Note = { id: string; note: string };
type AppRow = {
  id: string;
  phone: string;
  resume: string;
  linkedin: string;
  github: string;
  portfolio?: string | null;
  status: "PENDING" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED";
  createdAt: string;
  user: { name: string; email: string };
  job: { title: string };
  notes: Note[];
};

const statusOptions = ["PENDING", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"] as const;

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<AppRow | null>(null);
  const [jobForm, setJobForm] = useState({ title: "", category: "", description: "", location: "", salary: "", experience: "", employmentType: "Full Time", skills: "" });

  const load = async () => {
    const [jobsRes, appsRes] = await Promise.all([
      fetch("/api/admin/jobs", { cache: "no-store" }),
      fetch("/api/admin/applications", { cache: "no-store" }),
    ]);
    if (jobsRes.ok) setJobs(await jobsRes.json());
    if (appsRes.ok) setApplications(await appsRes.json());
  };

  useEffect(() => { void load(); }, []);

  const filteredApplications = useMemo(() => applications.filter((a) => {
    const q = query.toLowerCase();
    const matchesQ = !q || a.user.name.toLowerCase().includes(q) || a.user.email.toLowerCase().includes(q) || a.job.title.toLowerCase().includes(q);
    const matchesS = !statusFilter || a.status === statusFilter;
    return matchesQ && matchesS;
  }), [applications, query, statusFilter]);

  const newApplicants = applications.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 7 * 24 * 3600 * 1000).length;
  const hiredRate = Math.round((applications.filter((a) => a.status === "HIRED").length / Math.max(1, applications.length)) * 100);

  const addJob = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...jobForm, skills: jobForm.skills.split(",").map((s) => s.trim()).filter(Boolean), isOpen: true }) });
    setJobForm({ title: "", category: "", description: "", location: "", salary: "", experience: "", employmentType: "Full Time", skills: "" });
    await load();
  };

  return <main className="container py-10 space-y-6">
    <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card p-4">Total applications: {applications.length}</div>
      <div className="card p-4">Open positions: {jobs.filter((j) => j.isOpen).length}</div>
      <div className="card p-4">New applicants: {newApplicants}</div>
      <div className="card p-4">Hiring analytics: {hiredRate}% hired</div>
    </div>

    <section className="card p-4 space-y-3">
      <h2 className="font-semibold">Jobs Management</h2>
      <form onSubmit={addJob} className="grid md:grid-cols-4 gap-2">
        <input className="border rounded p-2" placeholder="Title" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} required />
        <input className="border rounded p-2" placeholder="Category" value={jobForm.category} onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })} required />
        <input className="border rounded p-2" placeholder="Location" value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} required />
        <input className="border rounded p-2" placeholder="Salary" value={jobForm.salary} onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })} required />
        <input className="border rounded p-2" placeholder="Experience" value={jobForm.experience} onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })} required />
        <input className="border rounded p-2" placeholder="Employment Type" value={jobForm.employmentType} onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })} required />
        <input className="border rounded p-2 md:col-span-2" placeholder="Skills comma separated" value={jobForm.skills} onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })} />
        <textarea className="border rounded p-2 md:col-span-4" placeholder="Description" value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} required />
        <button className="btn-primary md:col-span-1" type="submit">Add Job</button>
      </form>

      <div className="grid gap-2">
        {jobs.map((j) => <div key={j.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span>{j.title} ({j.category}) - {j.location}</span>
          <div className="flex gap-2">
            <button className="border rounded px-3 py-1" onClick={async () => { await fetch(`/api/admin/jobs/${j.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOpen: !j.isOpen }) }); await load(); }}>{j.isOpen ? "Mark Closed" : "Mark Open"}</button>
            <button className="border rounded px-3 py-1" onClick={async () => { const title = prompt("Edit job title", j.title); if (!title) return; await fetch(`/api/admin/jobs/${j.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }); await load(); }}>Edit</button>
            <button className="border rounded px-3 py-1 text-red-600" onClick={async () => { await fetch(`/api/admin/jobs/${j.id}`, { method: "DELETE" }); await load(); }}>Delete</button>
          </div>
        </div>)}
      </div>
    </section>

    <section className="card p-4 overflow-auto space-y-3">
      <h2 className="font-semibold">Applicants</h2>
      <div className="flex flex-col md:flex-row gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search candidate, email, role" className="border rounded-lg p-2 md:min-w-72" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg p-2">
          <option value="">All statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b"><th className="text-left p-2">Candidate</th><th>Role</th><th>Status</th><th>Resume</th><th>Actions</th></tr></thead>
        <tbody>
          {filteredApplications.map((a) => <tr key={a.id} className="border-b align-top"><td className="p-2">{a.user.name}<div className="text-zinc-500">{a.user.email}<br />{a.phone}</div></td><td>{a.job.title}</td><td>{a.status}</td><td><a href={a.resume} className="underline">Download</a></td><td className="p-2"><div className="flex gap-2 flex-wrap">
            <select className="border rounded p-1" defaultValue={a.status} onChange={async (e) => { await fetch(`/api/admin/applications/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: e.target.value }) }); await load(); }}>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="border rounded px-2" onClick={() => setSelected(a)}>Profile</button>
          </div></td></tr>)}
        </tbody>
      </table>
    </section>

    {selected && <div className="fixed inset-0 bg-black/40 grid place-items-center p-4" onClick={() => setSelected(null)}>
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold">Candidate Profile</h3>
        <p>{selected.user.name} • {selected.user.email} • {selected.phone}</p>
        <p><a className="underline mr-2" href={selected.linkedin}>LinkedIn</a><a className="underline mr-2" href={selected.github}>GitHub</a>{selected.portfolio && <a className="underline" href={selected.portfolio}>Portfolio</a>}</p>
        <p><a className="underline" href={selected.resume}>Resume Preview/Download</a></p>
        <div><h4 className="font-medium">Notes</h4>{selected.notes.map((n) => <div key={n.id}>• {n.note}</div>)}</div>
        <form onSubmit={async (e) => { e.preventDefault(); const note = (new FormData(e.currentTarget).get("note") as string) || ""; if (!note.trim()) return; await fetch(`/api/admin/applications/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: selected.status, note }) }); setSelected(null); await load(); }} className="flex gap-2">
          <input name="note" className="border rounded p-2 flex-1" placeholder="Internal recruiter comment" />
          <button className="btn-primary" type="submit">Add Note</button>
        </form>
      </div>
    </div>}
  </main>;
}
