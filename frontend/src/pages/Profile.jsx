import React from 'react'
import { BookOpen, Clock, Trophy, Share2, Flame } from 'lucide-react'
import { useState , useEffect } from 'react';
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  // Mock Data for Stats
  const [user , setUser] = useState(null);
  const [coursesCreated, setCoursesCreated] = useState(null);
  const [hoursLearned, setHoursLearned] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [totalVideosCreated, setTotalVideosCreated] = useState(0);
  const [profileCopied, setProfileCopied] = useState(false)

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    date: ""
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [activitySummary, setActivitySummary] = useState({
    heatmap: {},
    streak: 0,
    totalActiveDays: 0
  });

//courses created 
useEffect(() => {
  if (!user){
    return;
  }
  const getUserData = async () => {
    try {
      const data = await axios.get(`${import.meta.env.VITE_API_URL}/course`, {
        withCredentials: true,
      });
      if (data.status === 200) {
        const coursesData = data.data?.data || [];
        setCoursesCreated(coursesData.length);
        let vidsComp = 0;
        let totalVideos = 0;
        coursesData.forEach((e) => {
          vidsComp = vidsComp + e.completedVideos.length-1;
          totalVideos = totalVideos + e.totalVideos;
        })
        setHoursLearned(
          vidsComp
        );
        setTotalVideosCreated(totalVideos)
        setCompletionRate(totalVideos ? Math.floor((vidsComp / totalVideos) * 100) : 0);
      }
    } catch (error) {
      console.log(error);
    }
  };
  getUserData();
},[user]);

  
  const streak = activitySummary?.streak || 0;

  const stats = [
    { label: 'Courses Created', value: coursesCreated, icon: BookOpen, color: 'text-blue-400' },
    { label: 'Lessons Completed', value:`${hoursLearned} / ${totalVideosCreated}`, icon: Clock, color: 'text-amber-400' },
    { label: 'Completion Rate', value:`${completionRate}%`, icon: Trophy, color: 'text-emerald-400' },
    { label: 'Current Streak', value:`${streak} days`, icon: Flame, color: 'text-orange-500' },
  ]

useEffect(() => {    
  const fetchUser = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/auth/check`,
        { withCredentials: true }
      );
      if(res.data?.success){
        setUser(res.data?.data);
        const activityRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/auth/activity-summary`,
          { withCredentials: true }
        );
        if(activityRes?.data?.success){
          setActivitySummary(activityRes?.data?.data || {
            heatmap: {},
            streak: 0,
            totalActiveDays: 0
          });
        }
      }
      else{
        navigate("/login");
      }
    } catch {
      console.log("User not logged in");
      navigate("/login");
    } finally {
      setProfileLoading(false);
    }
  };

  fetchUser();
  
}, [navigate]);

const startOfYear = new Date(new Date().getFullYear(), 0, 1);

const heatmapData = Array.from({ length: 364 }, (_, index) => {
  if (!user) return 0;

  const dateForIndex = new Date(startOfYear);
  dateForIndex.setDate(startOfYear.getDate() + index);
  const key = dateForIndex.toISOString().slice(0, 10);
  const count = activitySummary?.heatmap?.[key]?.count || 0;

  if (count >= 4) {
    return 4;
  }
  if (count === 3) {
    return 3;
  }
  if (count === 2) {
    return 2;
  }
  if (count === 1) {
    return 1;
  }

  return 0;
});



const getHeatmapColor = (level) => {
    switch (level) {
      case 4: return 'bg-blue-300';
      case 3: return 'bg-blue-400';
      case 2: return 'bg-blue-500';
      case 1: return 'bg-blue-600';
      default: return 'bg-neutral-800/50';
    }
  };
const experienceLevel=()=>{
  if(coursesCreated < 5) return "Beginner";
  else if(coursesCreated>=5 && coursesCreated<=10) return "Intermediate";
  else if(coursesCreated>30 && coursesCreated <=45) return "Advanced";
  else return "Expert";
}

const getName=(name)=>{
  if(!name) return '';
  const initial=name.trim().split(" ");
  if(initial.length==1) return initial[0][0].toUpperCase();
  return(initial[0][0]+initial[1][0]).toUpperCase();
}


  if (profileLoading || !user || coursesCreated === null)
    return (
      <div className="flex items-center justify-center min-h-screen  selection:bg-[#2563EB] selection:text-black overflow-hidden relative">
        <div
          className="absolute inset-0 z-0 animate-grid"
          style={{
            backgroundColor: "#0a0a0a",
            backgroundImage: `
      radial-gradient(circle at 25% 25%, #222222 0.5px, transparent 1px),
      radial-gradient(circle at 75% 75%, #111111 0.5px, transparent 1px)
    `,
            backgroundSize: "10px 10px",
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
    <div className="min-h-screen selection:bg-[#2563EB] selection:text-white relative text-gray-100 font-sans overflow-hidden">

      {/* BACKGROUND LAYER */}
        <div
  className="absolute inset-0 z-0 animate-grid" // <--- Added class here
  style={{
    backgroundColor: '#0a0a0a',
    backgroundImage: `
      radial-gradient(circle at 25% 25%, #222222 0.5px, transparent 1px),
      radial-gradient(circle at 75% 75%, #111111 0.5px, transparent 1px)
    `,
    backgroundSize: '10px 10px', // The animation moves exactly this distance
    imageRendering: 'pixelated',
  }}
/>

      {/* MAIN CONTENT */}
      <div className="relative z-10  mx-auto px-4 mt-28 pb-10 max-w-5xl">
        
        {/* 1. USER HEADER */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 mb-8 border-b border-white/10 pb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            {/* Avatar */}
            <div className="h-28 w-28 rounded-full p-1 bg-linear-to-tr from-blue-600 to-amber-600">
               <div className="h-full w-full rounded-full bg-neutral-900 border-4 border-[#0a0a0a] flex items-center justify-center overflow-hidden">
                  <span className="text-4xl font-bold text-gray-200">{getName(user?.username)}</span>
                  {/* <img src="URL_HERE" alt="user" className="h-full w-full object-cover" /> */}
               </div>
            </div>
            
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {user !== null ? user.username : "Loading..."}
              </h1>
              <p className="text-gray-400 font-medium mb-1">
                {user !==null ? user.email : "Loading..."}
              </p>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                 
                 <span className="text-xs text-gray-500">Joined: {new Date(user?.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: '2-digit', 
                  year: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end items-center">
             {/* <button className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-400 transition-all">
                <Share2 size={18} />
             </button> */}
              <span className={`px-3 py-0.5 w-fit ${experienceLevel(hoursLearned) === "Beginner" ? 'bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20': `${experienceLevel(hoursLearned) === "Intermediate" ? 'bg-yellow-500/10 text-yellow-400 text-sm border border-yellow-500/20':'bg-red-500/10 text-red-400 text-sm border border-red-500/20' }` } rounded-xs  font-mono`}>
                {experienceLevel(hoursLearned)}
              </span>
             
             <button
              onClick={
                () => {
                  try {
                    navigator.clipboard.writeText(window.location.href);
                    setProfileCopied(true);
                    setTimeout(() => setProfileCopied(false), 2000);
                  } catch (error) {
                    console.log(error)
                  }
                  
                }
              }
             className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 hover:border-neutral-600 transition-all text-sm text-gray-300">
                <Share2 size={16} />
                {profileCopied ? 'Copied!' : 'Share Profile' }
             </button>
          </div>
        </div>

        {/* 2. STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="py-4 px-5  rounded-xs bg-[#0E0E0E] border border-neutral-800 backdrop-blur-sm hover:bg-[#141414] transition-all flex gap-4  items-center  group">
              <div className={`mb-2 p-2 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <div className='flex flex-col'>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{stat.label}</span>
              <span className="text-xl font-bold text-white mb-1 tracking-tight">{stat.value}</span>
              </div>
               
            </div>
          ))}
        </div>

        {/* 3. ACTIVITY HEATMAP */}
        <div className="rounded-2xl border border-neutral-800 bg-[#0c0c0c]/80 backdrop-blur-md p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Learning Activity</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Not Active</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-neutral-800/50"></div>
                {/* <div className="w-3 h-3 rounded-sm bg-blue-900/40"></div> */}
                <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
                {/* <div className="w-3 h-3 rounded-sm bg-blue-400"></div> */}
              </div>
              <span>Active</span>
            </div>
          </div>

          {/* The Grid Container */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-175">
              {/* Grid: 7 rows (days), flows column-wise */}
              <div className="grid grid-rows-7 grid-flow-col gap-0.75">
                {heatmapData.map((level, i) => {
                    const dateForBlock = new Date(startOfYear);
                    dateForBlock.setDate(startOfYear.getDate() + i);

                return (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-[2px] ${getHeatmapColor(level)} hover:ring-1 hover:ring-white/50 transition-all cursor-pointer`}
                    onMouseEnter={(e) =>
                      setTooltip({
                        visible: true,
                         x: e.clientX,
                        y: e.clientY,
                        date: dateForBlock.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }),

                      })
                    }
                    onMouseLeave={() =>
                      setTooltip({ ...tooltip, visible: false })
                    }
                 />
                );
              })}
              </div>
              
              {/* Month Labels (Visual only) */}
              <div className="flex justify-between text-[10px] text-gray-600 font-mono mt-2 px-1">
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
              </div>
            </div>
          </div>
        </div>
        {tooltip.visible && (
          <div
            className="fixed z-50 px-2 py-1 text-xs bg-black border border-neutral-700 rounded-md text-white pointer-events-none"
            style={{
              top: tooltip.y + 10,
              left: tooltip.x + 10,
            }}
          >
            {tooltip.date}
          </div>
        )}

      </div>
    </div>
  )
}

export default Profile
