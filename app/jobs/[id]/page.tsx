import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function JobDetail({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });

  if (!job) {
    return <div className='container py-20'>Job not found.</div>;
  }

  return (
    <main className='min-h-screen bg-[#F7FAFC] py-10'>
      <div className='container'>
        <div className='rounded-3xl border border-[var(--line)]/70 bg-gradient-to-b from-[#F7FAFC] to-[#EFF6F8] p-4 md:p-6'>
          <div className='rounded-2xl border border-zinc-100 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)] p-6 md:p-10 grid lg:grid-cols-[1fr_320px] gap-8'>
            <section className='space-y-4'>
              <h1 className='text-4xl font-semibold'>{job.title}</h1>
              <p className='text-zinc-600'>
                {job.category} • {job.location} • {job.salary}
              </p>

              <h2 className='font-semibold pt-4'>Job Description</h2>
              <p className='text-zinc-700 whitespace-pre-wrap'>{job.description}</p>

              <h2 className='font-semibold pt-4'>Requirements</h2>
              <ul className='list-disc pl-6 text-zinc-700'>
                <li>{job.experience}</li>
                <li>{job.skills.join(', ')}</li>
              </ul>
            </section>

            <aside className='lg:sticky lg:top-20 card p-4 h-fit bg-white'>
              <Link href={`/apply/${job.id}`} className='btn-primary block w-full text-center'>
                Apply Now
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
