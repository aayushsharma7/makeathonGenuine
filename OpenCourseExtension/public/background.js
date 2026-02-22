const API_BASE = "http://localhost:3000";

const postJson = async (path, body = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  return { ok: response.ok, status: response.status, payload };
};

const getJson = async (path) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  return { ok: response.ok, status: response.status, payload };
};

const fail = (sendResponse, message = "Request failed", code = 500, data = null) => {
  sendResponse({
    success: false,
    message,
    code,
    data,
  });
};

const pass = (sendResponse, data = null, message = "ok", code = 200) => {
  sendResponse({
    success: true,
    message,
    code,
    data,
  });
};

const withApi = async (sendResponse, fn) => {
  try {
    await fn();
  } catch (error) {
    fail(sendResponse, error?.message || "Unexpected error", 500);
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message?.action || "";

  if (action === "CHECK_AUTH") {
    withApi(sendResponse, async () => {
      const result = await getJson("/auth/check");
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Auth check failed", result.status || 401);
      }
      return pass(sendResponse, result.payload?.data || null, "auth-ok");
    });
    return true;
  }

  if (action === "CHECK_VIDEO") {
    withApi(sendResponse, async () => {
      const videoId = `${message?.videoId || ""}`.trim();
      if (!videoId) {
        return fail(sendResponse, "videoId is required", 400);
      }
      const result = await postJson("/course/getVideoData", { videoId });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Video not found", result.status || 404);
      }
      return pass(sendResponse, result.payload?.data || null, "video-found");
    });
    return true;
  }

  if (action === "UPDATE_VIDEO") {
    withApi(sendResponse, async () => {
      const { videoDbId, progressTime = 0, duration = 0, completed = false } = message || {};
      if (!videoDbId) {
        return fail(sendResponse, "videoDbId is required", 400);
      }
      const result = await postJson("/course/update/video", {
        videoId: videoDbId,
        progress_time: Number(progressTime || 0),
        duration: Number(duration || 0),
        completed: completed === true,
      });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to update video", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "video-updated");
    });
    return true;
  }

  if (action === "GET_COURSE_DATA") {
    withApi(sendResponse, async () => {
      const courseId = `${message?.courseId || ""}`.trim();
      if (!courseId) {
        return fail(sendResponse, "courseId is required", 400);
      }
      const result = await getJson(`/course/data/${courseId}`);
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to fetch course data", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || [], "course-data");
    });
    return true;
  }

  if (action === "GET_COURSE_META") {
    withApi(sendResponse, async () => {
      const courseId = `${message?.courseId || ""}`.trim();
      if (!courseId) {
        return fail(sendResponse, "courseId is required", 400);
      }
      const result = await getJson(`/course/getCourse/${courseId}`);
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to fetch course", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "course-meta");
    });
    return true;
  }

  if (action === "UPDATE_COURSE_PROGRESS") {
    withApi(sendResponse, async () => {
      const { courseId, completedVideos = [], lastVideoPlayed = 0 } = message || {};
      if (!courseId) {
        return fail(sendResponse, "courseId is required", 400);
      }
      const result = await postJson("/course/update/course", {
        courseId,
        completedVideos,
        lastVideoPlayed,
      });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to update course progress", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "course-updated");
    });
    return true;
  }

  if (action === "GET_NOTES") {
    withApi(sendResponse, async () => {
      const videoDbId = `${message?.videoDbId || ""}`.trim();
      if (!videoDbId) {
        return fail(sendResponse, "videoDbId is required", 400);
      }
      const result = await getJson(`/course/notes/${videoDbId}`);
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to fetch notes", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "notes");
    });
    return true;
  }

  if (action === "ADD_NOTE") {
    withApi(sendResponse, async () => {
      const { videoDbId, timestamp = 0, notesContent = "", category = "theory" } = message || {};
      if (!videoDbId || !`${notesContent}`.trim()) {
        return fail(sendResponse, "videoDbId and notesContent are required", 400);
      }
      const result = await postJson("/course/update/video/notes", {
        videoId: videoDbId,
        newNote: {
          videoId: videoDbId,
          timestamp: Number(timestamp || 0),
          notesContent: `${notesContent}`.trim(),
          category: `${category || "theory"}`,
        },
      });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to add note", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "note-added");
    });
    return true;
  }

  if (action === "DELETE_NOTE") {
    withApi(sendResponse, async () => {
      const { videoDbId, noteId } = message || {};
      if (!videoDbId || !noteId) {
        return fail(sendResponse, "videoDbId and noteId are required", 400);
      }
      const result = await postJson("/course/update/video/notes/delete", {
        videoId: videoDbId,
        noteId,
      });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to delete note", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "note-deleted");
    });
    return true;
  }

  if (action === "REVIEW_NOTE") {
    withApi(sendResponse, async () => {
      const { videoDbId, noteId, rating = 3 } = message || {};
      if (!videoDbId || !noteId) {
        return fail(sendResponse, "videoDbId and noteId are required", 400);
      }
      const result = await postJson("/course/update/video/notes/review", {
        videoId: videoDbId,
        noteId,
        rating: Number(rating || 3),
      });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to review note", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "note-reviewed");
    });
    return true;
  }

  if (action === "SUGGEST_NOTE_CATEGORY") {
    withApi(sendResponse, async () => {
      const { videoDbId, notesContent = "" } = message || {};
      if (!videoDbId || !`${notesContent}`.trim()) {
        return fail(sendResponse, "videoDbId and notesContent are required", 400);
      }
      const result = await postJson("/course/update/video/notes/suggest-category", {
        videoId: videoDbId,
        notesContent,
      });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to suggest category", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "category-suggested");
    });
    return true;
  }

  if (action === "GET_PROBLEMS") {
    withApi(sendResponse, async () => {
      const { videoId, title = "", description = "" } = message || {};
      if (!videoId) {
        return fail(sendResponse, "videoId is required", 400);
      }
      const result = await postJson("/course/generate/problems", {
        videoId,
        title,
        description,
      });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to fetch problems", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "problems");
    });
    return true;
  }

  if (action === "GET_SUMMARY") {
    withApi(sendResponse, async () => {
      const { videoId, title = "", description = "" } = message || {};
      if (!videoId) {
        return fail(sendResponse, "videoId is required", 400);
      }
      const result = await postJson("/course/generate/summary", {
        videoId,
        title,
        description,
      });
      if (!result.ok || !result.payload?.success) {
        return fail(sendResponse, result.payload?.message || "Failed to fetch summary", result.status || 500);
      }
      return pass(sendResponse, result.payload?.data || null, "summary");
    });
    return true;
  }
});
