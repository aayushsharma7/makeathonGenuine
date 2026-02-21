import React, { useEffect, useState } from "react";
import {
  Plus,
  Play,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const HomePage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [infor, setInfor] = useState({});
  const [lastCoursePlayed, setLastCoursePlayed] = useState("none");

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
        withCredentials: true,
      });
      // console.log(responsePost.data);
      if (responsePost.data?.success) {
        setInfor(responsePost.data.data || {});
        // console.log(responsePost.data.info)
        const lastPlayed = localStorage.getItem('last_course_played') || responsePost.data?.data?.lastCoursePlayed;
        setLastCoursePlayed(lastPlayed);
      } else {
        navigate("/signup");
      }
    } catch (error) {
      console.log(error);
      navigate("/login");
    }
  };

  useEffect(() => {
    checkAuth();
    
  }, []);

  const getData = async () => {
    try {
      const data = await axios.get(`${import.meta.env.VITE_API_URL}/course`, {
        withCredentials: true,
      });
      if (data.status === 200) {
        const courseList = data.data?.data || [];
        setCourses([...courseList].reverse());
        
        
        // console.log(data.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      // setIsLoggedIn(true);
      // console.log(isLoggedIn)
    }
  };

  useEffect(() => {
    
    getData();
    // console.log(courses);
  }, []);

  const navigate = useNavigate();

  const goToCourse = (e, n) => {
    navigate(`/courses/${n}/${e}}`);
  };

  const handleLastPlayedCourse = async (courseId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/course/update/lastplayedcourse`,{
        courseId
      },{
        withCredentials: true
      });

      // console.log(apiRes.data?.lastplayedId);
    } catch (error) {
      console.log(error);
    } finally{
      localStorage.setItem(`last_course_played`, `${courseId}`)
    }
  }

  // const changeUser = () => {
  //     setUser('changed');
  // }

  // setTimeout(() => {
  // setLoading(false);
  // },500)

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
    <div className="min-h-screen  selection:bg-[#2563EB] selection:text-black overflow-hidden relative">
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

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-27 ">
        {/* 1. HERO HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-14 ">
          <div className="relative">
            {/* Glowing Accent Dot */}
            {/* <div className="absolute -top-10 -left-10 w-20 h-20 bg-[#2563EB] blur-3xl opacity-20 pointer-events-none"></div> */}

            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[0.9]">
              All your courses <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#2563EB] via-white to-zinc-500">
                start learning!
              </span>
            </h1>
          </div>

          {/* New Ingestion Button (Styled like CreateCourse submit) */}
          <div className="flex flex-col md:items-end gap-3">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-[0.9]">
              Welcome,{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#2563EB] via-white to-zinc-500">
                {infor.username}!
              </span>
            </h1>
            <div className="flex flex-wrap justify-start md:justify-end gap-2">
              <Link
                to="/onboarding"
                className="text-xs font-bold px-3 py-2 border border-white/15 rounded-sm text-zinc-300 hover:text-white hover:border-[#2563EB]/60 transition-colors"
              >
                Start With Onboarding
              </Link>
              <Link
                to="/create"
                className="text-xs font-bold px-3 py-2 border border-white/15 rounded-sm text-zinc-300 hover:text-white hover:border-[#2563EB]/60 transition-colors"
              >
                Create From Playlist
              </Link>
              <Link
                to="/create?type=custom"
                className="text-xs font-bold px-3 py-2 border border-white/15 rounded-sm text-zinc-300 hover:text-white hover:border-[#2563EB]/60 transition-colors"
              >
                Create Custom Course
              </Link>
            </div>
          </div>

          {/* <Link to={`/create`} className="group relative inline-flex">
                  <button className=" relative inline-flex items-center justify-center px-8 py-4 text-base font-black text-black transition-all duration-200 bg-[#DEFF0A] font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-[#CBEA00] active:scale-[0.98]">
                    <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
                    NEW COURSE
                  </button>
                </Link> */}
        </div>
        <div className={`${lastCoursePlayed === "none" ? 'hidden':''}`}>
          <div className="relative">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-[0.9] mb-6 ml-1 -mt-1">
              Continue Watching
            </h1>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.filter((item) => item._id === lastCoursePlayed ).map((course, idx) => (
            <div
              key={idx}
              className={`group ${
                courses.length > 0 ? "" : "hidden"
              } relative bg-[#111010]/60 backdrop-blur-md border border-white/5 rounded-md overflow-hidden transition-all duration-500 hover:shadow-[#2563EB] hover:-translate-y-1`}
            >
              {/* Card Image Area */}
              <div className="relative h-56 w-full overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-transparent to-transparent z-10 opacity-90"></div>
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 group-hover:blur-[1.5px] transition-transform duration-700 ease-out grayscale-[0.2] group-hover:grayscale-0"
                />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 bg-zinc-200 rounded-md border-2 border-black  flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform duration-300">
                    <button
                      onClick={() => {
                        goToCourse(course._id, course.title);
                      }}
                      className="cursor-pointer"
                    >
                      <Play fill="black" className="w-5 h-5 ml-1 text-black" />
                    </button>
                  </div>
                </div>

                {/* Duration Badge */}
                {/* <div className="absolute top-4 right-4 z-20">
                  <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                    <Clock size={12} className="text-[#DEFF0A]" />
                    <span className="text-[11px] font-bold text-white tracking-wide">
                      18hr
                    </span>
                  </div>
                </div> */}
              </div>

              {/* Card Content Area */}
              <div className="p-6 pt-5 relative z-20">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <h3 className="text-xl capitalize font-bold text-white leading-tight mb-1 group-hover:text-[#2563EB] transition-colors duration-300">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold tracking-wider">
                      <User size={12} />
                      {course.owner}
                    </div>
                  </div>
                  {/* <button className="text-zinc-600 hover:text-white transition-colors">
                    <MoreVertical size={20} />
                  </button> */}
                </div>

                {/* Progress Bar (Visual) */}
                {/* <div className="mt-6">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-2 tracking-widest uppercase">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${course.progress}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        course.progress > 0
                          ? "bg-[#DEFF0A] shadow-[0_0_10px_#DEFF0A]"
                          : "bg-zinc-700"
                      }`}
                    ></div>
                  </div>
                </div> */}

                {/* Continue/Start Link */}
                <div className={`flex gap-2 ${Math.floor(((course.completedVideos.length-1)/course.totalVideos)*100) === 0 ? '':''}`}>
                            <div
                              className={` w-full h-1 bg-zinc-800/50 rounded-full mt-2 overflow-hidden`}
                            >
                              <div
                                className={`h-full bg-blue-500  rounded-full opacity-80`}
                                style={{
                                  width: `${(((course.completedVideos.length-1)/course.totalVideos)*100)}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className={`text-[11px] font-medium text-zinc-500
                            
                            `}
                            >
                              {`${Math.floor(((course.completedVideos.length-1)/course.totalVideos)*100)}%`}
                            </span>
                          </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2 justify-between">
                  <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Lesson: {Number(localStorage.getItem(`last_video_played_${course._id}`))+1}
                  </span>
                  <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Total Videos: {course.totalVideos}
                  </span>
                  <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Modules: {course.learningModules?.length || 0}
                  </span>
                  {/* <span className="text-[11px] font-black text-[#2563EB] tracking-wider uppercase opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    {course.progress > 0 ? "RESUME >" : "START >"}
                  </span> */}
                </div>
              </div>
            </div>
          ))}
          <Link
            to={`/create`}
            className="group relative border border-dashed border-zinc-800 rounded-md flex flex-col items-center justify-center p-6 hover:border-[#2563EB]/40 hover:bg-[#2563EB]/2 transition-all duration-300 min-h-75"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:border-[#2563EB] transition-all duration-300">
              <Plus
                size={24}
                className="text-zinc-600 group-hover:text-[#2563EB]"
              />
            </div>
            <span className="mt-4 text-sm font-bold text-zinc-600 tracking-widest uppercase group-hover:text-zinc-400">
              Add New Course
            </span>
          </Link>
        </div>
        </div>
        
        <div className="relative mt-15">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-[0.9] mb-6 ml-1">
              All Courses
            </h1>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <div
              key={idx}
              onClick={() => {
                const courseId = course._id
                handleLastPlayedCourse(courseId)
              }}
              className={`group ${
                courses.length > 0 ? "" : "hidden"
              } relative bg-[#111010]/60 backdrop-blur-md border border-white/5 rounded-md overflow-hidden transition-all duration-500 hover:shadow-[#2563EB] hover:-translate-y-1`}
            >
              {/* Card Image Area */}
              <div className="relative h-56 w-full overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-transparent to-transparent z-10 opacity-90"></div>
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 group-hover:blur-[1.5px] transition-transform duration-700 ease-out grayscale-[0.2] group-hover:grayscale-0"
                />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 bg-white rounded-lg border-2 border-black  flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform duration-300">
                    <button
                      onClick={() => {
                        goToCourse(course._id, course.title);
                      }}
                      className="cursor-pointer"
                    >
                      <Play fill="black" className="w-5 h-5 ml-1 text-black" />
                    </button>
                  </div>
                </div>

                {/* Duration Badge */}
                {/* <div className="absolute top-4 right-4 z-20">
                  <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                    <Clock size={12} className="text-[#DEFF0A]" />
                    <span className="text-[11px] font-bold text-white tracking-wide">
                      18hr
                    </span>
                  </div>
                </div> */}
              </div>

              {/* Card Content Area */}
              <div className="p-6 pt-5 relative z-20">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <h3 className="text-xl capitalize font-bold text-white leading-tight mb-1 group-hover:text-[#2563EB] transition-colors duration-300">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold tracking-wider">
                      <User size={12} />
                      {course.owner}
                    </div>
                  </div>
                  {/* <button className="text-zinc-600 hover:text-white transition-colors">
                    <MoreVertical size={20} />
                  </button> */}
                </div>

                {/* Progress Bar (Visual) */}
                {/* <div className="mt-6">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-2 tracking-widest uppercase">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${course.progress}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        course.progress > 0
                          ? "bg-[#DEFF0A] shadow-[0_0_10px_#DEFF0A]"
                          : "bg-zinc-700"
                      }`}
                    ></div>
                  </div>
                </div> */}

                {/* Continue/Start Link */}
                <div className={`flex gap-2 ${Math.floor(((course.completedVideos.length-1)/course.totalVideos)*100) === 0 ? 'hidden':''}`}>
                            <div
                              className={` w-full h-1 bg-zinc-800/50 rounded-full mt-2 overflow-hidden`}
                            >
                              <div
                                className={`h-full bg-blue-500  rounded-full opacity-80`}
                                style={{
                                  width: `${Math.floor(((course.completedVideos.length -1)/course.totalVideos)*100)}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className={`text-[11px] font-medium text-zinc-500
                            
                            `}
                            >
                              {`${Math.floor(((course.completedVideos.length -1)/course.totalVideos)*100)}%`}
                            </span>
                          </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2 justify-between">
                  <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Lesson: {Number(localStorage.getItem(`last_video_played_${course._id}`))+1}
                  </span>
                  <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Total Videos: {course.totalVideos}
                  </span>
                  <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Modules: {course.learningModules?.length || 0}
                  </span>
                  {/* <span className="text-[11px] font-black text-[#2563EB] tracking-wider uppercase opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    {course.progress > 0 ? "RESUME >" : "START >"}
                  </span> */}
                </div>
              </div>
            </div>
          ))}

          {/* Add New Placeholder Card (Empty State Aesthetic) */}
          <Link
            to={`/create`}
            className="group relative border border-dashed border-zinc-800 rounded-md flex flex-col items-center justify-center p-6 hover:border-[#2563EB]/40 hover:bg-[#2563EB]/2 transition-all duration-300 min-h-75"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:border-[#2563EB] transition-all duration-300">
              <Plus
                size={24}
                className="text-zinc-600 group-hover:text-[#2563EB]"
              />
            </div>
            <span className="mt-4 text-sm font-bold text-zinc-600 tracking-widest uppercase group-hover:text-zinc-400">
              Add New Course
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
