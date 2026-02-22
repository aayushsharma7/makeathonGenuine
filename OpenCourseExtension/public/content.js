
const EXT_ROOT_ID = "opencourse-ext-root";

const state = {
  isAuthed: false,
  currentYtVideoId: "",
  trackedVideo: null,
  courseVideos: [],
  courseMeta: null,
  lastProgressSyncAt: 0,
  lastCourseSyncAt: 0,
  lastProgressTimeSent: 0,
  completionSent: false,
  uiTab: "course",
  notesPayload: null,
  notesLoading: false,
  notesError: "",
  problemsPayload: null,
  problemsLoading: false,
  problemsError: "",
  panelOpen: true,
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendBg = async (action, payload = {}) => {
  try {
    const response = await chrome.runtime.sendMessage({ action, ...payload });
    return response || { success: false, message: "No response" };
  } catch (error) {
    return { success: false, message: error?.message || "Bridge error" };
  }
};

const extractYtVideoId = () => {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = `${params.get("v") || ""}`.trim();
  if (fromQuery) return fromQuery;
  return window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)?.[1] || "";
};

const getVideoElement = () => document.querySelector("video");
const n = (v = 0) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

const formatTime = (value = 0) => {
  const safe = Math.max(0, Math.floor(Number(value || 0)));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = `${safe % 60}`.padStart(2, "0");
  return h > 0 ? `${h}:${`${m}`.padStart(2, "0")}:${s}` : `${m}:${s}`;
};

const formatDuration = (value = "") => {
  const safe = `${value || ""}`.trim();
  if (!safe) return "0:00";
  if (!/^PT/i.test(safe)) return safe;
  const m = safe.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!m) return safe;
  return formatTime((parseInt(m[1] || "0", 10) * 3600) + (parseInt(m[2] || "0", 10) * 60) + parseInt(m[3] || "0", 10));
};

const esc = (v = "") => `${v || ""}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const durationLabel = (video = {}) => (n(video?.totalDuration || 0) ? formatTime(video.totalDuration) : formatDuration(video?.duration || ""));
const videoPct = (video = {}) => {
  if (video?.completed) return 100;
  const d = n(video?.totalDuration || 0);
  if (!d) return 0;
  return Math.max(0, Math.min(99, Math.floor((n(video?.progressTime || 0) / d) * 100)));
};

const ensureRoot = () => {
  let host = document.getElementById(EXT_ROOT_ID);
  if (host) return host;

  host = document.createElement("div");
  host.id = EXT_ROOT_ID;
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.top = "84px";
  host.style.right = "16px";
  host.style.zIndex = "2147483647";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
      .toggle { position: fixed; top: 84px; right: 16px; width: 44px; height: 44px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); background: rgba(20,20,20,.95); color: #d4d4d8; cursor: pointer; font-size: 11px; font-weight: 800; letter-spacing: .08em; box-shadow: 0 12px 24px rgba(0,0,0,.35); }
      .toggle:hover { border-color: rgba(37,99,235,.4); color: #eff6ff; }
      .wrap { width: min(560px, calc(100vw - 28px)); max-height: 84vh; border-radius: 12px; overflow: hidden; color: #e4e4e7; border: 1px solid #222226; background: #080808; box-shadow: 0 18px 40px rgba(0,0,0,.55); }
      .head { padding: 10px 12px; border-bottom: 1px solid #1f1f23; display: flex; justify-content: space-between; align-items: center; gap: 8px; background: #0d0d0f; }
      .title { font-size: 11px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; color: #71717a; }
      .sub { font-size: 11px; color: #71717a; }
      .ok { color: #22c55e; }
      .warn { color: #f87171; }
      .btn { border: 1px solid #2d2d31; background: #131316; color: #d4d4d8; border-radius: 6px; padding: 6px 9px; font-size: 11px; cursor: pointer; }
      .btn:hover { border-color: rgba(37,99,235,.4); background: #1a1a1f; }
      .tabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; padding: 10px; border-bottom: 1px solid #1f1f23; background: #0b0b0d; }
      .tab { border: 1px solid #2a2a2e; border-radius: 7px; padding: 7px; font-size: 11px; font-weight: 600; text-align: center; color: #a1a1aa; background: #141418; cursor: pointer; }
      .tab.active { color: #dbeafe; border-color: rgba(37,99,235,.5); background: rgba(37,99,235,.14); }
      .body { max-height: calc(84vh - 122px); overflow-y: auto; padding: 10px; display: grid; gap: 10px; }
      .body::-webkit-scrollbar, .list::-webkit-scrollbar { width: 6px; height: 6px; }
      .body::-webkit-scrollbar-track, .list::-webkit-scrollbar-track { background: #000; border-radius: 4px; }
      .body::-webkit-scrollbar-thumb, .list::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
      .card { border: 1px solid #232327; border-radius: 8px; background: #0f0f12; padding: 10px; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .txt { font-size: 12px; color: #e4e4e7; line-height: 1.4; }
      .small { font-size: 11px; color: #71717a; line-height: 1.4; }
      .chip { font-size: 10px; border: 1px solid #2c2c31; background: #17171b; border-radius: 999px; padding: 3px 8px; color: #a1a1aa; white-space: nowrap; }
      .track { height: 6px; border-radius: 999px; background: #242429; overflow: hidden; margin-top: 8px; }
      .fill { height: 100%; border-radius: 999px; background: #2563eb; }
      .fill.done { background: #22c55e; }
      .module { border: 1px solid #232327; border-radius: 8px; overflow: hidden; background: #0b0b0f; }
      .module-h { padding: 8px 10px; border-bottom: 1px solid #1f1f23; display: flex; justify-content: space-between; align-items: center; gap: 8px; background: #101015; }
      .module-t { font-size: 11px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; color: #71717a; }
      .list { max-height: 230px; overflow-y: auto; padding: 8px; display: grid; gap: 6px; }
      .item { border: 1px solid #242428; border-radius: 8px; background: #141418; padding: 8px; }
      .item.current { border-color: rgba(37,99,235,.35); background: rgba(37,99,235,.08); }
      .item.done { border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.06); }
      .vtitle { color: #d4d4d8; text-decoration: none; font-size: 12px; font-weight: 700; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .vtitle:hover { color: #fff; text-decoration: underline; }
      .field { width: 100%; border: 1px solid #2a2a2f; border-radius: 8px; background: #121216; color: #f4f4f5; padding: 8px; font-size: 12px; outline: none; }
      .field:focus { border-color: rgba(37,99,235,.45); }
      select.field option { background: #111010; color: #f4f4f5; }
      .footer { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
      .due { border: 1px solid rgba(245,158,11,.25); background: rgba(245,158,11,.08); border-radius: 8px; padding: 8px; }
    </style>
    <button id="toggle" class="toggle">OC</button>
    <div id="panel" class="wrap" style="display:none"></div>
  `;

  shadow.getElementById("toggle")?.addEventListener("click", () => {
    state.panelOpen = !state.panelOpen;
    render();
  });

  return host;
};

const groupByModule = (videos = []) => {
  const grouped = {};
  videos.forEach((video) => {
    const key = `${video?.moduleTitle || "Module: General"}`.trim() || "Module: General";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(video);
  });
  return grouped;
};

const getCurrentCourseIndex = () => {
  if (!state.trackedVideo?._id) return -1;
  return state.courseVideos.findIndex((item) => `${item?._id || ""}` === `${state.trackedVideo._id}`);
};

const buildCompletedIndexes = (videos = []) => {
  const completed = [-1];
  videos.forEach((item, idx) => { if (item?.completed === true) completed.push(idx); });
  return Array.from(new Set(completed)).sort((a, b) => a - b);
};

const syncCourseProgress = async (force = false) => {
  if (!state.trackedVideo?.playlist || !state.courseVideos.length) return;
  const now = Date.now();
  if (!force && now - state.lastCourseSyncAt < 8000) return;
  state.lastCourseSyncAt = now;
  await sendBg("UPDATE_COURSE_PROGRESS", {
    courseId: state.trackedVideo.playlist,
    completedVideos: buildCompletedIndexes(state.courseVideos),
    lastVideoPlayed: Math.max(0, getCurrentCourseIndex()),
  });
};

const refreshNotes = async () => {
  if (!state.trackedVideo?._id) return;
  state.notesLoading = true; state.notesError = ""; render();
  const res = await sendBg("GET_NOTES", { videoDbId: state.trackedVideo._id });
  if (!res.success) { state.notesPayload = null; state.notesError = res.message || "Failed to fetch notes"; }
  else state.notesPayload = res.data || { notes: [], groupedByCategory: {}, dueNow: [] };
  state.notesLoading = false; render();
};

const refreshProblems = async () => {
  if (!state.trackedVideo?.videoId) return;
  state.problemsLoading = true; state.problemsError = ""; render();
  const res = await sendBg("GET_PROBLEMS", {
    videoId: state.trackedVideo.videoId,
    title: state.trackedVideo.title || "",
    description: state.trackedVideo.description || "",
  });
  if (!res.success) { state.problemsPayload = null; state.problemsError = res.message || "Failed to fetch problems"; }
  else state.problemsPayload = res.data || null;
  state.problemsLoading = false; render();
};

const renderCourseTab = () => {
  if (!state.trackedVideo) return `<div class="card small">Open a YouTube video that exists in your OpenCourse library.</div>`;

  const grouped = groupByModule(state.courseVideos || []);
  const currentId = `${state.trackedVideo._id || ""}`;
  const done = (state.courseVideos || []).filter((v) => v?.completed).length;
  const total = (state.courseVideos || []).length || 1;
  const pct = Math.max(0, Math.min(100, Math.floor((done / total) * 100)));

  const modulesHtml = Object.entries(grouped).map(([moduleTitle, videos]) => {
    const moduleDone = (videos || []).filter((v) => v?.completed).length;
    const moduleTotal = (videos || []).length || 1;
    const modulePct = Math.max(0, Math.min(100, Math.floor((moduleDone / moduleTotal) * 100)));
    const items = videos.map((video, idx) => {
      const isCurrent = `${video?._id || ""}` === currentId;
      const doneVideo = !!video?.completed;
      const progress = videoPct(video);
      return `
        <div class="item ${isCurrent ? "current" : ""} ${doneVideo ? "done" : ""}" data-current="${isCurrent ? "1" : "0"}">
          <div class="row" style="align-items:flex-start;">
            <a class="vtitle" href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noreferrer">${esc(video?.title || "Untitled Video")}</a>
            <span class="chip">${doneVideo ? "Completed" : `${progress}%`}</span>
          </div>
          <div class="row" style="margin-top:6px;">
            <span class="small">#${idx + 1} | ${durationLabel(video)}</span>
            <span class="chip">${esc((video?.recommendationAction || "watch").toLowerCase())}</span>
          </div>
          <div class="track"><div class="fill ${doneVideo ? "done" : ""}" style="width:${doneVideo ? 100 : progress}%;"></div></div>
        </div>
      `;
    }).join("");

    return `
      <div class="module">
        <div class="module-h">
          <div><div class="module-t">${esc(moduleTitle)}</div><div class="small">${moduleDone}/${moduleTotal} completed</div></div>
          <span class="chip">${modulePct}%</span>
        </div>
        <div class="list">${items}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="card">
      <div class="row" style="align-items:flex-start;">
        <div><div class="txt">${esc(state.trackedVideo.title || "Tracked Video")}</div><div class="small">${esc(state.courseMeta?.channelTitle || state.trackedVideo?.channelTitle || "")}</div></div>
        <span class="chip">${state.trackedVideo.completed ? "Completed" : "Tracking"}</span>
      </div>
      <div class="small" style="margin-top:8px;">Course progress: ${done}/${total} videos (${pct}%)</div>
      <div class="small">Current: ${formatTime(state.trackedVideo?.progressTime || 0)} / ${durationLabel(state.trackedVideo)}</div>
      <div class="track"><div class="fill" style="width:${pct}%;"></div></div>
    </div>
    ${modulesHtml || `<div class="card small">No course content available.</div>`}
  `;
};

const renderNotesTab = () => {
  if (!state.trackedVideo) return `<div class="card small">No tracked video.</div>`;
  if (state.notesLoading) return `<div class="card small">Loading notes...</div>`;
  if (state.notesError) return `<div class="card small warn">${esc(state.notesError)}</div>`;

  const payload = state.notesPayload || { notes: [], groupedByCategory: {}, dueNow: [] };
  const dueNow = Array.isArray(payload?.dueNow) ? payload.dueNow : [];
  const grouped = payload?.groupedByCategory || {};

  const dueHtml = dueNow.slice(0, 4).map((note) => `
    <div class="due">
      <div class="row"><button class="btn" data-jump="${Math.floor(Number(note?.timestamp || 0))}">${formatTime(note?.timestamp || 0)}</button><span class="small">${esc(note?.category || "theory")} | due ${note?.nextReviewAt ? new Date(note.nextReviewAt).toLocaleDateString() : "today"}</span></div>
      <div class="txt" style="margin-top:6px;">${esc(note?.notesContent || "")}</div>
      <div class="footer"><button class="btn" data-review="${note?._id || ""}" data-rating="2">Hard</button><button class="btn" data-review="${note?._id || ""}" data-rating="3">Okay</button><button class="btn" data-review="${note?._id || ""}" data-rating="5">Easy</button><button class="btn" data-del="${note?._id || ""}">Delete</button></div>
    </div>
  `).join("");

  const groupedHtml = Object.entries(grouped).map(([category, notes]) => {
    const items = (notes || []).map((note) => `
      <div class="item">
        <div class="row"><button class="btn" data-jump="${Math.floor(Number(note?.timestamp || 0))}">${formatTime(note?.timestamp || 0)}</button><span class="small">Due ${note?.nextReviewAt ? new Date(note.nextReviewAt).toLocaleDateString() : "today"}</span></div>
        <div class="txt" style="margin-top:6px;">${esc(note?.notesContent || "")}</div>
        <div class="footer"><button class="btn" data-del="${note?._id || ""}">Delete</button></div>
      </div>
    `).join("");

    return `<div class="module"><div class="module-h"><div class="module-t">${esc(category)}</div><span class="chip">${(notes || []).length}</span></div><div class="list">${items || `<div class="small">No notes in this category.</div>`}</div></div>`;
  }).join("");

  return `
    <div class="card"><div class="row"><span class="small">Due now: ${dueNow.length}</span><button class="btn" id="refresh-notes">Refresh</button></div></div>
    ${dueHtml || `<div class="card small">No due notes right now.</div>`}
    ${groupedHtml || `<div class="card small">No saved notes.</div>`}
    <div class="card">
      <div class="module-t" style="letter-spacing:.12em; margin-bottom:8px;">Add Note</div>
      <select id="note-category" class="field"><option value="theory">Theory</option><option value="doubt">Doubt</option><option value="code">Code</option><option value="formula">Formula</option><option value="revision">Revision</option></select>
      <textarea id="note-text" class="field" rows="3" placeholder="Add a note at current YouTube timestamp..." style="margin-top:8px;"></textarea>
      <div class="footer"><button class="btn" id="suggest-category">Auto</button><button class="btn" id="add-note">Add Note</button></div>
    </div>
  `;
};

const renderProblemsTab = () => {
  if (!state.trackedVideo) return `<div class="card small">No tracked video.</div>`;
  if (state.problemsLoading) return `<div class="card small">Generating problems...</div>`;
  if (state.problemsError) return `<div class="card small warn">${esc(state.problemsError)}</div>`;

  const relevant = state.problemsPayload?.relevant !== false;
  const list = state.problemsPayload?.problemsList || state.problemsPayload?.data || [];
  const html = (list || []).map((block) => {
    const topic = block?.topic || "Topic";
    const items = (block?.problems || []).map((p) => `<div class="item"><div class="row" style="align-items:flex-start;"><a class="vtitle" href="${esc(p?.url || "#")}" target="_blank" rel="noreferrer">${esc(p?.title || "Problem")}</a><span class="chip">${esc(p?.difficulty || "")}</span></div></div>`).join("");
    return `<div class="module"><div class="module-h"><div class="module-t">${esc(topic)}</div><span class="chip">${(block?.problems || []).length}</span></div><div class="list">${items || `<div class="small">No problems in this topic.</div>`}</div></div>`;
  }).join("");

  return `<div class="card"><div class="row"><span class="small ${relevant ? "ok" : "warn"}">${relevant ? "Relevant for practice" : "No relevant coding problems detected"}</span><button class="btn" id="refresh-problems">Generate</button></div></div>${html || `<div class="card small">No problem recommendations yet.</div>`}`;
};

const attachHandlers = () => {
  const panel = document.getElementById(EXT_ROOT_ID)?.shadowRoot?.getElementById("panel");
  if (!panel) return;

  panel.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.uiTab = `${btn.getAttribute("data-tab") || "course"}`;
      render();
      if (state.uiTab === "notes" && !state.notesPayload) await refreshNotes();
      if (state.uiTab === "problems" && !state.problemsPayload) await refreshProblems();
    });
  });

  panel.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const video = getVideoElement();
      if (!video) return;
      video.currentTime = Math.max(0, Number(btn.getAttribute("data-jump") || 0));
      video.play().catch(() => {});
    });
  });

  panel.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const noteId = `${btn.getAttribute("data-del") || ""}`.trim();
      if (!noteId || !state.trackedVideo?._id) return;
      await sendBg("DELETE_NOTE", { videoDbId: state.trackedVideo._id, noteId });
      await refreshNotes();
    });
  });

  panel.querySelectorAll("[data-review]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const noteId = `${btn.getAttribute("data-review") || ""}`.trim();
      const rating = Number(btn.getAttribute("data-rating") || 3);
      if (!noteId || !state.trackedVideo?._id) return;
      await sendBg("REVIEW_NOTE", { videoDbId: state.trackedVideo._id, noteId, rating });
      await refreshNotes();
    });
  });

  panel.querySelector("#refresh-notes")?.addEventListener("click", refreshNotes);
  panel.querySelector("#refresh-problems")?.addEventListener("click", refreshProblems);

  panel.querySelector("#add-note")?.addEventListener("click", async () => {
    const textEl = panel.querySelector("#note-text");
    const categoryEl = panel.querySelector("#note-category");
    const notesContent = `${textEl?.value || ""}`.trim();
    if (!notesContent || !state.trackedVideo?._id) return;

    await sendBg("ADD_NOTE", {
      videoDbId: state.trackedVideo._id,
      timestamp: Math.floor(Number(getVideoElement()?.currentTime || 0)),
      notesContent,
      category: `${categoryEl?.value || "theory"}`,
    });

    if (textEl) textEl.value = "";
    await refreshNotes();
  });

  panel.querySelector("#suggest-category")?.addEventListener("click", async () => {
    const textEl = panel.querySelector("#note-text");
    const categoryEl = panel.querySelector("#note-category");
    const notesContent = `${textEl?.value || ""}`.trim();
    if (!notesContent || !state.trackedVideo?._id || !categoryEl) return;
    const result = await sendBg("SUGGEST_NOTE_CATEGORY", { videoDbId: state.trackedVideo._id, notesContent });
    if (result.success && result.data?.category) categoryEl.value = result.data.category;
  });
};

const scrollCurrentVideoIntoView = () => {
  const panel = document.getElementById(EXT_ROOT_ID)?.shadowRoot?.getElementById("panel");
  if (!panel || state.uiTab !== "course") return;
  const current = panel.querySelector('.item[data-current="1"]');
  if (current) current.scrollIntoView({ block: "nearest", behavior: "smooth" });
};

const render = () => {
  const shadow = ensureRoot()?.shadowRoot;
  const panel = shadow?.getElementById("panel");
  const toggle = shadow?.getElementById("toggle");
  if (!panel || !toggle) return;

  toggle.textContent = state.panelOpen ? "X" : "OC";
  panel.style.display = state.panelOpen ? "block" : "none";
  if (!state.panelOpen) return;

  const tabHtml = state.uiTab === "notes" ? renderNotesTab() : state.uiTab === "problems" ? renderProblemsTab() : renderCourseTab();

  panel.innerHTML = `
    <div class="head"><div><div class="title">OpenCourse</div><div class="sub ${state.isAuthed ? "ok" : "warn"}">${state.isAuthed ? "Authenticated" : "Login required"}</div><div class="sub">${state.trackedVideo ? "Tracked in your course" : "Not mapped to OpenCourse"}</div></div><button id="refresh-all" class="btn">Refresh</button></div>
    <div class="tabs"><div class="tab ${state.uiTab === "course" ? "active" : ""}" data-tab="course">Course</div><div class="tab ${state.uiTab === "notes" ? "active" : ""}" data-tab="notes">Notes</div><div class="tab ${state.uiTab === "problems" ? "active" : ""}" data-tab="problems">Problems</div></div>
    <div class="body">${tabHtml}</div>
  `;

  panel.querySelector("#refresh-all")?.addEventListener("click", async () => initializeForCurrentVideo(true));
  attachHandlers();
  setTimeout(scrollCurrentVideoIntoView, 30);
};

const initializeForCurrentVideo = async (force = false) => {
  const ytVideoId = extractYtVideoId();
  if (!ytVideoId) return;
  if (!force && state.currentYtVideoId === ytVideoId) return;

  state.currentYtVideoId = ytVideoId;
  state.trackedVideo = null;
  state.courseVideos = [];
  state.courseMeta = null;
  state.completionSent = false;
  state.notesPayload = null;
  state.problemsPayload = null;
  render();

  const auth = await sendBg("CHECK_AUTH");
  state.isAuthed = !!auth?.success;
  if (!state.isAuthed) return render();

  const check = await sendBg("CHECK_VIDEO", { videoId: ytVideoId });
  if (!check.success || !check.data?._id) {
    state.trackedVideo = null;
    return render();
  }

  state.trackedVideo = check.data;
  state.completionSent = !!check.data.completed;

  const [courseRes, metaRes] = await Promise.all([
    sendBg("GET_COURSE_DATA", { courseId: check.data.playlist }),
    sendBg("GET_COURSE_META", { courseId: check.data.playlist }),
  ]);

  if (courseRes.success) state.courseVideos = Array.isArray(courseRes.data) ? courseRes.data : [];
  if (metaRes.success) state.courseMeta = metaRes.data || null;

  const video = getVideoElement();
  if (video && n(state.trackedVideo?.progressTime || 0) > 15 && n(video.currentTime || 0) < 2) {
    video.currentTime = Math.min(n(state.trackedVideo.progressTime || 0), Math.max(0, n(video.duration || 0) - 3));
  }

  await refreshNotes();
  render();
};

const syncTick = async () => {
  if (!state.isAuthed || !state.trackedVideo?._id) return;
  const video = getVideoElement();
  if (!video) return;

  const duration = n(video.duration || 0);
  const progressTime = n(video.currentTime || 0);
  if (duration <= 0) return;

  const isDone = !!(state.completionSent || video.ended || (progressTime / duration) >= 0.9);
  const now = Date.now();
  const progressedEnough = Math.abs(progressTime - state.lastProgressTimeSent) >= 3;
  if (!progressedEnough && !isDone) return;
  if (now - state.lastProgressSyncAt < 5000 && !isDone) return;

  state.lastProgressSyncAt = now;
  state.lastProgressTimeSent = progressTime;

  const updateRes = await sendBg("UPDATE_VIDEO", {
    videoDbId: state.trackedVideo._id,
    progressTime,
    duration,
    completed: isDone,
  });
  if (!updateRes.success) return;

  const idx = state.courseVideos.findIndex((v) => `${v?._id || ""}` === `${state.trackedVideo._id}`);
  if (idx >= 0) {
    state.courseVideos[idx] = { ...state.courseVideos[idx], progressTime, totalDuration: duration, completed: isDone || !!state.courseVideos[idx]?.completed };
  }
  state.trackedVideo = { ...state.trackedVideo, progressTime, totalDuration: duration, completed: isDone || !!state.trackedVideo.completed };

  if (!state.completionSent && isDone) {
    state.completionSent = true;
    await syncCourseProgress(true);
    const refreshed = await sendBg("GET_COURSE_DATA", { courseId: state.trackedVideo.playlist });
    if (refreshed.success) state.courseVideos = Array.isArray(refreshed.data) ? refreshed.data : state.courseVideos;
  } else if (now - state.lastCourseSyncAt > 15000) {
    await syncCourseProgress(false);
  }

  render();
};

const bindYoutubeNavigation = () => {
  window.addEventListener("yt-navigate-finish", () => initializeForCurrentVideo(true));
  window.addEventListener("popstate", () => initializeForCurrentVideo(true));
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "OPEN_PANEL") {
    state.panelOpen = true;
    render();
    sendResponse({ success: true });
    return true;
  }
  if (message?.action === "SEEK_TO") {
    const video = getVideoElement();
    if (video) {
      video.currentTime = Math.max(0, Number(message?.seconds || 0));
      video.play().catch(() => {});
    }
    sendResponse({ success: true });
    return true;
  }
  return false;
});

const bootstrap = async () => {
  ensureRoot();
  render();
  bindYoutubeNavigation();
  await initializeForCurrentVideo(true);

  while (true) {
    await syncTick();
    await wait(3000);
    const current = extractYtVideoId();
    if (current && current !== state.currentYtVideoId) await initializeForCurrentVideo(true);
  }
};

bootstrap().catch(() => {});
