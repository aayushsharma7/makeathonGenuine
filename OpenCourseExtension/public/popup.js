const state = {
  tab: "course",
  authed: false,
  ytVideoId: "",
  trackedVideo: null,
  courseVideos: [],
  notesPayload: null,
  problemsPayload: null,
  error: "",
};

const sendBg = async (action, payload = {}) => {
  try {
    return await chrome.runtime.sendMessage({ action, ...payload });
  } catch (error) {
    return { success: false, message: error?.message || "Bridge error" };
  }
};

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

const activeTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] || null;
};

const extractVideoId = (url = "") => {
  try {
    const parsed = new URL(url);
    const fromQuery = `${parsed.searchParams.get("v") || ""}`.trim();
    if (fromQuery) return fromQuery;
    return parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)?.[1] || "";
  } catch {
    return "";
  }
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

const setStatus = (text = "", type = "") => {
  const el = document.getElementById("status");
  if (!el) return;
  el.className = `sub ${type}`;
  el.textContent = text;
};

const renderCourseTab = () => {
  const currentId = `${state.trackedVideo?._id || ""}`;
  const done = (state.courseVideos || []).filter((v) => v?.completed).length;
  const total = (state.courseVideos || []).length || 1;
  const pct = Math.max(0, Math.min(100, Math.floor((done / total) * 100)));

  const modulesHtml = Object.entries(groupByModule(state.courseVideos || [])).map(([moduleTitle, videos]) => {
    const moduleDone = (videos || []).filter((v) => v?.completed).length;
    const moduleTotal = (videos || []).length || 1;
    const modulePct = Math.max(0, Math.min(100, Math.floor((moduleDone / moduleTotal) * 100)));
    const items = videos.map((video, idx) => {
      const isCurrent = `${video?._id || ""}` === currentId;
      const doneVideo = !!video?.completed;
      const progress = videoPct(video);
      return `
        <div class="item ${isCurrent ? "current" : ""} ${doneVideo ? "done" : ""}" data-current="${isCurrent ? "1" : "0"}">
          <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noreferrer">${esc(video?.title || "Untitled")}</a>
          <div class="row" style="margin-top:6px;"><span class="small">#${idx + 1} | ${durationLabel(video)}</span><span class="chip">${doneVideo ? "Completed" : `${progress}%`}</span></div>
          <div class="track"><div class="fill ${doneVideo ? "done" : ""}" style="width:${doneVideo ? 100 : progress}%;"></div></div>
        </div>
      `;
    }).join("");
    return `<div class="module"><div class="module-h"><div class="module-t">${esc(moduleTitle)}</div><span class="chip">${moduleDone}/${moduleTotal} (${modulePct}%)</span></div><div class="list">${items}</div></div>`;
  }).join("");

  return `
    <div class="card">
      <div class="row" style="align-items:flex-start;">
        <div><div class="txt">${esc(state.trackedVideo?.title || "Tracked Video")}</div><div class="small">${esc(state.trackedVideo?.channelTitle || "")}</div></div>
        <span class="chip">${state.trackedVideo?.completed ? "Completed" : "Tracking"}</span>
      </div>
      <div class="small" style="margin-top:8px;">Course progress: ${done}/${total} videos (${pct}%)</div>
      <div class="small">Current: ${formatTime(state.trackedVideo?.progressTime || 0)} / ${durationLabel(state.trackedVideo || {})}</div>
      <div class="track"><div class="fill" style="width:${pct}%;"></div></div>
    </div>
    ${modulesHtml || `<div class="card"><div class="small">No course videos found.</div></div>`}
  `;
};

const renderNotesTab = () => {
  const due = state.notesPayload?.dueNow || [];
  const grouped = state.notesPayload?.groupedByCategory || {};
  const dueHtml = due.slice(0, 5).map((note) => `
    <div class="due">
      <div class="row"><button class="btn" data-seek="${Math.floor(Number(note?.timestamp || 0))}">${formatTime(note?.timestamp || 0)}</button><span class="small">${esc(note?.category || "theory")} | due ${note?.nextReviewAt ? new Date(note.nextReviewAt).toLocaleDateString() : "today"}</span></div>
      <div class="txt" style="margin-top:6px;">${esc(note?.notesContent || "")}</div>
    </div>
  `).join("");
  const groupedHtml = Object.entries(grouped).map(([category, notes]) => `<div class="module"><div class="module-h"><div class="module-t">${esc(category)}</div><span class="chip">${(notes || []).length}</span></div></div>`).join("");
  return `<div class="card"><div class="small">Due now: ${due.length}</div></div>${dueHtml || `<div class="card"><div class="small">No notes due now.</div></div>`}${groupedHtml}`;
};

const renderProblemsTab = () => {
  const relevant = state.problemsPayload?.relevant !== false;
  const blocks = state.problemsPayload?.problemsList || state.problemsPayload?.data || [];
  const html = (blocks || []).map((b) => `
    <div class="module">
      <div class="module-h"><div class="module-t">${esc(b?.topic || "Topic")}</div><span class="chip">${(b?.problems || []).length}</span></div>
      <div class="list">${(b?.problems || []).map((p) => `<div class="item"><a target="_blank" rel="noreferrer" href="${esc(p?.url || "#")}">${esc(p?.title || "Problem")}</a></div>`).join("")}</div>
    </div>
  `).join("");
  return `<div class="card"><div class="small ${relevant ? "ok" : "warn"}">${relevant ? "Relevant for practice" : "No relevant coding problem suggestions"}</div></div>${html || `<div class="card"><div class="small">No problems generated yet.</div></div>`}`;
};

const render = () => {
  const body = document.getElementById("body");
  if (!body) return;

  if (state.error) {
    body.innerHTML = `<div class="card"><div class="small warn">${esc(state.error)}</div></div>`;
    return;
  }
  if (!state.authed) {
    body.innerHTML = `<div class="card"><div class="small warn">Please login to OpenCourse in this browser.</div></div>`;
    return;
  }
  if (!state.ytVideoId) {
    body.innerHTML = `<div class="card"><div class="small">Open a YouTube watch page to use extension data.</div></div>`;
    return;
  }
  if (!state.trackedVideo) {
    body.innerHTML = `<div class="card"><div class="small">This YouTube video is not mapped in your OpenCourse library.</div></div>`;
    return;
  }

  body.innerHTML = state.tab === "notes" ? renderNotesTab() : state.tab === "problems" ? renderProblemsTab() : renderCourseTab();

  body.querySelectorAll("[data-seek]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tab = await activeTab();
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: "SEEK_TO", seconds: Number(btn.getAttribute("data-seek") || 0) }, () => {});
    });
  });

  const current = body.querySelector('.item[data-current="1"]');
  if (current && state.tab === "course") current.scrollIntoView({ block: "nearest", behavior: "smooth" });
};

const loadData = async () => {
  state.error = "";
  setStatus("Checking session...");
  const auth = await sendBg("CHECK_AUTH");
  state.authed = Boolean(auth?.success);
  if (!state.authed) {
    setStatus("Not authenticated", "warn");
    render();
    return;
  }

  const tab = await activeTab();
  state.ytVideoId = extractVideoId(tab?.url || "");
  if (!state.ytVideoId) {
    setStatus("Open a YouTube video tab", "warn");
    render();
    return;
  }

  setStatus("Loading course data...");
  const check = await sendBg("CHECK_VIDEO", { videoId: state.ytVideoId });
  if (!check.success || !check.data?._id) {
    state.trackedVideo = null;
    setStatus("Video not in OpenCourse", "warn");
    render();
    return;
  }

  state.trackedVideo = check.data;
  const [courseRes, notesRes, problemsRes] = await Promise.all([
    sendBg("GET_COURSE_DATA", { courseId: check.data.playlist }),
    sendBg("GET_NOTES", { videoDbId: check.data._id }),
    sendBg("GET_PROBLEMS", {
      videoId: check.data.videoId,
      title: check.data.title || "",
      description: check.data.description || "",
    }),
  ]);

  state.courseVideos = courseRes.success ? (courseRes.data || []) : [];
  state.notesPayload = notesRes.success ? (notesRes.data || { notes: [], groupedByCategory: {}, dueNow: [] }) : { notes: [], groupedByCategory: {}, dueNow: [] };
  state.problemsPayload = problemsRes.success ? (problemsRes.data || {}) : {};

  setStatus("Synced with active YouTube video", "ok");
  render();
};

document.querySelectorAll("[data-tab]").forEach((el) => {
  el.addEventListener("click", () => {
    state.tab = `${el.getAttribute("data-tab") || "course"}`;
    document.querySelectorAll("[data-tab]").forEach((node) => node.classList.remove("active"));
    el.classList.add("active");
    render();
  });
});

document.getElementById("open-panel")?.addEventListener("click", async () => {
  const tab = await activeTab();
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: "OPEN_PANEL" }, () => {});
});

loadData().catch((error) => {
  state.error = error?.message || "Failed to initialize popup";
  render();
});
