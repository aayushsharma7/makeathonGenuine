import React, { useEffect, useState, useRef } from "react";
import {
  Play,
  ChevronLeft,
  Clock,
  ChevronDown,
  Send,
  Bot,
  BookCopy,
  SquareCheckBig,
  PencilRuler,
  Pencil,
  Trash2,
  ListVideo,
  Code,
  Bug,
  ExternalLink,
  ClipboardPen,
  CircleHelp,
  X,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useNavigate, useParams } from "react-router-dom";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

import axios from "axios";
import { Excalidraw, WelcomeScreen, serializeAsJSON } from "@excalidraw/excalidraw";
import Editor from "@monaco-editor/react";
import "@excalidraw/excalidraw/index.css"; //else tailwind css messed it up

  const CODE_SNIPPETS = {
    javascript: `// JavaScript Playground\nconsole.log("Hello World!");\n\nfunction sum(a, b) {\n  return a + b;\n}`,
    python: `# Python Playground\ndef main():\n    print("Hello World!")\n\nif __name__ == "__main__":\n    main()`,
    java: `// Java Playground\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}`,
    cpp: `// C++ Playground\n#include <iostream>\n\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}`
  };

  const LANGUAGE_VERSIONS = {
    javascript: "18.15.0",
    python: "3.10.0",
    java: "15.0.2",
    c: "10.2.0",
    cpp: "10.2.0",
  };

const CoursePlayer = () => {
  const getApiData = (response) => {
    return response?.data?.data ?? response?.data;
  };
  const formatTimestampLabel = (seconds = 0) => {
    const safe = Math.max(0, parseInt(seconds || 0, 10) || 0);
    const mins = Math.floor(safe / 60);
    const secs = `${safe % 60}`.padStart(2, "0");
    return `${mins}:${secs}`;
  };
  const [data, setData] = useState([]);
  const [courseData, setCourseData] = useState({});
  const { name, id } = useParams();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isContentOpen, setIsContentOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCardsOpen, setIsCardsOpen] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [isSummaryButtonOpen, setIsSummaryButtonOpen] = useState(true);
  const playerInstanceRef = useRef(null); // to use the player outside the useeffect...
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Hello! I'm your AI learning assistant. I'm watching this video with you. Ask me anything about the content!",
    },
  ]);
  const videoRef = useRef(null); // this means this - {current: null}:  useRef gives you an object that looks like this: { current: initialValue }. This object stays the same for the entire life of the component.
  const ragWarmedVideoSetRef = useRef(new Set());
  const playbackMetricsRef = useRef({
    pauseCount: 0,
    speedSum: 1,
    speedSamples: 1,
    watchedSeconds: 0,
    lastTime: 0,
    isPlaying: false,
  });
  // const plyrRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [notesLoading, setNotesLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [videoProgress, setVideoProgress] = useState({});
  const [courseProgress, setCourseProgress] = useState({});

  const [isProblemButtonOpen, setIsProblemButtonOpen] = useState(true);

  const [input, setInput] = useState("");
  const chatContainerRef = useRef(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [aiRagStatus, setAiRagStatus] = useState(null);
  const [aiOverview, setAiOverview] = useState(null);
  const [aiOverviewLoading, setAiOverviewLoading] = useState(false);
  const [aiOverviewError, setAiOverviewError] = useState("");
  const [currentVideoNotes, setCurrentVideoNotes] = useState([]);
  const [notesByCategory, setNotesByCategory] = useState({});
  const [dueNotes, setDueNotes] = useState([]);
  const [noteCategoryFilter, setNoteCategoryFilter] = useState("all");
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isIdeOpen, setIsIdeOpen] = useState(false);
  const [isExcaliOpen, setIsExcaliOpen] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [noteCategory, setNoteCategory] = useState("theory");
  const navigate = useNavigate();
  const [problemsData, setProblemsData] = useState([]);
  const [relevant, setRelevant] = useState(true);
  const [summaryData, setSummaryData] = useState("");
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitLoading, setQuizSubmitLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizRagStatus, setQuizRagStatus] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState("");
  const [quizError, setQuizError] = useState("");
  const [quizStartedAt, setQuizStartedAt] = useState(0);
  const [quizHintOpenMap, setQuizHintOpenMap] = useState({});
  const [quizMastery, setQuizMastery] = useState([]);
  const [quizSchedule, setQuizSchedule] = useState({ dueItems: [], upcomingItems: [] });
  const [quizStats, setQuizStats] = useState(null);
  const [quizAnalytics, setQuizAnalytics] = useState({ dropoff: [], weakTopicHeatmap: [] });
  const [quizMetaLoading, setQuizMetaLoading] = useState(false);
  const [showEndQuizPrompt, setShowEndQuizPrompt] = useState(false);
  const [progressInsights, setProgressInsights] = useState(null);
  const [progressInsightsLoading, setProgressInsightsLoading] = useState(false);
  const [isModulesOverviewOpen, setIsModulesOverviewOpen] = useState(true);
  const [openModulesMap, setOpenModulesMap] = useState({});
  const [newVideoUrls, setNewVideoUrls] = useState([""]);
  const [addingVideos, setAddingVideos] = useState(false);
  const [addVideoStatus, setAddVideoStatus] = useState("");
  const [rebuildingModules, setRebuildingModules] = useState(false);
  const [moduleRebuildStatus, setModuleRebuildStatus] = useState("");
  const [showQuizAdvanced, setShowQuizAdvanced] = useState(false);
  const [noteRevisionLoadingId, setNoteRevisionLoadingId] = useState("");
  const [noteCategorySuggesting, setNoteCategorySuggesting] = useState(false);
  const [courseNoteQueue, setCourseNoteQueue] = useState({ dueCount: 0, upcomingCount: 0, byCategory: {} });

  const [ideLanguage, setIdeLanguage] = useState("javascript");
  const [ideVersion, setIdeVersion] = useState(LANGUAGE_VERSIONS["javascript"]);
  const [ideCode, setIdeCode] = useState(CODE_SNIPPETS["javascript"]);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const [isExcaliLoaded, setIsExcaliLoaded] = useState(false)

  const [activeTab, setActiveTab] = useState("output"); 
  const [userInput, setUserInput] = useState("");

  const initialDrawData= useRef(null) //useref as usestate was making it empty at refresh
  const courseIdFromUrl = id?.split("}")[0] || "";
  
  const onLanguageChange = (e) => {
    const lang = e.target.value;
    setIdeLanguage(lang);
    setIdeVersion(LANGUAGE_VERSIONS[lang]);
    setIdeCode(CODE_SNIPPETS[lang]);
  };
  const runCode = async () => {
      setIsRunning(true);
      setActiveTab("output");
      setOutput(["Running code..."]);

    try {
      const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
        language: ideLanguage,
        version: ideVersion,
        files: [{ content: ideCode }],
        stdin: userInput,
      });

      const { run: { stdout, stderr } } = response.data;
      
      if (stderr) {
          setOutput(stderr.split("\n"));
      } else {
          setOutput(stdout.split("\n"));
      }

    } catch (error) {
      console.error(error);
      setOutput(["Error executing code.", "Check console for details."]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDrawChange = (elements, appState) => {
    const json = serializeAsJSON(elements, appState, {}, "local"); //helper func from excali (keeps file clean)
    // console.log( JSON.stringify(json));
    localStorage.setItem(`excali_${courseData?.[0]?._id}`, JSON.stringify(json));
  }

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
        withCredentials: true,
      });
      if (!responsePost.data?.success) {
        navigate("/login");
      }
    } catch (error) {
      console.log(error);
      navigate("/login");
    }
  };

  useEffect(() => {
    setIsProblemButtonOpen(true);
    setShowEndQuizPrompt(false);
    setQuizData(null);
    setQuizRagStatus(null);
    setQuizAnswers({});
    setQuizResult(null);
    setQuizAttempts([]);
    setSelectedAttemptId("");
    setQuizError("");
    setQuizStartedAt(0);
    setQuizHintOpenMap({});
    setQuizMastery([]);
    setQuizSchedule({ dueItems: [], upcomingItems: [] });
    setQuizStats(null);
    setQuizAnalytics({ dropoff: [], weakTopicHeatmap: [] });
    if (localStorage.getItem(`problemsOpened_${data?.[activeIndex]?._id}`)) {
      if (
        localStorage.getItem(`problemsOpened_${data?.[activeIndex]?._id}`) ===
        "false"
      ) {
        setIsProblemButtonOpen(false);
        setNotesLoading(true);
        getProblemsData();
      }
    }
    setIsSummaryButtonOpen(true);
    if (localStorage.getItem(`summaryOpened_${data?.[activeIndex]?._id}`)) {
      if (
        localStorage.getItem(`summaryOpened_${data?.[activeIndex]?._id}`) ===
        "false"
      ) {
        setIsSummaryButtonOpen(false);
        setSummaryLoading(true);
        getSummaryData();
      }
    };

    localStorage.setItem(`video_${currentVideoId}_progress`,data?.[activeIndex]?.progressTime)

  }, [activeIndex]);

  const getData = async () => {
    try {
      const apiData = await axios.get(
        `${import.meta.env.VITE_API_URL}/course/data/${id.split("}")[0]}`,
        {
          withCredentials: true,
        }
      );
      const courseApiData = await axios.get(
        `${import.meta.env.VITE_API_URL}/course/getCourse/${id.split("}")[0]}`,
        {
          withCredentials: true,
        }
      );
      const courseVideos = getApiData(apiData) || [];
      const courseMeta = getApiData(courseApiData) || {};

      const currIndex =
        localStorage.getItem(
          `last_video_played_${courseVideos?.[activeIndex]?.playlist}`
        ) ||
        courseMeta?.lastVideoPlayed ||
        0;
      // console.log(localStorage.getItem(`last_video_played_${data?.[activeIndex]?.playlist}`))
      setActiveIndex(parseFloat(currIndex));
      // console.log(apiData.data);
      const filteredData = courseVideos.filter((e) => e.duration !== "PT0S").filter((e) => e.title !== "Deleted video");
      setData(filteredData);
      setCourseData([courseMeta]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getSummaryData = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/generate/summary`,
        {
          videoId: data?.[activeIndex]?.videoId,
          title: data?.[activeIndex]?.title,
          description: data?.[activeIndex]?.description,
        },
        {
          withCredentials: true,
        }
      );
      const summaryPayload = getApiData(res);
      setSummaryData(summaryPayload?.summary || "");
    } catch (error) {
      console.log(error);
    } finally {
      setSummaryLoading(false);
    }
  };
  const getProblemsData = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/generate/problems`,
        {
          videoId: data?.[activeIndex]?.videoId,
          title: data?.[activeIndex]?.title,
          description: data?.[activeIndex]?.description,
        },
        {
          withCredentials: true,
        }
      );
      const problemsPayload = getApiData(res);
      setProblemsData(problemsPayload?.problemsList || []);
      setRelevant(problemsPayload?.relevant ?? false);
    } catch (error) {
      console.log(error);
    } finally {
      setProblemsLoading(false);
    }
  };

  const getQuizData = async ({ adaptive = false, forceRegenerate = false, focusConcept = "" } = {}) => {
    if (!data?.[activeIndex]?._id) {
      return;
    }
    setQuizLoading(true);
    setQuizError("");
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/quiz/get`,
        {
          videoDbId: data?.[activeIndex]?._id,
          adaptive,
          forceRegenerate,
          focusConcept,
        },
        {
          withCredentials: true,
        }
      );
      const quizPayload = getApiData(response);
      setQuizData(quizPayload?.quiz || null);
      setQuizRagStatus(quizPayload?.ragStatus || null);
      setQuizAnswers({});
      setQuizHintOpenMap({});
      setQuizAttempts(Array.isArray(quizPayload?.attempts) ? quizPayload.attempts : []);
      const latestAttempt = quizPayload?.latestAttempt || null;
      if (adaptive) {
        setQuizResult(null);
        setSelectedAttemptId("");
        setQuizStartedAt(Date.now());
      } else {
        setQuizResult(latestAttempt);
        setSelectedAttemptId(latestAttempt?._id || "");
        if (!latestAttempt) {
          setQuizStartedAt(Date.now());
        }
      }
    } catch (error) {
      console.log(error);
      setQuizError(error?.response?.data?.message || "Unable to fetch quiz.");
    } finally {
      setQuizLoading(false);
    }
  };

  const getQuizMetaData = async () => {
    if (!id) {
      return;
    }
    setQuizMetaLoading(true);
    try {
      const courseId = id.split("}")[0];
      const [masteryRes, scheduleRes, statsRes, analyticsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/course/quiz/mastery/${courseId}`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/course/quiz/schedule/${courseId}`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/course/quiz/stats/${courseId}`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/course/quiz/analytics/${courseId}`, { withCredentials: true }),
      ]);

      const masteryPayload = getApiData(masteryRes);
      const schedulePayload = getApiData(scheduleRes);
      const statsPayload = getApiData(statsRes);
      const analyticsPayload = getApiData(analyticsRes);

      setQuizMastery(masteryPayload?.mastery || []);
      setQuizSchedule({
        dueItems: schedulePayload?.dueItems || [],
        upcomingItems: schedulePayload?.upcomingItems || [],
      });
      setQuizStats(statsPayload || null);
      setQuizAnalytics({
        dropoff: analyticsPayload?.dropoff || [],
        weakTopicHeatmap: analyticsPayload?.weakTopicHeatmap || [],
      });
    } catch (error) {
      console.log(error);
    } finally {
      setQuizMetaLoading(false);
    }
  };

  const getProgressInsights = async () => {
    if (!courseIdFromUrl) {
      return;
    }
    setProgressInsightsLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/course/progress/insights/${courseIdFromUrl}`,
        { withCredentials: true }
      );
      const payload = getApiData(response);
      setProgressInsights(payload || null);
    } catch (error) {
      console.log(error);
    } finally {
      setProgressInsightsLoading(false);
    }
  };

  const getVideoAiOverview = async () => {
    if (!data?.[activeIndex]?._id) {
      return;
    }
    setAiOverviewLoading(true);
    setAiOverviewError("");
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/video/ai-overview`,
        {
          videoDbId: data?.[activeIndex]?._id,
        },
        { withCredentials: true }
      );
      const payload = getApiData(response);
      setAiOverview(payload || null);
    } catch (error) {
      console.log(error);
      setAiOverviewError(error?.response?.data?.message || "Unable to generate AI overview.");
      setAiOverview(null);
    } finally {
      setAiOverviewLoading(false);
    }
  };

  const prewarmCurrentVideoRag = async () => {
    const videoDbId = data?.[activeIndex]?._id;
    if (!videoDbId) {
      return;
    }
    if (ragWarmedVideoSetRef.current.has(videoDbId)) {
      return;
    }
    ragWarmedVideoSetRef.current.add(videoDbId);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/course/rag/prewarm`,
        {
          videoDbId,
        },
        {
          withCredentials: true,
        }
      );
    } catch {
      ragWarmedVideoSetRef.current.delete(videoDbId);
    }
  };

  const handleQuizOptionSelect = (questionIndex, optionIndex) => {
    if (quizSubmitLoading || quizResult) {
      return;
    }
    setQuizAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const startNewQuizAttempt = () => {
    setQuizResult(null);
    setSelectedAttemptId("");
    setQuizAnswers({});
    setQuizHintOpenMap({});
    setQuizError("");
    setQuizStartedAt(Date.now());
    getQuizData({ adaptive: true, forceRegenerate: true });
  };

  const startFocusedReQuiz = (conceptTag) => {
    if (!conceptTag) {
      return;
    }
    setQuizResult(null);
    setSelectedAttemptId("");
    setQuizAnswers({});
    setQuizHintOpenMap({});
    setQuizError("");
    setQuizStartedAt(Date.now());
    getQuizData({
      adaptive: true,
      forceRegenerate: true,
      focusConcept: conceptTag,
    });
  };

  const jumpToRevisionClip = (clip) => {
    const target = Math.max(0, parseFloat(clip?.startSeconds || 0));
    if (playerInstanceRef?.current) {
      playerInstanceRef.current.currentTime = target;
      setIsToolsOpen(true);
      setIsSummaryOpen(false);
      setIsIdeOpen(false);
      setIsExcaliOpen(false);
    }
  };

  const submitQuiz = async () => {
    if (!quizData?._id) {
      return;
    }

    const answers = quizData.questions.map((_, idx) => quizAnswers[idx]);
    if (answers.some((item) => typeof item !== "number")) {
      setQuizError("Please answer all questions before submitting.");
      return;
    }

    setQuizSubmitLoading(true);
    setQuizError("");
    try {
      const speedSamples = playbackMetricsRef.current.speedSamples || 1;
      const avgPlaybackSpeed = Number(
        ((playbackMetricsRef.current.speedSum || 1) / Math.max(1, speedSamples)).toFixed(2)
      );
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/quiz/submit`,
        {
          quizId: quizData._id,
          videoDbId: data?.[activeIndex]?._id,
          answers,
          timeSpentSeconds: quizStartedAt ? Math.floor((Date.now() - quizStartedAt) / 1000) : 0,
          engagementMetrics: {
            pauseCount: playbackMetricsRef.current.pauseCount || 0,
            avgPlaybackSpeed,
            watchedSeconds: Math.floor(playbackMetricsRef.current.watchedSeconds || 0),
          },
        },
        {
          withCredentials: true,
        }
      );
      const attemptPayload = getApiData(response);
      const savedAttempt = attemptPayload || null;
      setQuizResult(savedAttempt);
      setSelectedAttemptId(savedAttempt?._id || "");
      setQuizAttempts((prev) => {
        if (!savedAttempt?._id) {
          return prev;
        }
        const filtered = prev.filter((item) => item?._id !== savedAttempt._id);
        return [savedAttempt, ...filtered].slice(0, 10);
      });
      await getQuizMetaData();
    } catch (error) {
      console.log(error);
      setQuizError(error?.response?.data?.message || "Unable to submit quiz.");
    } finally {
      setQuizSubmitLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    getData();
    getProgressInsights();
    
  }, []);

  useEffect(() => {
    if (!data?.[activeIndex]?._id) {
      return;
    }
    prewarmCurrentVideoRag();
    getVideoAiOverview();
  }, [data, activeIndex]);

  const getNotesData = async () => {
    try {
      const notesApiData = await axios.get(
        `${import.meta.env.VITE_API_URL}/course/notes/${data?.[activeIndex]?._id}`,
        {
          withCredentials: true,
        }
      );
      const notesPayload = getApiData(notesApiData);
      if (Array.isArray(notesPayload)) {
        setCurrentVideoNotes(notesPayload || []);
        setNotesByCategory({});
        setDueNotes([]);
      } else {
        setCurrentVideoNotes(notesPayload?.notes || []);
        setNotesByCategory(notesPayload?.groupedByCategory || {});
        setDueNotes(notesPayload?.dueNow || []);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setNotesLoading(false);
    }
  };

  const getCourseNoteReviewQueue = async () => {
    if (!courseIdFromUrl) {
      return;
    }
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/course/notes/review-queue/${courseIdFromUrl}`,
        { withCredentials: true }
      );
      const payload = getApiData(response) || {};
      setCourseNoteQueue({
        dueCount: payload?.dueCount || 0,
        upcomingCount: payload?.upcomingCount || 0,
        byCategory: payload?.byCategory || {},
      });
    } catch (error) {
      console.log(error);
    }
  };

  const setActive = (index) => {
    setShowEndQuizPrompt(false);
    setActiveIndex(index);
    // console.log(activeIndex);
  };

  const openQuizPanel = () => {
    setIsToolsOpen(true);
    setIsContentOpen(false);
    setIsChatOpen(false);
    setIsCardsOpen(false);
    setIsPracticeOpen(false);
    setIsQuizOpen(true);
    setShowQuizAdvanced(false);
    setTimeout(() => {
      getQuizData();
      getQuizMetaData();
      getProgressInsights();
    }, 250);
  };

  const goToNextVideo = () => {
    if (activeIndex >= data?.length - 1) {
      return;
    }
    setIsToolsOpen(true);
    setIsContentOpen(true);
    setIsChatOpen(false);
    setIsCardsOpen(false);
    setIsPracticeOpen(false);
    setIsQuizOpen(false);
    setActiveIndex((prev) => prev + 1);
  };

  const handleEndQuizYes = () => {
    setShowEndQuizPrompt(false);
    openQuizPanel();
  };

  const handleEndQuizNo = () => {
    setShowEndQuizPrompt(false);
    goToNextVideo();
  };

  const deletNotes = async (noteId) => {
    try {
      // setCurrentVideoNotes((prev) => ([...prev].filter((e) => e.noteIndex !== noteIdx+1)));
      await axios.post(
        `${import.meta.env.VITE_API_URL}/course/update/video/notes/delete`,
        {
          videoId: data?.[activeIndex]?._id,
          noteId,
        },
        { withCredentials: true }
      );
      await getNotesData();
      await getCourseNoteReviewQueue();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    //auto scroll chatbox
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isChatLoading]);

  const handleInput = (e) => {
    setInput(e.target.value);
  };
  const handleNotesInput = (e) => {
    setNotesInput(e.target.value);
  };

  const handleNotesSubmit = async (e) => {
    e.preventDefault();
    setNotesLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/course/update/video/notes`,
        {
          videoId: data?.[activeIndex]?._id,
          newNote: {
            videoId: data?.[activeIndex]?._id,
            timestamp:
              JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))
                ?.progressTime ||
              data?.[activeIndex]?.progressTime ||
              0,
            notesContent: notesInput,
            category: noteCategory,
          },
        },
        { withCredentials: true }
      );

      await getNotesData();
      await getCourseNoteReviewQueue();

      // setCurrentVideoNotes((prev) => [...prev, {
      //   videoId: data?.[activeIndex]?._id,
      //   noteIndex: currentVideoNotes.length + 1 || 1,
      //   timestamp: Math.floor(playerInstanceRef.current.currentTime) || JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))?.progressTime || data?.[activeIndex]?.progressTime || 0,
      //   notesContent: notesInput
      // }]);
      setNotesInput("");
    } catch (error) {
      console.log(error);
      setNotesLoading(false);
    }
  };

  const suggestNoteCategory = async () => {
    const text = `${notesInput || ""}`.trim();
    if (!text || !data?.[activeIndex]?._id) {
      return;
    }
    setNoteCategorySuggesting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/update/video/notes/suggest-category`,
        {
          videoId: data?.[activeIndex]?._id,
          notesContent: text,
        },
        { withCredentials: true }
      );
      const payload = getApiData(response);
      if (payload?.category) {
        setNoteCategory(payload.category);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setNoteCategorySuggesting(false);
    }
  };

  const reviewNoteNow = async (noteId, rating = 3) => {
    if (!noteId) {
      return;
    }
    setNoteRevisionLoadingId(noteId);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/course/update/video/notes/review`,
        {
          videoId: data?.[activeIndex]?._id,
          noteId,
          rating,
        },
        { withCredentials: true }
      );
      await getNotesData();
      await getCourseNoteReviewQueue();
    } catch (error) {
      console.log(error);
    } finally {
      setNoteRevisionLoadingId("");
    }
  };

  const setNewVideoUrlAt = (index, value) => {
    setNewVideoUrls((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addNewVideoInput = () => {
    setNewVideoUrls((prev) => [...prev, ""]);
  };

  const removeNewVideoInput = (index) => {
    setNewVideoUrls((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [""];
    });
  };

  const addVideosToExistingCourse = async () => {
    const urls = newVideoUrls.map((item) => item.trim()).filter(Boolean);
    if (!urls.length) {
      setAddVideoStatus("Add at least one video URL.");
      return;
    }

    setAddingVideos(true);
    setAddVideoStatus("");
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/add-videos`,
        {
          courseId: id.split("}")[0],
          videoUrls: urls,
        },
        {
          withCredentials: true,
        }
      );

      if (response?.data?.success) {
        setAddVideoStatus(`Added ${response?.data?.data?.addedCount || urls.length} videos successfully.`);
        setNewVideoUrls([""]);
        await getData();
      } else {
        setAddVideoStatus(response?.data?.message || "Unable to add videos.");
      }
    } catch (error) {
      console.log(error);
      setAddVideoStatus(error?.response?.data?.message || "Unable to add videos.");
    } finally {
      setAddingVideos(false);
    }
  };

  const rebuildModules = async () => {
    if (!courseIdFromUrl) {
      return;
    }
    setRebuildingModules(true);
    setModuleRebuildStatus("");
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/course/rebuild-modules`,
        {
          courseId: courseIdFromUrl,
        },
        {
          withCredentials: true,
        }
      );

      if (response?.data?.success) {
        setModuleRebuildStatus("Modules rebuilt successfully.");
        await getData();
      } else {
        setModuleRebuildStatus(response?.data?.message || "Unable to rebuild modules.");
      }
    } catch (error) {
      console.log(error);
      setModuleRebuildStatus(error?.response?.data?.message || "Unable to rebuild modules.");
    } finally {
      setRebuildingModules(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newMessages = [
      ...messages,
      {
        role: "user",
        content: input,
      },
    ];
    sessionStorage.setItem(
      `messages_${data?.[activeIndex]?._id}`,
      JSON.stringify(newMessages)
    );

    if (!isChatLoading) {
      // const newMessages = [...messages, {
      // role: "user",
      // content: input
      // }] //spread operator to it doesnt create reference to original messages array and ui updates auto (dont use this as state isnt updated synchronously)

      // Use the functional update form with the previous state --- impppp
      setMessages(newMessages);
      setInput("");

      setIsChatLoading(true);

      try {
        const start = currentTime > 60 ? Math.floor(currentTime) - 60 : 0;
        const end = Math.floor(currentTime) + 60;
        // const rawTranscript = await fetchTranscript(`https://www.youtube.com/watch?v=${data?.[activeIndex]?.videoId}`,{
        //     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        // });

        const resp = await axios.post(
          `${import.meta.env.VITE_API_URL}/course/ai`,
          {
            messages: newMessages.slice(-6),
            videoId: data?.[activeIndex]?.videoId,
            start,
            end,
            currentQues: {
              role: "user",
              content: input,
            },
            title: data?.[activeIndex]?.title,
            description: data?.[activeIndex]?.description
          },
          { withCredentials: true }
        );
        const aiPayload = getApiData(resp);
        if (aiPayload && typeof aiPayload === "object" && aiPayload.ragStatus) {
          setAiRagStatus(aiPayload.ragStatus);
        }
        const aiAnswer =
          typeof aiPayload === "string"
            ? aiPayload
            : aiPayload?.answer || "Sorry, I couldn't generate a response right now.";
        const newerMessages = [
          ...newMessages,
          {
            role: "system",
            content: aiAnswer,
          },
        ];
        setMessages(newerMessages);
        sessionStorage.setItem(
          `messages_${data?.[activeIndex]?._id}`,
          JSON.stringify(newerMessages)
        );
      } catch (error) {
        console.error(error);
        const newerMessages = [
          ...newMessages,
          {
            role: "system",
            content: "Sorry, I'm having trouble connecting right now.",
          },
        ];
        setMessages(newerMessages);
        sessionStorage.setItem(
          `messages_${data?.[activeIndex]?._id}`,
          JSON.stringify(newerMessages)
        );
      } finally {
        setIsChatLoading(false);
      }
    }
  };

  // console.log(Math.floor((currentTime/currDuration)*100));

  // useEffect(() => {
  //   if (
  //     JSON.parse(localStorage.getItem(`messages_${data?.[activeIndex]?._id}`))
  //   ) {
  //     setMessages(
  //       JSON.parse(localStorage.getItem(`messages_${data?.[activeIndex]?._id}`))
  //     );
  //   } else {
  //     setMessages([
  //       {
  //         role: "system",
  //         content:
  //           "ho",
  //       },
  //     ]);
  //   }
  // }, [activeIndex]);

  const currentVideoId = data?.[activeIndex]?.videoId;
  const bestQuizAttempt = (quizAttempts || []).reduce((best, attempt) => {
    if (!attempt) {
      return best;
    }
    if (!best) {
      return attempt;
    }
    return (attempt?.percentage || 0) > (best?.percentage || 0) ? attempt : best;
  }, null);
  const latestQuizAttempt = (quizAttempts || []).length ? quizAttempts[0] : null;
  const previousQuizAttempt = (quizAttempts || []).length > 1 ? quizAttempts[1] : null;
  const latestQuizTrendDelta = latestQuizAttempt && previousQuizAttempt
    ? (latestQuizAttempt?.percentage || 0) - (previousQuizAttempt?.percentage || 0)
    : null;
  const noteCategoryKeys = Object.keys(notesByCategory || {});
  const filteredDueNotes = noteCategoryFilter === "all"
    ? (dueNotes || [])
    : (dueNotes || []).filter((note) => `${note?.category || ""}`.toLowerCase() === noteCategoryFilter);
  const filteredNotesByCategory = noteCategoryFilter === "all"
    ? (notesByCategory || {})
    : { [noteCategoryFilter]: (notesByCategory?.[noteCategoryFilter] || []) };
  const moduleGroups = data.reduce((acc, video, index) => {
    const moduleKey = video.moduleTitle || "Module: General";
    const savedProgress = JSON.parse(localStorage.getItem(`video_${video.videoId}_progress`));
    const isCompleted = (savedProgress?.completed || video?.completed) === true;

    if (!acc[moduleKey]) {
      acc[moduleKey] = {
        title: moduleKey,
        firstIndex: index,
        total: 0,
        completed: 0,
        videos: [],
      };
    }

    acc[moduleKey].total += 1;
    if (isCompleted) {
      acc[moduleKey].completed += 1;
    }
    acc[moduleKey].videos.push({
      index,
      video,
      isCompleted,
      savedProgress,
    });
    return acc;
  }, {});
  const modulesList = Object.values(moduleGroups);

  useEffect(() => {
    if (!modulesList.length) {
      setOpenModulesMap({});
      return;
    }
    setOpenModulesMap((prev) => {
      const next = { ...prev };
      modulesList.forEach((moduleItem, idx) => {
        if (typeof next[moduleItem.title] !== "boolean") {
          next[moduleItem.title] = idx === 0;
        }
      });
      return next;
    });
  }, [data]);

  useEffect(() => {
    playbackMetricsRef.current = {
      pauseCount: 0,
      speedSum: 1,
      speedSamples: 1,
      watchedSeconds: 0,
      lastTime: 0,
      isPlaying: false,
    };
    const player = new Plyr(videoRef.current, {
      //this videoRef.current injects this player into the div tag where it is referrenced to
      controls: [
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "settings",
        "fullscreen",
      ],
      loop: { active: false },
      youtube: {
        noCookie: true,
        iv_load_policy: 3,
      },
      ratio: "16:9",
    });

    // plyrRef.current = player;

    player.on("ready", (event) => {
      playerInstanceRef.current = player;
      const speed = Number(player?.speed || 1);
      playbackMetricsRef.current.speedSum = speed;
      playbackMetricsRef.current.speedSamples = 1;
      // if(!JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))){
      //     const obj = JSON.stringify({
      //       progressTime: 0,
      //       duration: player.duration,
      //       completed: false
      //     })
      //     localStorage.setItem(`video_${currentVideoId}_progress`, obj );
      //     const progressedTime = 0;
      // console.log(progressedTime);
      //     event.detail.plyr.currentTime = parseFloat(progressedTime); // this parseFloat is required to convert string to number -- impp
      //     setCurrDuration(player.duration);
      //     setCurrVideo(activeIndex);
      //     localStorage.setItem(`last_video_played_${data?.[activeIndex]?.playlist}`, activeIndex);
      // }
      const progressedTime =
        JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))
          ?.progressTime || data?.[activeIndex]?.progressTime;
      // console.log(progressedTime);
      event.detail.plyr.currentTime = parseFloat(progressedTime); // this parseFloat is required to convert string to number -- impp
      localStorage.setItem(
        `last_video_played_${data?.[activeIndex]?.playlist}`,
        activeIndex
      );
      setCourseProgress({
        id: data?.[activeIndex]?.playlist,
        completedVideos:
          JSON.parse(
            localStorage.getItem(
              `completed_videos_${data?.[activeIndex]?.playlist}`
            )
          ) || courseData?.[0]?.completedVideos,
        lastVideoPlayed:
          localStorage.getItem(
            `last_video_played_${data?.[activeIndex]?.playlist}`
          ) ||
          courseData?.[0]?.lastVideoPlayed ||
          0,
      });
      // console.log(player.duration)
      // const newCompletedVideos = [...completedVideos].filter(
      //   (num) => num !== activeIndex
      // );
      // setCompletedVideos(newCompletedVideos);
      // const compVids = JSON.stringify(newCompletedVideos);
      // localStorage.setItem(`completed_videos`, compVids);
    });
    player.on("timeupdate", (event) => {
      //simple event listener when currentTime attribute of player updates
      const time = event.detail.plyr.currentTime;
      const speed = Number(event.detail.plyr.speed || 1);
      const lastTime = playbackMetricsRef.current.lastTime || 0;
      const delta = time - lastTime;
      if (playbackMetricsRef.current.isPlaying && delta > 0 && delta < 6) {
        playbackMetricsRef.current.watchedSeconds += delta;
      }
      playbackMetricsRef.current.lastTime = time;
      if (Number.isFinite(speed) && speed > 0) {
        playbackMetricsRef.current.speedSum += speed;
        playbackMetricsRef.current.speedSamples += 1;
      }
      setCurrentTime(time);
      if (
        JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))
      ) {
        if (
          JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))
            .completed !== true
        ) {
          if (time > 1) {
            const progressTime = Math.floor(time);
            const obj = JSON.stringify({
              progressTime,
              duration: player.duration,
              completed: false,
            });
            setVideoProgress({
              id: data?.[activeIndex]?._id,
              progressTime,
              duration: player.duration,
              completed: false,
            });

            localStorage.setItem(`video_${currentVideoId}_progress`, obj);
          }
        }
      } else {
        if (data?.[activeIndex]?.completed !== true) {
          if (time > 1) {
            const progressTime = Math.floor(time);
            const obj = JSON.stringify({
              progressTime,
              duration: player.duration,
              completed: false,
            });
            setVideoProgress({
              id: data?.[activeIndex]?._id,
              progressTime,
              duration: player.duration,
              completed: false,
            });
            localStorage.setItem(`video_${currentVideoId}_progress`, obj);
          }
        }
      }
    });
    player.on("seeked", (event) => {
      const time = event.detail.plyr.currentTime;
      playbackMetricsRef.current.lastTime = time;
      setCurrentTime(time);
      if (
        JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))
      ) {
        if (
          JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))
            .completed !== true
        ) {
          if (time > 1) {
            const progressTime = Math.floor(time);
            const obj = JSON.stringify({
              progressTime,
              duration: player.duration,
              completed: false,
            });
            setVideoProgress({
              id: data?.[activeIndex]?._id,
              progressTime,
              duration: player.duration,
              completed: false,
            });
            localStorage.setItem(`video_${currentVideoId}_progress`, obj);
          }
        }
      } else {
        if (data?.[activeIndex]?.completed !== true) {
          if (time > 1) {
            const progressTime = Math.floor(time);
            const obj = JSON.stringify({
              progressTime,
              duration: player.duration,
              completed: false,
            });
            setVideoProgress({
              id: data?.[activeIndex]?._id,
              progressTime,
              duration: player.duration,
              completed: false,
            });
            localStorage.setItem(`video_${currentVideoId}_progress`, obj);
          }
        }
      }
    });
    player.on("ended", (event) => {
      const time = event.detail.plyr.currentTime;
      playbackMetricsRef.current.lastTime = time;
      playbackMetricsRef.current.isPlaying = false;
      setCurrentTime(time);
      if (
        JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))
      ) {
        if (
          JSON.parse(localStorage.getItem(`video_${currentVideoId}_progress`))
            .completed !== true
        ) {
          if (time > 1) {
            const obj = JSON.stringify({
              progressTime: player.duration,
              duration: player.duration,
              completed: true,
            });
            setVideoProgress({
              id: data?.[activeIndex]?._id,
              progressTime: player.duration,
              duration: player.duration,
              completed: true,
            });

            localStorage.setItem(`video_${currentVideoId}_progress`, obj);
          }
        }
      } else {
        if (data?.[activeIndex]?.completed !== true) {
          if (time > 1) {
            const obj = JSON.stringify({
              progressTime: player.duration,
              duration: player.duration,
              completed: true,
            });
            setVideoProgress({
              id: data?.[activeIndex]?._id,
              progressTime: player.duration,
              duration: player.duration,
              completed: true,
            });
            localStorage.setItem(`video_${currentVideoId}_progress`, obj);
          }
        }
      }
      const completedVids =
        JSON.parse(
          localStorage.getItem(
            `completed_videos_${data?.[activeIndex]?.playlist}`
          )
        ) || courseData?.[0]?.completedVideos;
      if (completedVids.filter((num) => num === activeIndex).length === 0) {
        const compVids = JSON.stringify([...completedVids, activeIndex]);
        // const compVids = JSON.stringify([...completedVideos, activeIndex]);

        localStorage.setItem(
          `completed_videos_${data?.[activeIndex]?.playlist}`,
          compVids
        );
        setCourseProgress({
          id: data?.[activeIndex]?.playlist,
          completedVideos:
            JSON.parse(
              localStorage.getItem(
                `completed_videos_${data?.[activeIndex]?.playlist}`
              )
            ) || courseData?.[0]?.completedVideos,
          lastVideoPlayed:
            localStorage.getItem(
              `last_video_played_${data?.[activeIndex]?.playlist}`
            ) ||
            courseData?.[0]?.lastVideoPlayed ||
            0,
        });
      }
      // if(activeIndex !== data?.length){
      //   setInterval(() => {
      //     setActiveIndex((prev) => prev+1);
      //   },3000)
      // }
      // event.detail.plyr.stop();
      setShowEndQuizPrompt(true);
    });
    player.on("play", () => {
      playbackMetricsRef.current.isPlaying = true;
      playbackMetricsRef.current.lastTime = Number(player.currentTime || 0);
    });
    player.on("pause", () => {
      if (!player.ended && Number(player.currentTime || 0) > 1) {
        playbackMetricsRef.current.pauseCount += 1;
      }
      playbackMetricsRef.current.isPlaying = false;
    });
    player.on("ratechange", () => {
      const speed = Number(player.speed || 1);
      if (Number.isFinite(speed) && speed > 0) {
        playbackMetricsRef.current.speedSum += speed;
        playbackMetricsRef.current.speedSamples += 1;
      }
    });
  }, [currentVideoId]);

  // useState: When you update it, React re-renders (refreshes) the component to show the new data on the screen.
  // useRef: When you update it, React does nothing visually. It remembers the value in the background, but the screen does not change.
  const progressRef = useRef({
    courseId: courseProgress?.id,
    videoId: videoProgress?.id,
    completedVideos: courseProgress?.completedVideos,
    lastVideoPlayed: courseProgress?.lastVideoPlayed,
    progressTime: videoProgress?.progressTime,
    duration: videoProgress?.duration,
    completed: videoProgress?.completed,
  });

  useEffect(() => {
    progressRef.current = {
      courseId: courseProgress?.id,
      videoId: videoProgress?.id,
      completedVideos: courseProgress?.completedVideos,
      lastVideoPlayed: courseProgress?.lastVideoPlayed,
      progressTime: videoProgress?.progressTime,
      duration: videoProgress?.duration,
      completed: videoProgress?.completed,
    };
  }, [courseProgress, videoProgress]);

  useEffect(() => {
    //using ref is v imp as we can update the status without re-rendering i.e if i accessed the states inside setInterval they would be having their old/value when mount happended
    // but if i use ref (which acts like a box and tells interval to see whats changed) the current of ref updates and gives latest value to the interval
    // the use effect runs when mounted first but interval runs every 5s and is cleared when unmounted...
    const interval = setInterval(async () => {
      const currentStatus = progressRef.current;
      if (currentStatus.courseId && currentStatus.videoId) {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL}/course/update/course`,
            {
              completed_videos: currentStatus.completedVideos,
              last_video_played: currentStatus.lastVideoPlayed,
              courseId: currentStatus.courseId,
            },
            { withCredentials: true }
          );
          await axios.post(
            `${import.meta.env.VITE_API_URL}/course/update/video`,
            {
              progress_time: currentStatus.progressTime,
              duration: currentStatus.duration,
              completed: currentStatus.completed,
              videoId: currentStatus.videoId,
            },
            { withCredentials: true }
          );
        } catch (error) {
          console.log(error);
        }
      }
    }, 5000);
    // In React, the function you return inside a useEffect is called the Cleanup Function.
    // React runs the Cleanup:Right before the component Unmounts (disappears).(If dependencies change) Right before running the effect again.
    return () => clearInterval(interval); //v imp to remove interval on unmount...
  }, []);

  if (loading || !data || data.length === 0 || !data[activeIndex])
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
    <div className="min-h-screen  selection:bg-[#2563EB] selection:text-black text-white overflow-hidden relative flex flex-col">
      <style>{`
        /* Width */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        /* Track */
        ::-webkit-scrollbar-track {
          background: black;
          border-radius: 4px;
        }
        /* Handle */
        ::-webkit-scrollbar-thumb {
          background: #27272a; /* Zinc-800 */
          border-radius: 4px;
          transition: background 0.3s ease;
        }
      `}</style>

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

      {/* --- CONTENT WRAPPER --- */}
      <div className="relative z-10 max-w-450 mx-auto p-4 md:p-4 flex flex-col w-full">
        {/* HEADER */}
        <header className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center justify-center gap-4">
            <div
              onClick={() => {
                // localStorage.clear();
              }}
            >
              <Link
                to="/courses"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5 backdrop-blur-md group"
              >
                <ChevronLeft className="w-5 h-5 text-zinc-400 group-hover:text-white" />
              </Link>
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-white/90">
                {name}
              </h1>
            </div>
          </div>
          <div className="mr-1">
            <div className="flex items-center justify-center gap-4">
              <div>
                <div
                  onClick={() => {
                    setIsToolsOpen(true);
                    setIsIdeOpen(false);
                    setIsSummaryOpen(false);
                    setIsExcaliOpen(false);
                    setIsQuizOpen(false);
                  }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5 backdrop-blur-md group"
                >
                  <ListVideo className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                </div>
              </div>
              <div>
                <div
                  onClick={() => {
                    setIsToolsOpen(false);
                    setIsIdeOpen(false);
                    setIsSummaryOpen(true);
                    setIsQuizOpen(false);
                  }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5 backdrop-blur-md group"
                >
                  <Pencil className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                </div>
              </div>
              <div>
                <div
                  onClick={() => {
                    setIsToolsOpen(false);
                    setIsIdeOpen(true);
                    setIsSummaryOpen(false);
                    setIsExcaliOpen(false);
                    setIsQuizOpen(false);
                  }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5 backdrop-blur-md group"
                >
                  <Code className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                </div>
              </div>
              <div>
                <div
                  onClick={() => {
                    setIsToolsOpen(false);
                    setIsIdeOpen(false);
                    setIsSummaryOpen(false);
                    setIsExcaliOpen(true);
                    setIsQuizOpen(false);
                    if(!isExcaliLoaded){
                      try {
                      if(localStorage.getItem(`excali_${courseData?.[0]?._id}`)){
                        const data = JSON.parse(localStorage.getItem(`excali_${courseData?.[0]?._id}`));
                        initialDrawData.current = {
                          elements: data.elements,
                          appState: data.appState,
                          scrollToContent: true
                        };
                      }
                      else{
                        initialDrawData.current ={ elements: [], appState: {viewBackgroundColor: "#ffffff", 
                          currentItemStrokeColor: "#1e1e1e" } };
                      };
                    } catch {
                        initialDrawData.current ={ elements: [], appState: {viewBackgroundColor: "#ffffff", 
                          currentItemStrokeColor: "#1e1e1e" } };
                    }finally{
                      setIsExcaliLoaded(true)
                    }
                    }
                    
                    
                    
                  }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5 backdrop-blur-md group"
                >
                  <ClipboardPen className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                </div>
              </div>
            </div>
          </div>
          {/* <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
                <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">
                  Episode {activeIndex + 1}
                </p>
              </div> */}
        </header>

        {/* MAIN LAYOUT */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 min-h-0 pb-2 ">
          {/* LEFT: PLAYER & DESCRIPTION */}
          <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
            {/* --- VIDEO CONTAINER --- */}
            {/* key={currentVideoId} is the magic fix. It destroys the DOM when video changes */}
            <div
              key={currentVideoId}
              className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl shrink-0"
            >
              <div
                ref={videoRef}
                className="plyr__video-embed w-full h-full"
                data-plyr-provider="youtube"
                data-plyr-embed-id={currentVideoId}
              />
              <div
                className={`absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-4 ${
                  showEndQuizPrompt ? "" : "hidden"
                }`}
              >
                <div className="w-full max-w-md rounded-md border border-white/10 bg-[#111010]/95 p-5">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    Video Completed
                  </p>
                    <button
                      type="button"
                      onClick={() => setShowEndQuizPrompt(false)}
                      className="rounded-sm border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                      aria-label="Close quiz prompt"
                      title="Close"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-zinc-100">
                    Do you want to attempt the quiz now?
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    If you skip, we will move to the next video.
                  </p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleEndQuizYes}
                      className="px-3 py-2 rounded-sm bg-[#2563EB] hover:bg-[#1d4fd8] text-black font-bold text-sm"
                    >
                      Give Quiz
                    </button>
                    <button
                      type="button"
                      onClick={handleEndQuizNo}
                      disabled={activeIndex >= data?.length - 1}
                      className="px-3 py-2 rounded-sm border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {activeIndex >= data?.length - 1 ? "No Next Video" : "Skip To Next Video"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:mt-4 mt-6 ml-2">
              <h2 className="text-xl md:text-3xl font-bold text-white mb-1 ">
                {data[activeIndex].title}
              </h2>
              <h2 className="text-md md:text-sm font-bold text-zinc-500">
                {data[activeIndex].channelTitle}
              </h2>
              <div className="mt-4 border border-white/10 bg-[#111010]/70 rounded-md p-4 max-w-6xl">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    AI Overview & Recommendations
                  </p>
                  {aiOverview?.ragStatus ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-sm border border-white/10 bg-white/5 text-zinc-400">
                      RAG {aiOverview?.ragStatus?.retrievedChunks ?? 0}
                    </span>
                  ) : null}
                </div>
                {aiOverviewLoading ? (
                  <p className="text-xs text-zinc-500 mt-2">Generating overview...</p>
                ) : aiOverviewError ? (
                  <p className="text-xs text-red-400 mt-2">{aiOverviewError}</p>
                ) : (
                  <>
                    <p className="text-sm text-zinc-300 mt-2">
                      {aiOverview?.overview || "Overview will appear shortly for this video."}
                    </p>
                    {(aiOverview?.whatYouWillLearn || []).length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(aiOverview?.whatYouWillLearn || []).map((item, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-1 rounded-sm border border-white/10 bg-white/5 text-zinc-300">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 rounded-sm border border-white/10 bg-black/20 p-3">
                      <p className="text-xs text-zinc-200 font-semibold capitalize">
                        Recommended Mode: {(aiOverview?.recommendation?.mode || "watch_full").replaceAll("_", " ")}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {aiOverview?.recommendation?.reason || "Follow the recommended flow for best learning efficiency."}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Speed: {aiOverview?.recommendation?.suggestedPlaybackSpeed || "1.0x"}
                      </p>
                      <p className="text-xs text-zinc-300 mt-1">
                        {aiOverview?.recommendation?.suggestedAction || ""}
                      </p>
                    </div>
                    {(aiOverview?.recommendation?.skipSegments || []).length ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Skippable Sections</p>
                        {(aiOverview?.recommendation?.skipSegments || []).map((segment, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (playerInstanceRef?.current) {
                                playerInstanceRef.current.currentTime = Number(segment?.startSeconds || 0);
                                playerInstanceRef.current.play();
                              }
                            }}
                            className="w-full text-left rounded-sm border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
                          >
                            <p className="text-xs text-zinc-200">
                              {formatTimestampLabel(segment?.startSeconds || 0)} - {formatTimestampLabel(segment?.endSeconds || 0)}
                            </p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{segment?.reason}</p>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(false);
                          setIsSummaryOpen(true);
                          setIsIdeOpen(false);
                          setIsExcaliOpen(false);
                          setIsQuizOpen(false);
                          getSummaryData();
                        }}
                        className="text-xs px-3 py-2 rounded-sm border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      >
                        Generate/Open Summary
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(true);
                          setIsCardsOpen(true);
                          setIsContentOpen(false);
                          setIsChatOpen(false);
                          setIsPracticeOpen(false);
                          setIsQuizOpen(false);
                          setNotesLoading(true);
                          getNotesData();
                        }}
                        className="text-xs px-3 py-2 rounded-sm border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      >
                        Open Notes
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 border border-white/10 bg-[#111010]/70 rounded-md p-4 max-w-6xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    Course Progress
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase">
                    Level: <span className="text-zinc-300 capitalize">{progressInsights?.learnerLevel || "beginner"}</span>
                  </p>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span>Completed {progressInsights?.percentageCompleted ?? 0}%</span>
                    <span>Remaining {progressInsights?.remainingPercentage ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800/70 overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full"
                      style={{ width: `${progressInsights?.percentageCompleted ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-sm border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[10px] text-zinc-500 uppercase">Videos Done</p>
                    <p className="text-sm font-bold text-zinc-100">
                      {progressInsights?.completedVideosCount ?? 0} / {progressInsights?.totalVideosCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-sm border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[10px] text-zinc-500 uppercase">Today Target</p>
                    <p className="text-sm font-bold text-zinc-100">
                      {progressInsights?.todaysGoalVideos ?? 0} videos
                    </p>
                  </div>
                  <div className="rounded-sm border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[10px] text-zinc-500 uppercase">Projected End</p>
                    <p className="text-sm font-bold text-zinc-100">
                      {progressInsights?.targetEndDate ? new Date(progressInsights.targetEndDate).toLocaleDateString() : "NA"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-sm border border-white/10 bg-black/20 px-3 py-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span>Daily videos done: {progressInsights?.todaysCompletedVideos ?? 0}</span>
                    <span>{progressInsights?.todaysVideosProgress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${progressInsights?.todaysVideosProgress ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Recommended pace: {progressInsights?.recommendedDailyVideos ?? 0} videos/day
                  </p>
                </div>
                <div className={`${progressInsightsLoading ? "" : "hidden"} mt-2 text-xs text-zinc-500`}>
                  Updating progress insights...
                </div>
              </div>
              {/* <div className="max-w-5xl p-3 bg-[#141414] h-fit mt-10 rounded-md">
                <p className="text-zinc-400 leading-relaxed text-sm md:text-base max-w-4xl ">
                  {data[activeIndex].description}
                </p>
              </div> */}
            </div>
          </div>
            {/* RIGHT COLUMN: PLAYLIST + CHAT and Notes */}
          
          <div
            className={`${
              isToolsOpen ? "" : "hidden"
            }  lg:col-span-4 flex flex-col gap-2`}
          >
            {/* 1. COURSE CONTENT ACCORDION */}
            <div className="max-h-133 flex flex-col bg-[#141414]/60 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden transition-all duration-300">
              {/* Header */}
              <div
                onClick={() => {
                  setIsContentOpen(!isContentOpen);
                  setIsChatOpen(false);
                  setIsCardsOpen(false);
                  setIsPracticeOpen(false);
                  setIsQuizOpen(false);
                }}
                className="px-5 py-2 border-b border-white/5 flex justify-between items-center bg-white/2 shrink-0 cursor-pointer group/header hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    Course Content
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-zinc-500 transition-transform duration-500 ease-in-out ${
                      isContentOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold text-zinc-400">
                  {JSON.parse(
                    localStorage.getItem(
                      `completed_videos_${data?.[activeIndex]?.playlist}`
                    )
                  )?.length || courseData?.[0]?.completedVideos?.length
                    ? JSON.parse(
                        localStorage.getItem(
                          `completed_videos_${data?.[activeIndex]?.playlist}`
                        )
                      )?.length - 1 ||
                      courseData?.[0]?.completedVideos?.length - 1
                    : courseData?.[0]?.completedVideos?.length - 1}{" "}
                  / {data?.length} Completed
                  {` | ${courseData?.[0]?.learningModules?.length || 0} Modules`}
                </span>
              </div>

              {/* Body */}
              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
                  isContentOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden ">
                  {/* <div className="px-4 mb-2">
                  <span className="text-[11px] font-bold text-zinc-400">
                    Showing 
                {JSON.parse(
                  localStorage.getItem(
                    `completed_videos_${data?.[activeIndex]?.playlist}`
                  )
                )?.length || courseData?.[0]?.completedVideos?.length
                  ? JSON.parse(
                      localStorage.getItem(
                        `completed_videos_${data?.[activeIndex]?.playlist}`
                      )
                    )?.length - 1 ||
                    courseData?.[0]?.completedVideos?.length - 1
                  : courseData?.[0]?.completedVideos?.length - 1}{" "}
                / {data?.length} Completed
              </span>
                </div> */}
                  {/* Scrollable Area */}
                  <div className="p-3 md:pb-28 space-y-3 max-h-90 md:max-h-150 overflow-y-auto custom-scrollbar hover:pr-2">
                    <div className="mb-2 border border-white/10 bg-white/2 rounded-md overflow-hidden">
                      <div
                        onClick={() => setIsModulesOverviewOpen((prev) => !prev)}
                        className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/5 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                            Learning Modules
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                rebuildModules();
                              }}
                              disabled={rebuildingModules}
                              className="text-[10px] px-2 py-1 rounded-sm bg-[#2563EB] text-black font-bold disabled:opacity-70"
                            >
                              {rebuildingModules ? "Rebuilding..." : "Rebuild"}
                            </button>
                            <ChevronDown
                              size={14}
                              className={`text-zinc-500 transition-transform duration-300 ${isModulesOverviewOpen ? "rotate-180" : ""}`}
                            />
                          </div>
                        </div>
                      </div>
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ${
                          isModulesOverviewOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-2 p-3 pt-1">
                            {modulesList.map((moduleItem, idx) => {
                              const percentage = moduleItem.total ? Math.floor((moduleItem.completed / moduleItem.total) * 100) : 0;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setActive(moduleItem.firstIndex)}
                                  className="w-full text-left px-3 py-2 rounded-sm border border-white/10 bg-black/20 hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-zinc-200 font-semibold truncate">{moduleItem.title}</span>
                                    <span className="text-[10px] text-zinc-500">
                                      {moduleItem.completed}/{moduleItem.total}
                                    </span>
                                  </div>
                                  <div className="mt-2 h-1 w-full rounded-full bg-zinc-800/60 overflow-hidden">
                                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${percentage}%` }} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <p className="px-3 pb-2 text-[10px] text-zinc-500">{moduleRebuildStatus}</p>
                    </div>

                    

                    {modulesList.map((moduleItem, moduleIndex) => {
                      const isOpen = openModulesMap[moduleItem.title] ?? moduleIndex === 0;
                      const modulePercentage = moduleItem.total
                        ? Math.floor((moduleItem.completed / moduleItem.total) * 100)
                        : 0;

                      return (
                        <div key={moduleItem.title} className="border border-white/10 rounded-md bg-black/20 overflow-hidden">
                          <button
                            onClick={() =>
                              setOpenModulesMap((prev) => ({
                                ...prev,
                                [moduleItem.title]: !isOpen,
                              }))
                            }
                            className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/5"
                          >
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold text-zinc-200 truncate">{moduleItem.title}</p>
                              <p className="text-[10px] text-zinc-500">
                                {moduleItem.completed}/{moduleItem.total} completed
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-zinc-400">{modulePercentage}%</span>
                              <ChevronDown
                                size={14}
                                className={`text-zinc-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                              />
                            </div>
                          </button>

                          <div
                            className={`grid transition-[grid-template-rows] duration-300 ${
                              isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="px-2 pb-2 space-y-2">
                                {moduleItem.videos.map((moduleVideo, itemIndex) => {
                                  const video = moduleVideo.video;
                                  const index = moduleVideo.index;
                                  const progressStore = JSON.parse(localStorage.getItem(`video_${video.videoId}_progress`));
                                  const completedState = (progressStore?.completed || data?.[index]?.completed) === true;
                                  const progressTime = progressStore?.progressTime || data?.[index]?.progressTime;
                                  const duration = progressStore?.duration || data?.[index]?.totalDuration;
                                  const progressPercent = progressTime && duration ? Math.floor((progressTime / duration) * 100) : 0;

                                  return (
                                    <div
                                      onClick={() => setActive(index)}
                                      key={`${video.videoId}_${index}`}
                                      className={`group flex items-center gap-3 p-2 rounded-md transition-all duration-200 cursor-pointer border ${
                                        activeIndex === index
                                          ? completedState
                                            ? "bg-green-500/5 border-green-500/20"
                                            : "bg-[#2563EB]/5 border-[#2563EB]/20"
                                          : "bg-transparent border-transparent hover:bg-white/5"
                                      }`}
                                    >
                                      <div
                                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                          activeIndex === index
                                            ? completedState
                                              ? "bg-green-500/80 text-black"
                                              : "bg-[#2563EB] text-black"
                                            : `bg-transparent text-zinc-700 border ${completedState ? "border-green-500/50" : "border-white/5"}`
                                        }`}
                                      >
                                        {activeIndex === index ? (
                                          <Play size={12} fill="black" />
                                        ) : completedState ? (
                                          <div className="text-green-500">
                                            <SquareCheckBig size={13} />
                                          </div>
                                        ) : (
                                          <span className="text-[10px] font-bold">{itemIndex + 1}</span>
                                        )}
                                      </div>

                                      <div className="shrink-0 relative rounded-md overflow-hidden border border-white/10 w-18 h-10 bg-zinc-900">
                                        <img
                                          src={video.thumbnail}
                                          alt={video.title}
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0"
                                        />
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <h4 className={`text-xs font-bold leading-tight truncate ${activeIndex === index ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
                                          {video.title}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                          <Clock size={10} className={activeIndex === index ? "text-[#2563EB]" : "text-zinc-600"} />
                                          <span className={`text-[11px] font-medium ${activeIndex === index ? "text-[#2563EB]" : "text-zinc-600"}`}>
                                            {video.duration.replace("PT", "").replace("H", ":").replace("M", ":").replace("S", "")}
                                          </span>
                                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-white/5 border border-white/10 text-zinc-400 capitalize">
                                            {video.recommendationAction || "watch"}
                                          </span>
                                        </div>
                                        {progressPercent > 0 && (
                                          <div className="flex items-center gap-2 mt-1">
                                            <div className="w-full h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                                              <div
                                                className={`h-full ${completedState ? "bg-green-500" : "bg-[#2563EB]"} rounded-full opacity-80`}
                                                style={{ width: `${progressPercent}%` }}
                                              />
                                            </div>
                                            <span className="text-[10px] text-zinc-500">{progressPercent}%</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border border-white/10 bg-black/20 rounded-md p-3 space-y-2">
                      <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Add Videos To This Course</p>
                      {newVideoUrls.map((videoUrl, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setNewVideoUrlAt(idx, e.target.value)}
                            placeholder="https://www.youtube.com/watch?v="
                            className="flex-1 bg-[#0f0f0f] border border-zinc-800 rounded-sm px-3 py-2 text-white text-xs focus:outline-none focus:border-[#2563EB]"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewVideoInput(idx)}
                            className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-zinc-300 hover:text-red-300 hover:border-red-400/40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addNewVideoInput}
                          className="text-xs px-3 py-1.5 rounded-sm bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                        >
                          Add Another URL
                        </button>
                        <button
                          type="button"
                          onClick={addVideosToExistingCourse}
                          disabled={addingVideos}
                          className="text-xs px-3 py-1.5 rounded-sm bg-[#2563EB] text-black font-bold disabled:opacity-70"
                        >
                          {addingVideos ? "Adding..." : "Add Videos"}
                        </button>
                      </div>
                      <p className={`text-xs ${addVideoStatus.toLowerCase().includes("success") || addVideoStatus.toLowerCase().includes("added") ? "text-green-400" : "text-zinc-400"}`}>
                        {addVideoStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* 2. AI TUTOR CHAT (New Card) */}
            <div
              onClick={() => {
                if (
                  JSON.parse(
                    sessionStorage.getItem(
                      `messages_${data?.[activeIndex]?._id}`
                    )
                  )
                ) {
                  setMessages(
                    JSON.parse(
                      sessionStorage.getItem(
                        `messages_${data?.[activeIndex]?._id}`
                      )
                    )
                  );
                } else {
                  setMessages([
                    {
                      role: "system",
                      content:
                        "Hello! I'm your AI learning assistant. I'm watching this video with you. Ask me anything about the content!",
                    },
                  ]);
                }
              }}
              className="h-fit  flex flex-col bg-[#141414]/60 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden transition-all duration-300"
            >
              {/* Header */}
              <div
                onClick={() => {
                  setIsContentOpen(false);
                  setIsChatOpen(!isChatOpen);
                  setIsCardsOpen(false);
                  setIsPracticeOpen(false);
                  setIsQuizOpen(false);
                }}
                className="px-5 py-2 border-b border-white/5 flex justify-between items-center bg-white/2 shrink-0 cursor-pointer group/header hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <BookCopy
                      size={15}
                      className={isChatOpen ? "text-blue-500" : "text-zinc-500"}
                    />
                    AI Tutor
                  </span>
                  {aiRagStatus ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-sm border border-white/10 bg-white/5 text-zinc-400">
                      RAG {aiRagStatus?.retrievedChunks ?? 0}
                    </span>
                  ) : null}
                  <ChevronDown
                    size={14}
                    className={`text-zinc-500 transition-transform duration-500 ease-in-out ${
                      !isChatOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    isChatOpen ? "bg-blue-600 animate-pulse" : "bg-zinc-700"
                  }`}
                />
              </div>

              {/* Body */}
              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
                  isChatOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col h-125 md:max-h-150 relative">
                    {/* Chat Messages Area */}
                    <div
                      ref={chatContainerRef}
                      className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                    >
                      {/* AI Welcome Message */}
                      {messages.map((item, id) => (
                        <div key={id}>
                          {item.role === "system" ? (
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-blue-400" />
                              </div>
                              <div className="flex-1 bg-white/5 border text-wrap border-white/5 rounded-2xl rounded-tl-none p-3 text-sm text-zinc-300 leading-relaxed">
                                <p>{item.content}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3 flex-row-reverse">
                              <div className="bg-[#2563EB] rounded-2xl text-wrap rounded-tr-none p-3 text-sm text-white leading-relaxed max-w-[85%]">
                                <p>{item.content}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* loading shoudnt be in messages.map as it has to be the latest/last msg to appear thus at the end */}
                      {isChatLoading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <Bot
                              size={14}
                              className="text-blue-400 animate-pulse"
                            />
                          </div>
                          <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 text-sm text-zinc-300 leading-relaxed max-w-25">
                            <div className="flex gap-1 items-center h-full justify-center">
                              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit}>
                      <div className="p-3 border-t border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md mt-auto">
                        <div className="relative">
                          <input
                            type="text"
                            value={input}
                            onChange={handleInput}
                            required
                            autoComplete="off"
                            name="user_text"
                            disabled={isChatLoading}
                            placeholder="Ask a question..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                          />
                          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-blue-500 rounded-lg text-zinc-400 hover:text-white transition-all">
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
            {/* 3. NOTES ACCORDION */}
            <div className="h-fit flex flex-col bg-[#141414]/60 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden transition-all duration-300">
              {/* Header */}
              <div
                onClick={() => {
                  setIsContentOpen(false);
                  setIsChatOpen(false);
                  setIsCardsOpen(!isCardsOpen);
                  setNotesLoading(true);
                  setIsPracticeOpen(false);
                  setIsQuizOpen(false);
                  getNotesData();
                  getCourseNoteReviewQueue();
                }}
                className="px-5 py-2 border-b border-white/5 flex justify-between items-center bg-white/2 shrink-0 cursor-pointer group/header hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <PencilRuler
                      size={15}
                      className={
                        isCardsOpen ? "text-blue-500" : "text-zinc-500"
                      }
                    />
                    Notes
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-zinc-500 transition-transform duration-500 ease-in-out ${
                      isCardsOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </div>
              </div>

              {/* Body */}
              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
                  isCardsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col h-125 md:max-h-150 relative">
                    {notesLoading ? (
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 items-center justify-center custom-scrollbar">
                        <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 text-sm text-zinc-300 leading-relaxed max-w-25">
                          <div className="flex gap-1 items-center h-full justify-center">
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Course Review Queue</p>
                            <p className="text-[10px] text-zinc-400">
                              Due {courseNoteQueue?.dueCount || 0} | Upcoming {courseNoteQueue?.upcomingCount || 0}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => setNoteCategoryFilter("all")}
                              className={`text-[10px] px-2 py-1 rounded-sm border ${
                                noteCategoryFilter === "all"
                                  ? "border-[#2563EB]/40 bg-[#2563EB]/10 text-blue-300"
                                  : "border-white/10 bg-white/5 text-zinc-400"
                              }`}
                            >
                              All
                            </button>
                            {Object.keys(notesByCategory || {}).map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setNoteCategoryFilter(cat)}
                                className={`text-[10px] px-2 py-1 rounded-sm border capitalize ${
                                  noteCategoryFilter === cat
                                    ? "border-[#2563EB]/40 bg-[#2563EB]/10 text-blue-300"
                                    : "border-white/10 bg-white/5 text-zinc-400"
                                }`}
                              >
                                {cat} ({(notesByCategory?.[cat] || []).length})
                              </button>
                            ))}
                          </div>
                        </div>

                        {!!filteredDueNotes?.length && (
                          <div className="mb-3 rounded-md border border-amber-500/20 bg-amber-500/8 p-3">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300 mb-2">
                              Revision Due Now ({filteredDueNotes.length})
                            </p>
                            <div className="space-y-2">
                              {filteredDueNotes.slice(0, 3).map((note) => (
                                <div key={note?._id} className="rounded-sm border border-white/10 bg-black/20 p-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playerInstanceRef.current.currentTime = Number(note?.timestamp || 0);
                                        playerInstanceRef.current.play();
                                      }}
                                      className="text-[10px] cursor-pointer font-bold text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded-md border border-[#2563EB]/20"
                                    >
                                      {formatTimestampLabel(note?.timestamp || 0)}
                                    </button>
                                    <span className="text-[10px] text-zinc-400 capitalize">{note?.category || "theory"}</span>
                                  </div>
                                  <p className="text-xs text-zinc-300 mt-1 line-clamp-2">{note?.notesContent}</p>
                                  <p className="text-[10px] text-zinc-500 mt-1">
                                    Due: {note?.nextReviewAt ? new Date(note.nextReviewAt).toLocaleDateString() : "Today"}
                                  </p>
                                  <div className="mt-2 flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={noteRevisionLoadingId === note?._id}
                                      onClick={() => reviewNoteNow(note?._id, 2)}
                                      className="text-[10px] px-2 py-1 rounded-sm border border-red-500/30 bg-red-500/10 text-red-300 disabled:opacity-60"
                                    >
                                      Hard
                                    </button>
                                    <button
                                      type="button"
                                      disabled={noteRevisionLoadingId === note?._id}
                                      onClick={() => reviewNoteNow(note?._id, 3)}
                                      className="text-[10px] px-2 py-1 rounded-sm border border-white/10 bg-white/5 text-zinc-300 disabled:opacity-60"
                                    >
                                      Okay
                                    </button>
                                    <button
                                      type="button"
                                      disabled={noteRevisionLoadingId === note?._id}
                                      onClick={() => reviewNoteNow(note?._id, 5)}
                                      className="text-[10px] px-2 py-1 rounded-sm border border-green-500/30 bg-green-500/10 text-green-300 disabled:opacity-60"
                                    >
                                      Easy
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {noteCategoryKeys.length ? (
                          Object.entries(filteredNotesByCategory).map(([category, notes]) => (
                            <div key={category} className="mb-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{category}</p>
                              <div className="space-y-2">
                                {(notes || []).map((item) => (
                                  <div
                                    key={item?._id}
                                    className="group relative p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#2563EB]/30 hover:bg-white/6 transition-all"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <div className="flex items-center gap-2">
                                        <span
                                          onClick={() => {
                                            playerInstanceRef.current.currentTime = Number(item?.timestamp || 0);
                                            playerInstanceRef.current.play();
                                          }}
                                          className="text-[10px] cursor-pointer font-bold text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded-md border border-[#2563EB]/20"
                                        >
                                          {formatTimestampLabel(item?.timestamp || 0)}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">
                                          Rev L{item?.reviewLevel || 0}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">
                                          Due {item?.nextReviewAt ? new Date(item.nextReviewAt).toLocaleDateString() : "Today"}
                                        </span>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={async () => {
                                            await deletNotes(item._id);
                                          }}
                                          className="text-zinc-500 hover:text-red-500 cursor-pointer transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-sm text-zinc-300 leading-relaxed">
                                      {item?.notesContent}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : currentVideoNotes?.length ? (
                          currentVideoNotes.map((item) => (
                            <div
                              key={item?._id}
                              className="group relative p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#2563EB]/30 hover:bg-white/6 transition-all mb-2"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span
                                  onClick={() => {
                                    playerInstanceRef.current.currentTime = Number(item?.timestamp || 0);
                                    playerInstanceRef.current.play();
                                  }}
                                  className="text-[10px] cursor-pointer font-bold text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded-md border border-[#2563EB]/20"
                                >
                                  {formatTimestampLabel(item?.timestamp || 0)}
                                </span>
                                <button
                                  onClick={async () => {
                                    await deletNotes(item._id);
                                  }}
                                  className="text-zinc-500 hover:text-red-500 cursor-pointer transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              <p className="text-[10px] text-zinc-500 mb-1">
                                Due: {item?.nextReviewAt ? new Date(item.nextReviewAt).toLocaleDateString() : "Today"}
                              </p>
                              <p className="text-sm text-zinc-300 leading-relaxed">{item?.notesContent}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-zinc-500 border border-white/10 rounded-md p-3 bg-black/20">
                            No notes yet. Add a note with category and it will appear in grouped sections.
                          </div>
                        )}
                      </div>
                    )}
                    {/* Scrollable Notes List */}

                    {/* Input Area */}
                    <form onSubmit={handleNotesSubmit}>
                      <div className="p-3 border-t border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md mt-auto">
                        <div className="mb-2 flex items-center gap-2">
                          <select
                            value={noteCategory}
                            onChange={(e) => setNoteCategory(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500/50"
                          >
                            <option value="theory" className="bg-[#111010] text-zinc-100">Theory</option>
                            <option value="doubt" className="bg-[#111010] text-zinc-100">Doubt</option>
                            <option value="code" className="bg-[#111010] text-zinc-100">Code</option>
                            <option value="formula" className="bg-[#111010] text-zinc-100">Formula</option>
                            <option value="revision" className="bg-[#111010] text-zinc-100">Revision</option>
                          </select>
                          <button
                            type="button"
                            onClick={suggestNoteCategory}
                            disabled={noteCategorySuggesting || !`${notesInput || ""}`.trim()}
                            className="text-[10px] px-3 py-2 rounded-sm border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 disabled:opacity-60"
                          >
                            {noteCategorySuggesting ? "Suggesting..." : "Auto"}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            autoComplete="off"
                            value={notesInput}
                            onChange={handleNotesInput}
                            required
                            name="user_note"
                            placeholder="Add a note at current time..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                          />
                          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-blue-500 rounded-lg text-zinc-400 hover:text-white transition-all">
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
            {/* 3. QUIZ ACCORDION */}
            <div className="h-fit max-h-133 flex flex-col bg-[#141414]/60 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden transition-all duration-300">
              <div
                onClick={() => {
                  const nextState = !isQuizOpen;
                  setIsContentOpen(false);
                  setIsChatOpen(false);
                  setIsCardsOpen(false);
                  setIsPracticeOpen(false);
                  setIsQuizOpen(nextState);
                  if (nextState) {
                    getQuizData();
                    getQuizMetaData();
                  }
                }}
                className="px-5 py-2 border-b border-white/5 flex justify-between items-center bg-white/2 shrink-0 cursor-pointer group/header hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CircleHelp
                      size={15}
                      className={
                        isQuizOpen ? "text-blue-500" : "text-zinc-500"
                      }
                    />
                    Quiz
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-zinc-500 transition-transform duration-500 ease-in-out ${
                      isQuizOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </div>
                <span className="text-[10px] text-zinc-500">
                  {quizResult
                    ? `${quizResult?.percentage || 0}%`
                    : quizAttempts?.length
                      ? `Best ${bestQuizAttempt?.percentage || 0}%`
                      : "Not attempted"}
                </span>
              </div>

              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
                  isQuizOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col h-fit max-h-133 p-3 pb-8 md:pb-10 pr-2 space-y-3 overflow-y-auto custom-scrollbar">
                    {quizLoading ? (
                      <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
                        Preparing quiz...
                      </div>
                    ) : quizError ? (
                      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                        {quizError}
                      </div>
                    ) : !quizData?.questions?.length ? (
                      <div className="text-sm text-zinc-500">No quiz available for this video yet.</div>
                    ) : !quizResult ? (
                      <div className="space-y-3">
                        {quizData.questions.map((item, idx) => (
                          <div key={idx} className="rounded-md border border-white/10 bg-black/20 p-3">
                            <p className="text-sm text-zinc-200 font-semibold">
                              Q{idx + 1}. {item.question}
                            </p>
                            <div className="mt-2 space-y-2">
                              {item.options.map((option, optIdx) => (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleQuizOptionSelect(idx, optIdx)}
                                  className={`w-full text-left text-xs rounded-sm border px-3 py-2 transition-colors ${
                                    quizAnswers[idx] === optIdx
                                      ? "border-[#2563EB]/50 bg-[#2563EB]/10 text-zinc-100"
                                      : "border-white/10 bg-white/3 text-zinc-300 hover:bg-white/5"
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300">
                                {item.conceptTag}
                              </span>
                              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-blue-300 capitalize">
                                {item.difficulty}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                                {formatTimestampLabel(item.sourceStartSeconds)} - {formatTimestampLabel(item.sourceEndSeconds)}
                              </span>
                            </div>
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setQuizHintOpenMap((prev) => ({
                                    ...prev,
                                    [idx]: !prev[idx],
                                  }))
                                }
                                className="text-[10px] px-2 py-1 rounded-sm border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                              >
                                {quizHintOpenMap[idx] ? "Hide Hint" : "Show Hint"}
                              </button>
                              <p className={`mt-2 text-xs text-blue-300 ${quizHintOpenMap[idx] ? "" : "hidden"}`}>
                                {item.hint || "Focus on the key idea and eliminate distractors."}
                              </p>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={submitQuiz}
                          disabled={quizSubmitLoading}
                          className="w-full bg-[#2563EB] hover:bg-[#1d4fd8] text-black font-bold py-2.5 rounded-md disabled:opacity-70"
                        >
                          {quizSubmitLoading ? "Submitting..." : "Submit Quiz"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-zinc-500 uppercase tracking-[0.2em]">Quiz Controls</p>
                            {quizRagStatus ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-sm border border-white/10 bg-white/5 text-zinc-400">
                                RAG {quizRagStatus?.retrievedChunks ?? 0}
                              </span>
                            ) : null}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowQuizAdvanced((prev) => !prev)}
                                className="text-xs px-3 py-1.5 rounded-sm border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                              >
                                {showQuizAdvanced ? "Hide Details" : "Show Details"}
                              </button>
                              <button
                                type="button"
                                onClick={startNewQuizAttempt}
                                className="text-xs px-3 py-1.5 rounded-sm bg-[#2563EB] text-black font-bold hover:bg-[#1d4fd8]"
                              >
                                Retake Quiz
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400 mt-2">
                            Start a fresh attempt for this video and compare with past performance.
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-sm border border-green-500/20 bg-green-500/10 px-2 py-2">
                              <p className="text-[10px] text-green-400 uppercase tracking-[0.2em]">Best Score</p>
                              <p className="text-sm font-bold text-zinc-100">
                                {bestQuizAttempt ? `${bestQuizAttempt?.percentage || 0}%` : "NA"}
                              </p>
                            </div>
                            <div className={`rounded-sm border px-2 py-2 ${
                              latestQuizTrendDelta === null
                                ? "border-white/10 bg-white/5"
                                : latestQuizTrendDelta >= 0
                                  ? "border-blue-500/20 bg-blue-500/10"
                                  : "border-red-500/20 bg-red-500/10"
                            }`}>
                              <p className={`text-[10px] uppercase tracking-[0.2em] ${
                                latestQuizTrendDelta === null
                                  ? "text-zinc-400"
                                  : latestQuizTrendDelta >= 0
                                    ? "text-blue-400"
                                    : "text-red-400"
                              }`}>
                                Trend
                              </p>
                              <p className="text-sm font-bold text-zinc-100">
                                {latestQuizTrendDelta === null
                                  ? "Need 2 attempts"
                                  : latestQuizTrendDelta >= 0
                                    ? `+${latestQuizTrendDelta}%`
                                    : `${latestQuizTrendDelta}%`}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs text-zinc-500 uppercase tracking-[0.2em]">Quiz Outcome</p>
                              <p className="text-sm text-zinc-100 font-bold mt-1">
                                {quizResult?.score}/{quizResult?.totalQuestions} ({quizResult?.percentage}%)
                              </p>
                            </div>
                            <span className={`text-xs font-bold ${
                              quizResult?.canProceed ? "text-green-400" : "text-orange-300"
                            }`}>
                              {quizResult?.canProceed ? "Ready For Next Video" : "Reattempt Recommended"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-2">
                            {quizResult?.overallFeedback}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] px-2 py-1 rounded-sm border border-white/10 bg-white/5 text-zinc-300">
                              Comprehension {quizResult?.comprehensionScore ?? 0}/100
                            </span>
                            <span className="text-[10px] px-2 py-1 rounded-sm border border-white/10 bg-white/5 text-zinc-300 capitalize">
                              Skill {quizResult?.skillLevel || "developing"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-2">
                            {quizResult?.readinessReason || "Keep practicing to improve retention."}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            {quizResult?.canProceed ? (
                              <button
                                type="button"
                                onClick={goToNextVideo}
                                disabled={activeIndex >= data?.length - 1}
                                className="text-xs px-3 py-1.5 rounded-sm bg-green-500/20 border border-green-500/30 text-green-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {activeIndex >= data?.length - 1 ? "Course Completed" : "Proceed To Next Video"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={startNewQuizAttempt}
                                className="text-xs px-3 py-1.5 rounded-sm bg-[#2563EB] text-black font-bold hover:bg-[#1d4fd8]"
                              >
                                Reattempt Quiz
                              </button>
                            )}
                          </div>
                        </div>

                        <div className={`${showQuizAdvanced ? "space-y-3" : "hidden"}`}>
                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Attempt History</p>
                          <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                            {(quizAttempts || []).length ? (
                              (quizAttempts || []).map((attempt, idx) => (
                                <button
                                  key={attempt?._id || idx}
                                  type="button"
                                  onClick={() => {
                                    setQuizResult(attempt || null);
                                    setSelectedAttemptId(attempt?._id || "");
                                  }}
                                  className={`w-full text-left rounded-sm border px-3 py-2 transition-colors ${
                                    selectedAttemptId === attempt?._id
                                      ? "border-[#2563EB]/40 bg-[#2563EB]/10"
                                      : "border-white/10 bg-white/3 hover:bg-white/5"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-300 font-semibold">
                                      Attempt {quizAttempts.length - idx}
                                    </span>
                                    <span className="text-blue-400 font-bold">
                                      {attempt?.percentage || 0}%
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-zinc-500 mt-1">
                                    {attempt?.createdAt ? new Date(attempt.createdAt).toLocaleString() : "Unknown time"}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-zinc-500">No previous attempts.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Streak & Consistency</p>
                          {quizMetaLoading ? (
                            <p className="text-xs text-zinc-500">Loading stats...</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-sm border border-white/10 bg-white/5 px-2 py-2">
                                <p className="text-[10px] text-zinc-500 uppercase">Streak</p>
                                <p className="text-sm text-zinc-100 font-bold">{quizStats?.streak ?? 0} days</p>
                              </div>
                              <div className="rounded-sm border border-white/10 bg-white/5 px-2 py-2">
                                <p className="text-[10px] text-zinc-500 uppercase">Consistency</p>
                                <p className="text-sm text-zinc-100 font-bold">{quizStats?.consistencyScore ?? 0}%</p>
                              </div>
                              <div className="rounded-sm border border-white/10 bg-white/5 px-2 py-2">
                                <p className="text-[10px] text-zinc-500 uppercase">Avg Score</p>
                                <p className="text-sm text-zinc-100 font-bold">{quizStats?.avgScore ?? 0}%</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Topic Mastery</p>
                          {quizMetaLoading ? (
                            <p className="text-xs text-zinc-500">Loading mastery...</p>
                          ) : quizMastery?.length ? (
                            <div className="space-y-2 max-h-42 overflow-y-auto custom-scrollbar">
                              {quizMastery.slice(0, 12).map((item, idx) => (
                                <div key={idx} className="text-xs text-zinc-300">
                                  <div className="flex items-center justify-between">
                                    <span>{item.conceptTag}</span>
                                    <span className={`${
                                      item.status === "mastered"
                                        ? "text-green-400"
                                        : item.status === "improving"
                                          ? "text-blue-400"
                                          : "text-red-400"
                                    }`}>{item.accuracy}%</span>
                                  </div>
                                  <div className="h-1 mt-1 rounded-full bg-zinc-800 overflow-hidden">
                                    <div className={`h-full rounded-full ${
                                      item.status === "mastered"
                                        ? "bg-green-500"
                                        : item.status === "improving"
                                          ? "bg-blue-500"
                                          : "bg-red-500"
                                    }`} style={{ width: `${item.accuracy}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500">Mastery data will appear after quiz attempts.</p>
                          )}
                        </div>

                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Spaced Re-Quiz Queue (1/3/7)</p>
                          {quizMetaLoading ? (
                            <p className="text-xs text-zinc-500">Loading schedule...</p>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <p className="text-[10px] text-zinc-500 mb-1">Due Now</p>
                                <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                                  {(quizSchedule?.dueItems || []).length ? (
                                    (quizSchedule?.dueItems || []).map((item, idx) => (
                                      <div key={item?._id || idx} className="flex items-center justify-between gap-2 border border-white/10 rounded-sm px-2 py-1.5 bg-white/5">
                                        <span className="text-xs text-zinc-300 truncate">{item?.conceptTag}</span>
                                        <button
                                          type="button"
                                          onClick={() => startFocusedReQuiz(item?.conceptTag)}
                                          className="text-[10px] px-2 py-1 rounded-sm bg-[#2563EB] text-black font-bold"
                                        >
                                          Re-Quiz
                                        </button>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-zinc-500">No due concepts.</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] text-zinc-500 mb-1">Upcoming</p>
                                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                  {(quizSchedule?.upcomingItems || []).slice(0, 6).map((item, idx) => (
                                    <div key={item?._id || idx} className="text-xs text-zinc-400 border border-white/10 rounded-sm px-2 py-1 bg-white/3">
                                      {item?.conceptTag} | {item?.nextReviewAt ? new Date(item.nextReviewAt).toLocaleDateString() : "TBD"}
                                    </div>
                                  ))}
                                  {!(quizSchedule?.upcomingItems || []).length && (
                                    <p className="text-xs text-zinc-500">No upcoming items.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>


                        <div className={`rounded-md border border-white/10 bg-black/20 p-3 ${
                          (quizResult?.revisionClips || []).length ? "" : "hidden"
                        }`}>
                          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Revision Clip Points</p>
                          <div className="space-y-2">
                            {(quizResult?.revisionClips || []).map((clip, idx) => (
                              <div key={idx} className="border border-white/10 rounded-sm bg-white/5 px-2 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-zinc-200">{clip?.conceptTag}</p>
                                  <button
                                    type="button"
                                    onClick={() => jumpToRevisionClip(clip)}
                                    className="text-[10px] px-2 py-1 rounded-sm bg-[#2563EB] text-black font-bold"
                                  >
                                    Jump To Clip
                                  </button>
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1">{clip?.label} | {clip?.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Concept Analysis</p>
                          <div className="space-y-2">
                            {(quizResult?.conceptBreakdown || []).map((item, idx) => (
                              <div key={idx} className="text-xs text-zinc-300">
                                <div className="flex items-center justify-between">
                                  <span>{item.key}</span>
                                  <span>{item.correct}/{item.total} ({item.accuracy}%)</span>
                                </div>
                                <div className="h-1 mt-1 rounded-full bg-zinc-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${item.accuracy}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Recommendations</p>
                          <div className="space-y-1">
                            {(quizResult?.recommendedActions || []).map((item, idx) => (
                              <p key={idx} className="text-xs text-zinc-300">{idx + 1}. {item}</p>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(quizResult?.questionReview || []).map((item, idx) => (
                            <div key={idx} className={`rounded-md border p-3 ${item.isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-zinc-100">Q{idx + 1}. {item.question}</p>
                                <button
                                  type="button"
                                  onClick={() => jumpToRevisionClip({ startSeconds: item.sourceStartSeconds || 0 })}
                                  className="text-[10px] px-2 py-1 rounded-sm bg-[#2563EB] text-black font-bold"
                                >
                                  Jump To Source
                                </button>
                              </div>
                              <p className="text-xs mt-1 text-zinc-300">Your answer: {item.selectedOption || "Not answered"}</p>
                              <p className="text-xs text-zinc-300">Correct answer: {item.correctOption}</p>
                              <p className="text-[10px] text-zinc-400 mt-1">
                                Source: {formatTimestampLabel(item.sourceStartSeconds)} - {formatTimestampLabel(item.sourceEndSeconds)}
                              </p>
                              {!!item.sourceContext && (
                                <p className="text-[10px] text-zinc-500 mt-1 break-words">
                                  Context: {item.sourceContext}
                                </p>
                              )}
                              <p className="text-xs text-zinc-400 mt-1">{item.explanation}</p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Instructor Analytics</p>
                          {quizMetaLoading ? (
                            <p className="text-xs text-zinc-500">Loading analytics...</p>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] text-zinc-500 mb-1">Weak Topic Heatmap</p>
                                <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                                  {(quizAnalytics?.weakTopicHeatmap || []).slice(0, 10).map((item, idx) => (
                                    <div key={idx} className="text-xs text-zinc-300">
                                      <div className="flex items-center justify-between">
                                        <span>{item.topic}</span>
                                        <span>{item.accuracy}%</span>
                                      </div>
                                      <div className="h-1 mt-1 rounded-full bg-zinc-800 overflow-hidden">
                                        <div className="h-full rounded-full bg-red-500" style={{ width: `${item.intensity}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                  {!(quizAnalytics?.weakTopicHeatmap || []).length && (
                                    <p className="text-xs text-zinc-500">No heatmap data yet.</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] text-zinc-500 mb-1">Drop-Off by Video</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                  {(quizAnalytics?.dropoff || []).slice(0, 12).map((item, idx) => (
                                    <div key={idx} className="border border-white/10 rounded-sm bg-white/5 px-2 py-2">
                                      <p className="text-xs text-zinc-300 truncate">
                                        {item.sequence}. {item.title}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                                        <span>Completion {item.completion}%</span>
                                        <span>Quiz Avg {item.avgQuizScore}%</span>
                                      </div>
                                    </div>
                                  ))}
                                  {!(quizAnalytics?.dropoff || []).length && (
                                    <p className="text-xs text-zinc-500">No drop-off data yet.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PRACTICE ACCORDION */}
            <div className="h-fit max-h-133  flex flex-col bg-[#141414]/60 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden transition-all duration-300">
              {/* Header */}
              <div
                onClick={() => {
                  setIsContentOpen(false);
                  setIsChatOpen(false);
                  setIsCardsOpen(false);
                  setIsPracticeOpen(!isPracticeOpen);
                  setIsQuizOpen(false);
                  // getProblemsData();
                }} 
                className="px-5 py-2 border-b border-white/5 flex justify-between items-center bg-white/2 shrink-0 cursor-pointer group/header hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Bug
                      size={15}
                      className={
                        isPracticeOpen ? "text-blue-500" : "text-zinc-500"
                      }
                    />
                    Problems
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-zinc-500 transition-transform duration-500 ease-in-out ${
                      isPracticeOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </div>
              </div>

              {/* Body */}
              <div
  className={`grid transition-[grid-template-rows]  duration-500 ease-in-out ${
    isPracticeOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
  }`}
>
  <div className="overflow-hidden">
    <div className="flex flex-col h-fit max-h-115 pb-3 relative">
      <div
        className={`${
          isProblemButtonOpen ? "" : "hidden"
        } flex items-center justify-center mt-5 mb-5`}
      >
        <button
          onClick={() => {
            setIsProblemButtonOpen(false);
            setProblemsLoading(true);
            getProblemsData();
            localStorage.setItem(
              `problemsOpened_${data?.[activeIndex]?._id}`,
              "false"
            );
          }}
          className="group relative w-35 flex items-center justify-center gap-2.5 p-2 rounded-md border bg-white/5 border-zinc-200/30 hover:border-blue-500/50  transition-all duration-300 cursor-pointer"
        >
          <span className="text-sm font-semibold tracking-wide text-zinc-300 ">
            Get Problems
          </span>
        </button>
      </div>
      <div
        className={`${
          isProblemButtonOpen ? "hidden" : ""
        } flex flex-col h-full min-h-0`}
      >
        {problemsLoading ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 items-center justify-center custom-scrollbar">
            <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 text-sm text-zinc-300 leading-relaxed max-w-25">
              <div className="flex gap-1 items-center h-full justify-center">
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0">
            <div
              className={`${
                relevant ? "" : "hidden"
              } flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar`}
            >
              <div className={``}>
                {problemsData.map((item, idx) => {
                  return (
                    <div key={idx}>
                      <div className="">
                        <h1 className="mb-2 ml-1 text-zinc-400">
                          Task {idx + 1}:{" "}
                          <span className="text-blue-500">
                            {item.topic}
                          </span>
                        </h1>
                        {item.problems.map((item1, idx1) => {
                          return (
                            <div
                              key={idx1}
                              className={`${
                                idx1 === item.problems.length - 1
                                  ? "mb-5"
                                  : ""
                              } group relative p-3 rounded-xl bg-white/5 border border-white/10 ${
                                item1.platform === "LeetCode"
                                  ? "hover:border-[#FFA116]/30"
                                  : `${
                                      item1.platform === "GeeksForGeeks" || item1.platform === "GeeksforGeeks"
                                        ? "hover:border-[#159d15]/30"
                                        : `${
                                            item1.platform === "Codechef" ||
                                            item1.platform === "CodeChef"
                                              ? "hover:border-[#e97a3a]/30"
                                              : ""
                                          }`
                                    }`
                              } hover:bg-white/6 transition-all mb-2`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center jus gap-2">
                                  {/* SVGs here (omitted for brevity) */}
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    id="leetcode"
                                    className={`${
                                      item1.platform === "LeetCode" || item1.platform === "Leetcode"
                                        ? ""
                                        : "hidden"
                                    } w-4 h-4`}
                                  >
                                    <path fill="#B3B1B0" d="M22,14.355c0-0.742-0.564-1.345-1.26-1.345H10.676c-0.696,0-1.26,0.604-1.26,1.345c0,0.742,0.564,1.346,1.26,1.346H20.74C21.436,15.701,22,15.098,22,14.355L22,14.355z"></path>
                                    <path fill="#9C9A99" d="M22,14.355H9.416l0,0c0,0.742,0.564,1.346,1.26,1.346H20.74C21.436,15.701,22,15.098,22,14.355L22,14.355L22,14.355z"></path>
                                    <path fill="#C98F1B" d="M4.781,14.355H4.735c0.015,0.736,0.315,1.474,0.897,2.068c1.309,1.336,2.639,2.65,3.96,3.974l0.204,0.198c0.469,0.303,0.473,1.25,0.182,1.671c-0.31,0.449-0.71,0.729-1.271,0.729c-0.02,0-0.041,0-0.062-0.001c-0.2-0.007-0.364-0.087-0.53-0.181c-0.035-0.02-0.07-0.04-0.104-0.062C8.963,23.593,10.221,24,11.599,24c1.484,0,2.83-0.511,3.804-1.494l2.589-2.637c0.51-0.514,0.492-1.365-0.039-1.9c-0.272-0.275-0.627-0.413-0.978-0.413c-0.332,0-0.659,0.124-0.906,0.374l-2.676,2.607c-0.462,0.467-1.102,0.662-1.808,0.662c-0.706,0-1.346-0.195-1.81-0.662l-4.297-4.363C5.024,15.716,4.79,15.052,4.781,14.355L4.781,14.355z"></path>
                                    <path fill="#060605" d="M4.735,14.355H1.918c0.006,1.485,0.595,2.945,1.739,4.101c1.324,1.336,2.657,2.663,3.984,3.996c0.113,0.114,0.236,0.215,0.37,0.3c0.034,0.021,0.068,0.042,0.104,0.062c0.166,0.094,0.33,0.174,0.53,0.181c0.021,0.001,0.041,0.001,0.062,0.001c0.561,0,0.961-0.28,1.271-0.729c0.291-0.421,0.286-1.368-0.182-1.671l-0.204-0.198c-1.321-1.324-2.652-2.638-3.96-3.974C5.05,15.83,4.75,15.091,4.735,14.355L4.735,14.355z"></path>
                                    <path fill="#E7A41F" d="M3.483,18.187l4.312,4.361C8.767,23.527,10.113,24,11.599,24c1.484,0,2.83-0.511,3.804-1.494l2.589-2.637c0.51-0.514,0.492-1.365-0.039-1.9c-0.53-0.535-1.375-0.553-1.884-0.039l-2.676,2.607c-0.462,0.467-1.102,0.662-1.808,0.662c-0.706,0-1.346-0.195-1.81-0.662l-4.297-4.363c-0.463-0.468-0.697-1.15-0.697-1.863c0-0.713,0.234-1.357,0.697-1.824l4.285-4.38c0.464-0.468,1.116-0.645,1.822-0.645c0.707,0,1.347,0.195,1.808,0.662l2.676,2.606c0.51,0.515,1.354,0.497,1.885-0.038c0.531-0.536,0.549-1.386,0.039-1.901l-2.589-2.635c-0.648-0.646-1.471-1.116-2.392-1.33l-0.033-0.006l2.447-2.504c0.512-0.514,0.494-1.366-0.037-1.901c-0.53-0.535-1.376-0.553-1.887-0.038L3.483,10.476C2.509,11.458,2,12.814,2,14.312S2.509,17.206,3.483,18.187L3.483,18.187z"></path>
                                    <path fill="#070706" d="M8.115,22.814c-0.176-0.097-0.332-0.219-0.474-0.361c-1.327-1.333-2.66-2.66-3.984-3.996c-1.988-2.009-2.302-4.936-0.785-7.32c0.234-0.37,0.529-0.694,0.839-1.004c3.208-3.214,6.415-6.43,9.623-9.644c0.625-0.626,1.497-0.652,2.079-0.066c0.559,0.562,0.527,1.455-0.077,2.065c-0.77,0.776-1.54,1.55-2.31,2.325c-0.041,0.122-0.14,0.2-0.226,0.287c-0.863,0.877-1.751,1.73-2.6,2.619c-0.111,0.115-0.262,0.186-0.372,0.305c-1.423,1.423-2.862,2.83-4.265,4.272c-1.136,1.167-1.096,2.938,0.068,4.128c1.309,1.336,2.639,2.65,3.96,3.974l0.204,0.198c0.469,0.303,0.473,1.25,0.182,1.671c-0.321,0.466-0.739,0.75-1.333,0.728C8.445,22.987,8.281,22.907,8.115,22.814L8.115,22.814z"></path>
                                    <path fill="#EAB03C" d="M13.021,4.826c-0.044,0.115-0.138,0.19-0.221,0.273c-0.863,0.877-1.751,1.73-2.6,2.619c-0.111,0.115-0.262,0.186-0.372,0.305c-1.423,1.423-2.862,2.83-4.265,4.272c-0.58,0.596-0.853,1.349-0.827,2.102h0.046C4.781,14.368,4.78,14.339,4.78,14.31c0-0.713,0.234-1.357,0.697-1.824l4.285-4.38c0.464-0.468,1.116-0.645,1.822-0.645c0.707,0,1.347,0.195,1.808,0.662l2.676,2.606c0.248,0.251,0.576,0.375,0.908,0.375c0.35,0,0.705-0.138,0.977-0.413c0.531-0.536,0.549-1.386,0.039-1.901l-2.589-2.635C14.757,5.51,13.938,5.041,13.021,4.826L13.021,4.826z M14.4,0c-0.194,0.001-0.386,0.045-0.562,0.132C14.021,0.049,14.212,0.005,14.4,0L14.4,0z"></path>
                                    <path fill="#272726" d="M14.432,0c-0.01,0-0.021,0-0.031,0c-0.189,0.004-0.379,0.049-0.562,0.132c-0.178,0.081-0.349,0.2-0.504,0.356c-3.208,3.214-6.416,6.43-9.623,9.644c-0.31,0.31-0.604,0.634-0.839,1.004c-0.652,1.025-0.966,2.151-0.954,3.262h2.818c-0.026-0.753,0.248-1.506,0.827-2.102c1.402-1.442,2.842-2.849,4.265-4.272c0.111-0.119,0.261-0.189,0.372-0.305c0.849-0.889,1.737-1.742,2.6-2.619c0.083-0.084,0.177-0.159,0.221-0.273c0.002-0.005,0.003-0.009,0.005-0.014c0.77-0.775,1.54-1.549,2.31-2.325c0.604-0.61,0.637-1.503,0.077-2.065C15.133,0.14,14.786,0,14.432,0L14.432,0z"></path>
                                  </svg>
                                  <svg
                                    viewBox="0 0 48 48"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`w-5 h-5 text-[#269f44] ${
                                      item1.platform === "GeeksForGeeks" || item1.platform === "GeeksforGeeks"
                                        ? ""
                                        : "hidden"
                                    }`}
                                    fill="none" // Ensures the lines are clean
                                  >
                                    <g
                                      // Apply styles directly to the group to avoid conflicts
                                      stroke="currentColor"
                                      strokeWidth="3.168"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M23.9944,24H43.5a9.7513,9.7513,0,1,1-2.8565-6.8943" />
                                      <path d="M24.0056,24H4.5a9.7513,9.7513,0,1,0,2.8565-6.8943" />
                                    </g>
                                  </svg>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`w-5 h-5 text-[#269f44] ${
                                      item1.platform === "Codechef" ||
                                      item1.platform === "CodeChef"
                                        ? ""
                                        : "hidden"
                                    }`}
                                    viewBox="0 0 48 48"
                                  >
                                    <path fill="#ffffff" d="M34.809,32.711L34.809,32.711c1.016,0.306,1.952,0.833,2.74,1.543 c0.133,0.085,0.219,0.228,0.23,0.386c0,0.235-0.175,0.466-0.536,0.686c-0.648,0.434-1.273,0.9-1.873,1.398 c-0.592,0.483-1.212,0.93-1.858,1.337c-0.083,0.044-0.176,0.068-0.27,0.07c-0.132,0.002-0.26-0.048-0.356-0.14 c-0.184-0.16-0.203-0.438-0.043-0.622c0.004-0.005,0.009-0.01,0.013-0.014c0.202-0.26,0.465-0.467,0.766-0.601 c0.354-0.194,0.689-0.421,1.002-0.676c0.501-0.381,0.801-0.636,1.002-0.751c0.396-0.2,0.601-0.341,0.601-0.426 c0.004-0.018,0.004-0.037,0-0.055c-0.247-0.407-0.63-0.712-1.082-0.862c-0.446-0.125-0.902-0.26-1.357-0.401 c-0.456-0.114-0.869-0.355-1.192-0.696c-0.01-0.031-0.01-0.064,0-0.095c0.016-0.142,0.086-0.273,0.195-0.366 c0.09-0.112,0.222-0.182,0.366-0.195c0.073-0.01,0.147-0.01,0.22,0c0.268,0.015,0.532,0.079,0.776,0.19l0.726,0.316 M13.465,32.28 c0.181-0.003,0.358,0.055,0.501,0.165c0.12,0.092,0.192,0.234,0.195,0.386c0.001,0.108-0.043,0.211-0.12,0.286 c-0.54,0.476-1.173,0.836-1.858,1.057c-0.69,0.22-1.3,0.638-1.753,1.202c0.646,0.375,1.316,0.71,2.004,1.002l2.074,0.912 c0.161,0.064,0.263,0.223,0.255,0.396c0.03,0.235-0.072,0.468-0.265,0.606c-0.19,0.157-0.43,0.242-0.676,0.24 c-0.1,0-0.199-0.02-0.291-0.06c-0.141-0.138-0.292-0.265-0.451-0.381c-1.202-0.668-2.488-1.292-3.857-1.873 c-0.135-0.055-0.275-0.11-0.411-0.155c-0.151-0.061-0.263-0.192-0.301-0.351c0.006-0.42,0.188-0.817,0.501-1.097 c0.644-0.469,1.342-0.859,2.079-1.162c0.743-0.297,1.444-0.692,2.084-1.172H13.465z"></path>
                                    <path fill="#ffffff" d="M22.051,32.24c-0.171-0.265-0.384-0.5-0.631-0.696c-0.198-0.138-0.435-0.21-0.676-0.205 c-0.081-0.002-0.161,0.013-0.235,0.045l-1.503,0.501c-0.096,0.03-0.195,0.043-0.296,0.04c-0.178,0.013-0.355-0.037-0.501-0.14 c-0.182-0.158-0.336-0.346-0.456-0.556l-0.416,0.281c0.176,0.295,0.403,0.556,0.671,0.771c0.211,0.132,0.457,0.197,0.706,0.185 c0.127-0.001,0.254-0.02,0.376-0.055l1.388-0.501c0.094-0.036,0.194-0.055,0.296-0.055c0.152-0.01,0.304,0.031,0.431,0.115 c0.175,0.143,0.327,0.312,0.451,0.501l0.396-0.22"></path>
                                    <path fill="#ffffff" fillRule="evenodd" d="M32.289,40.61c0.761,4.558-4.809,5.009-7.098,2.95 c-1.583-1.413-1.137-3.381,1.132-3.256C28.327,40.41,29.494,42.984,32.289,40.61" clipRule="evenodd"></path>
                                    <path fill="#ffffff" fillRule="evenodd" d="M15.364,40.61c-0.761,4.558,4.809,5.009,7.098,2.95 c1.583-1.413,1.137-3.381-1.132-3.256C19.326,40.41,18.159,42.984,15.364,40.61" clipRule="evenodd"></path>
                                    <path fill="#ffffff" d="M20.839,33.998c-0.279-0.184-0.608-0.276-0.942-0.265c-0.404-0.015-0.798,0.129-1.097,0.401 c-0.338,0.332-0.482,0.814-0.381,1.277c0.049,0.436,0.223,0.848,0.501,1.187c0.236,0.316,0.607,0.502,1.002,0.501 c0.258-0.004,0.511-0.073,0.736-0.2c0.451-0.27,0.671-0.781,0.671-1.548C21.387,34.848,21.206,34.347,20.839,33.998z M19.877,35.811c-0.277,0-0.501-0.224-0.501-0.501s0.224-0.501,0.501-0.501s0.501,0.224,0.501,0.501S20.154,35.811,19.877,35.811z"></path>
                                    <path fill="#ffffff" d="M24.195,39.914c0.139,0.001,0.276-0.025,0.406-0.075c0.124-0.048,0.242-0.112,0.351-0.19 c0.102-0.082,0.198-0.173,0.286-0.27c0.083-0.093,0.156-0.194,0.22-0.301c0.061-0.094,0.115-0.193,0.16-0.296 c0.035-0.074,0.064-0.151,0.085-0.23v-0.045c-0.01-0.014-0.019-0.029-0.025-0.045l0,0c-0.13,0.2-0.293,0.378-0.481,0.526 c-0.144,0.136-0.314,0.24-0.501,0.306c-0.188,0.065-0.387,0.097-0.586,0.095c-0.17,0.003-0.339-0.021-0.501-0.07 c-0.139-0.044-0.269-0.112-0.386-0.2c-0.117-0.094-0.223-0.202-0.316-0.321c-0.097-0.13-0.18-0.269-0.25-0.416l0,0 c-0.011,0.011-0.02,0.025-0.025,0.04c0,0,0,0.03,0,0.04c0.068,0.192,0.156,0.376,0.26,0.551c0.094,0.168,0.212,0.322,0.351,0.456 c0.124,0.13,0.27,0.236,0.431,0.316c0.159,0.067,0.329,0.104,0.501,0.11"></path>
                                    <path fill="#ffffff" d="M28.613,33.968c-0.278-0.185-0.607-0.28-0.942-0.27c-0.405-0.014-0.799,0.132-1.097,0.406 c-0.336,0.333-0.478,0.815-0.376,1.277c0.046,0.436,0.22,0.85,0.501,1.187c0.236,0.315,0.608,0.501,1.002,0.501 c0.258-0.004,0.512-0.073,0.736-0.2c0.493-0.352,0.752-0.947,0.676-1.548C29.089,34.644,28.928,34.188,28.613,33.968z M27.511,35.867c-0.277,0-0.501-0.224-0.501-0.501s0.224-0.501,0.501-0.501s0.501,0.224,0.501,0.501S27.787,35.867,27.511,35.867z"></path>
                                    <path fill="#cfd8dc" d="M38.519,9.951c-0.113-0.175-0.224-0.354-0.339-0.518c-0.092-0.132-0.186-0.252-0.279-0.377 c-0.137-0.184-0.275-0.367-0.414-0.537c-0.083-0.102-0.167-0.196-0.251-0.293c-0.155-0.178-0.309-0.351-0.465-0.513 C36.7,7.64,36.63,7.57,36.559,7.5c-0.181-0.18-0.363-0.35-0.546-0.51c-0.043-0.037-0.085-0.075-0.128-0.111 c-2.281-1.946-4.592-2.44-6.076-2.765l-0.821-0.185c-3.005-0.576-5.53-0.867-8.09-0.501c-1.008,0.219-1.982,0.573-2.895,1.052 c-1.257,0.571-2.565,1.162-3.827,1.252c-1.321,0.341-2.468,1.162-3.216,2.304l-0.14,0.2c-0.671,1.403-0.847,2.992-0.501,4.508 c0.276,0.902,0.616,1.783,0.937,2.63c0.736,1.727,1.269,3.534,1.588,5.385c0.332,0.658,0.591,1.35,0.771,2.064  c0.426,1.483,0.912,3.151,2.229,4.448h0.035c0.011-0.005,0.022-0.009,0.033-0.014c0.003,0.003,0.005,0.006,0.008,0.009  c1.14-0.54,2.24-0.902,3.307-1.124c0.15-0.031,0.298-0.053,0.446-0.078c0.18-0.031,0.36-0.063,0.538-0.087  c0.289-0.037,0.576-0.064,0.861-0.081c0.025-0.002,0.05-0.005,0.075-0.006c3.649-0.2,6.912,1.133,10.1,2.433l0.575,0.238  c0.018-0.008,0.035-0.029,0.053-0.039c0.01,0.004,0.019,0.008,0.029,0.012c0.781-0.341,1.177-2.965,1.703-5.41  c1.893-4.333,6.126-7.514,5.871-11.521C39.169,10.996,38.846,10.459,38.519,9.951z"></path>
                                    <polygon
                                      fill="#cfd8dc"
                                      points="31.829,28.563 31.822,28.561 31.819,28.563"
                                    ></polygon>
                                    <path fill="#ef5350" d="M31.473,26.384c-0.007-0.089-0.044-0.18-0.071-0.27c0-0.001-0.001-0.003-0.001-0.004  c-0.337-1.099-2.136-2.252-4.586-2.876c-0.135-0.036-0.273-0.053-0.409-0.084c-0.006-0.001-0.012-0.002-0.018-0.004 c-0.585-0.134-1.176-0.224-1.771-0.277c-0.036-0.003-0.072-0.007-0.108-0.01c-0.338-0.027-0.675-0.044-1.014-0.044  c-0.298-0.002-0.597,0.003-0.895,0.023c-0.133,0.009-0.265,0.022-0.397,0.035c-0.311,0.031-0.62,0.073-0.926,0.13 c-0.107,0.018-0.215,0.024-0.322,0.045c-2.018,0.371-3.797,1.551-4.924,3.266l0.065,2.65v0.04h0.03 c1.741-0.997,3.667-1.628,5.66-1.853c3.171-0.286,6.417,0.681,9.587,2.895h0.03v-0.05C31.616,28.803,31.64,27.584,31.473,26.384z"></path>
                                    <path fill="#eceff1" fillRule="evenodd" d="M12.975,7.881c-0.341,1.733,1.202,7.203,0.701,10.073  c-0.26-1.503-1.222-4.508-1.182-6.176c-0.461-1.002-0.927-2.229-1.438-2.7S12.113,6.158,13,7.881" clipRule="evenodd"></path>
                                    <path fill="#b0bec5" d="M16.476,25.493L16.476,25.493c-2.004-2.364-2.855-6.437-3.556-9.868 c-0.556-2.725-1.032-5.049-1.949-5.78l0,0c-0.109-0.148-0.182-0.319-0.21-0.501c-0.032-0.347,0.039-0.696,0.205-1.002 C11.124,8,11.367,7.705,11.672,7.485c0.193-0.133,0.414-0.218,0.646-0.25V7.28c-0.231,0.032-0.45,0.117-0.641,0.25  c-0.202,0.253-0.383,0.523-0.541,0.806c-0.451,0.902,0.501,0.857,0.857,1.347c0.927,0.746,1.002,3.196,1.563,5.931  c0.701,3.426,0.932,7.489,2.94,9.843l0,0l0,0l-0.03,0.035"></path>
                                    <path fill="#eceff1" fillRule="evenodd" d="M16.401,7.175c-0.346,1.728,0.536,5.705,0,8.58  c-0.26-1.503-1.222-4.508-1.182-6.171c-0.466-1.002-1.002-2.164-1.347-2.76s1.237-1.257,2.505,0.351" clipRule="evenodd"></path>
                                    <path fill="#b0bec5" d="M15.73,6.564c-0.278-0.233-0.65-0.318-1.002-0.23c-0.138,0.015-0.27,0.063-0.386,0.14  c-0.102,0.067-0.171,0.175-0.19,0.296c0,0.18-0.14,0.21,0,0.546l0,0c1.122,1.503,2.004,4.042,2.214,6.722 c0.301,3.401-0.095,7.168,2.159,9.838l-0.035,0.03c-2.264-2.685-2.6-6.457-2.895-9.863c-0.24-2.675-0.456-5.129-1.568-6.637l0,0 c-0.189-0.211-0.285-0.489-0.265-0.771c0.022-0.132,0.096-0.249,0.205-0.326c0.123-0.086,0.266-0.138,0.416-0.15  c0.479-0.038,0.956,0.093,1.347,0.371l-0.03,0.035"></path>
                                    <path fill="#eceff1" d="M21.911,4.129c1.042,1.738-0.872,9.562-1.222,14.476c-0.03,0.416-3.697-16.224,1.212-14.476"></path>
                                    <path fill="#b0bec5" d="M21.475,22.943c-1.475-4.089-2.37-8.365-2.66-12.703c-0.113-1.435,0.002-2.879,0.341-4.278 c0.326-1.112,0.897-1.843,1.783-1.974c0.324-0.042,0.652-0.018,0.967,0.07v0.045c-0.319-0.059-0.647-0.049-0.962,0.03 c-0.741,0.17-0.651,0.631-1.137,1.678c-0.379,1.346-0.502,2.751-0.361,4.142c0.631,4.127,1.408,9.758,2.079,12.958H21.49"></path>
                                    <path fill="#b0bec5" d="M24.931,22.678c-0.05-0.336-0.095-0.676-0.145-1.002c-0.771-5.59-1.718-12.402,1.598-17.296  h0.04c-1.357,3.622-1.543,10.519-1.703,12.743c-0.07,0.962,0.04,3.005,0.115,4.508c0.045,0.346,0.1,0.686,0.145,1.027h-0.05"></path>
                                    <path fill="#b0bec5" d="M28.528,23.394c0.115-2.885,0.421-6.261,0.701-9.187c0.696-3.687,2.57-5.43,3.061-9.157  V5.006c-1.69,2.827-2.813,5.956-3.306,9.212c-0.457,3.036-0.597,6.112-0.416,9.177h-0.05"></path>
                                    <g>
                                      <path fill="#b0bec5" d="M37.218,9.429c-1.503,4.628-3.276,9.152-5.079,13.73C32.189,17.098,35.435,9.804,37.218,9.429"></path>
                                      <path fill="#b0bec5" d="M31.258,25.197c0.791-0.821,0.847-2.084,0.917-3.551c-0.017-1.501,0.251-2.992,0.791-4.393 c0-0.06,0.045-0.155,0.08-0.286c0.441-1.528,2.199-7.684,4.248-7.574v0.045c-1.608-0.06-3.657,6.011-4.142,7.549 c-0.035,0.125-0.045,0.205-0.065,0.27l0,0c-0.576,1.503-0.611,3.005-0.801,4.378c-0.065,1.473-0.19,2.745-1.002,3.576h-0.03"></path>
                                    </g>
                                  </svg>
                                  {/* HackerRank Icon */}
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 24 24" 
                                    className={`w-3 h-3 ${item1.platform === "HackerRank" ? '' : 'hidden'}`}
                                  >
                                    {/* The 'H' shape - Uses currentColor to be visible in your dark mode app */}
                                    <path 
                                      d="M0 0h4v10h4V0h4v24h-4V14H4v10H0V0z" 
                                      fill="currentColor" 
                                    />
                                    
                                    {/* The Green Block */}
                                    <rect 
                                      x="14" 
                                      y="0" 
                                      width="10" 
                                      height="24" 
                                      fill="#2EC866" 
                                    />
                                  </svg>
                                  <span
                                    className={`text-[11px] font-bold  text-zinc-400   ${
                                      item1.platform === "LeetCode" || item1.platform === "Leetcode"
                                        ? "group-hover:text-[#FFA116]"
                                        : `${
                                            item1.platform === "GeeksForGeeks" || item1.platform === "GeeksforGeeks"
                                              ? "group-hover:text-[#159d15]"
                                              : `${
                                                  item1.platform === "Codechef" ||
                                                  item1.platform === "CodeChef"
                                                    ? "group-hover:text-[#e97a3a]"
                                                    : ""
                                                }`
                                          }`
                                    } transition-colors`}
                                  >
                                    {item1.platform}
                                  </span>
                                </div>
                                <a
                                  href={item1.link}
                                  key={idx}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-zinc-500 ${
                                    item1.platform === "LeetCode" || item1.platform === "Leetcode"
                                      ? "hover:text-[#FFA116]"
                                      : `${
                                          item1.platform === "GeeksForGeeks" || item1.platform === "GeeksforGeeks"
                                            ? "hover:text-[#159d15]"
                                            : `${
                                                item1.platform === "Codechef" ||
                                                item1.platform === "CodeChef"
                                                  ? "hover:text-[#e97a3a]"
                                                  : ""
                                              }`
                                        }`
                                  }  transition-colors`}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                              <h3
                                className={`text-sm font-semibold text-zinc-200 ml-1 leading-tight mb-2 ${
                                  item1.platform === "LeetCode" || item1.platform === "Leetcode"
                                    ? "group-hover:text-[#FFA116]"
                                    : `${
                                        item1.platform === "GeeksForGeeks" || item1.platform === "GeeksforGeeks"
                                          ? "group-hover:text-[#159d15]"
                                          : `${
                                              item1.platform === "Codechef" ||
                                              item1.platform === "CodeChef"
                                                ? "group-hover:text-[#e97a3a]"
                                                : ""
                                            }`
                                      }`
                                } cursor-pointer transition-colors truncate`}
                              >
                                <a
                                  href={item1.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {idx1 + 1}. {item1.title}
                                </a>
                              </h3>
                              <div className="flex flex-wrap gap-1.5 ml-1">
                                {item1.tags.map((item, idx) => {
                                  return (
                                    <span
                                      key={idx}
                                      className={`text-[10px] px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-400 border border-white/5  ${
                                        item1.platform === "LeetCode" || item1.platform === "Leetcode"
                                          ? "group-hover:border-[#FFA116]/20"
                                          : `${
                                              item1.platform === "GeeksForGeeks" || item1.platform === "GeeksforGeeks"
                                                ? "group-hover:border-[#159d15]/20"
                                                : `${
                                                    item1.platform === "Codechef" ||
                                                    item1.platform === "CodeChef"
                                                      ? "group-hover:border-[#e97a3a]/20"
                                                      : ""
                                                  }`
                                            }`
                                      }  transition-colors`}
                                    >
                                      {item}
                                    </span>
                                  );
                                })}
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded ${
                                    item1.difficulty === "Easy"
                                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                                      : `${
                                          item1.difficulty === "Medium"
                                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                            : "bg-red-500/10 text-red-500 border-red-500/20"
                                        }`
                                  }  border `}
                                >
                                  {item1.difficulty}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className={`${
                relevant ? "hidden" : ""
              } flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar`}
            >
              <h1>No relevant problems found.....</h1>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
            </div>
          </div>
          {/* summary */}
          <div
            className={`${
              isSummaryOpen ? "" : "hidden"
            }  lg:col-span-4 flex flex-col gap-2`}
          >
            <div className="md:max-h-160 max-h-160  flex flex-col bg-[#141414]/60 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden transition-all duration-300">
              {/* Header */}
              <div className="px-5 py-2 border-b border-white/5 flex justify-between items-center bg-white/2 shrink-0 cursor-pointer group/header hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    COMPLETE NOTES
                  </span>
                </div>
                {/* <span className="text-[11px] font-bold text-zinc-400">
                {JSON.parse(
                  localStorage.getItem(
                    `completed_videos_${data?.[activeIndex]?.playlist}`
                  )
                )?.length || courseData?.[0]?.completedVideos?.length
                  ? JSON.parse(
                      localStorage.getItem(
                        `completed_videos_${data?.[activeIndex]?.playlist}`
                      )
                    )?.length - 1 ||
                    courseData?.[0]?.completedVideos?.length - 1
                  : courseData?.[0]?.completedVideos?.length - 1}{" "}
                / {data?.length} Completed
              </span> */}
              </div>

              {/* Body */}
              <div
              >
                <div className="overflow-hidden ">
                  {/* Scrollable Area */}
                  <div className={`p-3 space-y-2 max-h-160 ${
                        isSummaryButtonOpen ? "" : "pb-13"
                      }  overflow-y-auto custom-scrollbar`}>
                      <div
                      className={`${
                        isSummaryButtonOpen ? "" : "hidden"
                      } flex items-center justify-center`}
                    >
                      <button
                            onClick={() => {
                              setIsSummaryButtonOpen(false);
                              setSummaryLoading(true);
                              getSummaryData();
                              localStorage.setItem(
                                `summaryOpened_${data?.[activeIndex]?._id}`,
                                "false"
                              );
                            }}
                            className="group relative w-42 flex items-center justify-center gap-2.5 p-2 rounded-sm border bg-white/5 border-zinc-200/30 hover:border-blue-500/50  transition-all duration-300 cursor-pointer"
                          >
                            <span className="text-sm font-semibold tracking-wide text-zinc-300 ">
                              Generate Notes
                            </span>
                          </button>
                    </div>
                    <div className={`${
                        isSummaryButtonOpen ? "hidden" : ""
                      } `}>
                      {summaryLoading ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 items-center justify-center custom-scrollbar">
                          <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 text-sm text-zinc-300 leading-relaxed max-w-25">
                            <div className="flex gap-1 items-center h-full justify-center">
                              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-500/5 h-full p-3 overflow-scroll md:overflow-hidden w-full rounded-md border border-zinc-400/20">
                    <div className="-mt-4">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-2xl font-semibold mt-5 mb-3">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-xl font-medium mt-4 mb-2">{children}</h3>
                          ),

                          p: ({ children }) => (
                            <div className="text-gray-300 leading-7 mb-3">{children}</div>
                          ),

                          ul: ({ children }) => (
                            <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
                          ),
                          li: ({ children }) => <li className="text-gray-300">{children}</li>,

                          pre: ({ children }) => (
                            <pre className="bg-zinc-900 p-4 rounded-lg overflow-x-auto my-4 border border-zinc-800 shadow-md">
                              {children}
                            </pre>
                          ),

                          code: ({ inline, className, children }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = inline || !match;

                            return isInline ? (
                              <code className="bg-zinc-800 px-1 py-0.5 rounded text-sm text-gray-200 font-mono">
                                {children}
                              </code>
                            ) : (
                              <code
                                className={`${className || ""} text-green-400 block text-sm font-mono`}
                              >
                                {children}
                              </code>
                            );
                          },

                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-gray-400 my-4">
                              {children}
                            </blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                              {children}
                            </a>
                          ),
                        }}>{summaryData.replace(/\\n/g, "\n")
                        .replace(/\u00a0/g, " ")
                        .replace(/([^\n])```/g, "$1\n\n```")
                        .replace(/```(\w+)([^\n])/g, "```$1\n$2")}
                      </ReactMarkdown>
                    </div>
                        
                    </div>
                    )}
                    </div>
                     
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* ide */}
          <div
            className={`${
              isIdeOpen ? "" : "hidden"
            } lg:col-span-4 flex flex-col gap-2 h-full min-h-0`} 
          >
            <div className="h-full min-h-150 max-h-160 flex flex-col bg-[#101010] border border-white/10 rounded-lg overflow-hidden transition-all duration-300 shadow-2xl">
              
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-[#151515]  shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    YOUR IDE
                  </span>
                  
                  {/* Language Selector */}
                  <div className="relative group flex items-center gap-2">
                    <select
                      value={ideLanguage}
                      onChange={onLanguageChange}
                      className="bg-[#3c3c3c] text-white text-xs rounded px-2 py-1 outline-none border border-transparent focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                    <span className="text-[10px] text-zinc-500 font-mono pt-0.5">
                        v{ideVersion}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                   <button 
                     onClick={runCode}
                     disabled={isRunning}
                     className={`flex items-center gap-1.5 px-3 py-1 text-white text-xs font-semibold rounded transition-colors ${
                        isRunning ? "bg-zinc-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                     }`}
                   >
                     {isRunning ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                     ) : (
                        <Play size={12} fill="white" />
                     )}
                     {isRunning ? "Running..." : "Run"}
                   </button>
                </div>
              </div>

              {/* SPLIT LAYOUT CONTAINER */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                
                {/* 1. Code Editor */}
                <div className="h-[65%] relative border-b border-white/10 overflow-hidden">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={ideLanguage}
                    value={ideCode}
                    onChange={(value) => setIdeCode(value)}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: true,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 },
                      fontFamily: "'Fira Code', 'Consolas', monospace",
                    }}
                    loading={
                      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                        Loading Editor...
                      </div>
                    }
                  />
                </div>
                
                {/* 2. Bottom Panel (Output + Input) */}
                <div className="h-[35%] bg-[#151515] flex flex-col">
                   
                   {/* Tabs Header */}
                   <div className="flex items-center border-b border-white/10 bg-[#252526] px-4">
                      <button 
                        onClick={() => setActiveTab("output")}
                        className={`text-[11px] font-bold uppercase tracking-wider py-2 mr-6 border-b-2 transition-colors ${
                            activeTab === "output" ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Output
                      </button>
                      <button 
                        onClick={() => setActiveTab("input")}
                        className={`text-[11px] font-bold uppercase tracking-wider py-2 border-b-2 transition-colors ${
                            activeTab === "input" ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Input
                      </button>
                      
                      <div className="flex-1" />
                      
                      {activeTab === "output" && (
                        <button 
                            onClick={() => setOutput([])} 
                            className="text-[10px] text-zinc-500 hover:text-white transition-colors"
                        >
                            Clear
                        </button>
                      )}
                   </div>
                   
                   {/* Panel Body */}
                   <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-sm">
                     
                     {/* OUTPUT VIEW */}
                     {activeTab === "output" && (
                        <div className="text-zinc-300 whitespace-pre-wrap">
                            {output.length > 0 ? (
                                output.map((line, idx) => (
                                    <div key={idx} className="mb-0.5 break-all">{line}</div>
                                ))
                            ) : (
                                <div className="text-zinc-600 italic text-xs">
                                    Click 'Run' to execute code.
                                </div>
                            )}
                        </div>
                     )}

                     {/* INPUT VIEW */}
                     {activeTab === "input" && (
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Enter input for your program (eg- 10 20)"
                            className="w-full h-full bg-transparent text-zinc-300 resize-none outline-none placeholder:text-zinc-700"
                            spellCheck={false}
                        />
                     )}

                   </div>
                </div>

              </div>
            </div>
          </div>
          {/* excali draw */}
          {isExcaliLoaded && (<div
            className={`${
              isExcaliOpen ? "" : "hidden"
            } lg:col-span-4 flex flex-col gap-2`}
          >
            <div className="w-full h-full min-h-150 max-h-160 flex flex-col bg-[#141414]/60 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden transition-all duration-300">
              
              {/* Header */}
              <div className="px-5 py-2 border-b border-white/5 flex justify-between items-center bg-white/2 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    WHITEBOARD
                  </span>
                </div>
              </div>

              {/* Body: Excalidraw Wrapper */}
              <div className="flex-1 w-full relative bg-[#1e1e1e] overflow-hidden"> 
                <div className="absolute inset-0 w-full h-full">
                  <Excalidraw 
                    theme="dark" 
                    onChange={handleDrawChange}
                    initialData={initialDrawData.current}
                  >
                    <WelcomeScreen />
                    </Excalidraw>
                </div>

              </div>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;


