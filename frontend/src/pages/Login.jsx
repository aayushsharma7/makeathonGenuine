import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, ArrowRight, Github, Chrome } from "lucide-react";
import axios from 'axios';
import Navbar from '../components/Navbar';

const Login = () => {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [resp, setResp] = useState("")
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const checkAuth = async () => {
      try {
        const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
          withCredentials: true,
        });
        if (responsePost.data.code === 200) {
          setIsLoggedIn(true);
          navigate("/courses");
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.log(error);
      }
    };

    useEffect(() => {
      checkAuth();
    }, []);

    const emailHandle = (e) => {
        setEmail(e.target.value)
    }
    const passHandle = (e) => {
        setPassword(e.target.value)
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            email,
            password
        }

        //withCredentials is imp to send cookies
        const apiRes = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`,payload,{
            withCredentials: true
        });
        setResp(apiRes)
        // if(apiRes.data.code === 200){
        //     console.log(apiRes.message)
        // } 
        console.log(apiRes.data.code, apiRes.data.message);
        if(apiRes.data.code===200){
            const url = `/courses`
            navigate(url)
        }
    }
 


  return (
    <div className="min-h-screen  selection:bg-[#2563EB] selection:text-black overflow-hidden relative flex items-center justify-center p-4">
      

      <div
  className="absolute inset-0 z-0 animate-grid"
  style={{
    backgroundColor: '#0a0a0a',
    backgroundImage: `
      radial-gradient(circle at 25% 25%, #222222 0.5px, transparent 1px),
      radial-gradient(circle at 75% 75%, #111111 0.5px, transparent 1px)
    `,
    backgroundSize: '10px 10px',
    imageRendering: 'pixelated',
  }}
/>
      {/* --- MAIN CARD --- */}
      <div className="w-full max-w-lg relative z-10">
        
        <div className="rounded-lg  p-2 md:p-10 relative overflow-hidden group/card">
          
          {/* Subtle internal gradient glow */}
          {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-2 bg-linear-to-r from-transparent via-[#2563EB]/50 to-transparent blur-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-700"></div> */}

          {/* HEADER */}
          <div className="mb-10 text-center relative">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
              Login to our <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#2563EB] via-white to-zinc-400">
                Platform.
              </span>
            </h1>
            <p className="text-zinc-500 font-medium text-sm">
              Start building your knowledge empire today.
            </p>
          </div>

          {/* FORM */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* 1. Name Input */}
            {/* <div className="group relative">
               <div className="absolute inset-0 bg-gradient-to-r from-[#DEFF0A] to-[#7000FF] rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity duration-500"></div>
               <div className="relative flex items-center bg-[#1A1A1A] border border-zinc-800 rounded-2xl px-4 py-4 focus-within:border-[#DEFF0A] focus-within:bg-[#202020] transition-all duration-300">
                  <User size={20} className="text-zinc-500 mr-3 group-focus-within:text-[#DEFF0A] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Full Name"
                    className="bg-transparent w-full text-white font-medium placeholder:text-zinc-600 focus:outline-none"
                    required
                  />
               </div>
            </div> */}

            {/* 2. Email Input */}
            <div className="group relative">
               <div className="absolute inset-0 bg-linear-to-r from-[#2563EB] to-[#7000FF] rounded-sm blur opacity-0 group-focus-within:opacity-20 transition-opacity duration-500"></div>
               <div className="relative flex items-center bg-[#111010] border border-zinc-800 rounded-sm px-4 py-4 focus-within:border-[#2563EB] focus-within:bg-[#111010] transition-all duration-300">
                  <Mail size={20} className="text-zinc-500 mr-3 group-focus-within:text-[#2563EB] transition-colors" />
                  <input 
                    type="email" 
                    placeholder="Email Address"
                    className="bg-transparent w-full text-white font-medium placeholder:text-zinc-600 focus:outline-none"
                    required
                    value={email}
                    onChange={emailHandle}
                  />
               </div>
            </div>

            {/* 3. Password Input */}
            <div className="group relative">
               <div className="absolute inset-0 bg-linear-to-r from-[#2563EB] to-[#7000FF] rounded-sm blur opacity-0 group-focus-within:opacity-20 transition-opacity duration-500"></div>
               <div className="relative flex items-center bg-[#111010] border border-zinc-800 rounded-sm px-4 py-4 focus-within:border-[#2563EB] focus-within:bg-[#111010] transition-all duration-300">
                  <Lock size={20} className="text-zinc-500 mr-3 group-focus-within:text-[#2563EB] transition-colors" />
                  <input 
                    type="password" 
                    placeholder="Password"
                    className="bg-transparent w-full text-white font-medium placeholder:text-zinc-600 focus:outline-none"
                    required
                    value={password}
                    onChange={passHandle}
                  />
               </div>
            </div>

            {/* ACTION BUTTON */}
            <button className="w-full mt-6 bg-[#2563EB] hover:bg-[#2543EB] text-black font-black text-lg py-4 rounded-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group relative overflow-hidden">
               <span className="relative z-10">LOGIN</span>
               <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
               
               {/* Button Shine Effect */}
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
            </button>

          </form>
          {resp?.data?.code ? <div className="mt-4 text-center">
             <p className={`${resp?.data?.code === 200 ? 'text-green-500':'text-red-500'} text-sm font-medium`}>
               {resp?.data?.code === 200 ? '': `${resp?.data?.code}:`} {resp?.data?.message}
             </p>
          </div>: ''}

          {/* DIVIDER */}
          {/* <div className="my-8 flex items-center gap-4">
             <div className="h-[1px] bg-white/10 flex-1"></div>
             <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">or continue with</span>
             <div className="h-[1px] bg-white/10 flex-1"></div>
          </div>

          SOCIALS
          <div className="grid grid-cols-2 gap-4">
             <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 py-3 rounded-xl transition-all group">
                <Github size={18} className="text-zinc-400 group-hover:text-white" />
                <span className="text-sm font-bold text-zinc-400 group-hover:text-white">Github</span>
             </button>
             <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 py-3 rounded-xl transition-all group">
                <Chrome size={18} className="text-zinc-400 group-hover:text-white" />
                <span className="text-sm font-bold text-zinc-400 group-hover:text-white">Google</span>
             </button>
          </div> */}

          {/* FOOTER */}
          <div className="mt-8 text-center">
             <p className="text-zinc-500 text-sm font-medium">
                Don't have an account?{' '}
               <Link to="/signup" className="text-[#2563EB]  font-bold underline decoration-2 underline-offset-4">
                 Sign up here
               </Link>
             </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Login