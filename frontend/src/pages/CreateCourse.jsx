import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LucideAlignCenter, Mail, Plus, Trash2, Video } from "lucide-react";

const DEFAULT_PERSONALIZATION = {
  experienceLevel: "",
  timePerDay: "",
  learningStyle: "",
  goalUrgency: "",
  codingConfidence: "",
  priorExposure: "",
  targetGoal: "",
  knownTopics: "",
};

const CreateCourse = () => {
  const [playlist, setPlaylist] = useState("");
  const [videoUrls, setVideoUrls] = useState([""]);
  const [mode, setMode] = useState("playlist");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [statusCode, setStatusCode] = useState({});
  const [infor, setInfor] = useState({});
  const [onboardingPath, setOnboardingPath] = useState("direct");
  const [personalization, setPersonalization] = useState(DEFAULT_PERSONALIZATION);

  const navigate = useNavigate();
  const location = useLocation();

  const isCustomMode = mode === "custom";

  const filteredVideoUrls = useMemo(
    () => videoUrls.map((item) => item.trim()).filter(Boolean),
    [videoUrls]
  );

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
        withCredentials: true,
      });
      if (responsePost.data?.success) {
        setInfor(responsePost.data.data || {});
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

    const params = new URLSearchParams(location.search);
    const pathValue = params.get("onboarding");
    const customValue = params.get("type");

    if (pathValue === "path1" || pathValue === "path2") {
      setOnboardingPath(pathValue);
    }
    if (customValue === "custom") {
      setMode("custom");
    }

    const prefillRaw = sessionStorage.getItem("onboarding_prefill");
    if (prefillRaw) {
      try {
        const prefill = JSON.parse(prefillRaw);
        if (prefill.playlistUrl) {
          setPlaylist(prefill.playlistUrl);
        }
        if (prefill.courseTitle) {
          setTitle(prefill.courseTitle);
        }
        if (prefill.onboardingPath) {
          setOnboardingPath(prefill.onboardingPath);
        }
        if (prefill.path2Answers) {
          setPersonalization((prev) => ({
            ...prev,
            targetGoal: prefill.path2Answers.goal || prev.targetGoal,
            priorExposure: prefill.path2Answers.background || prev.priorExposure,
            timePerDay: prefill.path2Answers.timePerDay || prev.timePerDay,
          }));
        }
      } catch (error) {
        console.log(error);
      }
    }
  }, []);

  const personalizationHandle = (e) => {
    const { name, value } = e.target;
    setPersonalization((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const setVideoUrlAt = (index, value) => {
    setVideoUrls((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addVideoInput = () => {
    setVideoUrls((prev) => [...prev, ""]);
  };

  const removeVideoInput = (index) => {
    setVideoUrls((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [""];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusCode({});

    if (!title.trim()) {
      setStatusCode({ code: 400, data: "Course title is required" });
      return;
    }

    if (!isCustomMode && !playlist.trim()) {
      setStatusCode({ code: 400, data: "Playlist URL is required" });
      return;
    }

    if (isCustomMode && filteredVideoUrls.length === 0) {
      setStatusCode({ code: 400, data: "Add at least one YouTube video URL" });
      return;
    }

    if (onboardingPath === "path1") {
      try {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/onboarding/path1/profile`,
          { answers: personalization },
          { withCredentials: true }
        );
      } catch (error) {
        console.log(error);
      }
    }

    const endpoint = isCustomMode
      ? `${import.meta.env.VITE_API_URL}/course/create/custom`
      : `${import.meta.env.VITE_API_URL}/course/create`;

    const payload = isCustomMode
      ? {
          name: title,
          owner: infor.username,
          onboardingPath,
          personalization,
          videoUrls: filteredVideoUrls,
        }
      : {
          url: playlist,
          name: title,
          owner: infor.username,
          onboardingPath,
          personalization,
        };

    setLoading(true);
    try {
      const responsePost = await axios.post(endpoint, payload, {
        withCredentials: true,
        validateStatus: () => true,
      });

      if (responsePost.status === 201) {
        setStatusCode({ code: responsePost.status, data: responsePost.data?.message || "Created" });
        sessionStorage.removeItem("onboarding_prefill");
        navigate("/courses");
        return;
      }

      setStatusCode({
        code: responsePost.status,
        data: responsePost.data?.message || "Unable to create course",
      });
    } catch (error) {
      console.log(error);
      setStatusCode({ code: 500, data: "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-zinc-300 text-sm tracking-wide">
        Creating your course...
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-[#2563EB] selection:text-black overflow-hidden relative px-4 py-24 md:px-8">
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

      <div className="w-full max-w-3xl relative z-10 mx-auto">
        <div className="p-4 md:p-8 overflow-hidden relative border border-white/5 rounded-md bg-[#111010]/40 backdrop-blur-sm">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-3">
              Create a course <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#2563EB] to-[#ffffff]">in seconds!</span>
            </h1>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-lg">
              Import a full playlist or build a custom course by adding YouTube videos manually.
            </p>
          </div>

          <div className="mb-6 border border-white/10 bg-black/20 rounded-md p-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("playlist")}
              className={`flex-1 rounded-sm px-3 py-2 text-sm font-bold transition-colors ${
                !isCustomMode ? "bg-[#2563EB] text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              Playlist Import
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`flex-1 rounded-sm px-3 py-2 text-sm font-bold transition-colors ${
                isCustomMode ? "bg-[#2563EB] text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              Custom Course
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isCustomMode && (
              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 block">YouTube Playlist URL</label>
                <div className="relative flex items-center bg-[#111010] border border-zinc-800 rounded-sm px-4 py-4 focus-within:border-[#2563EB] transition-all duration-300">
                  <Mail size={20} className="text-zinc-500 mr-3" />
                  <input
                    autoComplete="off"
                    type="text"
                    placeholder="https://youtube.com/playlist?list="
                    name="playlist"
                    value={playlist}
                    onChange={(e) => setPlaylist(e.target.value)}
                    required={!isCustomMode}
                    className="bg-transparent w-full text-white font-medium placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {isCustomMode && (
              <div className="space-y-3 border border-white/10 bg-black/20 rounded-md p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">YouTube Videos</p>
                  <button
                    type="button"
                    onClick={addVideoInput}
                    className="text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-200 px-3 py-1.5 rounded-sm flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Video
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {videoUrls.map((videoUrl, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 relative flex items-center bg-[#111010] border border-zinc-800 rounded-sm px-3 py-3 focus-within:border-[#2563EB]">
                        <Video size={16} className="text-zinc-500 mr-2 shrink-0" />
                        <input
                          autoComplete="off"
                          type="text"
                          placeholder="https://www.youtube.com/watch?v="
                          value={videoUrl}
                          onChange={(e) => setVideoUrlAt(index, e.target.value)}
                          className="bg-transparent w-full text-white text-sm font-medium placeholder:text-zinc-600 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideoInput(index)}
                        className="p-2 rounded-sm border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/40 text-zinc-300 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 block">Course Title</label>
              <div className="relative flex items-center bg-[#111010] border border-zinc-800 rounded-sm px-4 py-4 focus-within:border-[#2563EB] transition-all duration-300">
                <LucideAlignCenter size={20} className="text-zinc-500 mr-3" />
                <input
                  autoComplete="off"
                  type="text"
                  placeholder="e.g. React JS"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-transparent w-full text-white font-medium placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <h3 className="text-sm font-black text-zinc-300 tracking-wider uppercase mb-4">Personalize This Course</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="targetGoal"
                  value={personalization.targetGoal}
                  onChange={personalizationHandle}
                  placeholder="Goal (e.g. internship prep)"
                  className="bg-[#111010] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#2563EB]"
                  required
                />
                <input
                  type="text"
                  name="knownTopics"
                  value={personalization.knownTopics}
                  onChange={personalizationHandle}
                  placeholder="Known topics (comma separated)"
                  className="bg-[#111010] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#2563EB]"
                />
                <select
                  name="experienceLevel"
                  value={personalization.experienceLevel}
                  onChange={personalizationHandle}
                  className="bg-[#111010] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                  required
                >
                  <option value="">Experience level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <select
                  name="codingConfidence"
                  value={personalization.codingConfidence}
                  onChange={personalizationHandle}
                  className="bg-[#111010] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                  required
                >
                  <option value="">Coding confidence (1-5)</option>
                  <option value="1">1 - Low</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5 - High</option>
                </select>
                <input
                  type="text"
                  name="timePerDay"
                  value={personalization.timePerDay}
                  onChange={personalizationHandle}
                  placeholder="Time/day (e.g. 1 hour)"
                  className="bg-[#111010] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#2563EB]"
                  required
                />
                <select
                  name="learningStyle"
                  value={personalization.learningStyle}
                  onChange={personalizationHandle}
                  className="bg-[#111010] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                  required
                >
                  <option value="">Learning style</option>
                  <option value="quick">Quick revision focused</option>
                  <option value="balanced">Balanced</option>
                  <option value="deep">Deep conceptual</option>
                </select>
                <select
                  name="goalUrgency"
                  value={personalization.goalUrgency}
                  onChange={personalizationHandle}
                  className="bg-[#111010] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                  required
                >
                  <option value="">Goal urgency</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  type="text"
                  name="priorExposure"
                  value={personalization.priorExposure}
                  onChange={personalizationHandle}
                  placeholder="Prior exposure (short note)"
                  className="bg-[#111010] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button className="w-full bg-[#2563EB] hover:bg-[#2543EB] text-black font-black text-lg py-4 rounded-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden">
                <span className="relative z-10">{isCustomMode ? "CREATE CUSTOM COURSE" : "CREATE COURSE"}</span>
                <ArrowRight className="w-5 h-5 relative z-10" strokeWidth={3} />
              </button>

              <p
                className={`text-sm font-medium leading-relaxed mt-4 text-center ${
                  !statusCode.code ? "hidden" : statusCode.code === 200 || statusCode.code === 201 ? "text-green-500" : "text-red-500"
                }`}
              >
                {statusCode.code ? `${statusCode.code} : ${statusCode.data}` : ""}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;
