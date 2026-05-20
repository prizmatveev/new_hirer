"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminRegister() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/register', { method: 'POST', body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error || 'Failed');
    setMsg('Registered. Redirecting to login...');
    setTimeout(() => router.push('/admin/login'), 800);
  };

  return <main className='min-h-screen grid place-items-center p-6'><form onSubmit={submit} className='card p-8 w-full max-w-md space-y-4'><h1 className='text-2xl font-semibold'>Admin Registration</h1><input className='border rounded-lg p-3 w-full' placeholder='Name' value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className='border rounded-lg p-3 w-full' placeholder='Email' value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><div className='relative'><input type={showPassword?'text':'password'} className='border rounded-lg p-3 w-full pr-12' placeholder='Password' value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type='button' aria-label={showPassword?'Hide password':'Show password'} className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-800' onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><button className='btn-primary w-full'>Create Admin</button><p className='text-sm text-zinc-600'>{msg}</p></form></main>;
}
