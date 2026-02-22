import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, LucideAlignCenter, Mail, Plus, Trash2, Video, X } from "lucide-react";

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

const PERSONALIZATION_FLOW = [
  {
    key: "targetGoal",
    label: "What is your primary goal for this course?",
    type: "text",
    placeholder: "e.g. internship prep in 2 months",
    required: true,
  },
  {
    key: "experienceLevel",
    label: "What is your current experience level?",
    type: "select",
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
    required: true,
  },
  {
    key: "codingConfidence",
    label: "How confident are you in coding right now?",
    type: "select",
    options: [
      { value: "1", label: "1 - Low" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
      { value: "5", label: "5 - High" },
    ],
    required: true,
  },
  {
    key: "timePerDay",
    label: "How much time can you invest daily?",
    type: "text",
    placeholder: "e.g. 1 hour",
    required: true,
  },
  {
    key: "learningStyle",
    label: "Pick your preferred learning style",
    type: "select",
    options: [
      { value: "quick", label: "Quick revision focused" },
      { value: "balanced", label: "Balanced" },
      { value: "deep", label: "Deep conceptual" },
    ],
    required: true,
  },
  {
    key: "goalUrgency",
    label: "How urgent is your goal?",
    type: "select",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
    required: true,
  },
  {
    key: "knownTopics",
    label: "Which topics are you already comfortable with?",
    type: "text",
    placeholder: "comma separated e.g. arrays, loops, jsx",
    required: false,
  },
  {
    key: "priorExposure",
    label: "Any prior exposure/context we should consider?",
    type: "text",
    placeholder: "short note (optional)",
    required: false,
  },
];

const REQUIRED_PERSONALIZATION_KEYS = PERSONALIZATION_FLOW.filter((item) => item.required).map((item) => item.key);

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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  const isCustomMode = mode === "custom";
  const activeWizardQuestion = PERSONALIZATION_FLOW[wizardStep];
  const isPersonalizationDone = REQUIRED_PERSONALIZATION_KEYS.every((key) => `${personalization[key] || ""}`.trim());
  const personalizationProgress = Math.floor(((wizardStep + 1) / PERSONALIZATION_FLOW.length) * 100);

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
      setIsWizardOpen(true);
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

    if (!isPersonalizationDone) {
      setIsWizardOpen(true);
      setWizardStep(0);
      setStatusCode({ code: 400, data: "Please complete quick personalization first." });
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

  const handleWizardValue = (value) => {
    if (!activeWizardQuestion) {
      return;
    }
    setPersonalization((prev) => ({
      ...prev,
      [activeWizardQuestion.key]: value,
    }));
  };

  const goNextStep = () => {
    if (!activeWizardQuestion) {
      return;
    }
    const currentValue = `${personalization[activeWizardQuestion.key] || ""}`.trim();
    if (activeWizardQuestion.required && !currentValue) {
      setStatusCode({ code: 400, data: "Please answer this question to continue." });
      return;
    }
    setStatusCode({});
    if (wizardStep >= PERSONALIZATION_FLOW.length - 1) {
      setIsWizardOpen(false);
      return;
    }
    setWizardStep((prev) => prev + 1);
  };

  const goPrevStep = () => {
    if (wizardStep === 0) {
      return;
    }
    setWizardStep((prev) => prev - 1);
  };

  const openWizard = () => {
    setStatusCode({});
    setIsWizardOpen(true);
    const firstMissingIndex = PERSONALIZATION_FLOW.findIndex((item) => item.required && !`${personalization[item.key] || ""}`.trim());
    setWizardStep(firstMissingIndex === -1 ? 0 : firstMissingIndex);
  };

  useEffect(() => {
    if (!isWizardOpen) {
      return;
    }
    const firstMissingIndex = PERSONALIZATION_FLOW.findIndex((item) => item.required && !`${personalization[item.key] || ""}`.trim());
    if (firstMissingIndex !== -1) {
      setWizardStep(firstMissingIndex);
    }
  }, [isWizardOpen]);

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

      <div className="w-full max-w-xl relative z-10 mx-auto">
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
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-black text-zinc-300 tracking-wider uppercase">Personalization</h3>
                <button
                  type="button"
                  onClick={openWizard}
                  className="text-xs px-3 py-1.5 rounded-sm border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                >
                  {isPersonalizationDone ? "Edit Answers" : "Start Quick Questions"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PERSONALIZATION_FLOW.map((item) => {
                  const filled = `${personalization[item.key] || ""}`.trim().length > 0;
                  return (
                    <span
                      key={item.key}
                      className={`text-[10px] px-2 py-1 rounded-sm border ${
                        filled ? "border-[#2563EB]/30 text-[#b2c8ff] bg-[#2563EB]/10" : "border-white/10 text-zinc-500 bg-white/3"
                      }`}
                    >
                      {item.key}
                    </span>
                  );
                })}
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

      <div className={`${isWizardOpen ? "" : "hidden"} fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4`}>
        <div className="w-full max-w-xl border border-white/10 bg-[#111010] rounded-md p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">Personalize Course</p>
            <button
              type="button"
              onClick={() => setIsWizardOpen(false)}
              className="p-1 rounded-sm border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span>
                Question {wizardStep + 1} of {PERSONALIZATION_FLOW.length}
              </span>
              <span>{personalizationProgress}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-zinc-800/70 overflow-hidden">
              <div className="h-full bg-[#2563EB]" style={{ width: `${personalizationProgress}%` }} />
            </div>
          </div>

          {activeWizardQuestion ? (
            <div className="space-y-4">
              <h4 className="text-white text-lg font-black leading-tight">{activeWizardQuestion.label}</h4>
              {activeWizardQuestion.type === "select" ? (
                <select
                  value={personalization[activeWizardQuestion.key]}
                  onChange={(e) => handleWizardValue(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">Select an option</option>
                  {activeWizardQuestion.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={personalization[activeWizardQuestion.key]}
                  onChange={(e) => handleWizardValue(e.target.value)}
                  placeholder={activeWizardQuestion.placeholder}
                  className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#2563EB]"
                />
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={goPrevStep}
                  disabled={wizardStep === 0}
                  className="text-xs px-3 py-2 rounded-sm border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
                <div className="flex items-center gap-2">
                  {!activeWizardQuestion.required ? (
                    <button
                      type="button"
                      onClick={goNextStep}
                      className="text-xs px-3 py-2 rounded-sm border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                    >
                      Skip
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={goNextStep}
                    className="text-xs px-3 py-2 rounded-sm bg-[#2563EB] text-black font-bold hover:bg-[#2543EB]"
                  >
                    {wizardStep === PERSONALIZATION_FLOW.length - 1 ? "Done" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;
