import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight, MessageCircle, ListPlus } from "lucide-react";

const OnboardingPage = () => {
  const [path, setPath] = useState("");
  const [goal, setGoal] = useState("");
  const [background, setBackground] = useState("");
  const [timePerDay, setTimePerDay] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [inlineError, setInlineError] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Tell me what you want to learn. I will recommend the best playlist for you.",
    },
  ]);
  const [recommendations, setRecommendations] = useState([]);
  const navigate = useNavigate();
  const getApiData = (response) => response?.data?.data ?? response?.data ?? {};

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
        withCredentials: true,
      });
      if (!responsePost?.data?.success) {
        navigate("/login");
      }
    } catch {
      navigate("/login");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const goPath1 = () => {
    navigate("/create?onboarding=path1");
  };

  const handlePath2Chat = async () => {
    const fallbackText = `Goal: ${goal}, Background: ${background}, Time/day: ${timePerDay}, Language: ${preferredLanguage}`;
    const userText = (chatInput || fallbackText).trim();
    if(!userText){
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Please share your goal and current background first." },
      ]);
      return;
    }

    try {
      setChatLoading(true);
      setInlineError("");
      const newMessages = [...chatMessages, { role: "user", content: userText }];
      setChatMessages(newMessages);
      setChatInput("");

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/onboarding/path2/chat`,
        { messages: newMessages },
        { withCredentials: true }
      );

      const payload = getApiData(res);
      setChatMessages((prev) => [...prev, payload || { role: "assistant", content: "I am ready with recommendations." }]);
      if(payload?.extracted){
        if(payload.extracted.goal && !goal){
          setGoal(payload.extracted.goal);
        }
        if(payload.extracted.background && !background){
          setBackground(payload.extracted.background);
        }
        if(payload.extracted.timePerDay && !timePerDay){
          setTimePerDay(payload.extracted.timePerDay);
        }
        if(payload.extracted.preferredLanguage && !preferredLanguage){
          setPreferredLanguage(payload.extracted.preferredLanguage);
        }
      }
    } catch (error) {
      console.log(error);
      if(error?.response?.status === 401){
        navigate("/login");
        return;
      }
      setInlineError(error?.response?.data?.message || "Unable to chat right now.");
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: error?.response?.data?.message || "Unable to chat right now. You can still generate recommendations." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getRecommendations = async () => {
    if(!goal.trim()){
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Please enter your learning goal before generating recommendations." }]);
      return;
    }
    setLoading(true);
    try {
      setInlineError("");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/onboarding/path2/recommend`,
        {
          goal,
          background,
          timePerDay,
          preferredLanguage,
        },
        { withCredentials: true }
      );

      const payload = getApiData(res);
      const recs = payload?.recommendations || [];
      setProfileId(payload?.profileId || "");
      setRecommendations(recs);
      if(payload?.bestChoice){
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Top recommendation ready: ${payload.bestChoice.title}. You can review and select it below.`,
          },
        ]);
      }
      if (recs.length === 0) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "No recommendations found, try changing your goal." }]);
      }
    } catch (error) {
      console.log(error);
      if(error?.response?.status === 401){
        navigate("/login");
        return;
      }
      setInlineError(error?.response?.data?.message || "Could not generate recommendations.");
      setChatMessages((prev) => [...prev, { role: "assistant", content: error?.response?.data?.message || "Could not generate recommendations." }]);
    } finally {
      setLoading(false);
    }
  };

  const chooseRecommendation = async (item) => {
    try {
      if(profileId){
        await axios.post(
          `${import.meta.env.VITE_API_URL}/onboarding/path2/select`,
          {
            profileId,
            playlistId: item.playlistId
          },
          { withCredentials: true }
        );
      }
    } catch (error) {
      console.log(error);
    } finally {
      const prefill = {
        onboardingPath: "path2",
        playlistUrl: item.playlistUrl,
        courseTitle: item.title,
        path2Answers: {
          goal,
          background,
          timePerDay,
          preferredLanguage,
        },
      };
      sessionStorage.setItem("onboarding_prefill", JSON.stringify(prefill));
      navigate("/create?onboarding=path2");
    }
  };

  return (
    <div className="min-h-screen selection:bg-[#2563EB] selection:text-black overflow-hidden relative p-4 md:p-8">
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

      <div className="relative z-10 max-w-6xl mx-auto mt-22">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-4">
          Start your learning journey
          <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-[#2563EB] to-white">
            with onboarding
          </span>
        </h1>
        <p className="text-zinc-400 text-sm md:text-base mb-8">
          Choose a path and we will personalize your course structure, module by module.
        </p>

        <div className={`grid ${path === "path2" ? "md:grid-cols-2" : "md:grid-cols-2"} gap-6`}>
          <div className="bg-[#111010]/70 border border-white/10 rounded-md p-6">
            <div className="flex items-center gap-2 mb-2 text-zinc-300">
              <ListPlus size={16} />
              <span className="text-sm font-bold tracking-wider uppercase">Path 1</span>
            </div>
            <h2 className="text-white text-2xl font-black mb-2">I already know my course</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Go to Create Course, paste playlist URL, answer your level questions, and get a personalized module plan.
            </p>
            <button
              onClick={goPath1}
              className="bg-[#2563EB] hover:bg-[#2543EB] text-black font-black text-sm px-4 py-2 rounded-md transition-all flex items-center gap-2"
            >
              Continue to Create
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="bg-[#111010]/70 border border-white/10 rounded-md p-6">
            <div className="flex items-center gap-2 mb-2 text-zinc-300">
              <MessageCircle size={16} />
              <span className="text-sm font-bold tracking-wider uppercase">Path 2</span>
            </div>
            <h2 className="text-white text-2xl font-black mb-2">I need course recommendation</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Share your goal and we will recommend playlists, then personalize the selected course.
            </p>
            <button
              onClick={() => setPath("path2")}
              className="bg-white/5 hover:bg-white/10 text-zinc-100 font-semibold text-sm px-4 py-2 rounded-md border border-white/10"
            >
              Open Recommendation Flow
            </button>
          </div>
        </div>

        <div className={`${path === "path2" ? "" : "hidden"} mt-8 grid md:grid-cols-2 gap-6`}>
          <div className="bg-[#111010]/70 border border-white/10 rounded-md p-6 space-y-4">
            <h3 className="text-white text-lg font-black">Your Preferences</h3>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Goal: e.g. Crack frontend internship in 2 months"
              className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
            />
            <input
              type="text"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="Background: e.g. I know basic HTML/CSS"
              className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
            />
            <input
              type="text"
              value={timePerDay}
              onChange={(e) => setTimePerDay(e.target.value)}
              placeholder="Time per day: e.g. 1 hour"
              className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
            />
            <input
              type="text"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              placeholder="Preferred language: e.g. JavaScript"
              className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
            />
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if(e.key === "Enter"){
                    e.preventDefault();
                    handlePath2Chat();
                  }
                }}
                placeholder="Ask onboarding bot (e.g. suggest best complete DSA path)"
                className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-sm px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="button"
                onClick={handlePath2Chat}
                disabled={chatLoading}
                className="bg-white/5 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-sm border border-white/10"
              >
                {chatLoading ? "Thinking..." : "Ask Chatbot"}
              </button>
              <button
                onClick={getRecommendations}
                disabled={loading}
                className="bg-[#2563EB] hover:bg-[#2543EB] disabled:opacity-60 disabled:cursor-not-allowed text-black text-sm font-black px-4 py-2 rounded-sm"
              >
                {loading ? "Generating..." : "Get Recommendations"}
              </button>
            </div>
          </div>

          <div className="bg-[#111010]/70 border border-white/10 rounded-md p-6">
            <h3 className="text-white text-lg font-black mb-4">Chat + Recommendations</h3>
            {inlineError ? (
              <div className="mb-3 text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded-sm px-3 py-2">
                {inlineError}
              </div>
            ) : null}
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar mb-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`text-sm p-2 rounded-sm break-words ${msg.role === "assistant" ? "bg-white/5 text-zinc-300" : "bg-[#2563EB]/10 text-[#9ab9ff]"}`}>
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="space-y-3 max-h-70 overflow-y-auto custom-scrollbar pr-1">
              {recommendations.map((item, idx) => (
                <div key={idx} className="border border-white/10 rounded-sm p-3 bg-black/20 min-w-0">
                  <h4 className="text-white text-sm font-bold break-words">{item.title}</h4>
                  <p className="text-zinc-400 text-xs mt-1 break-words">{item.reason}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-400">
                    <span className="px-2 py-0.5 rounded-sm bg-white/5 border border-white/10">
                      Score: {item.score || "-"}
                    </span>
                    <span className="px-2 py-0.5 rounded-sm bg-white/5 border border-white/10">
                      Videos: {item.videoCount || "-"}
                    </span>
                    <span className="px-2 py-0.5 rounded-sm bg-white/5 border border-white/10">
                      Updated: {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a href={item.playlistUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-300 underline">
                      Open Playlist
                    </a>
                    <button
                      onClick={() => chooseRecommendation(item)}
                      className="ml-auto text-xs bg-[#2563EB] text-black font-bold px-3 py-1 rounded-sm"
                    >
                      Use This
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
