import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function JobDetail({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return <div className='container py-20'>Job not found.</div>;
  return <main className='container py-10 grid lg:grid-cols-[1fr_320px] gap-8'><section className='space-y-4'><h1 className='text-4xl font-semibold'>{job.title}</h1><p className='text-zinc-600'>{job.category} • {job.location} • {job.salary}</p><h2 className='font-semibold pt-4'>Responsibilities</h2><ul className='list-disc pl-6 text-zinc-700'><li>Ship quality experiences.</li><li>Collaborate cross-functionally.</li></ul><h2 className='font-semibold pt-4'>Requirements</h2><ul className='list-disc pl-6 text-zinc-700'><li>{job.experience}</li><li>{job.skills.join(', ')}</li></ul></section><aside className='lg:sticky lg:top-20 card p-4 h-fit'><Link href={`/apply/${job.id}`} className='btn-primary block w-full text-center'>Apply Now</Link></aside></main>;
}
