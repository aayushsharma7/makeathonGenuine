import React, { useEffect, useMemo, useState } from "react";
import { Plus, Play, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const getSubjectLabel = (subject = "") => {
  const value = `${subject || "general"}`;
  if (value === "ai-ml") {
    return "AI/ML";
  }
  if (value === "core-cs") {
    return "Core CS";
  }
  return value
    .split("-")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
};

const HomePage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [infor, setInfor] = useState({});
  const [lastCoursePlayed, setLastCoursePlayed] = useState("none");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [subjectUpdate, setSubjectUpdate] = useState({
    courseId: "",
    subject: "",
  });
  const [subjectUpdateStatus, setSubjectUpdateStatus] = useState("");
  const [subjectUpdateLoading, setSubjectUpdateLoading] = useState(false);

  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
        withCredentials: true,
      });
      if (responsePost.data?.success) {
        setInfor(responsePost.data.data || {});
        const lastPlayed = localStorage.getItem("last_course_played") || responsePost.data?.data?.lastCoursePlayed;
        setLastCoursePlayed(lastPlayed || "none");
      } else {
        navigate("/signup");
      }
    } catch (error) {
      console.log(error);
      navigate("/login");
    }
  };

  const getData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/course`, {
        withCredentials: true,
      });
      if (response.status === 200) {
        const courseList = response.data?.data || [];
        setCourses([...courseList].reverse());
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    getData();
  }, []);

  const goToCourse = (courseId, title) => {
    navigate(`/courses/${title}/${courseId}}`);
  };

  const handleLastPlayedCourse = async (courseId) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/course/update/lastplayedcourse`,
        { courseId },
        { withCredentials: true }
      );
    } catch (error) {
      console.log(error);
    } finally {
      localStorage.setItem("last_course_played", `${courseId}`);
      setLastCoursePlayed(courseId);
    }
  };

  const handleSubjectAssign = async (e) => {
    e.preventDefault();
    setSubjectUpdateStatus("");

    if (!subjectUpdate.courseId) {
      setSubjectUpdateStatus("Select a course first.");
      return;
    }
    if (!subjectUpdate.subject.trim()) {
      setSubjectUpdateStatus("Enter a subject.");
      return;
    }

    setSubjectUpdateLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/update/subject`,
        {
          courseId: subjectUpdate.courseId,
          subject: subjectUpdate.subject,
        },
        {
          withCredentials: true,
          validateStatus: () => true,
        }
      );

      if (response.status === 200 && response.data?.success) {
        setSubjectUpdateStatus("Subject updated successfully.");
        await getData();
        return;
      }

      setSubjectUpdateStatus(response.data?.message || "Unable to update subject.");
    } catch (error) {
      console.log(error);
      setSubjectUpdateStatus("Unable to update subject.");
    } finally {
      setSubjectUpdateLoading(false);
    }
  };

  const lastPlayedCourseObj = useMemo(
    () => courses.find((item) => item._id === lastCoursePlayed),
    [courses, lastCoursePlayed]
  );

  const subjectList = useMemo(() => {
    const dynamicSubjects = Array.from(
      new Set(courses.map((course) => course.subject || "general").filter(Boolean))
    );
    return dynamicSubjects.length ? dynamicSubjects : ["general"];
  }, [courses]);

  const coursesBySubject = useMemo(() => {
    const grouped = {};
    courses.forEach((course) => {
      const key = course.subject || "general";
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(course);
    });
    return grouped;
  }, [courses]);

  const displayedSubjects = useMemo(() => {
    if (selectedSubject === "all") {
      return Object.keys(coursesBySubject);
    }
    return coursesBySubject[selectedSubject] ? [selectedSubject] : [];
  }, [coursesBySubject, selectedSubject]);

  const renderCourseCard = (course) => {
    const progress = Math.floor(((course.completedVideos?.length - 1 || 0) / (course.totalVideos || 1)) * 100);
    const safeProgress = Math.max(0, Math.min(100, progress));
    const lessonIndex = Number(localStorage.getItem(`last_video_played_${course._id}`)) + 1;
    const safeLesson = Number.isFinite(lessonIndex) && lessonIndex > 0 ? lessonIndex : 1;
    const subjectLabel = getSubjectLabel(course.subject || "general");

    return (
      <div
        key={course._id}
        onClick={() => {
          handleLastPlayedCourse(course._id);
        }}
        className="group relative bg-[#111010]/60 backdrop-blur-md border border-white/5 rounded-md overflow-hidden transition-all duration-500 hover:shadow-[#2563EB] hover:-translate-y-1"
      >
        <div className="relative h-56 w-full overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-transparent to-transparent z-10 opacity-90"></div>
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover transform group-hover:scale-105 group-hover:blur-[1.5px] transition-transform duration-700 ease-out grayscale-[0.2] group-hover:grayscale-0"
          />

          <div className="absolute top-3 left-3 z-20">
            <span className="text-[10px] px-2 py-1 rounded-sm bg-black/70 text-zinc-200 border border-white/10 uppercase tracking-wider">
              {subjectLabel}
            </span>
          </div>

          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 bg-white rounded-lg border-2 border-black flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform duration-300">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLastPlayedCourse(course._id);
                  goToCourse(course._id, course.title);
                }}
                className="cursor-pointer"
              >
                <Play fill="black" className="w-5 h-5 ml-1 text-black" />
              </button>
            </div>
          </div>
        </div>

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
          </div>

          <div className={`flex gap-2 ${safeProgress === 0 ? "hidden" : ""}`}>
            <div className="w-full h-1 bg-zinc-800/50 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full opacity-80" style={{ width: `${safeProgress}%` }}></div>
            </div>
            <span className="text-[11px] font-medium text-zinc-500">{`${safeProgress}%`}</span>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2 justify-between">
            <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
              Lesson: {safeLesson}
            </span>
            <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
              Total Videos: {course.totalVideos}
            </span>
            <span className="text-[13px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
              Modules: {course.learningModules?.length || 0}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen selection:bg-[#2563EB] selection:text-black overflow-hidden relative">
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
        <p className="relative z-10 text-zinc-300 text-sm tracking-wide">Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-[#2563EB] selection:text-black overflow-hidden relative">
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

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-27">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[0.9]">
              All your courses <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#2563EB] via-white to-zinc-500">
                start learning!
              </span>
            </h1>
          </div>

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
        </div>

        <div className="mb-10 border border-white/10 bg-[#111010]/50 rounded-md p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-black mb-3">
            Assign Course To Subject
          </p>
          <form onSubmit={handleSubjectAssign} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={subjectUpdate.courseId}
              onChange={(e) => setSubjectUpdate((prev) => ({ ...prev, courseId: e.target.value }))}
              className="bg-[#0f0f0f] border border-zinc-800 rounded-sm px-3 py-3 text-zinc-200 text-sm focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>

            <input
              value={subjectUpdate.subject}
              onChange={(e) => setSubjectUpdate((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Type subject (e.g. electronics)"
              className="bg-[#0f0f0f] border border-zinc-800 rounded-sm px-3 py-3 text-zinc-200 text-sm focus:outline-none focus:border-[#2563EB]"
              list="subject-options"
            />
            <datalist id="subject-options">
              {subjectList.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            <button
              type="submit"
              disabled={subjectUpdateLoading}
              className="bg-[#2563EB] hover:bg-[#2543EB] text-black font-black text-sm py-3 rounded-sm transition-all disabled:opacity-70"
            >
              {subjectUpdateLoading ? "Saving..." : "Assign Subject"}
            </button>
          </form>
          <p
            className={`text-xs mt-2 ${
              subjectUpdateStatus.toLowerCase().includes("successfully") ? "text-green-400" : "text-zinc-500"
            }`}
          >
            {subjectUpdateStatus}
          </p>
        </div>

        <div className={`${lastPlayedCourseObj ? "" : "hidden"} mb-14`}>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-[0.9] mb-6 ml-1 -mt-1">
            Continue Watching
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lastPlayedCourseObj ? renderCourseCard(lastPlayedCourseObj) : null}
          </div>
        </div>

        <div className="relative mb-5">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-[0.9] mb-4 ml-1">
            Courses By Subject
          </h1>
          <div className="flex flex-wrap gap-2 mb-6">
            {subjectList.map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`text-xs font-bold px-3 py-2 rounded-sm border transition-colors ${
                  selectedSubject === subject
                    ? "bg-[#2563EB] text-black border-[#2563EB]"
                    : "border-white/15 text-zinc-300 hover:text-white hover:border-[#2563EB]/60"
                }`}
              >
                {subject === "all" ? "All Subjects" : getSubjectLabel(subject)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          {displayedSubjects.map((subject) => (
            <div key={subject}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-black text-zinc-100">
                  {getSubjectLabel(subject)}
                </h2>
                <span className="text-xs text-zinc-500 font-semibold">
                  {(coursesBySubject[subject] || []).length} course(s)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(coursesBySubject[subject] || []).map((course) => renderCourseCard(course))}
                <Link
                  to={`/create`}
                  className="group relative border border-dashed border-zinc-800 rounded-md flex flex-col items-center justify-center p-6 hover:border-[#2563EB]/40 hover:bg-[#2563EB]/2 transition-all duration-300 min-h-75"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:border-[#2563EB] transition-all duration-300">
                    <Plus size={24} className="text-zinc-600 group-hover:text-[#2563EB]" />
                  </div>
                  <span className="mt-4 text-sm font-bold text-zinc-600 tracking-widest uppercase group-hover:text-zinc-400">
                    Add New Course
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
