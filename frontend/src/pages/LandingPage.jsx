import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Rocket,
  Layers3,
  Brain,
  GraduationCap,
  Chrome,
  NotebookPen,
  CalendarDays,
  BarChart3,
  Puzzle,
  Bot,
  MonitorPlay,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const featureCards = [
  {
    icon: Layers3,
    title: "Module-Based Course Structuring",
    desc: "Converts raw playlists into topic-wise modules with completion tracking and learning flow.",
  },
  {
    icon: Brain,
    title: "Personalized Onboarding",
    desc: "Two onboarding paths build a learner profile and adapt pace, quiz difficulty, and recommendations.",
  },
  {
    icon: Bot,
    title: "AI Overview and Tutor",
    desc: "Video-wise AI overview, recommendations, and context-aware doubt solving while learning.",
  },
  {
    icon: Puzzle,
    title: "Adaptive Quiz Engine",
    desc: "Generates concept-driven quizzes with increasing difficulty and reattempt logic.",
  },
  {
    icon: NotebookPen,
    title: "Timestamped Notes + Revision",
    desc: "Category-based notes with due dates, spaced repetition, and one-click seek to video moments.",
  },
  {
    icon: CalendarDays,
    title: "Dynamic Daily Planning",
    desc: "Live planner recalculates goals and projected completion from user progress and pace.",
  },
  {
    icon: MonitorPlay,
    title: "Built-in Learning Workspace",
    desc: "Inbuilt Monaco IDE, Excalidraw board, summaries, and practice resources in one player.",
  },
  {
    icon: Chrome,
    title: "Website + YouTube Sync",
    desc: "Chrome extension mirrors course state and syncs progress/completion in real time.",
  },
];

const onboardingPathCards = [
  {
    title: "Path 1: Learner already knows the course",
    desc: "Paste playlist URL, answer guided questions, and get a personalized structured course instantly.",
  },
  {
    title: "Path 2: Learner needs recommendation",
    desc: "Chat with AI, get trusted up-to-date course suggestions, and import with one click.",
  },
];

const syncPoints = [
  "Detects if active YouTube video belongs to your OpenCourse.",
  "Pushes watch duration, progress, and completion back to backend.",
  "Shows course content, notes, and problem context inside YouTube.",
  "Maintains continuity between website player and extension popup.",
];

const LandingPage = () => {
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
        withCredentials: true,
      });
      if (responsePost.data?.success) {
        navigate("/courses");
      }
    } catch {
      console.log("Not logged in");
    }
  };

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full bg-[#080808] overflow-x-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 15% 0%, rgba(37,99,235,0.20), transparent 55%), radial-gradient(1200px 600px at 85% 10%, rgba(30,41,59,0.25), transparent 60%), linear-gradient(180deg, #080808 0%, #0a0a0a 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-0 animate-grid opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-30 pb-22">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300">
                <Rocket size={12} />
                AI Learning Platform
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl font-black text-white leading-tight">
                Learn from YouTube
                <br />
                <span className="text-[#2563EB]">like a structured course.</span>
              </h1>

              <p className="mt-5 text-base md:text-lg text-zinc-400 max-w-xl leading-relaxed">
                Personalized modules, AI guidance, adaptive quizzes, and real-time progress sync across web and extension.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate("/signup")}
                  className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold transition"
                >
                  Start Building for Free
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="px-7 py-3.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-200 font-semibold transition"
                >
                  Login
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {["2 Onboarding Paths", "Adaptive Quiz", "Web + YouTube Sync"].map((tag) => (
                  <span key={tag} className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-zinc-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 bg-blue-500/10 blur-3xl rounded-full" />
              <div className="relative rounded-3xl border border-white/10 bg-[#0f0f12] p-4 shadow-2xl shadow-black/40">
                <div className="mx-auto w-full max-w-xl rounded-2xl border border-zinc-700/80 bg-[#151519] overflow-hidden">
                  <div className="h-8 border-b border-zinc-700/80 bg-[#1b1b20] flex items-center gap-2 px-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                    <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">OpenCourse Engine</span>
                  </div>
                  <div className="grid md:grid-cols-[1.2fr_1fr]">
                    <div className="p-4 border-r border-zinc-700/60">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">module_builder.ts</p>
                      <pre className="text-[11px] leading-5 text-zinc-300 font-mono whitespace-pre-wrap">{`const learner = profile(user);
const modules = structureByTopic(playlist);
const plan = personalize(modules, learner);
syncProgress(web, youtube, plan);`}</pre>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Progress</p>
                        <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full w-[68%] bg-[#2563EB]" />
                        </div>
                      </div>
                      <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Quiz Mastery</p>
                        <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full w-[82%] bg-emerald-500" />
                        </div>
                      </div>
                      <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Today Target</p>
                        <p className="mt-2 text-xs font-semibold text-zinc-200">2 / 3 videos completed</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mx-auto mt-2 h-3.5 w-[82%] rounded-b-2xl bg-[#1d1d22] border border-zinc-700/80" />
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-22">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.07] p-6">
              <h3 className="text-sm uppercase tracking-[0.2em] text-red-300 font-black">Problem</h3>
              <p className="mt-3 text-zinc-200 leading-relaxed">
                Learners consume long playlists without structure, personalization, measurable progress, or retention support.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.07] p-6">
              <h3 className="text-sm uppercase tracking-[0.2em] text-blue-300 font-black">Solution</h3>
              <p className="mt-3 text-zinc-200 leading-relaxed">
                OpenCourse creates AI-personalized modules, adaptive quiz loops, planning, and revision workflows on top of YouTube.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-6">
              <h3 className="text-sm uppercase tracking-[0.2em] text-emerald-300 font-black">Impact</h3>
              <p className="mt-3 text-zinc-200 leading-relaxed">
                Improves completion, consistency, and concept retention through a full learning operating system.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="flex items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white">Everything in One AI Learning Stack</h2>
              <p className="text-zinc-500 mt-3 max-w-3xl">
                Feature-complete learning workflow from onboarding to assessment to revision and cross-platform sync.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {featureCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-white/10 bg-[#101010]/90 hover:bg-[#141414] hover:border-blue-500/30 transition p-5"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-zinc-100">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-white/10 bg-[#0f0f10] p-6">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">
                <GraduationCap size={14} />
                Onboarding Intelligence
              </div>
              <h3 className="mt-3 text-2xl font-black text-white">Two Personalized Entry Paths</h3>
              <div className="mt-5 space-y-3">
                {onboardingPathCards.map((card) => (
                  <div key={card.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <h4 className="text-sm font-bold text-zinc-100">{card.title}</h4>
                    <p className="text-sm text-zinc-400 mt-1">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0f0f10] p-6">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">
                <Chrome size={14} />
                Extension Sync Layer
              </div>
              <h3 className="mt-3 text-2xl font-black text-white">Website and YouTube Stay in Lockstep</h3>
              <div className="mt-5 space-y-3">
                {syncPoints.map((point) => (
                  <div key={point} className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="rounded-2xl border border-white/10 bg-[#0f0f10] p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">
              <BarChart3 size={14} />
              Why Teams Pick OpenCourse
            </div>
            <h3 className="mt-3 text-2xl md:text-3xl font-black text-white max-w-3xl">
              Built for outcomes, not just video consumption.
            </h3>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-bold text-zinc-100">Personalization Engine</p>
                <p className="text-sm text-zinc-400 mt-2">
                  Onboarding-to-planner adaptation tunes content depth, pace, and strategy for each learner.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-bold text-zinc-100">Retention Loop</p>
                <p className="text-sm text-zinc-400 mt-2">
                  Quizzes, revision queues, and due-note cycles keep learners accountable and improve recall.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-bold text-zinc-100">Seamless Continuity</p>
                <p className="text-sm text-zinc-400 mt-2">
                  Website player and extension share one progress source of truth without context loss.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-28">
          <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/15 to-zinc-900 p-8 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-blue-300 font-black">
              <ShieldCheck size={14} />
              Ready to Launch
            </div>
            <h2 className="mt-4 text-3xl md:text-5xl font-black text-white">
              Start your AI-personalized learning journey
            </h2>
            <p className="mt-4 text-zinc-300 max-w-3xl mx-auto">
              Import playlist, build custom course modules, track progress with AI guidance, and keep learning synced across website and YouTube.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate("/signup")}
                className="px-8 py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold transition"
              >
                Create Free Account
              </button>
              <button
                onClick={() => navigate("/onboarding")}
                className="px-8 py-3.5 rounded-xl border border-zinc-500 hover:border-zinc-300 text-zinc-100 font-semibold transition"
              >
                Explore Onboarding
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-zinc-500">© {new Date().getFullYear()} OpenCourse. Built for focused learning outcomes.</div>
          <a
            href="https://github.com/aayushsharma7/makeathonGenuine"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
          >
            View GitHub
            <ArrowRight size={14} />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
