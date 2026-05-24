"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

type FormData={fullName:string;email:string;phone:string;location:string;experience:string;linkedin:string;github:string;portfolio?:string;coverLetter?:string;currentCompany?:string;expectedSalary?:string;noticePeriod?:string};

export default function ApplyPage(){
  const params=useParams<{jobId:string}>();
  const jobId = typeof params?.jobId === 'string' ? params.jobId : Array.isArray(params?.jobId) ? params.jobId[0] : '';
  const[resume,setResume]=useState<File|null>(null);
  const{register,handleSubmit,reset,formState:{errors,isSubmitting}}=useForm<FormData>();

  const onSubmit=async(data:FormData)=>{
    if(!jobId){toast.error('Invalid job link. Please open the job again.');return;}
    if(!resume){toast.error('Resume is required');return;}
        const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('resume', resume);
    formData.append('fullName', data.fullName);
    formData.append('email', data.email);
    formData.append('phone', data.phone);
    formData.append('location', data.location);
    formData.append('experience', data.experience);
    if (data.currentCompany) formData.append('currentCompany', data.currentCompany);
    if (data.expectedSalary) formData.append('expectedSalary', data.expectedSalary);
    if (data.coverLetter) formData.append('coverLetter', data.coverLetter);
    formData.append('linkedin', data.linkedin);
    formData.append('github', data.github);
    if (data.portfolio) formData.append('portfolio', data.portfolio);
    const res=await fetch('/api/applications',{method:'POST',body:formData});
    const payload = await res.json().catch(()=>({}));
    if(!res.ok){toast.error(payload?.error || 'Failed to submit application');return;}
    toast.success('Application submitted successfully');
    reset();
    setResume(null);
  };

  return <main className='container py-12 shell p-6 md:p-10'><h1 className='text-3xl font-semibold mb-8'>Submit Your Application</h1><form onSubmit={handleSubmit(onSubmit)} className='card p-8 space-y-6 bg-[var(--panel)]'><div><label className='text-sm font-medium'>Upload Resume/CV *</label><input type='file' accept='.pdf,.doc,.docx' className='mt-2 block w-full border rounded-lg p-3' onChange={(e)=>setResume(e.target.files?.[0]||null)}/></div><div className='grid md:grid-cols-2 gap-4'><input placeholder='Full Name *' className='border rounded-lg p-3' {...register('fullName',{required:true})}/><input placeholder='Email *' className='border rounded-lg p-3' {...register('email',{required:true})}/><input placeholder='Phone *' className='border rounded-lg p-3' {...register('phone',{required:true})}/><input placeholder='Current Location *' className='border rounded-lg p-3' {...register('location',{required:true})}/><input placeholder='Years of Experience *' className='border rounded-lg p-3' {...register('experience',{required:true})}/><input placeholder='Current Company' className='border rounded-lg p-3' {...register('currentCompany')}/></div><h2 className='font-semibold'>Links</h2><div className='grid md:grid-cols-2 gap-4'><input placeholder='LinkedIn URL *' className='border rounded-lg p-3' {...register('linkedin',{required:true})}/><input placeholder='GitHub URL *' className='border rounded-lg p-3' {...register('github',{required:true})}/><input placeholder='Portfolio URL' className='border rounded-lg p-3' {...register('portfolio')}/><input placeholder='Expected Salary' className='border rounded-lg p-3' {...register('expectedSalary')}/></div><textarea placeholder='Cover Letter' className='border rounded-lg p-3 min-h-28 w-full' {...register('coverLetter')}/><button disabled={isSubmitting} className='btn-primary'>{isSubmitting?'Submitting...':'Submit Your Application'}</button>{Object.keys(errors).length>0&&<p className='text-sm text-red-600'>Please complete required fields.</p>}</form></main>
}
