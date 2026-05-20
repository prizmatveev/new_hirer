"use client";
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useState } from 'react';
const links=[['About','#about'],['Contact Us','#contact'],['Jobs','#jobs'],['Login','/admin/login']];
export function Navbar(){const[open,setOpen]=useState(false);return <header className='sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm'><nav className='container h-16 flex items-center justify-between'><Link href='/' className='font-semibold text-lg'>HireTech</Link><button className='md:hidden' onClick={()=>setOpen(!open)}><Menu/></button><div className='hidden md:flex gap-6'>{links.map(([n,h])=><Link key={n} href={h} className='text-sm hover:text-zinc-600'>{n}</Link>)}</div></nav>{open&&<div className='md:hidden border-t p-4 flex flex-col gap-2'>{links.map(([n,h])=><Link key={n} href={h}>{n}</Link>)}</div>}</header>}
