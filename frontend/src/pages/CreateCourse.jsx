import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftToLine, ArrowRight, ChartNoAxesCombinedIcon, LogInIcon, LogOutIcon, LucideAlignCenter, Mail } from 'lucide-react';
import Navbar from "../components/Navbar";

const CreateCourse = () => {

    

  const [playlist, setPlaylist] = useState("");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [statusCode, setStatusCode] = useState({});
  const [infor, setInfor] = useState({})
  const navigate = useNavigate();
  

  const playlistHandle = (e) => {
    setPlaylist(e.target.value);
  };
  
  const titleHandle = (e) => {
    setTitle(e.target.value);
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(
        `${import.meta.env.VITE_API_URL}/auth/check`, {withCredentials: true}
      );
      if(responsePost.data.code === 200){
        setIsLoggedIn(true);
        setInfor(response.data.info);
      }
      else{
        setIsLoggedIn(false);
        navigate('/signup')
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    checkAuth();
  })

  const backendResponse = async (payload) => {
    try {
      const responsePost = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/create`,
        payload,
        {withCredentials: true}
      );
      return responsePost;
    } catch (error) {
      // console.log(error.status);
      return error;
    }
    finally{
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      url: playlist,
      name: title,
      owner: infor.username,
    };
    setLoading(true);
    const res = await backendResponse(payload);
    if (res.status === 409) {
      console.log(res.response.data);
      setStatusCode({
        code: res.status,
        data: res.response.data,
      });

    } else if (res.status === 200) {
      console.log(res.data);
      setStatusCode({
        code: res.status,
        data: res.data,
      });
      const url = `/courses`
      navigate(url)
    }
    else{
      setStatusCode({
        code: res.status,
        data: res.data,
      });
    }

  };
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen selection:bg-[#2563EB] selection:text-black overflow-hidden relative">
        <div
          className="absolute inset-0 z-0 animate-grid" // <--- Added class here
          style={{
            backgroundColor: "#0a0a0a",
            backgroundImage: `
      radial-gradient(circle at 25% 25%, #222222 0.5px, transparent 1px),
      radial-gradient(circle at 75% 75%, #111111 0.5px, transparent 1px)
    `,
            backgroundSize: "10px 10px", // The animation moves exactly this distance
            imageRendering: "pixelated",
          }}
        />
        <div class="container">
          <div class="h1Container">
            <div class="cube h1 w1 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h1 w1 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h1 w1 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h1 w2 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h1 w2 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h1 w2 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h1 w3 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h1 w3 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h1 w3 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>
          </div>

          <div class="h2Container">
            <div class="cube h2 w1 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h2 w1 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h2 w1 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h2 w2 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h2 w2 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h2 w2 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h2 w3 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h2 w3 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h2 w3 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>
          </div>

          <div class="h3Container">
            <div class="cube h3 w1 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h3 w1 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h3 w1 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h3 w2 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h3 w2 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h3 w2 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h3 w3 l1">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h3 w3 l2">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>

            <div class="cube h3 w3 l3">
              <div class="face top"></div>
              <div class="face left"></div>
              <div class="face right"></div>
            </div>
          </div>
        </div>
      </div>
    );
  
  return (

    <div className="min-h-screen h-fit flex items-center justify-center bg-[#0A0A0A]  selection:bg-[#2563EB] selection:text-black overflow-hidden relative p-4">
      {/* <Navbar /> */}
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
          <div className="w-full md:max-w-135 relative z-10">
      {/* Decorative Elements */}
      {/* Main Card */}
      
         <div className="md:mt-10 p-4 md:p-10 overflow-hidden relative">
        {/* Header */}
        <div className="mb-10 relative ">
          
          
          
          <div className="flex justify-between">
          <h1 className="text-4xl font-black  text-white tracking-tight leading-none mb-3">
            Create a course  <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#2563EB] to-[#ffffff]">
              in seconds!
            </span>
          </h1>
          {/* <Link to={`/courses`}>
            <span className="py-1 px-3 rounded-full text-[14px] font-bold text-zinc-400 tracking-widest mb-4 flex gap-1 items-center">
              div<ArrowLeftToLine  strokeWidth={1} absoluteStrokeWidth />
              <ArrowLeftToLine size={14} />
              Home
            </span>
          </Link> */}
          </div>
          <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-sm">
            Convert any Youtube playlist into a full fledged course. Paste the link to get started!
          </p>
        </div>

        {/* Form Inputs (Visual Only) */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Input 1: Playlist Link */}
            {/* <div className="group relative">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-4 mb-2 block group-focus-within:text-[#2563EB] transition-colors">
                YouTube Playlist URL
              </label>
              <div className="relative transition-all duration-300 group-focus-within:transform group-focus-within:scale-[1.01]">
                <div className="absolute inset-0 bg-linear-to-r from-[#2563EB] to-[#7000FF] rounded-2xl blur-md opacity-0 group-focus-within:opacity-30 transition-opacity duration-500"></div>
                <input
                  autoComplete="off"
                  type="text"
                  placeholder="paste.your.link/here"
                  name="playlist"
                  value={playlist}
                  onChange={playlistHandle}
                  required
                  className="relative w-full bg-[#1A1A1A] text-white text-[15px] font-medium px-5 py-4 rounded-sm border border-zinc-800 placeholder:text-zinc-600 focus:outline-none focus:border-[#2563EB] focus:bg-[#202020] focus:shadow-[0_0_20px_rgba(222,255,10,0.1)] transition-all duration-300"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none group-focus-within:text-[#2563EB] transition-colors duration-300">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19.485 4.515a4 4 0 010 5.656l-1.101 1.102a4 4 0 11-5.656-5.656l4-4a4 4 0 015.656 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div> */}
            
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-4 mb-2 block group-focus-within:text-[#2563EB] transition-colors">
                  YouTube Playlist URL
              </label>
              <div className="group relative">
                <div className="absolute inset-0 bg-linear-to-r from-[#2563EB] to-[#7000FF] rounded-sm blur opacity-0 group-focus-within:opacity-20 transition-opacity duration-500"></div>
                <div className="relative flex items-center bg-[#111010] border border-zinc-800 rounded-sm px-4 py-4 focus-within:border-[#2563EB] focus-within:bg-[#111010] transition-all duration-300">
                    <Mail size={20} className="text-zinc-500 mr-3 group-focus-within:text-[#2563EB] transition-colors" />
                    <input 
                      autoComplete="off"
                    type="text"
                    placeholder="https://youtube.com/playlist?list="
                    name="playlist"
                    value={playlist}
                    onChange={playlistHandle}
                    required
                      className="bg-transparent w-full text-white font-medium placeholder:text-zinc-600 focus:outline-none"
                    />
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-4 mb-2 block group-focus-within:text-[#2563EB] transition-colors">
                  Course Title
              </label>
              <div className="group relative">
                <div className="absolute inset-0 bg-linear-to-r from-[#2563EB] to-[#7000FF] rounded-sm blur opacity-0 group-focus-within:opacity-20 transition-opacity duration-500"></div>
                <div className="relative flex items-center bg-[#111010] border border-zinc-800 rounded-sm px-4 py-4 focus-within:border-[#2563EB] focus-within:bg-[#111010] transition-all duration-300">
                    <LucideAlignCenter size={20} className="text-zinc-500 mr-3 group-focus-within:text-[#2563EB] transition-colors" />
                    <input 
                      autoComplete="off"
                  type="text"
                  placeholder="e.g. React JS"
                  name="title"
                  value={title}
                  onChange={titleHandle}
                  required
                      className="bg-transparent w-full text-white font-medium placeholder:text-zinc-600 focus:outline-none"
                    />
                </div>
              </div>
            </div>
            

            {/* Input 2: Course Name */}
            {/* <div className="group relative">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-4 mb-2 block group-focus-within:text-[#2563EB] transition-colors">
                Course Title
              </label>
              <div className="relative transition-all duration-300 group-focus-within:transform group-focus-within:scale-[1.01]">
                <div className="absolute inset-0 bg-linear-to-r from-[#2563EB] to-[#7000FF] rounded-2xl blur-md opacity-0 group-focus-within:opacity-30 transition-opacity duration-500"></div>
                <input
                  autoComplete="off"
                  type="text"
                  placeholder="e.g. Neon Patterns Advanced"
                  name="title"
                  value={title}
                  onChange={titleHandle}
                  required
                  className="relative w-full bg-[#1A1A1A] text-white text-[15px] font-medium px-5 py-4 rounded-sm border border-zinc-800 placeholder:text-zinc-600 focus:outline-none focus:border-[#2563EB] focus:bg-[#202020] focus:shadow-[0_0_20px_rgba(222,255,10,0.1)] transition-all duration-300"
                />
              </div>
            </div> */}

            {/* Input 3: Owner Name */}
            {/* <div className="group relative">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-4 mb-2 block transition-colors">
                User
              </label>
              <div className="relative transition-all duration-300 ">
                <div className="absolute inset-0 bg-linear-to-r from-[#DEFF0A] to-[#7000FF] rounded-2xl blur-md opacity-0 "></div>
                <input
                  autoComplete="off"
                  type="text"
                  placeholder="e.g. The Design Lead"
                  name="owner"
                  value={infor?.username}
                  readOnly
                  // onChange={ownerHandle}
                  required
                  className="relative w-full focus:outline-none bg-[#1A1A1A] text-zinc-400 text-[15px] font-medium px-5 py-4 rounded-2xl border border-zinc-800 placeholder:text-zinc-600  "
                />
              </div>
            </div> */}
          </div>

          {/* Sassy Submit Button */}
          <div className="pt-10 relative group ">
            <button className="w-full mt-6 bg-[#2563EB] hover:bg-[#2543EB] text-black font-black text-lg py-4 rounded-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group relative overflow-hidden">
               <span className="relative z-10">CREATE COURSE</span>
               <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
               
               {/* Button Shine Effect */}
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
            </button>
            
            <div className="flex items-center justify-center">
            <p
              className={`text-sm font-medium leading-relaxed max-w-sm mt-5 text-center ${
                !statusCode.code
                  ? "hidden"
                  : `${
                      statusCode.code === 200
                        ? "text-green-500"
                        : "text-red-500"
                    }`
              }`}
            >
              {!statusCode.code
                ? ""
                : `${statusCode.code} : ${statusCode.data}`}
            </p>
            </div>
          </div>
        </form>
      </div>
         
        
      

      {/* Bottom Status Bar */}
      {/* <div className="mt-6 flex justify-between items-center px-6 text-xs font-bold text-zinc-600 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="block w-2 h-2 bg-zinc-800 rounded-full"></span>
          <span>Sync Ready</span>
        </div>
        <span>01 / 03</span>
      </div> */}
    </div>
          
          
    </div>
    
  );
};

export default CreateCourse;
