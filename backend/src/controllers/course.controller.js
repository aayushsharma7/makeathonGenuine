import axios from "axios"
import { Course } from "../models/course.model.js";
import { Video } from "../models/videos.model.js";
import "dotenv/config"
import {GoogleGenAI} from "@google/genai"
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { fetchTranscript } from 'youtube-transcript-plus';
import { Notes } from "../models/note.model.js";
import { Transcript } from "../models/transcript.model.js";
import { Problems } from "../models/problems.model.js";
import { Summary } from "../models/summary.model.js";
import { User } from "../models/user.model.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";
import { QuizReviewSchedule } from "../models/quizReviewSchedule.model.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

const QUIZ_QUESTION_COUNT = 8;

const normalizeTopics = (rawTopics = "") => {
    if(Array.isArray(rawTopics)){
        return rawTopics.map((topic) => topic.toLowerCase().trim()).filter(Boolean);
    }
    return `${rawTopics}`.split(",").map((topic) => topic.toLowerCase().trim()).filter(Boolean);
}

const parseIsoDurationToMinutes = (isoDuration = "PT0S") => {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if(!match){
        return 0;
    }
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return (hours * 60) + minutes + Math.ceil(seconds / 60);
}

const extractTopicTags = (title = "", description = "", knownTopics = []) => {
    const text = `${title} ${description}`.toLowerCase();
    const keywordPool = [
        "introduction", "setup", "basics", "fundamentals", "variables", "loops", "functions",
        "arrays", "strings", "objects", "classes", "inheritance", "recursion", "sorting",
        "searching", "linked list", "stack", "queue", "tree", "graph", "dynamic programming",
        "react", "node", "express", "mongodb", "sql", "api", "authentication", "deployment"
    ];

    const tags = [];
    for (const topic of knownTopics) {
        if(topic && text.includes(topic)){
            tags.push(topic);
        }
    }
    for (const keyword of keywordPool) {
        if(text.includes(keyword) && !tags.includes(keyword)){
            tags.push(keyword);
        }
    }

    if(tags.length === 0){
        const firstWords = title.toLowerCase().split(" ").filter((w) => w.length > 3).slice(0,2);
        return firstWords.length ? firstWords : ["general"];
    }

    return tags.slice(0,3);
}

const buildRecommendation = ({topicTags, knownTopics, codingConfidence, goalUrgency, learningStyle}) => {
    const knownSet = new Set((knownTopics || []).map((topic) => topic.toLowerCase()));
    const isKnownTopic = topicTags.some((tag) => knownSet.has(tag.toLowerCase()));
    const confidence = parseInt(codingConfidence || "3", 10);
    const urgency = `${goalUrgency || ""}`.toLowerCase();
    const style = `${learningStyle || ""}`.toLowerCase();

    if(isKnownTopic && confidence >= 4){
        return {
            action: urgency.includes("high") ? "skip" : "watch_2x",
            reason: urgency.includes("high")
                ? "Topic already known and urgency is high."
                : "Topic already known, you can revise quickly at 2x."
        };
    }

    if(isKnownTopic && confidence >= 3){
        return {
            action: "watch_quick",
            reason: "You have prior exposure, so a quick revision is enough."
        };
    }

    if(style.includes("deep")){
        return {
            action: "watch",
            reason: "New topic and deep learning style selected."
        };
    }

    return {
        action: urgency.includes("high") ? "watch_2x" : "watch",
        reason: urgency.includes("high")
            ? "Recommended 2x to maintain pace while covering new content."
            : "Recommended full watch for better understanding."
    };
}

const buildPace = ({timePerDay, goalUrgency}) => {
    const timeText = `${timePerDay || ""}`.toLowerCase();
    const urgency = `${goalUrgency || ""}`.toLowerCase();
    if(urgency.includes("high") || timeText.includes("30")){
        return "Fast";
    }
    if(timeText.includes("1") || timeText.includes("2")){
        return "Balanced";
    }
    return "Deep";
}

const parseDailyHoursFromText = (timeText = "") => {
    const lower = `${timeText || ""}`.toLowerCase();
    if(!lower.trim()){
        return 0;
    }

    const rangeMatch = lower.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if(rangeMatch){
        const a = parseFloat(rangeMatch[1]);
        const b = parseFloat(rangeMatch[2]);
        if(!Number.isNaN(a) && !Number.isNaN(b)){
            return Number((((a + b) / 2)).toFixed(2));
        }
    }

    const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(hour|hr|hrs|hours)/);
    if(hourMatch){
        const value = parseFloat(hourMatch[1]);
        return Number((Number.isNaN(value) ? 0 : value).toFixed(2));
    }

    const minuteMatch = lower.match(/(\d+(?:\.\d+)?)\s*(minute|min|mins|minutes)/);
    if(minuteMatch){
        const mins = parseFloat(minuteMatch[1]);
        if(!Number.isNaN(mins)){
            return Number((mins / 60).toFixed(2));
        }
    }

    const plainNumber = parseFloat(lower);
    if(!Number.isNaN(plainNumber)){
        if(plainNumber > 12){
            return Number((plainNumber / 60).toFixed(2));
        }
        return Number(plainNumber.toFixed(2));
    }

    return 0;
}

const getPlaylistIdFromUrl = (url = "") => {
    if(!url){
        return "";
    }
    const parsed = `${url}`.split("list=")[1];
    if(!parsed){
        return "";
    }
    return parsed.split("&")[0] || "";
}

const extractYoutubeVideoId = (url = "") => {
    const safeUrl = `${url}`.trim();
    if(!safeUrl){
        return "";
    }

    const watchMatch = safeUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if(watchMatch?.[1]){
        return watchMatch[1];
    }

    const shortMatch = safeUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if(shortMatch?.[1]){
        return shortMatch[1];
    }

    const embedMatch = safeUrl.match(/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if(embedMatch?.[1]){
        return embedMatch[1];
    }

    if(/^[a-zA-Z0-9_-]{11}$/.test(safeUrl)){
        return safeUrl;
    }

    return "";
}

const getDurationDisplay = (isoDuration = "") => {
    if(!isoDuration){
        return "0:00";
    }
    const duration = isoDuration.replace("PT", "").replace("H", ":").replace("M", ":").replace("S", "");
    return duration.endsWith(":") ? `${duration}00` : duration;
}

const normalizeSubject = (rawSubject = "") => {
    const safe = `${rawSubject || ""}`.trim().toLowerCase();
    if(!safe){
        return "general";
    }
    return safe.replace(/\s+/g, "-");
}

const inferSubjectFromText = (text = "") => {
    const source = `${text || ""}`.toLowerCase();
    const map = [
        { subject: "dsa", keys: ["dsa", "algorithm", "algorithms", "data structure", "leetcode", "graph", "dp", "recursion"] },
        { subject: "electronics", keys: ["electronics", "vlsi", "digital", "analog", "microcontroller", "arduino", "embedded", "circuit"] },
        { subject: "ai-ml", keys: ["ai", "ml", "machine learning", "deep learning", "neural", "llm", "nlp", "computer vision"] },
        { subject: "web-development", keys: ["react", "node", "express", "javascript", "frontend", "backend", "full stack", "web"] },
        { subject: "core-cs", keys: ["os", "operating system", "dbms", "cn", "computer networks", "oop", "system design"] }
    ];

    for(const bucket of map){
        if(bucket.keys.some((key) => source.includes(key))){
            return bucket.subject;
        }
    }
    return "general";
}

const findClosestExistingSubject = (candidate = "", existingSubjects = [], contextText = "") => {
    const normalizedCandidate = normalizeSubject(candidate);
    const list = Array.from(new Set((existingSubjects || []).map((item) => normalizeSubject(item)).filter(Boolean)));
    if(!list.length){
        return normalizedCandidate;
    }
    if(list.includes(normalizedCandidate)){
        return normalizedCandidate;
    }

    const candidateTokens = new Set(normalizedCandidate.split("-").filter(Boolean));
    for(const subject of list){
        const subjectTokens = subject.split("-").filter(Boolean);
        const overlap = subjectTokens.some((token) => candidateTokens.has(token));
        if(overlap){
            return subject;
        }
    }

    const context = `${contextText || ""}`.toLowerCase();
    for(const subject of list){
        const subjectText = subject.replace(/-/g, " ");
        if(context.includes(subjectText)){
            return subject;
        }
    }

    return normalizedCandidate;
}

const resolveAutoSubjectForUser = async ({ owner = "", title = "", personalization = {}, knownTopics = [] }) => {
    const mergedText = [
        title,
        personalization?.targetGoal || "",
        personalization?.priorExposure || "",
        Array.isArray(knownTopics) ? knownTopics.join(" ") : `${knownTopics || ""}`
    ].join(" ");

    const inferred = inferSubjectFromText(mergedText);
    const existingCourses = await Course.find({ owner }).select("subject");
    const existingSubjects = existingCourses.map((item) => item.subject || "general");

    return findClosestExistingSubject(inferred, existingSubjects, mergedText);
}

const parseIsoDurationToSeconds = (isoDuration = "PT0S") => {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if(!match){
        return 0;
    }
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return (hours * 3600) + (minutes * 60) + seconds;
}

const getDateKeyUTC = (date = new Date()) => {
    return new Date(date).toISOString().slice(0, 10);
}

const normalizeNoteCategory = (category = "") => {
    const safe = `${category || ""}`.trim().toLowerCase();
    if(!safe){
        return "theory";
    }
    const allowed = ["theory", "doubt", "code", "formula", "revision"];
    if(allowed.includes(safe)){
        return safe;
    }
    return safe.slice(0, 32);
}

const inferNoteCategoryHeuristic = ({ content = "", title = "", description = "" }) => {
    const text = `${content || ""} ${title || ""} ${description || ""}`.toLowerCase();
    if(/error|bug|issue|why|confus|doubt|question/.test(text)){
        return "doubt";
    }
    if(/code|function|class|loop|array|algorithm|syntax|api|query|sql|js|python|java/.test(text)){
        return "code";
    }
    if(/formula|equation|theorem|identity|law/.test(text)){
        return "formula";
    }
    if(/revise|revision|remember|important/.test(text)){
        return "revision";
    }
    return "theory";
}

const suggestNoteCategoryWithAi = async ({ content = "", title = "", description = "" }) => {
    const heuristic = inferNoteCategoryHeuristic({ content, title, description });
    const text = `${content || ""}`.trim();
    if(!text){
        return heuristic;
    }
    try {
        const result = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
You are a strict JSON API that classifies study notes into one category.
Return only JSON:
{"category":"theory|doubt|code|formula|revision"}
Rules:
- Choose exactly one category.
- Do not add markdown.
`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        title,
                        description,
                        note: text
                    })
                }
            ],
            response_format: { type: "json_object" }
        });
        const parsed = safeJsonParse(result?.text || "");
        return normalizeNoteCategory(parsed?.category || heuristic);
    } catch (error) {
        return heuristic;
    }
}

const getNoteReviewIntervalDays = (level = 0) => {
    const ladder = [1, 2, 4, 7, 14, 21, 30];
    const idx = Math.max(0, Math.min(ladder.length - 1, parseInt(level, 10) || 0));
    return ladder[idx];
}

const toStartOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

const mapRecommendationActionToOverviewMode = (action = "") => {
    const safe = `${action || ""}`.trim().toLowerCase();
    if(safe === "skip"){
        return "skip_with_summary";
    }
    if(safe === "watch_quick" || safe === "watch_2x"){
        return "watch_partial";
    }
    return "watch_full";
}

const sanitizeOverviewSkipSegments = ({ segments = [], videoDurationSeconds = 0 }) => {
    return (segments || [])
        .map((item) => {
            const start = Math.max(0, parseInt(item?.startSeconds || 0, 10) || 0);
            const endRaw = parseInt(item?.endSeconds || (start + 45), 10) || (start + 45);
            let end = Math.max(start + 15, endRaw);
            if(videoDurationSeconds > 0){
                end = Math.min(videoDurationSeconds, end);
            }
            if(end <= start){
                return null;
            }
            return {
                startSeconds: start,
                endSeconds: end,
                reason: `${item?.reason || ""}`.trim() || "Lower-priority revision segment."
            };
        })
        .filter(Boolean)
        .slice(0, 4);
}

const buildFallbackVideoOverview = ({ videoDoc = null, courseDoc = null, summaryText = "", videoDurationSeconds = 0 }) => {
    const mode = mapRecommendationActionToOverviewMode(videoDoc?.recommendationAction || "watch");
    const summaryHint = summaryText
        ? "Summary is available if you want a quick pass before moving ahead."
        : "Generate summary/notes if you need a fast revision pass.";
    const shouldSuggestSkip = mode === "watch_partial";
    return {
        overview: `${videoDoc?.title || "This lesson"} covers core concepts relevant to your course path. ${summaryHint}`,
        whatYouWillLearn: (videoDoc?.topicTags || []).slice(0, 4).map((item) => `${item}`.replace(/-/g, " ")),
        recommendation: {
            mode,
            reason: `${videoDoc?.recommendationReason || "Based on your onboarding profile and current course flow."}`.trim(),
            suggestedPlaybackSpeed: mode === "watch_partial" ? "1.5x" : "1.0x",
            suggestedAction: mode === "skip_with_summary"
                ? "Read summary + notes, then proceed."
                : (mode === "watch_partial" ? "Watch priority sections and skip low-value revision parts." : "Watch full video once."),
            skipSegments: shouldSuggestSkip && videoDurationSeconds > 240
                ? [{
                    startSeconds: Math.max(0, Math.floor(videoDurationSeconds * 0.62)),
                    endSeconds: Math.max(0, Math.floor(videoDurationSeconds * 0.78)),
                    reason: "Likely extended walkthrough segment; skim if concept already known."
                }]
                : []
        }
    };
}

const upsertUserDailyActivity = async ({ userId, courseId, completedMinutes = 0 }) => {
    const userDoc = await User.findById(userId);
    if(!userDoc){
        return;
    }

    const dateKey = getDateKeyUTC(new Date());
    const heatmap = userDoc.heatmapActivity || [];
    const daily = userDoc.courseDailyProgress || [];

    const heatmapIdx = heatmap.findIndex((item) => item.date === dateKey);
    if(heatmapIdx >= 0){
        heatmap[heatmapIdx].count = (heatmap[heatmapIdx].count || 0) + 1;
        heatmap[heatmapIdx].minutes = (heatmap[heatmapIdx].minutes || 0) + completedMinutes;
    } else {
        heatmap.push({
            date: dateKey,
            count: 1,
            minutes: completedMinutes
        });
    }

    const dailyIdx = daily.findIndex((item) => item.date === dateKey && `${item.courseId}` === `${courseId}`);
    if(dailyIdx >= 0){
        daily[dailyIdx].completedVideos = (daily[dailyIdx].completedVideos || 0) + 1;
        daily[dailyIdx].completedMinutes = (daily[dailyIdx].completedMinutes || 0) + completedMinutes;
    } else {
        daily.push({
            date: dateKey,
            courseId: `${courseId}`,
            completedVideos: 1,
            completedMinutes
        });
    }

    userDoc.heatmapActivity = heatmap;
    userDoc.courseDailyProgress = daily;
    await userDoc.save();
}

const safeJsonParse = (text = "") => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const jsonMatch = `${text}`.match(/\{[\s\S]*\}/);
        if(jsonMatch){
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (innerErr) {
                return null;
            }
        }
        return null;
    }
}

const PINECONE_API_BASE = "https://api.pinecone.io";
const PINECONE_API_VERSION = process.env.PINECONE_API_VERSION || "2025-10";
const PINECONE_EMBED_MODEL = `${process.env.PINECONE_EMBED_MODEL || "llama-text-embed-v2"}`.trim() || "llama-text-embed-v2";
let pineconeResolvedIndexDimension = Number.parseInt(`${process.env.PINECONE_INDEX_DIMENSION || ""}`, 10) || 0;
const ragIndexingJobs = new Map();
const getPineconeConfig = () => {
    const apiKey = `${process.env.PINECONE_API_KEY || ""}`.trim();
    const rawHost = `${process.env.PINECONE_INDEX_HOST || ""}`.trim();
    const host = rawHost ? rawHost.replace(/\/+$/, "") : "";
    const namespace = `${process.env.PINECONE_NAMESPACE || "opencourse"}`.trim() || "opencourse";
    return {
        apiKey,
        host,
        namespace,
        isEnabled: Boolean(apiKey && host)
    };
}

const logRagEvent = (event = "", payload = {}) => {
    if(!shouldExposeRagDebug()){
        return;
    }
    try {
        console.log(`[RAG] ${event}`, payload);
    } catch (e) {
        console.log(`[RAG] ${event}`);
    }
}

const pineconeVersionCandidates = () => {
    const envVersion = `${process.env.PINECONE_API_VERSION || ""}`.trim();
    const candidates = [
        envVersion,
        PINECONE_API_VERSION,
        "2025-04",
        "2024-10",
        "2024-07",
        ""
    ].filter((item, idx, arr) => item !== undefined && arr.indexOf(item) === idx);
    return candidates;
}

const pineconePostWithFallback = async ({ url = "", apiKey = "", payload = {}, timeout = 20000 }) => {
    const versions = pineconeVersionCandidates();
    let lastError = null;
    const retryableCodes = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNABORTED", "EAI_AGAIN"]);

    for(const version of versions){
        for(let attempt = 1; attempt <= 3; attempt += 1){
            try {
                const headers = {
                    "Api-Key": apiKey,
                    "Content-Type": "application/json"
                };
                if(version){
                    headers["X-Pinecone-Api-Version"] = version;
                }

                const response = await axios.post(url, payload, {
                    headers,
                    timeout
                });
                return response;
            } catch (error) {
                lastError = error;
                const status = error?.response?.status || 0;
                const code = `${error?.code || ""}`.toUpperCase();
                const shouldRetryNetwork = retryableCodes.has(code) && attempt < 3;
                if(shouldRetryNetwork){
                    const waitMs = 200 * attempt;
                    await new Promise((resolve) => setTimeout(resolve, waitMs));
                    continue;
                }
                if(status !== 404 && status !== 400){
                    break;
                }
            }
        }
    }

    throw lastError || new Error("Pinecone request failed");
}

const parseIndexDimensionFromError = (error = null) => {
    const message = `${error?.response?.data?.message || error?.message || ""}`;
    if(!message){
        return 0;
    }
    const match = message.match(/index\s+(\d+)/i);
    if(!match){
        return 0;
    }
    const parsed = parseInt(match[1], 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

const alignVectorDimension = (values = [], targetDimension = 0) => {
    const vector = Array.isArray(values) ? values : [];
    const target = parseInt(targetDimension, 10) || 0;
    if(!target || !vector.length){
        return vector;
    }
    if(vector.length === target){
        return vector;
    }
    if(vector.length > target){
        return vector.slice(0, target);
    }
    const padCount = target - vector.length;
    return [...vector, ...Array(padCount).fill(0)];
}

const buildTranscriptChunks = (transcriptRows = [], videoId = "", courseId = "") => {
    const rows = (transcriptRows || []).filter((row) => `${row?.text || ""}`.trim());
    if(!rows.length){
        return [];
    }

    const chunks = [];
    let current = null;
    const charLimit = 900;
    const secondWindow = 100;

    rows.forEach((row) => {
        const offset = Math.max(0, Math.floor(row?.offset || 0));
        const text = `${row?.text || ""}`.trim();
        if(!text){
            return;
        }

        if(!current){
            current = {
                startSeconds: offset,
                endSeconds: offset + Math.max(8, Math.ceil(row?.duration || 6)),
                textParts: [text]
            };
            return;
        }

        const projectedText = `${current.textParts.join(" ")} ${text}`.trim();
        const projectedDuration = offset - current.startSeconds;
        const shouldFlush = projectedText.length > charLimit || projectedDuration > secondWindow;

        if(shouldFlush){
            chunks.push({
                id: `${videoId}:chunk:${chunks.length + 1}`,
                videoId,
                courseId: `${courseId}`,
                startSeconds: current.startSeconds,
                endSeconds: Math.max(current.startSeconds + 12, current.endSeconds),
                text: current.textParts.join(" ").trim()
            });
            current = {
                startSeconds: offset,
                endSeconds: offset + Math.max(8, Math.ceil(row?.duration || 6)),
                textParts: [text]
            };
            return;
        }

        current.textParts.push(text);
        current.endSeconds = Math.max(current.endSeconds, offset + Math.max(8, Math.ceil(row?.duration || 6)));
    });

    if(current?.textParts?.length){
        chunks.push({
            id: `${videoId}:chunk:${chunks.length + 1}`,
            videoId,
            courseId: `${courseId}`,
            startSeconds: current.startSeconds,
            endSeconds: Math.max(current.startSeconds + 12, current.endSeconds),
            text: current.textParts.join(" ").trim()
        });
    }

    return chunks.filter((item) => item.text.length > 25).slice(0, 220);
}

const embedTextsWithPinecone = async (texts = [], inputType = "passage") => {
    const { apiKey, isEnabled } = getPineconeConfig();
    if(!isEnabled || !texts.length){
        logRagEvent("embed_skipped", { isEnabled, textCount: texts.length, inputType });
        return [];
    }
    logRagEvent("embed_start", { textCount: texts.length, inputType, model: PINECONE_EMBED_MODEL });

    const requestedModel = `${PINECONE_EMBED_MODEL || "llama-text-embed-v2"}`.trim() || "llama-text-embed-v2";
    const maxInputsPerRequest = Math.max(1, Math.min(96, parseInt(process.env.PINECONE_EMBED_MAX_INPUTS || "80", 10) || 80));

    const runEmbedRequest = async (modelName, textBatch) => {
        const payload = {
            model: modelName,
            parameters: {
                input_type: inputType,
                truncate: "END"
            },
            inputs: textBatch.map((text) => ({ text: `${text || ""}`.trim() }))
        };

        try {
            return await pineconePostWithFallback({
                url: `${PINECONE_API_BASE}/embed`,
                apiKey,
                payload,
                timeout: 20000
            });
        } catch (firstError) {
            return pineconePostWithFallback({
                url: `${PINECONE_API_BASE}/inference/embed`,
                apiKey,
                payload,
                timeout: 20000
            });
        }
    };

    const vectors = [];
    for(let i = 0; i < texts.length; i += maxInputsPerRequest){
        const batch = texts.slice(i, i + maxInputsPerRequest);
        let response = null;
        try {
            response = await runEmbedRequest(requestedModel, batch);
        } catch (firstModelError) {
            const status = firstModelError?.response?.status || "";
            const shouldTryFallbackModel = requestedModel !== "multilingual-e5-large";
            if(!shouldTryFallbackModel){
                throw firstModelError;
            }
            response = await runEmbedRequest("multilingual-e5-large", batch);
            console.warn(`Pinecone embed model fallback used: ${requestedModel} -> multilingual-e5-large`, status, firstModelError?.response?.data || {});
        }

        const data = response?.data?.data || [];
        const batchVectors = data.map((item) => item?.values || []).filter((values) => Array.isArray(values) && values.length > 0);
        vectors.push(...batchVectors);
        logRagEvent("embed_batch_done", {
            batchStart: i,
            batchSize: batch.length,
            vectorCount: batchVectors.length,
            cumulativeVectors: vectors.length
        });
    }

    logRagEvent("embed_done", { vectorCount: vectors.length, inputType, maxInputsPerRequest });
    return vectors;
}

const upsertChunksToPinecone = async (chunks = []) => {
    const { apiKey, host, namespace, isEnabled } = getPineconeConfig();
    if(!isEnabled || !chunks.length){
        logRagEvent("upsert_skipped", { isEnabled, chunkCount: chunks.length });
        return { upsertedCount: 0 };
    }
    logRagEvent("upsert_start", { chunkCount: chunks.length, namespace, host });

    const embeddings = await embedTextsWithPinecone(chunks.map((item) => item.text), "passage");
    if(!embeddings.length || embeddings.length !== chunks.length){
        return { upsertedCount: 0 };
    }

    let vectors = chunks.map((chunk, idx) => ({
        id: chunk.id,
        values: (embeddings[idx] || []).map((v) => (Number.isFinite(v) ? Number(v) : 0)),
        metadata: {
            videoId: `${chunk.videoId}`,
            courseId: `${chunk.courseId}`,
            startSeconds: chunk.startSeconds,
            endSeconds: chunk.endSeconds,
            text: `${chunk.text}`.slice(0, 600)
        }
    })).filter((item) => Array.isArray(item.values) && item.values.length > 0);

    if(pineconeResolvedIndexDimension > 0){
        vectors = vectors.map((item) => ({
            ...item,
            values: alignVectorDimension(item.values, pineconeResolvedIndexDimension)
        }));
    }

    const batchSize = Math.max(4, Math.min(30, parseInt(process.env.PINECONE_UPSERT_BATCH_SIZE || "10", 10) || 10));
    let totalUpserted = 0;

    for(let i = 0; i < vectors.length; i += batchSize){
        let batchVectors = vectors.slice(i, i + batchSize);
        let response = null;
        try {
            response = await pineconePostWithFallback({
                url: `${host}/vectors/upsert`,
                apiKey,
                payload: {
                    namespace,
                    vectors: batchVectors
                },
                timeout: 30000
            });
        } catch (error) {
            const expectedDim = parseIndexDimensionFromError(error);
            if(expectedDim){
                pineconeResolvedIndexDimension = expectedDim;
                batchVectors = batchVectors.map((item) => ({
                    ...item,
                    values: alignVectorDimension(item.values, expectedDim).map((v) => (Number.isFinite(v) ? Number(v) : 0))
                }));
                response = await pineconePostWithFallback({
                    url: `${host}/vectors/upsert`,
                    apiKey,
                    payload: {
                        namespace,
                        vectors: batchVectors
                    },
                    timeout: 30000
                });
            } else {
                const detailBody = error?.response?.data || {};
                logRagEvent("upsert_batch_error", {
                    batchStart: i,
                    batchSize: batchVectors.length,
                    status: error?.response?.status || "",
                    detail: detailBody
                });

                // Retry individually to isolate malformed vector/metadata and index partial progress.
                let perVectorSuccess = 0;
                for(let j = 0; j < batchVectors.length; j += 1){
                    const single = batchVectors[j];
                    try {
                        await pineconePostWithFallback({
                            url: `${host}/vectors/upsert`,
                            apiKey,
                            payload: {
                                namespace,
                                vectors: [single]
                            },
                            timeout: 30000
                        });
                        perVectorSuccess += 1;
                    } catch (singleErr) {
                        logRagEvent("upsert_single_error", {
                            vectorId: single?.id || "",
                            status: singleErr?.response?.status || "",
                            detail: singleErr?.response?.data || {}
                        });
                    }
                }

                if(perVectorSuccess === 0){
                    throw error;
                }
                totalUpserted += perVectorSuccess;
                logRagEvent("upsert_batch_partial", {
                    batchStart: i,
                    batchSize: batchVectors.length,
                    perVectorSuccess,
                    totalUpserted
                });
                continue;
            }
        }

        const upsertedNow = response?.data?.upsertedCount || batchVectors.length;
        totalUpserted += upsertedNow;
        logRagEvent("upsert_batch_done", {
            batchStart: i,
            batchSize: batchVectors.length,
            upsertedNow,
            totalUpserted
        });
    }

    return {
        upsertedCount: totalUpserted
    };
}

const queryPineconeChunks = ({ text = "", videoId = "", courseId = "", topK = 12, startSeconds = null, endSeconds = null }) => {
    return queryPineconeChunksInternal({ text, videoId, courseId, topK, startSeconds, endSeconds });
}

const queryPineconeChunksInternal = async ({ text = "", videoId = "", courseId = "", topK = 12, startSeconds = null, endSeconds = null }) => {
    const { apiKey, host, namespace, isEnabled } = getPineconeConfig();
    if(!isEnabled || !text.trim()){
        logRagEvent("query_skipped", { isEnabled, hasText: Boolean(text.trim()) });
        return [];
    }
    logRagEvent("query_start", { namespace, host, topK, videoId, courseId, hasWindow: Number.isFinite(startSeconds) || Number.isFinite(endSeconds) });

    const embeddings = await embedTextsWithPinecone([text], "query");
    let queryVector = embeddings?.[0];
    if(!queryVector?.length){
        return [];
    }
    if(pineconeResolvedIndexDimension > 0){
        queryVector = alignVectorDimension(queryVector, pineconeResolvedIndexDimension);
    }

    const filters = [];
    if(videoId){
        filters.push({ videoId: { "$eq": `${videoId}` } });
    }
    if(courseId){
        filters.push({ courseId: { "$eq": `${courseId}` } });
    }
    if(Number.isFinite(startSeconds)){
        filters.push({ endSeconds: { "$gte": Math.max(0, Math.floor(startSeconds)) } });
    }
    if(Number.isFinite(endSeconds)){
        filters.push({ startSeconds: { "$lte": Math.max(0, Math.floor(endSeconds)) } });
    }

    const payload = {
        namespace,
        vector: queryVector,
        topK: Math.max(5, Math.min(20, parseInt(topK, 10) || 12)),
        includeMetadata: true
    };
    const filterObj = filters.length > 1 ? { "$and": filters } : (filters[0] || null);
    if(filterObj){
        payload.filter = filterObj;
    }

    let response = null;
    try {
        response = await pineconePostWithFallback({
            url: `${host}/query`,
            apiKey,
            payload,
            timeout: 20000
        });
    } catch (error) {
        const expectedDim = parseIndexDimensionFromError(error);
        if(!expectedDim){
            throw error;
        }
        pineconeResolvedIndexDimension = expectedDim;
        const retryPayload = {
            ...payload,
            vector: alignVectorDimension(payload.vector, expectedDim)
        };
        response = await pineconePostWithFallback({
            url: `${host}/query`,
            apiKey,
            payload: retryPayload,
            timeout: 20000
        });
    }

    const matches = response?.data?.matches || [];
    const out = matches.map((item) => ({
        id: item?.id || "",
        score: Number((item?.score || 0).toFixed(4)),
        text: `${item?.metadata?.text || ""}`.trim(),
        startSeconds: Math.max(0, parseInt(item?.metadata?.startSeconds || 0, 10) || 0),
        endSeconds: Math.max(0, parseInt(item?.metadata?.endSeconds || 0, 10) || 0)
    })).filter((item) => item.text);
    logRagEvent("query_done", { matchCount: out.length, topK });
    return out;
}

const ensureTranscriptDoc = async (videoId = "") => {
    if(!videoId){
        return null;
    }
    let transcriptDoc = await Transcript.findOne({ videoId }).sort({ createdAt: -1 });
    if(transcriptDoc){
        return transcriptDoc;
    }

    try {
        const rawTranscript = await fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`,{
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
        });
        if(rawTranscript && rawTranscript.length){
            transcriptDoc = await Transcript.create({
                videoId,
                transcript: rawTranscript
            });
            return transcriptDoc;
        }
    } catch (error) {
        return null;
    }

    return null;
}

const ensureRagChunksForVideo = async ({ videoDoc = null, transcriptDoc = null }) => {
    const videoKey = `${videoDoc?.videoId || ""}:${videoDoc?.playlist || ""}`;
    if(videoKey && ragIndexingJobs.has(videoKey)){
        logRagEvent("ensure_chunks_wait_existing_job", { videoKey });
        await ragIndexingJobs.get(videoKey);
        return;
    }

    const jobPromise = (async () => {
        const { isEnabled } = getPineconeConfig();
        if(!isEnabled || !videoDoc || !transcriptDoc){
            logRagEvent("ensure_chunks_skipped", {
                isEnabled,
                hasVideoDoc: Boolean(videoDoc),
                hasTranscriptDoc: Boolean(transcriptDoc)
            });
            return;
        }

        const transcriptRows = transcriptDoc?.transcript || [];
        if(!transcriptRows.length){
            logRagEvent("ensure_chunks_skipped_empty_transcript", { videoId: videoDoc?.videoId || "" });
            return;
        }

        const indexedAt = transcriptDoc?.rag?.indexedAt ? new Date(transcriptDoc.rag.indexedAt).getTime() : 0;
        const transcriptUpdatedAt = transcriptDoc?.updatedAt ? new Date(transcriptDoc.updatedAt).getTime() : 0;
        const hasFreshIndex = indexedAt && transcriptUpdatedAt && indexedAt >= transcriptUpdatedAt && transcriptDoc?.rag?.model === PINECONE_EMBED_MODEL;
        if(hasFreshIndex){
            logRagEvent("ensure_chunks_reused", {
                videoId: videoDoc?.videoId || "",
                chunksCount: transcriptDoc?.rag?.chunksCount || 0,
                model: transcriptDoc?.rag?.model || ""
            });
            return;
        }

        const chunks = buildTranscriptChunks(transcriptRows, videoDoc.videoId, videoDoc.playlist);
        if(!chunks.length){
            logRagEvent("ensure_chunks_no_chunks", { videoId: videoDoc?.videoId || "" });
            return;
        }

        try {
            await upsertChunksToPinecone(chunks);
        } catch (error) {
            const wrapped = new Error(`RAG_UPSERT_FAILED: ${error?.message || "unknown"}`);
            wrapped.response = error?.response;
            throw wrapped;
        }
        transcriptDoc.rag = {
            indexedAt: new Date(),
            chunksCount: chunks.length,
            model: PINECONE_EMBED_MODEL
        };
        await transcriptDoc.save();
        logRagEvent("ensure_chunks_done", { videoId: videoDoc?.videoId || "", chunksCount: chunks.length, model: PINECONE_EMBED_MODEL });
    })();

    if(videoKey){
        ragIndexingJobs.set(videoKey, jobPromise);
    }
    try {
        await jobPromise;
    } finally {
        if(videoKey){
            ragIndexingJobs.delete(videoKey);
        }
    }
}

const getRagContextForQuiz = async ({ videoDoc = null, summaryText = "", focusConcept = "" }) => {
    const queryText = [
        videoDoc?.title || "",
        (videoDoc?.topicTags || []).join(" "),
        focusConcept || "",
        summaryText || ""
    ].join(" ").trim();

    let matches = [];
    try {
        matches = await queryPineconeChunks({
            text: queryText,
            videoId: videoDoc?.videoId || "",
            courseId: videoDoc?.playlist || "",
            topK: 12
        });
    } catch (error) {
        const wrapped = new Error(`RAG_QUERY_FAILED: ${error?.message || "unknown"}`);
        wrapped.response = error?.response;
        throw wrapped;
    }

    return matches.map((item) => ({
        startSeconds: item.startSeconds,
        endSeconds: item.endSeconds,
        text: item.text.slice(0, 240)
    }));
}

const shouldExposeRagDebug = () => {
    const raw = `${process.env.DEBUG_RAG || ""}`.trim().toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes" || process.env.NODE_ENV !== "production";
}

const toTitleCase = (text = "") => {
    return `${text || ""}`
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

const sanitizeModuleTitle = (rawTitle = "", fallback = "General") => {
    const clean = `${rawTitle || ""}`.replace(/^module\s*:\s*/i, "").trim();
    const base = clean || fallback;
    return `Module: ${toTitleCase(base)}`;
}

const getModuleBucketsBySubject = (subject = "general") => {
    const normalized = normalizeSubject(subject);
    if(normalized === "dsa"){
        return [
            { title: "Foundations", topic: "foundations", keys: ["intro", "complexity", "big o", "analysis", "basics"] },
            { title: "Arrays and Strings", topic: "arrays-strings", keys: ["array", "string", "two pointer", "sliding window", "prefix"] },
            { title: "Linked Lists and Stacks", topic: "linear-ds", keys: ["linked list", "stack", "queue", "deque"] },
            { title: "Recursion and Backtracking", topic: "recursion-backtracking", keys: ["recursion", "backtracking", "subset", "permutation"] },
            { title: "Trees and BST", topic: "trees", keys: ["tree", "bst", "binary tree", "traversal", "lca"] },
            { title: "Heap and Greedy", topic: "heap-greedy", keys: ["heap", "priority queue", "greedy"] },
            { title: "Graphs", topic: "graphs", keys: ["graph", "bfs", "dfs", "topological", "disjoint set", "union find"] },
            { title: "Dynamic Programming", topic: "dynamic-programming", keys: ["dynamic programming", "dp", "memoization", "tabulation"] },
            { title: "Interview Problems", topic: "interview", keys: ["problem", "question", "interview", "contest"] }
        ];
    }
    if(normalized === "web-development"){
        return [
            { title: "Foundations", topic: "foundations", keys: ["intro", "setup", "environment", "basics"] },
            { title: "HTML and CSS", topic: "html-css", keys: ["html", "css", "layout", "responsive", "tailwind"] },
            { title: "JavaScript Core", topic: "javascript-core", keys: ["javascript", "js", "dom", "event", "promise", "async"] },
            { title: "React", topic: "react", keys: ["react", "jsx", "component", "hook", "state", "router"] },
            { title: "Backend and APIs", topic: "backend-api", keys: ["node", "express", "api", "auth", "middleware"] },
            { title: "Database and Deployment", topic: "db-deploy", keys: ["mongodb", "sql", "database", "deploy", "production"] }
        ];
    }

    return [
        { title: "Foundations", topic: "foundations", keys: ["intro", "setup", "basics", "fundamental"] },
        { title: "Core Concepts", topic: "core-concepts", keys: ["concept", "theory", "principle", "core"] },
        { title: "Hands-on Practice", topic: "practice", keys: ["project", "practice", "example", "demo", "problem"] },
        { title: "Advanced and Review", topic: "advanced-review", keys: ["advanced", "optimization", "revision", "summary", "interview"] }
    ];
}

const buildFallbackModulePlan = ({ videoDocs = [], subject = "general" }) => {
    const buckets = getModuleBucketsBySubject(subject);
    const moduleMap = {};

    videoDocs.forEach((video, index) => {
        const text = `${video.title || ""} ${video.description || ""} ${(video.topicTags || []).join(" ")}`.toLowerCase();
        const matched = buckets.find((bucket) => bucket.keys.some((key) => text.includes(key)));
        const selected = matched || buckets[Math.min(index < 2 ? 0 : 1, buckets.length - 1)];
        const moduleTitle = sanitizeModuleTitle(selected?.title || "General");
        if(!moduleMap[moduleTitle]){
            moduleMap[moduleTitle] = {
                title: moduleTitle,
                topic: selected?.topic || "general",
                videoIndexes: []
            };
        }
        moduleMap[moduleTitle].videoIndexes.push(index);
    });

    const plan = Object.values(moduleMap).filter((item) => item.videoIndexes.length > 0);
    if(!plan.length){
        return [{
            title: "Module: General",
            topic: "general",
            videoIndexes: videoDocs.map((_, idx) => idx)
        }];
    }

    return plan;
}

const normalizeModulePlan = ({ rawPlan, totalVideos }) => {
    const rawModules = Array.isArray(rawPlan?.modules) ? rawPlan.modules : [];
    const normalized = [];
    const used = new Set();

    rawModules.forEach((moduleItem, moduleIdx) => {
        const rawIndexes = Array.isArray(moduleItem?.videoIndexes) ? moduleItem.videoIndexes : [];
        const cleanedIndexes = rawIndexes
            .map((value) => parseInt(value, 10))
            .filter((value) => Number.isInteger(value) && value >= 0 && value < totalVideos)
            .filter((value) => {
                if(used.has(value)){
                    return false;
                }
                used.add(value);
                return true;
            });

        if(!cleanedIndexes.length){
            return;
        }

        normalized.push({
            title: sanitizeModuleTitle(moduleItem?.title || `Module ${moduleIdx + 1}`, "General"),
            topic: `${moduleItem?.topic || "general"}`.trim().toLowerCase() || "general",
            milestone: `${moduleItem?.milestone || ""}`.trim(),
            videoIndexes: cleanedIndexes
        });
    });

    const missing = [];
    for(let index = 0; index < totalVideos; index++){
        if(!used.has(index)){
            missing.push(index);
        }
    }

    if(missing.length){
        normalized.push({
            title: "Module: Additional Concepts",
            topic: "general",
            milestone: "",
            videoIndexes: missing
        });
    }

    return normalized;
}

const isWeakModulePlan = ({ modules = [], totalVideos = 0 }) => {
    if(!modules.length){
        return true;
    }
    if(totalVideos <= 4){
        return false;
    }

    const singletonCount = modules.filter((item) => (item.videoIndexes || []).length === 1).length;
    const singletonRatio = singletonCount / modules.length;
    const genericTitleCount = modules.filter((item) => {
        const title = `${item?.title || ""}`.toLowerCase();
        return title.includes("general") || title.includes("additional concepts") || /module:\s*(module\s*)?\d+/.test(title);
    }).length;
    const tooManyModules = modules.length > Math.max(10, Math.ceil(totalVideos * 0.5));

    if(singletonRatio > 0.4 && totalVideos >= 8){
        return true;
    }
    if(genericTitleCount >= Math.ceil(modules.length * 0.7) && totalVideos >= 6){
        return true;
    }
    if(tooManyModules){
        return true;
    }
    return false;
}

const buildStructuredModulePlan = async ({ videoDocs = [], subject = "general", personalization = {} }) => {
    if(!videoDocs.length){
        return [];
    }

    const fallbackModules = buildFallbackModulePlan({ videoDocs, subject });
    try {
        const compactVideoList = videoDocs.map((video, index) => ({
            index,
            title: `${video.title || ""}`.slice(0, 140),
            tags: (video.topicTags || []).slice(0, 4),
            durationMinutes: parseIsoDurationToMinutes(video.duration || "PT0S")
        }));

        const result = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            temperature: 0.1,
            maxTokens: 1800,
            messages: [
                {
                    role: "system",
                    content: `You are a strict JSON API that structures a video course into coherent learning modules.
Return only JSON:
{
  "modules":[
    {
      "title":"string",
      "topic":"string",
      "milestone":"string",
      "videoIndexes":[0,1,2]
    }
  ]
}
Rules:
- Group by topic coherence and learning progression.
- Never create random/single-video noisy modules unless absolutely necessary.
- Prefer 4 to 10 modules for larger playlists.
- Every index must appear exactly once.
- Keep module titles short and clear.
- Maintain practical progression: fundamentals -> core -> advanced -> revision/interview/project.
`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        subject,
                        targetGoal: personalization?.targetGoal || "",
                        knownTopics: personalization?.knownTopics || [],
                        videos: compactVideoList
                    })
                }
            ]
        });

        const parsed = safeJsonParse(result?.text || "");
        const normalized = normalizeModulePlan({
            rawPlan: parsed,
            totalVideos: videoDocs.length
        });

        if(!normalized.length || isWeakModulePlan({ modules: normalized, totalVideos: videoDocs.length })){
            return fallbackModules;
        }
        return normalized;
    } catch (error) {
        return fallbackModules;
    }
}

const containsHindiScript = (text = "") => /[\u0900-\u097F]/.test(`${text || ""}`);

const looksLikeVerbatimRecall = (text = "") => {
    const safe = `${text || ""}`.toLowerCase();
    const recallPatterns = [
        "according to the video",
        "as mentioned in the video",
        "what did the instructor say",
        "what is said in this video",
        "which statement is most consistent with what is explained around this part",
        "from the transcript"
    ];
    return recallPatterns.some((pattern) => safe.includes(pattern));
}

const isLikelyTooSimpleQuestion = (text = "") => {
    const safe = `${text || ""}`.trim().toLowerCase();
    if(!safe){
        return true;
    }
    const weakStarts = [
        "which topic is central",
        "what is this video about",
        "which of the following is discussed",
        "what is taught in this video"
    ];
    if(weakStarts.some((item) => safe.startsWith(item))){
        return true;
    }
    return safe.split(" ").length < 8;
}

const isAppliedQuestion = (text = "", domain = "general") => {
    const safe = `${text || ""}`.toLowerCase();
    const commonApplied = [
        "given",
        "scenario",
        "case",
        "step",
        "next",
        "best",
        "why",
        "predict",
        "outcome",
        "choose"
    ];
    const codingApplied = [
        "array",
        "output",
        "time complexity",
        "space complexity",
        "dry run",
        "trace",
        "iteration",
        "recursion",
        "stack",
        "queue",
        "tree",
        "graph",
        "sort"
    ];
    if(domain === "coding"){
        return codingApplied.some((token) => safe.includes(token));
    }
    return commonApplied.some((token) => safe.includes(token));
}

const isQuizQuestionHighQuality = ({ question = "", options = [], explanation = "", hint = "", domain = "general" }) => {
    const allText = [question, ...(options || []), explanation, hint].join(" ");
    if(containsHindiScript(allText)){
        return false;
    }
    if(looksLikeVerbatimRecall(question)){
        return false;
    }
    if(isLikelyTooSimpleQuestion(question)){
        return false;
    }
    if(!isAppliedQuestion(question, domain)){
        return false;
    }
    return true;
}

const normalizeQuizQuestions = (quizPayload, { domain = "general" } = {}) => {
    const rawQuestions = Array.isArray(quizPayload?.questions) ? quizPayload.questions : [];
    const validated = rawQuestions.map((item, idx) => {
        const options = Array.isArray(item?.options) ? item.options.slice(0,4).map((opt) => `${opt}`.trim()) : [];
        const optionIndex = parseInt(item?.correctOptionIndex, 10);
        const startSeconds = Math.max(0, parseInt(item?.sourceStartSeconds ?? item?.startSeconds ?? 0, 10) || 0);
        let endSeconds = Math.max(startSeconds + 15, parseInt(item?.sourceEndSeconds ?? item?.endSeconds ?? startSeconds + 55, 10) || (startSeconds + 55));
        if(endSeconds - startSeconds > 120){
            endSeconds = startSeconds + 120;
        }
        const normalizedDifficulty = `${item?.difficulty || "medium"}`.trim().toLowerCase();
        const difficulty = ["easy", "medium", "hard"].includes(normalizedDifficulty) ? normalizedDifficulty : "medium";
        const normalizedOptions = options.map((opt) => opt || "N/A");
        const uniqueCount = new Set(normalizedOptions.map((opt) => opt.toLowerCase())).size;

        return {
            question: `${item?.question || ""}`.trim(),
            options: normalizedOptions,
            correctOptionIndex: Number.isInteger(optionIndex) ? optionIndex : -1,
            conceptTag: `${item?.conceptTag || "general"}`.trim().toLowerCase() || "general",
            difficulty,
            explanation: `${item?.explanation || ""}`.trim(),
            hint: `${item?.hint || ""}`.trim(),
            sourceStartSeconds: startSeconds,
            sourceEndSeconds: endSeconds,
            sourceContext: `${item?.sourceContext || ""}`.trim(),
            validOptions: uniqueCount === 4
        };
    }).filter((item) => item.question && item.options.length === 4 && item.correctOptionIndex >= 0 && item.correctOptionIndex <= 3 && item.validOptions)
    .filter((item) => isQuizQuestionHighQuality({
        question: item.question,
        options: item.options,
        explanation: item.explanation,
        hint: item.hint,
        domain
    }))
    .map(({ validOptions, ...item }) => item);

    return validated.slice(0, QUIZ_QUESTION_COUNT);
}

const normalizeQuestionFingerprint = (text = "") => {
    return `${text || ""}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const collectPreviousQuestionFingerprints = ({ attempts = [], quizDoc = null }) => {
    const set = new Set();
    (attempts || []).forEach((attempt) => {
        (attempt?.questionReview || []).forEach((item) => {
            const fp = normalizeQuestionFingerprint(item?.question || "");
            if(fp){
                set.add(fp);
            }
        });
    });
    (quizDoc?.questions || []).forEach((item) => {
        const fp = normalizeQuestionFingerprint(item?.question || "");
        if(fp){
            set.add(fp);
        }
    });
    return set;
}

const countQuizOverlap = ({ questions = [], previousFingerprints = new Set() }) => {
    if(!questions.length || !previousFingerprints?.size){
        return 0;
    }
    return questions.reduce((acc, item) => {
        const fp = normalizeQuestionFingerprint(item?.question || "");
        if(fp && previousFingerprints.has(fp)){
            return acc + 1;
        }
        return acc;
    }, 0);
}

const diversifyQuizQuestions = ({
    questions = [],
    previousFingerprints = new Set(),
    title = "",
    topicTags = [],
    transcriptDoc = null,
    domain = "general",
    maxRepeats = 2
}) => {
    if(!questions.length || !previousFingerprints?.size){
        return questions;
    }

    const fallbackPool = buildFallbackQuizQuestions({
        title,
        topicTags,
        transcriptDoc,
        domain
    });
    const taken = new Set();
    const next = [];
    let repeatCount = 0;
    let fallbackIdx = 0;

    for(const question of questions){
        const fp = normalizeQuestionFingerprint(question?.question || "");
        const isPrev = fp && previousFingerprints.has(fp);
        if(isPrev && repeatCount >= maxRepeats){
            let replacement = null;
            while(fallbackIdx < fallbackPool.length){
                const candidate = fallbackPool[fallbackIdx];
                fallbackIdx += 1;
                const candidateFp = normalizeQuestionFingerprint(candidate?.question || "");
                if(!candidateFp || previousFingerprints.has(candidateFp) || taken.has(candidateFp)){
                    continue;
                }
                replacement = candidate;
                taken.add(candidateFp);
                break;
            }
            if(replacement){
                next.push(replacement);
                continue;
            }
        }

        if(isPrev){
            repeatCount += 1;
        }
        if(fp){
            taken.add(fp);
        }
        next.push(question);
    }

    return next.slice(0, questions.length);
}

const inferQuizDomainProfile = ({ course = null, videoDoc = null, transcriptRows = [] }) => {
    const subject = normalizeSubject(course?.subject || "general");
    const seedText = [
        subject,
        videoDoc?.title || "",
        videoDoc?.description || "",
        (videoDoc?.topicTags || []).join(" "),
        (transcriptRows || []).slice(0, 40).map((row) => row?.text || "").join(" ")
    ].join(" ").toLowerCase();

    if(["dsa", "web-development", "core-cs", "ai-ml"].includes(subject)){
        return { domain: "coding", subject };
    }
    if(["electronics"].includes(subject) || /physics|chemistry|biology|circuit|signal|semiconductor/.test(seedText)){
        return { domain: "science", subject };
    }
    if(/aptitude|quant|algebra|calculus|probability|statistics/.test(seedText)){
        return { domain: "math", subject };
    }
    if(/history|geography|polity|economics|upsc|ssc|neet|jee|gate|exam/.test(seedText)){
        return { domain: "exam-theory", subject };
    }
    if(/english|ielts|communication|speaking|writing|grammar|language/.test(seedText)){
        return { domain: "language", subject };
    }
    if(/design|ui|ux|figma|product|business|marketing|finance|sales/.test(seedText)){
        return { domain: "professional", subject };
    }

    return { domain: "general", subject };
}

const getQuizDifficultyPlan = ({ course = null, videoDoc = null, adaptiveDifficulty = "medium", domain = "general" }) => {
    const style = `${course?.personalizationProfile?.learningStyle || ""}`.toLowerCase();
    const titleText = `${videoDoc?.title || ""}`.toLowerCase();
    const descriptionText = `${videoDoc?.description || ""}`.toLowerCase();
    const combined = `${titleText} ${descriptionText}`;

    const isTheoryHeavy = ["history", "theory", "concept", "foundation", "principles", "overview"].some((key) => combined.includes(key));
    const isHandsOn = ["project", "build", "implementation", "problem", "exercise", "lab", "practice", "case study"].some((key) => combined.includes(key));

    let plan = { easy: 2, medium: 3, hard: 3 };
    if(domain === "coding"){
        plan = { easy: 1, medium: 3, hard: 4 };
    } else if(domain === "math"){
        plan = { easy: 1, medium: 4, hard: 3 };
    } else if(domain === "exam-theory" || domain === "language"){
        plan = { easy: 2, medium: 4, hard: 2 };
    } else if(isTheoryHeavy){
        plan = { easy: 2, medium: 4, hard: 2 };
    } else if(isHandsOn){
        plan = { easy: 1, medium: 4, hard: 3 };
    }

    if(style.includes("deep")){
        plan = { easy: Math.max(0, plan.easy - 1), medium: plan.medium + 1, hard: plan.hard };
    } else if(style.includes("quick")){
        plan = { easy: plan.easy + 1, medium: Math.max(1, plan.medium - 1), hard: Math.max(0, plan.hard) };
    }

    if(adaptiveDifficulty === "easy"){
        plan = { easy: 3, medium: 4, hard: 1 };
    } else if(adaptiveDifficulty === "hard"){
        plan = { easy: 1, medium: 3, hard: 4 };
    }

    const total = plan.easy + plan.medium + plan.hard;
    if(total !== QUIZ_QUESTION_COUNT){
        const diff = QUIZ_QUESTION_COUNT - total;
        plan.medium += diff;
        if(plan.medium < 0){
            plan.medium = 0;
            plan.easy = Math.max(0, QUIZ_QUESTION_COUNT - plan.hard);
        }
    }

    return plan;
}

const redistributeDifficulty = (questions = [], plan = { easy: 2, medium: 3, hard: 3 }) => {
    const desiredOrderFromPlan = [
        ...Array(plan.easy).fill("easy"),
        ...Array(plan.medium).fill("medium"),
        ...Array(plan.hard).fill("hard")
    ].slice(0, questions.length || QUIZ_QUESTION_COUNT);
    const strictProgression = ["easy", "easy", "medium", "medium", "medium", "hard", "hard", "hard"]
        .slice(0, questions.length || QUIZ_QUESTION_COUNT);
    const desiredOrder = desiredOrderFromPlan.length === strictProgression.length
        ? strictProgression
        : desiredOrderFromPlan;

    const priorityScore = { easy: 1, medium: 2, hard: 3 };
    const sorted = [...questions].sort((a, b) => (priorityScore[a.difficulty] || 2) - (priorityScore[b.difficulty] || 2));

    return sorted.map((question, idx) => ({
        ...question,
        difficulty: desiredOrder[idx] || question.difficulty || "medium"
    }));
}

const fillQuizQuestionsToTarget = ({
    questions = [],
    title = "",
    topicTags = [],
    transcriptDoc = null,
    domain = "general"
}) => {
    const target = QUIZ_QUESTION_COUNT;
    const current = [...(questions || [])];
    if(current.length >= target){
        return current.slice(0, target);
    }
    const existing = new Set(current.map((item) => normalizeQuestionFingerprint(item?.question || "")).filter(Boolean));
    const fallback = buildFallbackQuizQuestions({ title, topicTags, transcriptDoc, domain });
    for(const candidate of fallback){
        const fp = normalizeQuestionFingerprint(candidate?.question || "");
        if(!fp || existing.has(fp)){
            continue;
        }
        current.push(candidate);
        existing.add(fp);
        if(current.length >= target){
            break;
        }
    }
    return current.slice(0, target);
}

const snapQuestionToTranscriptRange = ({ question = null, transcriptRows = [], videoDurationSeconds = 0 }) => {
    const rows = transcriptRows || [];
    let start = Math.max(0, parseInt(question?.sourceStartSeconds || 0, 10) || 0);
    let end = Math.max(start + 20, parseInt(question?.sourceEndSeconds || start + 50, 10) || (start + 50));
    let context = `${question?.sourceContext || ""}`.trim();

    if(!rows.length){
        if(videoDurationSeconds > 0){
            start = Math.min(start, Math.max(0, videoDurationSeconds - 30));
            end = Math.min(videoDurationSeconds, Math.max(start + 20, end));
        }
        return {
            start,
            end,
            context
        };
    }

    const nearest = rows.reduce((best, row) => {
        const offset = Math.floor(row?.offset || 0);
        const bestOffset = Math.floor(best?.offset || 0);
        const bestDist = Math.abs(bestOffset - start);
        const currentDist = Math.abs(offset - start);
        return currentDist < bestDist ? row : best;
    }, rows[0]);

    const anchorOffset = Math.floor(nearest?.offset || 0);
    const nearbyRows = rows.filter((row) => {
        const offset = Math.floor(row?.offset || 0);
        return offset >= Math.max(0, anchorOffset - 12) && offset <= (anchorOffset + 55);
    });

    if(nearbyRows.length){
        const first = Math.floor(nearbyRows[0]?.offset || anchorOffset);
        const last = Math.floor(nearbyRows[nearbyRows.length - 1]?.offset || anchorOffset + 40);
        start = Math.max(0, first);
        end = Math.max(start + 20, last + 12);
        const collectedContext = nearbyRows.slice(0, 3).map((row) => `${row?.text || ""}`.trim()).join(" ").trim();
        if(collectedContext){
            context = collectedContext.slice(0, 260);
        }
    } else {
        start = Math.max(0, anchorOffset - 8);
        end = start + 45;
        if(!context){
            context = `${nearest?.text || ""}`.trim().slice(0, 220);
        }
    }

    if(videoDurationSeconds > 0){
        start = Math.min(start, Math.max(0, videoDurationSeconds - 20));
        end = Math.min(videoDurationSeconds, Math.max(start + 20, end));
    }
    if(end - start > 100){
        end = start + 100;
    }

    return {
        start,
        end,
        context
    };
}

const enrichQuestionSources = ({ questions = [], transcriptRows = [], videoDurationSeconds = 0 }) => {
    if(!questions.length){
        return [];
    }
    return questions.map((question) => {
        const snapped = snapQuestionToTranscriptRange({
            question,
            transcriptRows,
            videoDurationSeconds
        });

        return {
            ...question,
            sourceStartSeconds: snapped.start,
            sourceEndSeconds: snapped.end,
            sourceContext: snapped.context
        };
    });
}

const buildFallbackQuizQuestions = ({ title = "", topicTags = [], transcriptDoc = null, domain = "general" }) => {
    const primaryTopic = `${topicTags?.[0] || "core concept"}`.toLowerCase();
    const codingTemplates = [
        {
            question: `Given an array [5, 1, 4, 2, 8], after the first full pass of bubble sort, which array state is correct?`,
            options: ["[1, 4, 2, 5, 8]", "[1, 5, 2, 4, 8]", "[5, 1, 4, 2, 8]", "[1, 2, 4, 5, 8]"],
            correctOptionIndex: 0,
            conceptTag: primaryTopic || "sorting",
            difficulty: "medium",
            explanation: "In one full pass, the largest element moves to the end through adjacent swaps.",
            hint: "Track adjacent swaps from left to right for one complete iteration."
        },
        {
            question: `For a recursive function with base case n <= 1 and call f(n-1), what is the main reason the base case is required?`,
            options: ["To avoid infinite recursion", "To improve space complexity to O(1)", "To sort values automatically", "To remove stack usage completely"],
            correctOptionIndex: 0,
            conceptTag: primaryTopic || "recursion",
            difficulty: "medium",
            explanation: "Without a terminating condition, recursion would continue indefinitely.",
            hint: "Think about when recursive calls stop."
        },
        {
            question: `If an algorithm runs two nested loops over n elements, what is the typical time complexity?`,
            options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
            correctOptionIndex: 2,
            conceptTag: "complexity",
            difficulty: "easy",
            explanation: "Two full loops over n elements usually produce quadratic complexity.",
            hint: "Count how many operations happen as n grows."
        },
        {
            question: `In a DFS traversal, which data structure behavior is most directly used by recursion?`,
            options: ["Queue (FIFO)", "Stack (LIFO)", "Hash table lookup", "Priority queue ordering"],
            correctOptionIndex: 1,
            conceptTag: primaryTopic || "graph",
            difficulty: "medium",
            explanation: "Recursive calls use the call stack, which follows LIFO behavior.",
            hint: "Consider how the call stack grows and unwinds."
        },
        {
            question: `For binary search on a sorted array, what condition must always hold before applying the method?`,
            options: ["Array must be sorted", "Array length must be odd", "Array must contain distinct elements", "Target must be in first half"],
            correctOptionIndex: 0,
            conceptTag: primaryTopic || "search",
            difficulty: "easy",
            explanation: "Binary search relies on sorted order to discard half the search space each step.",
            hint: "What property lets you eliminate half the range safely?"
        },
        {
            question: `During insertion sort, after processing index i, what invariant is true for the subarray [0..i]?`,
            options: ["It is sorted", "It is reverse sorted", "It has all duplicates removed", "Its maximum stays at index 0"],
            correctOptionIndex: 0,
            conceptTag: primaryTopic || "sorting",
            difficulty: "medium",
            explanation: "Insertion sort maintains a sorted prefix after each insertion.",
            hint: "Think about what each pass guarantees."
        },
        {
            question: `In two-pointer technique on a sorted array, when current sum is too large, what move is usually correct?`,
            options: ["Move right pointer left", "Move left pointer right", "Move both pointers right", "Reset both pointers"],
            correctOptionIndex: 0,
            conceptTag: primaryTopic || "two-pointers",
            difficulty: "medium",
            explanation: "Decreasing the right pointer reduces the sum in a sorted array setup.",
            hint: "Use sorted-order effect on sum."
        },
        {
            question: `For BFS on an unweighted graph, why does the first time you reach a node give shortest path length from source?`,
            options: ["BFS explores level by level", "BFS sorts edges by weight", "BFS uses recursion depth", "BFS always starts from leaf"],
            correctOptionIndex: 0,
            conceptTag: primaryTopic || "graph",
            difficulty: "hard",
            explanation: "BFS expansion in layers ensures minimal edge count on first visit.",
            hint: "Consider traversal order by distance."
        }
    ];

    const nonCodingTemplates = [
        {
            question: `In a practical scenario based on ${title || "this lesson"}, which approach best applies the core concept to reach a reliable outcome?`,
            options: [
                "Apply the concept step-by-step and validate assumptions",
                "Memorize one definition and reuse it everywhere",
                "Skip constraints and directly choose the first option",
                "Ignore context and rely only on a keyword match"
            ],
            correctOptionIndex: 0,
            conceptTag: primaryTopic || "application",
            difficulty: "medium",
            explanation: "Applied understanding requires contextual reasoning and validation.",
            hint: "Choose the option that uses reasoning, not rote recall."
        },
        {
            question: `Which choice most likely represents a misconception when applying ${primaryTopic || "the concept"}?`,
            options: [
                "Using assumptions without checking context",
                "Comparing alternatives before deciding",
                "Mapping the concept to constraints",
                "Evaluating trade-offs before execution"
            ],
            correctOptionIndex: 0,
            conceptTag: primaryTopic || "misconceptions",
            difficulty: "medium",
            explanation: "Unchecked assumptions usually lead to incorrect application.",
            hint: "Look for the option that skips reasoning steps."
        },
        {
            question: `When two methods seem valid, what should be prioritized first for exam-style reasoning?`,
            options: [
                "Constraint fit and correctness",
                "Most familiar wording",
                "Longest explanation",
                "Earliest mention in notes"
            ],
            correctOptionIndex: 0,
            conceptTag: "reasoning",
            difficulty: "easy",
            explanation: "Correctness under constraints is the first filter for method selection.",
            hint: "Prioritize correctness over familiarity."
        },
        {
            question: `If an approach fails in one edge scenario, what is the strongest next step?`,
            options: [
                "Identify why it fails and adjust the method",
                "Ignore the edge case",
                "Memorize the previous answer",
                "Use the same approach unchanged"
            ],
            correctOptionIndex: 0,
            conceptTag: "edge-cases",
            difficulty: "medium",
            explanation: "Edge-case failure analysis improves robust understanding.",
            hint: "Robust methods handle edge scenarios explicitly."
        },
        {
            question: `Which option demonstrates deeper understanding rather than surface recall?`,
            options: [
                "Explaining why one option works and others fail",
                "Repeating one line from memory",
                "Selecting by keyword only",
                "Guessing based on option length"
            ],
            correctOptionIndex: 0,
            conceptTag: "understanding",
            difficulty: "medium",
            explanation: "Comparative reasoning indicates conceptual mastery.",
            hint: "Look for causal explanation, not memorization."
        },
        {
            question: `A real-world case violates one assumption of the taught method. What is the best first response?`,
            options: [
                "Re-evaluate assumptions and adapt method boundaries",
                "Apply the same method unchanged",
                "Discard all constraints",
                "Pick the fastest-looking option"
            ],
            correctOptionIndex: 0,
            conceptTag: "assumptions",
            difficulty: "hard",
            explanation: "Method validity depends on assumptions; mismatch requires adaptation.",
            hint: "Check method preconditions first."
        },
        {
            question: `When two candidate explanations seem correct, which criterion is strongest in exam evaluation?`,
            options: [
                "Consistency with constraints and evidence",
                "More familiar terminology",
                "Longer sentence length",
                "Higher confidence wording"
            ],
            correctOptionIndex: 0,
            conceptTag: "evaluation",
            difficulty: "medium",
            explanation: "Evidence-constrained reasoning is preferred over stylistic confidence.",
            hint: "Prioritize verifiable consistency."
        },
        {
            question: `Which answer reflects transfer of concept to a new scenario?`,
            options: [
                "Adapting core principle to changed constraints",
                "Repeating the original example verbatim",
                "Memorizing one phrase",
                "Ignoring contextual differences"
            ],
            correctOptionIndex: 0,
            conceptTag: "transfer",
            difficulty: "hard",
            explanation: "Transfer means applying principles beyond the original example context.",
            hint: "Look for adaptation, not repetition."
        }
    ];

    const defaultSet = domain === "coding" ? codingTemplates : nonCodingTemplates;
    const transcriptItems = transcriptDoc?.transcript || [];
    if(!transcriptItems.length){
        return defaultSet.map((item, idx) => ({
            ...item,
            sourceStartSeconds: idx * 30,
            sourceEndSeconds: (idx * 30) + 45,
            sourceContext: `Fallback context for ${item.conceptTag}.`
        }));
    }

    const samplePoints = [
        transcriptItems[Math.floor(transcriptItems.length * 0.1)],
        transcriptItems[Math.floor(transcriptItems.length * 0.3)],
        transcriptItems[Math.floor(transcriptItems.length * 0.5)],
        transcriptItems[Math.floor(transcriptItems.length * 0.7)],
        transcriptItems[Math.floor(transcriptItems.length * 0.9)],
        transcriptItems[Math.floor(transcriptItems.length * 0.2)],
        transcriptItems[Math.floor(transcriptItems.length * 0.4)],
        transcriptItems[Math.floor(transcriptItems.length * 0.8)]
    ].filter(Boolean);

    const examSet = defaultSet.slice(0, QUIZ_QUESTION_COUNT);
    return examSet.map((template, idx) => {
        const point = samplePoints[idx] || samplePoints[samplePoints.length - 1] || {};
        const context = `${point?.text || ""}`.trim();
        const startSeconds = Math.max(0, Math.floor((point?.offset || 0) - 12));
        const endSeconds = startSeconds + 70;
        return {
            ...template,
            sourceStartSeconds: startSeconds,
            sourceEndSeconds: endSeconds,
            sourceContext: context.slice(0, 220) || `Context around ${template.conceptTag}.`
        };
    });
}

const buildQuizAnalysis = ({ questionReview = [], percentage = 0 }) => {
    const conceptMap = {};
    const difficultyMap = {};

    questionReview.forEach((item) => {
        const conceptKey = item.conceptTag || "general";
        const difficultyKey = item.difficulty || "medium";
        if(!conceptMap[conceptKey]){
            conceptMap[conceptKey] = { key: conceptKey, correct: 0, total: 0, accuracy: 0 };
        }
        if(!difficultyMap[difficultyKey]){
            difficultyMap[difficultyKey] = { key: difficultyKey, correct: 0, total: 0, accuracy: 0 };
        }

        conceptMap[conceptKey].total += 1;
        difficultyMap[difficultyKey].total += 1;
        if(item.isCorrect){
            conceptMap[conceptKey].correct += 1;
            difficultyMap[difficultyKey].correct += 1;
        }
    });

    const conceptBreakdown = Object.values(conceptMap).map((item) => ({
        ...item,
        accuracy: item.total ? Math.round((item.correct / item.total) * 100) : 0
    }));
    const difficultyBreakdown = Object.values(difficultyMap).map((item) => ({
        ...item,
        accuracy: item.total ? Math.round((item.correct / item.total) * 100) : 0
    }));

    const strengths = conceptBreakdown.filter((item) => item.accuracy >= 70).map((item) => `${item.key} (${item.accuracy}%)`);
    const weakAreas = conceptBreakdown.filter((item) => item.accuracy < 70).map((item) => `${item.key} (${item.accuracy}%)`);

    const recommendedActions = [];
    if(percentage < 50){
        recommendedActions.push("Rewatch this video once at normal speed and pause at key explanations.");
        recommendedActions.push("Attempt the quiz again after revising concept notes.");
    } else if(percentage < 75){
        recommendedActions.push("Review only incorrectly answered questions and revise their explanations.");
        recommendedActions.push("Practice 3-5 focused questions on weak concepts.");
    } else {
        recommendedActions.push("You can move ahead, but quickly revise wrong questions once.");
        recommendedActions.push("Try medium/hard practice for stronger transfer.");
    }

    const overallFeedback = percentage >= 80
        ? "Strong understanding. Keep consistency and push difficulty gradually."
        : percentage >= 60
            ? "Good progress. A focused revision pass can improve your score significantly."
            : "Current understanding is developing. Do one revision cycle before moving forward.";

    return {
        conceptBreakdown,
        difficultyBreakdown,
        strengths,
        weakAreas,
        recommendedActions,
        overallFeedback
    };
}

const buildHeuristicReadiness = ({ percentage = 0, pausePerMinute = 0, avgPlaybackSpeed = 1, watchedSeconds = 0, videoDurationSeconds = 0 }) => {
    let score = Number(percentage || 0);

    if(pausePerMinute > 8){
        score -= 8;
    } else if(pausePerMinute > 5){
        score -= 4;
    } else if(pausePerMinute >= 1 && pausePerMinute <= 4){
        score += 2;
    }

    if(avgPlaybackSpeed > 2.25){
        score -= 8;
    } else if(avgPlaybackSpeed > 1.75){
        score -= 4;
    } else if(avgPlaybackSpeed >= 0.9 && avgPlaybackSpeed <= 1.4){
        score += 3;
    }

    const watchedRatio = videoDurationSeconds > 0 ? (watchedSeconds / Math.max(1, videoDurationSeconds)) : 0;
    if(watchedRatio < 0.35){
        score -= 15;
    } else if(watchedRatio < 0.55){
        score -= 8;
    } else if(watchedRatio >= 0.8){
        score += 4;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const canProceed = score >= 65 && percentage >= 55;
    const skillLevel = score >= 85 ? "advanced" : score >= 70 ? "strong" : score >= 50 ? "developing" : "needs-practice";
    const readinessReason = canProceed
        ? "Good understanding signal from quiz accuracy and viewing behavior."
        : "Reattempt recommended to strengthen understanding before moving forward.";

    return {
        comprehensionScore: score,
        skillLevel,
        canProceed,
        readinessReason,
        nextStep: canProceed ? "continue" : "reattempt"
    };
}

const buildReadinessAssessment = async ({ course = null, videoDoc = null, percentage = 0, engagement = {} }) => {
    const videoDurationSeconds = parseIsoDurationToSeconds(videoDoc?.duration || "PT0S");
    const heuristic = buildHeuristicReadiness({
        percentage,
        pausePerMinute: engagement.pausePerMinute || 0,
        avgPlaybackSpeed: engagement.avgPlaybackSpeed || 1,
        watchedSeconds: engagement.watchedSeconds || 0,
        videoDurationSeconds
    });

    try {
        const result = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
You are a strict JSON API.
Compute readiness after quiz using behavior and score.
Return JSON:
{
  "comprehensionScore": 0,
  "skillLevel": "needs-practice|developing|strong|advanced",
  "canProceed": true,
  "readinessReason": "string",
  "nextStep": "continue|reattempt"
}
Rules:
- Score 0-100.
- If quiz score is low and behavior indicates weak comprehension, prefer reattempt.
- Keep readinessReason short and actionable.
No markdown.
`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        subject: course?.subject || "general",
                        videoTitle: videoDoc?.title || "",
                        quizPercentage: percentage,
                        engagement,
                        heuristic
                    })
                }
            ],
            response_format: { type: "json_object" }
        });

        const parsed = safeJsonParse(result?.text || "");
        if(!parsed){
            return heuristic;
        }

        const llmScore = Math.max(0, Math.min(100, parseInt(parsed?.comprehensionScore, 10) || heuristic.comprehensionScore));
        const llmSkill = `${parsed?.skillLevel || heuristic.skillLevel}`.trim().toLowerCase();
        const skillLevel = ["needs-practice", "developing", "strong", "advanced"].includes(llmSkill) ? llmSkill : heuristic.skillLevel;
        const canProceed = typeof parsed?.canProceed === "boolean" ? parsed.canProceed : heuristic.canProceed;
        const nextStep = `${parsed?.nextStep || (canProceed ? "continue" : "reattempt")}`.trim().toLowerCase() === "continue" ? "continue" : "reattempt";
        const readinessReason = `${parsed?.readinessReason || heuristic.readinessReason}`.trim() || heuristic.readinessReason;

        return {
            comprehensionScore: llmScore,
            skillLevel,
            canProceed: canProceed && llmScore >= 55,
            readinessReason,
            nextStep
        };
    } catch (error) {
        return heuristic;
    }
}

const getAdaptiveDifficulty = (latestAttempt = null) => {
    const score = latestAttempt?.percentage ?? null;
    if(score === null || score === undefined){
        return "medium";
    }
    if(score >= 85){
        return "hard";
    }
    if(score >= 60){
        return "medium";
    }
    return "easy";
}

const buildStartOfDay = (dateLike = new Date()) => {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
}

const formatSecondsLabel = (seconds = 0) => {
    const safe = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const updateSpacedReviewSchedule = async ({ owner, courseId, videoDoc, conceptBreakdown = [] }) => {
    const weakItems = conceptBreakdown.filter((item) => item.accuracy < 70);
    const strongItems = conceptBreakdown.filter((item) => item.accuracy >= 70);
    const dayOffsets = [1, 3, 7];
    const now = new Date();

    for(const weakItem of weakItems){
        const existing = await QuizReviewSchedule.findOne({
            owner,
            courseId,
            videoDbId: videoDoc._id,
            conceptTag: weakItem.key
        });

        const stage = existing ? Math.min(existing.stage, dayOffsets.length - 1) : 0;
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + dayOffsets[stage]);

        if(existing){
            existing.nextReviewAt = nextDate;
            existing.lastAccuracy = weakItem.accuracy;
            existing.completed = false;
            await existing.save();
        } else {
            await QuizReviewSchedule.create({
                owner,
                courseId,
                videoDbId: videoDoc._id,
                videoId: videoDoc.videoId,
                conceptTag: weakItem.key,
                stage,
                nextReviewAt: nextDate,
                lastAccuracy: weakItem.accuracy,
                completed: false
            });
        }
    }

    for(const strongItem of strongItems){
        const existing = await QuizReviewSchedule.findOne({
            owner,
            courseId,
            videoDbId: videoDoc._id,
            conceptTag: strongItem.key
        });

        if(!existing){
            continue;
        }

        const nextStage = existing.stage + 1;
        if(nextStage >= dayOffsets.length){
            existing.completed = true;
            existing.nextReviewAt = new Date(now);
            existing.lastAccuracy = strongItem.accuracy;
            await existing.save();
            continue;
        }

        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + dayOffsets[nextStage]);
        existing.stage = nextStage;
        existing.nextReviewAt = nextDate;
        existing.lastAccuracy = strongItem.accuracy;
        existing.completed = false;
        await existing.save();
    }
}

const buildRevisionClips = ({ questionReview = [], transcriptDoc = null, videoDoc = null }) => {
    const wrong = questionReview.filter((item) => !item.isCorrect);
    if(!wrong.length){
        return [];
    }

    const transcriptItems = transcriptDoc?.transcript || [];
    const usedConcepts = new Set();
    const clips = [];

    wrong.forEach((item) => {
        const concept = `${item.conceptTag || "general"}`.toLowerCase();
        if(usedConcepts.has(concept)){
            return;
        }
        usedConcepts.add(concept);

        let startSeconds = 0;
        let endSeconds = 90;
        const totalSeconds = parseIsoDurationToSeconds(videoDoc?.duration || "PT0S");
        if(Number.isInteger(item.sourceStartSeconds) && Number.isInteger(item.sourceEndSeconds) && item.sourceEndSeconds > item.sourceStartSeconds){
            startSeconds = Math.max(0, item.sourceStartSeconds);
            endSeconds = Math.max(startSeconds + 20, item.sourceEndSeconds);
        } else
        if(transcriptItems.length){
            const hit = transcriptItems.find((row) => `${row?.text || ""}`.toLowerCase().includes(concept));
            if(hit){
                startSeconds = Math.max(0, Math.floor((hit.offset || 0) - 20));
                endSeconds = Math.floor((hit.offset || 0) + 70);
            }
        } else {
            const hash = concept.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const anchor = totalSeconds ? hash % Math.max(totalSeconds, 1) : 0;
            startSeconds = Math.max(0, anchor - 25);
            endSeconds = totalSeconds ? Math.min(totalSeconds, anchor + 65) : anchor + 65;
        }
        if(totalSeconds > 0){
            startSeconds = Math.min(startSeconds, Math.max(0, totalSeconds - 20));
            endSeconds = Math.min(totalSeconds, Math.max(startSeconds + 20, endSeconds));
        }
        if(endSeconds - startSeconds > 120){
            endSeconds = startSeconds + 120;
        }

        clips.push({
            conceptTag: concept,
            startSeconds,
            endSeconds,
            label: `${formatSecondsLabel(startSeconds)} - ${formatSecondsLabel(endSeconds)}`,
            reason: `Revisit ${concept} due to wrong answer(s).`
        });
    });

    return clips.slice(0, 5);
}

const getYouTubeVideosMeta = async (videoIds = []) => {
    if(!videoIds.length){
        return [];
    }

    const chunks = [];
    for(let i = 0; i < videoIds.length; i += 50){
        chunks.push(videoIds.slice(i, i + 50));
    }

    const responses = await Promise.all(
        chunks.map((chunk) =>
            axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
                params: {
                    key: process.env.YT_API_KEY,
                    part: "snippet,contentDetails,statistics",
                    id: chunk.join(","),
                    maxResults: 50
                }
            })
        )
    );

    return responses.flatMap((res) => res?.data?.items || []);
}

const buildVideoDocFromYoutubeMeta = ({
    courseId,
    owner,
    item,
    personalization = {},
    knownTopics = [],
    moduleOverride = ""
}) => {
    const snippet = item?.snippet || {};
    const contentDetails = item?.contentDetails || {};
    const title = snippet?.title || "Untitled Video";
    const description = snippet?.description || "";
    const topicTags = extractTopicTags(title, description, knownTopics);
    const recommendation = buildRecommendation({
        topicTags,
        knownTopics,
        codingConfidence: personalization.codingConfidence,
        goalUrgency: personalization.goalUrgency,
        learningStyle: personalization.learningStyle
    });
    const moduleTitle = moduleOverride || (topicTags[0] ? `Module: ${topicTags[0].toUpperCase()}` : "Module: GENERAL");
    const durationIso = contentDetails?.duration || "PT0S";
    const durationMinutes = parseIsoDurationToMinutes(durationIso);

    return {
        playlist: courseId,
        title,
        description,
        channelId: snippet?.channelId || "",
        channelTitle: snippet?.channelTitle || "",
        thumbnail: snippet?.thumbnails?.maxres?.url || snippet?.thumbnails?.standard?.url || snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || "",
        videoId: item?.id || snippet?.resourceId?.videoId || "",
        duration: durationIso,
        progressTime: 0,
        totalDuration: 0,
        completed: false,
        owner,
        topicTags,
        recommendationAction: recommendation.action,
        recommendationReason: recommendation.reason,
        moduleTitle,
        priorityScore: Math.max(10, 100 - (durationMinutes * 2))
    };
}

const syncCourseLearningModules = async (courseId) => {
    const courseDoc = await Course.findById(courseId);
    if(!courseDoc){
        return [];
    }

    const videosAll = await Video.find({ playlist: courseId }).sort({ createdAt: 1 });
    if(!videosAll.length){
        await Course.findByIdAndUpdate(courseId, {
            videos: [],
            learningModules: [],
            totalVideos: 0
        });
        return [];
    }

    const planModules = await buildStructuredModulePlan({
        videoDocs: videosAll,
        subject: courseDoc.subject || "general",
        personalization: courseDoc.personalizationProfile || {}
    });

    const bulkOps = [];
    const normalizedModules = planModules.map((moduleItem, moduleOrder) => {
        const moduleTitle = sanitizeModuleTitle(moduleItem.title, `Module ${moduleOrder + 1}`);
        const moduleTopic = `${moduleItem.topic || "general"}`.trim().toLowerCase() || "general";
        const videoIds = [];
        let estimatedMinutes = 0;

        moduleItem.videoIndexes.forEach((videoIndex, position) => {
            const videoDoc = videosAll[videoIndex];
            if(!videoDoc){
                return;
            }
            videoIds.push(videoDoc._id);
            estimatedMinutes += parseIsoDurationToMinutes(videoDoc.duration);

            const nextTags = Array.from(new Set([moduleTopic, ...(videoDoc.topicTags || [])].filter(Boolean))).slice(0, 5);
            bulkOps.push({
                updateOne: {
                    filter: { _id: videoDoc._id },
                    update: {
                        moduleTitle,
                        moduleOrder,
                        modulePosition: position,
                        topicTags: nextTags,
                        priorityScore: Math.max(10, 100 - (moduleOrder * 8) - (position * 2))
                    }
                }
            });
        });

        return {
            title: moduleTitle,
            topic: moduleTopic,
            videos: videoIds,
            estimatedMinutes,
            milestone: moduleItem.milestone || `Complete ${moduleTitle} (${moduleOrder + 1}/${planModules.length})`
        };
    }).filter((item) => item.videos.length > 0);

    if(bulkOps.length){
        await Video.bulkWrite(bulkOps);
    }

    const orderedVideos = await Video.find({ playlist: courseId }).sort({
        moduleOrder: 1,
        modulePosition: 1,
        createdAt: 1
    }).select("_id");

    await Course.findByIdAndUpdate(courseId, {
        videos: orderedVideos.map((item) => item._id),
        learningModules: normalizedModules,
        totalVideos: orderedVideos.length
    });

    return normalizedModules;
}


export const courseController = async (req,res) => {
    try {
        const playlistID = getPlaylistIdFromUrl(req.body.url);
        if(!playlistID){
            return sendError(res, 400, "Invalid playlist URL");
        }
        const personalization = req.body.personalization || {};
        const knownTopics = normalizeTopics(personalization.knownTopics || []);
        const recommendedPace = buildPace(personalization);
        const subject = await resolveAutoSubjectForUser({
            owner: req.user.username,
            title: req.body.name || "",
            personalization,
            knownTopics
        });
        const checkArr = await Course.find({
            playlistId: playlistID,
            owner: req.user.username
        })

        if(checkArr.length===0){
            const courseData = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?key=${process.env.YT_API_KEY}&part=snippet&playlistId=${playlistID}&maxResults=50`);
            while(courseData?.data?.nextPageToken){
                let moreCourseData = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?key=${process.env.YT_API_KEY}&part=snippet&playlistId=${playlistID}&maxResults=50&pageToken=${courseData.data.nextPageToken}`);
                moreCourseData.data.items.map((vid,idx) => {
                    courseData.data.items.push(vid);
                });
                courseData.data.nextPageToken = moreCourseData?.data?.nextPageToken;
            };
            
            const ytVideoIds = courseData.data.items.map((vid,idx) => {
                return vid.snippet.resourceId.videoId
            })

            
            let chunkedYtVideos = [];
            let copy = [];
            for (let i = 0; i < ytVideoIds.length; i++) {
                if(copy.length === 50){
                    chunkedYtVideos.push(copy);
                    copy=[];
                    copy.push(ytVideoIds[i]);
                }
                else{
                    copy.push(ytVideoIds[i]);
                }
            }
            if (copy.length > 0) {
                chunkedYtVideos.push(copy);
            }
            
            const videoData = await axios.get(`https://www.googleapis.com/youtube/v3/videos?key=${process.env.YT_API_KEY}&part=contentDetails,statistics,status&id=${chunkedYtVideos[0].join()}&maxResults=50`);
            for(let i=1; i<chunkedYtVideos.length;i++){
                const ytString = chunkedYtVideos[i].join();
                const newVideoData = await axios.get(`https://www.googleapis.com/youtube/v3/videos?key=${process.env.YT_API_KEY}&part=contentDetails,statistics,status&id=${ytString}&maxResults=50`);
                newVideoData.data.items.map((vid,idx) => {
                    videoData.data.items.push(vid);
                });
            };
            // console.log(ytString)
            // while(courseData?.data?.nextPageToken){
            //     let moreCourseData = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?key=${process.env.YT_API_KEY}&part=snippet&playlistId=${playlistID}&maxResults=50&pageToken=${courseData.data.nextPageToken}`);
            //     moreCourseData.data.items.map((vid,idx) => {
            //         courseData.data.items.push(vid);
            //     });
            //     courseData.data.nextPageToken = moreCourseData?.data?.nextPageToken;
            // };
            const newCourse = new Course({
                title: req.body.name,
                playlistId: playlistID,
                totalVideos: courseData.data.items.filter((e) => e.snippet.title !== "Deleted video" && e.snippet.title !== "Private video").length,
                videos: [],
                owner: req.user.username,
                subject,
                thumbnail: courseData.data.items[0].snippet.thumbnails.maxres?.url || courseData.data.items[0].snippet.thumbnails.standard?.url || courseData.data.items[0].snippet.thumbnails.high?.url || courseData.data.items[0].snippet.thumbnails.default?.url,
                completedVideos: [-1],
                lastVideoPlayed: 0,
                recommendedPace,
                onboardingPath: req.body.onboardingPath || "direct",
                personalizationProfile: {
                    experienceLevel: personalization.experienceLevel || "",
                    timePerDay: personalization.timePerDay || "",
                    learningStyle: personalization.learningStyle || "",
                    goalUrgency: personalization.goalUrgency || "",
                    codingConfidence: personalization.codingConfidence || "",
                    priorExposure: personalization.priorExposure || "",
                    targetGoal: personalization.targetGoal || "",
                    knownTopics
                },
                learningModules: []
            })
            await newCourse.save();

            const videoArray = courseData.data.items.filter((e) => e.snippet.title !== "Deleted video" && e.snippet.title !== "Private video").map((vid,idx) => { //array of vid objects
                const title = vid.snippet.title ?? "No title";
                const description = vid.snippet.description ?? "No description";
                const topicTags = extractTopicTags(title, description, knownTopics);
                const recommendation = buildRecommendation({
                    topicTags,
                    knownTopics,
                    codingConfidence: personalization.codingConfidence,
                    goalUrgency: personalization.goalUrgency,
                    learningStyle: personalization.learningStyle
                });
                const moduleTitle = topicTags[0] ? `Module: ${topicTags[0].toUpperCase()}` : "Module: GENERAL";
                const durationIso = videoData.data?.items?.[idx]?.contentDetails?.duration ?? "PT0S";
                const durationMinutes = parseIsoDurationToMinutes(durationIso);

                return {
                    playlist: newCourse._id,
                    title,
                    description,
                    channelId:vid.snippet.channelId,
                    channelTitle:vid.snippet.channelTitle,
                    thumbnail:vid.snippet.thumbnails.maxres?.url || vid.snippet.thumbnails.standard?.url || vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.default?.url,
                    //maxres wasnt available in some vids so set OR
                    videoId:vid.snippet.resourceId.videoId,
                    duration: durationIso,
                    progressTime: 0,
                    totalDuration: 0,
                    completed: false,
                    owner: req.user.username,
                    topicTags,
                    recommendationAction: recommendation.action,
                    recommendationReason: recommendation.reason,
                    moduleTitle,
                    priorityScore: Math.max(10, 100 - (durationMinutes * 2))
                }
            })

            await Video.insertMany(videoArray)
            const modules = await syncCourseLearningModules(newCourse._id);

            return sendSuccess(res, 201, "Course created successfully", {
                courseId: newCourse._id,
                modulesCount: modules.length
            });
        }
        else{
            console.log("Course not created: Already Exists");
            return sendError(res, 409, "Already Exists");
        }

    } catch (error) {
        console.log("error: ",error)
        return sendError(res, 500, "Error occured", error.message)
    }
}

export const createCustomCourseController = async (req, res) => {
    try {
        const {
            name = "",
            videoUrls = [],
            personalization = {},
            onboardingPath = "direct"
        } = req.body;

        if(!name.trim()){
            return sendError(res, 400, "Course title is required");
        }
        if(!Array.isArray(videoUrls) || videoUrls.length === 0){
            return sendError(res, 400, "At least one YouTube video URL is required");
        }
        if(!process.env.YT_API_KEY){
            return sendError(res, 500, "YouTube API key is missing");
        }

        const extractedVideoIds = Array.from(new Set(
            videoUrls.map((url) => extractYoutubeVideoId(url)).filter(Boolean)
        ));
        if(extractedVideoIds.length === 0){
            return sendError(res, 400, "No valid YouTube video URLs were provided");
        }

        const knownTopics = normalizeTopics(personalization.knownTopics || []);
        const recommendedPace = buildPace(personalization);
        const subject = await resolveAutoSubjectForUser({
            owner: req.user.username,
            title: name || "",
            personalization,
            knownTopics
        });
        const videosMeta = await getYouTubeVideosMeta(extractedVideoIds);

        if(!videosMeta.length){
            return sendError(res, 404, "Could not fetch metadata for provided videos");
        }

        const validVideosMeta = videosMeta.filter((item) => (item?.contentDetails?.duration || "PT0S") !== "PT0S");
        if(!validVideosMeta.length){
            return sendError(res, 400, "No playable videos found in provided URLs");
        }

        const fallbackThumbnail = validVideosMeta?.[0]?.snippet?.thumbnails?.high?.url || validVideosMeta?.[0]?.snippet?.thumbnails?.default?.url || "";
        const uniquePlaylistId = `custom_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        const newCourse = new Course({
            title: name,
            playlistId: uniquePlaylistId,
            totalVideos: validVideosMeta.length,
            videos: [],
            owner: req.user.username,
            subject,
            thumbnail: fallbackThumbnail,
            completedVideos: [-1],
            lastVideoPlayed: 0,
            recommendedPace,
            onboardingPath,
            personalizationProfile: {
                experienceLevel: personalization.experienceLevel || "",
                timePerDay: personalization.timePerDay || "",
                learningStyle: personalization.learningStyle || "",
                goalUrgency: personalization.goalUrgency || "",
                codingConfidence: personalization.codingConfidence || "",
                priorExposure: personalization.priorExposure || "",
                targetGoal: personalization.targetGoal || "",
                knownTopics
            },
            learningModules: []
        });
        await newCourse.save();

        const customVideos = validVideosMeta.map((item) => buildVideoDocFromYoutubeMeta({
            courseId: newCourse._id,
            owner: req.user.username,
            item,
            personalization,
            knownTopics
        }));

        await Video.insertMany(customVideos);
        const modules = await syncCourseLearningModules(newCourse._id);

        return sendSuccess(res, 201, "Custom course created successfully", {
            courseId: newCourse._id,
            modulesCount: modules.length
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to create custom course", error.message);
    }
}

export const addVideosToCourseController = async (req, res) => {
    try {
        const { courseId = "", videoUrls = [] } = req.body;

        if(!courseId){
            return sendError(res, 400, "Course ID is required");
        }
        if(!Array.isArray(videoUrls) || videoUrls.length === 0){
            return sendError(res, 400, "At least one YouTube video URL is required");
        }
        if(!process.env.YT_API_KEY){
            return sendError(res, 500, "YouTube API key is missing");
        }

        const course = await Course.findOne({ _id: courseId, owner: req.user.username });
        if(!course){
            return sendError(res, 404, "Course not found");
        }

        const userDoc = await User.findById(req.user.id).select("courseDailyProgress heatmapActivity");
        const userDailyProgress = userDoc?.courseDailyProgress || [];
        const userHeatmap = userDoc?.heatmapActivity || [];

        const extractedVideoIds = Array.from(new Set(
            videoUrls.map((url) => extractYoutubeVideoId(url)).filter(Boolean)
        ));
        if(extractedVideoIds.length === 0){
            return sendError(res, 400, "No valid YouTube video URLs were provided");
        }

        const existingVideos = await Video.find({
            playlist: courseId,
            videoId: { $in: extractedVideoIds }
        }).select("videoId");
        const existingSet = new Set(existingVideos.map((item) => item.videoId));
        const uniqueNewVideoIds = extractedVideoIds.filter((videoId) => !existingSet.has(videoId));
        if(uniqueNewVideoIds.length === 0){
            return sendError(res, 409, "All provided videos already exist in this course");
        }

        const videosMeta = await getYouTubeVideosMeta(uniqueNewVideoIds);
        const knownTopics = normalizeTopics(course?.personalizationProfile?.knownTopics || []);

        const validVideosMeta = videosMeta.filter((item) => (item?.contentDetails?.duration || "PT0S") !== "PT0S");
        if(!validVideosMeta.length){
            return sendError(res, 400, "No playable videos found in provided URLs");
        }

        const newVideoDocs = validVideosMeta.map((item) => buildVideoDocFromYoutubeMeta({
            courseId: course._id,
            owner: req.user.username,
            item,
            personalization: course.personalizationProfile || {},
            knownTopics
        }));

        const inserted = await Video.insertMany(newVideoDocs);
        const modules = await syncCourseLearningModules(course._id);

        return sendSuccess(res, 201, "Videos added to course successfully", {
            addedCount: inserted.length,
            modulesCount: modules.length
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to add videos to course", error.message);
    }
}

export const getCourse =  async (req,res) => {
    try {
        const courses = await Course.find({
            owner: req.user.username
        })
        return sendSuccess(res, 200, "Courses fetched successfully", courses)
    } catch (error) {
        console.log(error)
        return sendError(res, 500, "Failed to fetch courses", error.message)
    }
}
export const getSingleCourse =  async (req,res) => {
    try {
        const course = await Course.findOne({
            _id: req.params.id,
            owner: req.user.username
        })

        if(!course){
            return sendError(res, 404, "No course found")
        }

        return sendSuccess(res, 200, "Course fetched successfully", course)
    } catch (error) {
        console.log(error)
        return sendError(res, 500, "Failed to fetch course", error.message)
    }
}

export const getVideo =  async (req,res) => {
    try {
        const {videoId} = req.body;
        const video =  await Video.findOne({
            videoId,
            owner: req.user.username
        });

        if(!video){
            return sendError(res, 404, "No video found");
        }

        return sendSuccess(res, 200, "Video fetched successfully", video);
        
    } catch (error) {
        console.log(error)
        return sendError(res, 500, "Failed to fetch video", error.message)
    }
}

export const getCourseData = async(req,res) => {

    try {
        let courses = await Video.find({
            playlist: req.params.id,
            owner: req.user.username
        }).sort({ moduleOrder: 1, modulePosition: 1, createdAt: 1 })

        const requiresRestructure = courses.some((item) => item.moduleOrder === 999 || !item.moduleTitle);
        if(requiresRestructure){
            await syncCourseLearningModules(req.params.id);
            courses = await Video.find({
                playlist: req.params.id,
                owner: req.user.username
            }).sort({ moduleOrder: 1, modulePosition: 1, createdAt: 1 })
        }
        return sendSuccess(res, 200, "Course data fetched successfully", courses)
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to fetch course data", error.message)
    }

}

export const updateCoursePlan = async (req,res) => {
    try {
        const { courseId = "", targetEndDate = null, dailyStudyHoursGoal = null, dailyVideosGoal = null, weeklyCommitDays = null } = req.body;
        if(!courseId){
            return sendError(res, 400, "courseId is required");
        }

        const update = {};
        if(targetEndDate){
            const parsed = new Date(targetEndDate);
            if(Number.isNaN(parsed.getTime())){
                return sendError(res, 400, "Invalid targetEndDate");
            }
            update.targetEndDate = parsed;
        } else {
            update.targetEndDate = null;
        }

        if(dailyStudyHoursGoal !== null && dailyStudyHoursGoal !== undefined && `${dailyStudyHoursGoal}` !== ""){
            const parsedHours = Number(dailyStudyHoursGoal);
            if(Number.isNaN(parsedHours) || parsedHours < 0 || parsedHours > 12){
                return sendError(res, 400, "Invalid dailyStudyHoursGoal");
            }
            update.dailyStudyHoursGoal = Number(parsedHours.toFixed(2));
        }

        if(dailyVideosGoal !== null && dailyVideosGoal !== undefined && `${dailyVideosGoal}` !== ""){
            const parsedVideos = Number(dailyVideosGoal);
            if(Number.isNaN(parsedVideos) || parsedVideos < 0 || parsedVideos > 25){
                return sendError(res, 400, "Invalid dailyVideosGoal");
            }
            update.dailyVideosGoal = Math.floor(parsedVideos);
        }

        if(weeklyCommitDays !== null && weeklyCommitDays !== undefined && `${weeklyCommitDays}` !== ""){
            const parsedDays = Number(weeklyCommitDays);
            if(Number.isNaN(parsedDays) || parsedDays < 1 || parsedDays > 7){
                return sendError(res, 400, "Invalid weeklyCommitDays");
            }
            update.weeklyCommitDays = Math.floor(parsedDays);
        }

        const updated = await Course.findOneAndUpdate({
            _id: courseId,
            owner: req.user.username
        }, update, { new: true });

        if(!updated){
            return sendError(res, 404, "Course not found");
        }

        return sendSuccess(res, 200, "Course plan updated successfully", {
            courseId: updated._id,
            targetEndDate: updated.targetEndDate,
            dailyStudyHoursGoal: updated.dailyStudyHoursGoal || 0,
            dailyVideosGoal: updated.dailyVideosGoal || 0,
            weeklyCommitDays: updated.weeklyCommitDays || 5
        });
    } catch (error) {
        console.error("Course Plan Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getCourseProgressInsights = async (req,res) => {
    try {
        const { id } = req.params;
        const course = await Course.findOne({
            _id: id,
            owner: req.user.username
        });

        if(!course){
            return sendError(res, 404, "Course not found");
        }

        const user = await User.findById(req.user.id).select("courseDailyProgress");
        const videos = await Video.find({
            playlist: id,
            owner: req.user.username
        });
        const userDailyProgress = Array.isArray(user?.courseDailyProgress) ? user.courseDailyProgress : [];
        const totalVideosCount = videos.length;
        const completedVideosCount = videos.filter((item) => item.completed === true).length;
        const remainingVideosCount = Math.max(0, totalVideosCount - completedVideosCount);
        const percentageCompleted = totalVideosCount ? Math.round((completedVideosCount / totalVideosCount) * 100) : 0;
        const remainingPercentage = Math.max(0, 100 - percentageCompleted);

        const todayKey = getDateKeyUTC(new Date());
        const todayEntry = userDailyProgress.find(
            (item) => item.date === todayKey && `${item.courseId}` === `${id}`
        );
        const actualCompletedVideosToday = todayEntry?.completedVideos || 0;

        const urgencyRaw = `${course?.personalizationProfile?.goalUrgency || ""}`.toLowerCase();
        const timePerDayRaw = parseDailyHoursFromText(course?.personalizationProfile?.timePerDay || "");
        const confidenceRaw = Number(course?.personalizationProfile?.codingConfidence || 0);
        const levelText = `${course?.personalizationProfile?.experienceLevel || ""} ${course?.personalizationProfile?.priorExposure || ""}`.toLowerCase();
        const inferredLevel = levelText.includes("advanced") || confidenceRaw >= 4
            ? "advanced"
            : (levelText.includes("intermediate") || confidenceRaw >= 3 ? "intermediate" : "beginner");

        let baseDailyVideos = inferredLevel === "advanced" ? 3 : inferredLevel === "intermediate" ? 2 : 1;
        if(urgencyRaw.includes("high")){
            baseDailyVideos += 1;
        }
        if(urgencyRaw.includes("low")){
            baseDailyVideos -= 1;
        }
        if(timePerDayRaw >= 2.5){
            baseDailyVideos += 1;
        } else if(timePerDayRaw > 0 && timePerDayRaw < 0.75){
            baseDailyVideos -= 1;
        }
        if(Number.isInteger(course?.dailyVideosGoal) && course.dailyVideosGoal > 0){
            baseDailyVideos = course.dailyVideosGoal;
        }
        const recommendedDailyVideos = remainingVideosCount > 0
            ? Math.max(1, Math.min(6, baseDailyVideos))
            : 0;
        const todaysGoalVideos = remainingVideosCount > 0
            ? Math.min(remainingVideosCount, recommendedDailyVideos)
            : 0;
        const todaysVideosProgress = todaysGoalVideos > 0
            ? Math.min(100, Math.floor((actualCompletedVideosToday / todaysGoalVideos) * 100))
            : 100;

        const courseHistory = userDailyProgress
            .filter((item) => `${item.courseId}` === `${id}` && item?.date)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        const todayStart = toStartOfDay(new Date());
        const lookbackStart = new Date(todayStart);
        lookbackStart.setDate(lookbackStart.getDate() - 13);
        const historyWindow = courseHistory.filter((item) => {
            const dateObj = toStartOfDay(item.date);
            return dateObj >= lookbackStart && dateObj <= todayStart;
        });
        const totalWindowVideos = historyWindow.reduce((acc, item) => acc + (item?.completedVideos || 0), 0);
        const activeWindowDays = historyWindow.filter((item) => (item?.completedVideos || 0) > 0).length;
        const calendarWindowDays = 14;
        const avgByCalendarDay = totalWindowVideos / calendarWindowDays;
        const avgByActiveDay = activeWindowDays ? (totalWindowVideos / activeWindowDays) : 0;
        const observedDailyRate = Math.max(
            0,
            Number(((avgByCalendarDay * 0.7) + (avgByActiveDay * 0.3)).toFixed(2))
        );

        const effectiveDailyRate = Math.max(
            0.5,
            Number(Math.max(recommendedDailyVideos, observedDailyRate).toFixed(2))
        );
        const weeklyCommitDays = Math.max(1, Math.min(7, parseInt(course?.weeklyCommitDays || 7, 10) || 7));
        const commitFactor = 7 / weeklyCommitDays;
        const projectedDays = remainingVideosCount > 0
            ? Math.max(1, Math.ceil((remainingVideosCount / effectiveDailyRate) * commitFactor))
            : 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const projectedEndDate = new Date(today);
        projectedEndDate.setDate(projectedEndDate.getDate() + Math.max(0, projectedDays - 1));

        return sendSuccess(res, 200, "Course progress insights fetched successfully", {
            courseId: course._id,
            targetEndDate: projectedEndDate,
            percentageCompleted,
            remainingPercentage,
            totalVideosCount,
            completedVideosCount,
            remainingVideosCount,
            recommendedDailyVideos,
            effectiveDailyRate,
            observedDailyRate,
            activeDaysLast14: activeWindowDays,
            daysToTarget: projectedDays,
            todaysGoalVideos,
            todaysCompletedVideos: actualCompletedVideosToday,
            todaysVideosProgress,
            learnerLevel: inferredLevel
        });
    } catch (error) {
        console.error("Course Progress Insights Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getAi = async (req,res) => {
    try {
        const { messages = [], videoId, start, end, currentQues, title, description } = req.body;
        const transcriptDoc = await ensureTranscriptDoc(videoId);
        const rawTranscript = transcriptDoc?.transcript || [];
        const userQuestion = `${currentQues?.content || messages?.[messages.length - 1]?.content || ""}`.trim();
        const ragStatus = {
            enabled: getPineconeConfig().isEnabled,
            indexed: false,
            retrievedChunks: 0,
            fallbackReason: ""
        };

        const ownerVideoDoc = await Video.findOne({
            videoId,
            owner: req.user.username
        }).sort({ createdAt: -1 });

        let ragContext = [];
        const ragIndexed = Boolean(transcriptDoc?.rag?.indexedAt);
        if(ownerVideoDoc && transcriptDoc && ragIndexed){
            try {
                ragStatus.indexed = true;
                const matches = await queryPineconeChunks({
                    text: [userQuestion, title, description].filter(Boolean).join(" "),
                    videoId: ownerVideoDoc.videoId,
                    courseId: ownerVideoDoc.playlist,
                    topK: 8,
                    startSeconds: Number.isFinite(start) ? start : null,
                    endSeconds: Number.isFinite(end) ? end : null
                });
                ragContext = matches.map((item) => `[${item.startSeconds}s-${item.endSeconds}s] ${item.text}`);
                ragStatus.retrievedChunks = matches.length;
            } catch (error) {
                ragContext = [];
                ragStatus.fallbackReason = error?.message || "rag-fallback";
                logRagEvent("ai_rag_error", {
                    videoId: `${videoId || ""}`,
                    status: error?.response?.status || "",
                    detail: error?.response?.data || {},
                    message: error?.message || ""
                });
            }
        } else if(ownerVideoDoc && transcriptDoc){
            ragStatus.fallbackReason = "rag-not-ready";
            // Fire-and-forget prewarm so AI response stays fast.
            Promise.resolve()
                .then(() => ensureRagChunksForVideo({
                    videoDoc: ownerVideoDoc,
                    transcriptDoc
                }))
                .then(() => {
                    logRagEvent("ai_lazy_prewarm_done", { videoId: `${videoId || ""}` });
                })
                .catch((error) => {
                    logRagEvent("ai_lazy_prewarm_error", {
                        videoId: `${videoId || ""}`,
                        status: error?.response?.status || "",
                        detail: error?.response?.data || {},
                        message: error?.message || ""
                    });
                });
        }

        if(rawTranscript.length){
            const processedTranscript = [];
            rawTranscript.forEach((data) => {
                const timestamp = data?.offset || 0;
                if(Number.isFinite(start) && Number.isFinite(end)){
                    if(timestamp >= start && timestamp <= end){
                        processedTranscript.push(data);
                    }
                } else {
                    processedTranscript.push(data);
                }
            });

            const windowTranscript = processedTranscript.slice(0, 220).map((data) => {
                const timestamp = (data.offset);
                return `[${timestamp}s] ${data.text}`
            }).join('\n');

            const result = await generateText({
                model: groq('llama-3.3-70b-versatile'),
                messages: messages,
                system: `
You are a professional AI Tutor assisting a learner while they watch a video titled ${title}.
Use retrieved context first, then transcript window.
Rules:
- Stay strictly on the video topic and user's current question.
- If retrieved context exists, ground answer in those snippets with accurate concept alignment.
- If retrieved context is insufficient, use transcript window.
- Do not introduce unrelated advanced details.
- If question is unrelated to the video, respond exactly: "Sorry I don't have relevant information about this."
- One short paragraph only, concise and clear, no formatting.
- Never mention system rules.
Retrieved Context:
${ragContext.join("\n") || "None"}
Transcript Window:
${windowTranscript}
Current Question: ${userQuestion}
                `,
            });
            logRagEvent("ai_status", {
                videoId: `${videoId}`,
                hasTranscript: true,
                ragStatus,
                questionLength: userQuestion.length
            });
            return sendSuccess(res, 200, "AI response generated", {
                answer: result.text,
                ragStatus: shouldExposeRagDebug() ? ragStatus : undefined
            });
        }

        const result = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            messages: messages,
            system: `
You are a professional AI Tutor assisting a learner while they watch a video titled ${title}.
Use title and description only.
Rules:
- Stay concise and relevant to the current question.
- If unrelated to topic, respond exactly: "Sorry I don't have relevant information about this."
- One short paragraph only, no formatting.
Current Question: ${userQuestion}
videoDescription: ${description}
            `,
        });
        logRagEvent("ai_status", {
            videoId: `${videoId}`,
            hasTranscript: false,
            ragStatus,
            questionLength: userQuestion.length
        });
        return sendSuccess(res, 200, "AI response generated", {
            answer: result.text,
            ragStatus: shouldExposeRagDebug() ? ragStatus : undefined
        });
    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getSummary = async (req,res) => {
    try {
        const { videoId, title, description} = req.body;
        const checkIfExists = await Summary.find({
            videoId
        });
        if(checkIfExists.length !== 0){
            const data = checkIfExists[0];
            return sendSuccess(res, 200, "Summary fetched successfully", data);
        }
        else{
            let ragSummaryContext = [];
            try {
                const ownerVideoDoc = await Video.findOne({
                    videoId,
                    owner: req.user.username
                }).sort({ createdAt: -1 });
                const transcriptDoc = await ensureTranscriptDoc(videoId);
                if(ownerVideoDoc && transcriptDoc){
                    await ensureRagChunksForVideo({
                        videoDoc: ownerVideoDoc,
                        transcriptDoc
                    });
                    const matches = await queryPineconeChunks({
                        text: [title, description, "summary key concepts"].filter(Boolean).join(" "),
                        videoId: ownerVideoDoc.videoId,
                        courseId: ownerVideoDoc.playlist,
                        topK: 10
                    });
                    ragSummaryContext = matches.map((item) => `[${item.startSeconds}s-${item.endSeconds}s] ${item.text}`);
                }
            } catch (error) {
                ragSummaryContext = [];
            }

            const result = await generateText({
            model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
            temperature: 0,
            messages: [
                { role: "system", content: `
            **Role:** You are an expert Academic Note-Taker and Curriculum Developer. Your task is to generate **complete, detailed, and structured study notes** based *only* on the provided Video Title and Video Description.
            ## Core Instructions
            ### 1. Noise Filtration (Strict)
            - **DISCARD:** All promotional text, subscription requests, social media links, sponsorships, merchandise plugs, affiliate links, and generic channel introductions.
            - **KEEP:** Educational content, timestamps, chapter markers, and topic outlines provided by the creator.
            ### 2. Content Expansion (Sparse Data Rule)
            - Video descriptions may be incomplete or uninformative.
            - If the description lacks sufficient educational detail, **use the Video Title as the primary source of truth**.
            - Generate comprehensive, textbook-quality explanations using your internal knowledge of the topic.
            - Ensure all content is **strictly relevant** to the topic mentioned in the title.
            - If retrieved transcript context exists, prioritize it as the factual source.
            ### 3. Standalone Notes Rule
            - Do **NOT** reference the video, instructor, speaker, or phrases like *"in this video"*.
            - Write the notes as **independent academic material**, suitable for revision and exam preparation.
            ### 4. Formatting Rules (Strict Markdown)
            - **NO HTML:** Do not use any HTML tags.
            - **Headings:** Use ## for main sections and ### for subsections. Do NOT use #.
            - **Styling:**  
            - **Bold** → keywords  
            - *Italics* → definitions  
            - **Code:** Use fenced code blocks with language identifiers.
            - **Lists:**  
            - - for bullet points  
            -1. for ordered steps  
            - **Tables:** Use GitHub-Flavored Markdown tables where comparisons are useful.
            ### 5. Depth Requirement
            - The notes should be **detailed and explanatory**, not a brief summary.
            - Aim for clarity, completeness, and conceptual depth.

            ## Target Output Structure

            ## Introduction
            A concise overview of the topic and key learning outcomes.

            ## Core Concepts
            - **[Concept Name]:** Detailed explanation.
            - **[Concept Name]:** Detailed explanation.

            ## Implementation & Examples
            *(If the topic is technical or coding related)*

            // meaningful, well-commented example relevant to the topic

            Here are the title and descriptions of the video for you to reference to-
            videoTitle: ${title},
            videoDescriptions: ${description},
            retrievedContext: ${ragSummaryContext.join("\n") || "none"}
            `},
                { role: "user", content: "generate summary" }
            ],
            });
            const newSummary = new Summary({
                videoId,
                summary: result.text
            });
            await newSummary.save();
            return sendSuccess(res, 201, "Summary generated successfully", newSummary);
        }
        //     rawTranscript = await fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`);
        //     const newAddTs = new Transcript({
        //         videoId,
        //         transcript: rawTranscript
        //     });
        //     await newAddTs.save();
        // }
        // else{
        //     rawTranscript = checkIfExists[0].transcript;
        // }

        // const transcript = rawTranscript.map((data) => {
        //     const timestamp = (data.offset);
        //     return `[${timestamp}s] ${data.text}`
        // }).join('\n');

        

        // res.send(newTranscript);

        // const userQuery = messages[messages.length - 1].content;

        // const answer = await askWithContext(transcript, userQuery, videoId);
        
        // res.status(200).send((result.text));
       
        // res.send(transcript);
        

    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }

    // const response = await generateText({
    // model: groq('llama-3.1-8b-instant'),
    // prompt: `heres the transcripts : ${transcript}, now can u answer ques based ion this video? 
    // Ques : I dont understand what he taught at 475s `,
    // });

    // res.send(response.text);

    // gemini
    // const ai = new GoogleGenAI({
    //     apiKey: process.env.GEMINI_API_KEY
    // });
    // const response = await ai.models.generateContent({
    //     model: "gemini-2.5-flash",
    //     contents: "Here is a video link: https://www.youtube.com/watch?v=IBrmsyy9R94&pp=ygUYbGF6eSBsb2FkaW5nIGluIHJlYWN0IGpz,  Now can you see/learn/know what is inside the videoa and answer questions based on the video if asked? ",
    // });
    // res.send(response.text);
}
export const getRecommendedProblems = async (req,res) => {
    try {
        const { videoId, title, description} = req.body;
        const checkIfExists = await Problems.find({
            videoId
        });
        // let rawTranscript;
        if(checkIfExists.length !== 0){
            const data = checkIfExists[0];
            return sendSuccess(res, 200, "Problems fetched successfully", data);
        }
        else{
            let ragProblemContext = [];
            try {
                const ownerVideoDoc = await Video.findOne({
                    videoId,
                    owner: req.user.username
                }).sort({ createdAt: -1 });
                const transcriptDoc = await ensureTranscriptDoc(videoId);
                if(ownerVideoDoc && transcriptDoc){
                    await ensureRagChunksForVideo({
                        videoDoc: ownerVideoDoc,
                        transcriptDoc
                    });
                    const matches = await queryPineconeChunks({
                        text: [title, description, "coding problems dsa topics"].filter(Boolean).join(" "),
                        videoId: ownerVideoDoc.videoId,
                        courseId: ownerVideoDoc.playlist,
                        topK: 10
                    });
                    ragProblemContext = matches.map((item) => `[${item.startSeconds}s-${item.endSeconds}s] ${item.text}`);
                }
            } catch (error) {
                ragProblemContext = [];
            }

            const result = await generateText({
            model: groq('groq/compound'),
            temperature: 0,
            messages: [
                { role: "system", content: `
            You are an automated curriculum engine acting as a strict JSON API endpoint. 
            Your goal is to map educational video content to relevant competitive programming/ normal coding problems (DSA).
            INPUT CONTEXT:
            You will be provided with a Video Title and Description.
            YOUR PROTOCOL:
            1. ANALYZE RELEVANCE (The Gatekeeper):
            - Determine if the content covers specific **Data Structures, Algorithms, or Computational Logic or Basic Normal Coding i.e they cover algorithmic concepts (Loops, Patterns, Arrays)** (e.g., Arrays, Recursion, DP, Graphs, Bit Manipulation).
            - STRICT EXCLUSION: If the video is about Web Development (React, CSS), System Design, DevOps, or General Tech News, it is NOT relevant.
            - SOURCE OF TRUTH (CRITICAL):
            - **Focus STRICTLY** on the educational content taught in the video.
            - If retrieved transcript context is available, use it as the primary source.
            - **Look for TIMESTAMPS/CHAPTERS** in the Description (e.g., "05:30 Binary Search", "10:00 Recursion") as the primary signal for what is taught.
            - **IGNORE** promotional text, social media links, "About me" sections, or generic channel descriptions. 
            - If a topic is mentioned in the description but NOT covered in the transcript/chapters, DO NOT include it.

            - EXCEPTION: "Complete Courses" (e.g., "Java Full Course") are relevant IF they cover algorithmic concepts (Loops, Patterns, Arrays).
            - Provide Questions for python/sql/ai-ml related content also using kaggle etc.
            2. TOPIC SEGMENTATION:
            - If the video covers multiple distinct topics (e.g. "Arrays and Linked Lists"), create SEPARATE objects for each topic in the output array.
            - Do not lump them into one topic like "Arrays & Linked Lists".
            - All problems related to the same topic should come under one object only, for example if topic is selection sort then the object having the opic selection sort should have all problems related to it rather than having 2 objects having the same topic.
            3. EXTRACTION:
            - For each identified topic, find **3 distinct practice problems** from LeetCode or GeeksForGeeks (GFG) or Codechef or Codeforces or HackerRank or Kaggle etc......
            - Ensure URLs are valid and canonical.
            - REVERIFY ALL URLs AND STRICTLY ENSURE THEY ARE VALID AND OPEN THE PROBLEM NOT THE 404 PAGE
            4. OUTPUT FORMAT (Strict JSON):
            - You must return a root object containing a list named "data" and a boolean "relevant" which should be true if video is relevant and you have found problems else it should be false.
            - NO markdown formatting (no \`\`\`json).
            - NO conversational text.
            - STRICTLY FOLLOW THE JSON SCHEMA
            TARGET JSON SCHEMA:
            {
            "relevant": true,
            "data": [
                {
                
                "topic": "Name of Specific Topic (e.g. Binary Search)",
                "problems": [
                    {
                    "title": "Problem Title",
                    "platform": "LeetCode" | "GeeksForGeeks",
                    "link": "Valid URL",
                    "difficulty": "Easy" | "Medium" | "Hard",
                    "tags": ["Tag1", "Tag2"]
                    }
                ]
                }
            ]
            }
            EDGE CASE - NOT RELEVANT:
            If the video is not about DSA/Algorithms, return exactly:
            {
            "relevant": false,
            "data": [
                {
                "topic": null,
                "problems": []
                }
            ]
            }
            --AGAIN DO NOT SEND ANYTHING ELSE EXCEPT THE JSON SCHEMA I TOLD YOU TO SEND
            `},
                { role: "user", content: JSON.stringify({
                    videoTitle: title,
                    videoDescription: description,
                    retrievedContext: ragProblemContext
                }) }
            ],
            response_format: { type: "json_object" }
            });

            // this result can still contain text so adding (so it doesnt fail) a manual parser - 
            const cleanAndParseJSON = (text) => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            return JSON.parse(jsonMatch[0]);
                        } catch (innerErr) {
                            console.error("Regex extraction failed:", innerErr);
                        }
                    }
                    return { 
                        relevant: false, 
                        data: [] 
                    };
                }
            };

            const checkedData = cleanAndParseJSON(result.text);
            const newProblems = new Problems({
                videoId,
                relevant: checkedData.relevant,
                problemsList: checkedData.data
            });
            await newProblems.save();
            return sendSuccess(res, 201, "Problems generated successfully", newProblems);
        }
        //     rawTranscript = await fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`);
        //     const newAddTs = new Transcript({
        //         videoId,
        //         transcript: rawTranscript
        //     });
        //     await newAddTs.save();
        // }
        // else{
        //     rawTranscript = checkIfExists[0].transcript;
        // }

        // const transcript = rawTranscript.map((data) => {
        //     const timestamp = (data.offset);
        //     return `[${timestamp}s] ${data.text}`
        // }).join('\n');

        

        // res.send(newTranscript);

        // const userQuery = messages[messages.length - 1].content;

        // const answer = await askWithContext(transcript, userQuery, videoId);
        
        // res.status(200).send((result.text));
       
        // res.send(transcript);
        

    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }

    // const response = await generateText({
    // model: groq('llama-3.1-8b-instant'),
    // prompt: `heres the transcripts : ${transcript}, now can u answer ques based ion this video? 
    // Ques : I dont understand what he taught at 475s `,
    // });

    // res.send(response.text);

    // gemini
    // const ai = new GoogleGenAI({
    //     apiKey: process.env.GEMINI_API_KEY
    // });
    // const response = await ai.models.generateContent({
    //     model: "gemini-2.5-flash",
    //     contents: "Here is a video link: https://www.youtube.com/watch?v=IBrmsyy9R94&pp=ygUYbGF6eSBsb2FkaW5nIGluIHJlYWN0IGpz,  Now can you see/learn/know what is inside the videoa and answer questions based on the video if asked? ",
    // });
    // res.send(response.text);
}

export const updateCourseProgess = async (req,res) => {
    try {
        const {completed_videos, last_video_played, completedVideos, lastVideoPlayed, courseId} = req.body;
        
        const newUpdatedCourse = await Course.findOneAndUpdate({
            _id: courseId,
            owner: req.user.username
        }, {
            completedVideos: completed_videos ?? completedVideos,
            lastVideoPlayed: last_video_played ?? lastVideoPlayed,
        });

        if(!newUpdatedCourse){
            return sendError(res, 403, "Course not found or unauthorized");
        }

        return sendSuccess(res, 200, "Course Progress Updated Successfully")
        // console.log("Course Progress Updated Successfully")

    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}
export const updateVideoProgess = async (req,res) => {
    try {
        const {progress_time, duration, completed, videoId, progressTime, totalDuration} = req.body;
        const completedIncoming = completed === true;
        const newUpdatedVideo = await Video.findOneAndUpdate({
            _id: videoId,
            owner: req.user.username
        }, {
            progressTime: progress_time ?? progressTime,
            totalDuration: duration ?? totalDuration,
            completed: completed
        });

        if(!newUpdatedVideo){
            return sendError(res, 403, "Video not found or unauthorized");
        }

        if(!newUpdatedVideo.completed && completedIncoming){
            const completedMinutes = Math.max(
                1,
                Math.ceil(((duration ?? totalDuration ?? newUpdatedVideo.totalDuration) || 0) / 60)
            );
            await upsertUserDailyActivity({
                userId: req.user._id,
                courseId: newUpdatedVideo.playlist,
                completedMinutes
            });
        }

        return sendSuccess(res, 200, "Video Progress Updated Successfully")
                // console.log("Video Progress Updated Successfully")


    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const updateVideoNotes = async (req,res) => {
    try {
        const {newNote, videoId} = req.body;
        const existingVideo = await Video.findOne({
            _id: videoId,
            owner: req.user.username
        });

        if(!existingVideo){
            return sendError(res, 403, "Video not found or unauthorized");
        }

        const notePayload = {
            videoId: existingVideo._id,
            timestamp: Math.max(0, parseInt(newNote?.timestamp || 0, 10) || 0),
            notesContent: `${newNote?.notesContent || ""}`.trim(),
            category: normalizeNoteCategory(newNote?.category || "theory"),
            reviewLevel: 0,
            nextReviewAt: new Date()
        };
        if(!notePayload.notesContent){
            return sendError(res, 400, "notesContent is required");
        }

        const createdNewNote = new Notes(notePayload);
        await createdNewNote.save();
        existingVideo.notes.push(createdNewNote._id);
        await existingVideo.save();
        // console.log({ 
        //     message: "Note updated successfully", notes: resp.notes
        // })
        return sendSuccess(res, 200, "Note updated successfully", {
            notes: existingVideo.notes
        });

    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getVideoAiOverview = async (req,res) => {
    try {
        const { videoDbId = "" } = req.body;
        if(!videoDbId){
            return sendError(res, 400, "videoDbId is required");
        }

        const videoDoc = await Video.findOne({
            _id: videoDbId,
            owner: req.user.username
        });
        if(!videoDoc){
            return sendError(res, 404, "Video not found");
        }

        const courseDoc = await Course.findOne({
            _id: videoDoc.playlist,
            owner: req.user.username
        });

        const videoDurationSeconds = parseIsoDurationToSeconds(videoDoc?.duration || "PT0S");
        const summaryDoc = await Summary.findOne({ videoId: videoDoc.videoId }).sort({ createdAt: -1 });
        const transcriptDoc = await ensureTranscriptDoc(videoDoc.videoId);
        let ragContext = [];
        const ragStatus = {
            enabled: getPineconeConfig().isEnabled,
            indexed: false,
            retrievedChunks: 0,
            fallbackReason: ""
        };

        if(transcriptDoc?.rag?.indexedAt){
            try {
                ragStatus.indexed = true;
                const matches = await queryPineconeChunks({
                    text: [videoDoc.title, videoDoc.description, "overview recommendation skip sections"].join(" "),
                    videoId: videoDoc.videoId,
                    courseId: videoDoc.playlist,
                    topK: 8
                });
                ragContext = matches.map((item) => ({
                    startSeconds: item.startSeconds,
                    endSeconds: item.endSeconds,
                    text: item.text.slice(0, 220)
                }));
                ragStatus.retrievedChunks = ragContext.length;
            } catch (error) {
                ragStatus.fallbackReason = error?.message || "rag-fallback";
            }
        }

        const fallback = buildFallbackVideoOverview({
            videoDoc,
            courseDoc,
            summaryText: summaryDoc?.summary || "",
            videoDurationSeconds
        });

        let overview = fallback;
        try {
            const result = await generateText({
                model: groq("llama-3.3-70b-versatile"),
                temperature: 0.1,
                messages: [
                    {
                        role: "system",
                        content: `
You are a strict JSON API for personalized video overview + recommendation.
Return only JSON:
{
  "overview":"string",
  "whatYouWillLearn":["string"],
  "recommendation":{
    "mode":"watch_full|watch_partial|skip_with_summary",
    "reason":"string",
    "suggestedPlaybackSpeed":"string",
    "suggestedAction":"string",
    "skipSegments":[{"startSeconds":120,"endSeconds":240,"reason":"string"}]
  }
}
Rules:
- Use learner profile + topic context.
- Keep output concise, practical, and user-actionable.
- If suggesting skip segments, include timestamps and reasons.
- Do not over-skip core concept segments.
- English only.
- No markdown.
`
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            courseSubject: courseDoc?.subject || "general",
                            personalizationProfile: courseDoc?.personalizationProfile || {},
                            recommendedPace: courseDoc?.recommendedPace || "",
                            video: {
                                title: videoDoc?.title || "",
                                description: videoDoc?.description || "",
                                topicTags: videoDoc?.topicTags || [],
                                recommendationAction: videoDoc?.recommendationAction || "watch",
                                recommendationReason: videoDoc?.recommendationReason || "",
                                durationSeconds: videoDurationSeconds
                            },
                            summary: `${summaryDoc?.summary || ""}`.slice(0, 1600),
                            ragContext
                        })
                    }
                ],
                response_format: { type: "json_object" }
            });

            const parsed = safeJsonParse(result?.text || "");
            if(parsed && typeof parsed === "object"){
                const modeRaw = `${parsed?.recommendation?.mode || ""}`.trim();
                const mode = ["watch_full", "watch_partial", "skip_with_summary"].includes(modeRaw)
                    ? modeRaw
                    : fallback.recommendation.mode;
                overview = {
                    overview: `${parsed?.overview || fallback.overview}`.trim() || fallback.overview,
                    whatYouWillLearn: Array.isArray(parsed?.whatYouWillLearn)
                        ? parsed.whatYouWillLearn.map((item) => `${item}`.trim()).filter(Boolean).slice(0, 5)
                        : fallback.whatYouWillLearn,
                    recommendation: {
                        mode,
                        reason: `${parsed?.recommendation?.reason || fallback.recommendation.reason}`.trim() || fallback.recommendation.reason,
                        suggestedPlaybackSpeed: `${parsed?.recommendation?.suggestedPlaybackSpeed || fallback.recommendation.suggestedPlaybackSpeed}`.trim() || fallback.recommendation.suggestedPlaybackSpeed,
                        suggestedAction: `${parsed?.recommendation?.suggestedAction || fallback.recommendation.suggestedAction}`.trim() || fallback.recommendation.suggestedAction,
                        skipSegments: sanitizeOverviewSkipSegments({
                            segments: parsed?.recommendation?.skipSegments || [],
                            videoDurationSeconds
                        })
                    }
                };
                if(!overview.recommendation.skipSegments.length && fallback.recommendation.skipSegments.length){
                    overview.recommendation.skipSegments = fallback.recommendation.skipSegments;
                }
            }
        } catch (error) {
            overview = fallback;
        }

        return sendSuccess(res, 200, "AI overview generated successfully", {
            ...overview,
            ragStatus: shouldExposeRagDebug() ? ragStatus : undefined
        });
    } catch (error) {
        console.error("AI Overview Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}
export const getVideoNotes = async (req,res) => {
    try {
        const videoExists = await Video.findOne({
            _id: req.params.id,
            owner: req.user.username
        });

        if(!videoExists){
            return sendError(res, 403, "Video not found or unauthorized");
        }

        const notes = await Notes.find({
            videoId: req.params.id
        }).sort({ nextReviewAt: -1, createdAt: -1 });
        const activeNotes = notes.filter((note) => note?.isArchived !== true);
        const now = new Date();
        const grouped = activeNotes.reduce((acc, note) => {
            const category = normalizeNoteCategory(note?.category || "theory");
            if(!acc[category]){
                acc[category] = [];
            }
            acc[category].push(note);
            return acc;
        }, {});
        Object.keys(grouped).forEach((key) => {
            grouped[key] = (grouped[key] || []).sort((a, b) => {
                const aTime = a?.nextReviewAt ? new Date(a.nextReviewAt).getTime() : 0;
                const bTime = b?.nextReviewAt ? new Date(b.nextReviewAt).getTime() : 0;
                return aTime - bTime;
            });
        });
        const dueNow = activeNotes
            .filter((note) => !note?.nextReviewAt || new Date(note.nextReviewAt) <= now)
            .sort((a, b) => {
                const aTime = a?.nextReviewAt ? new Date(a.nextReviewAt).getTime() : 0;
                const bTime = b?.nextReviewAt ? new Date(b.nextReviewAt).getTime() : 0;
                return aTime - bTime;
            });

        return sendSuccess(res, 200, "Notes fetched successfully", {
            notes: activeNotes,
            groupedByCategory: grouped,
            dueNow,
            dueCount: dueNow.length
        });
        // console.log("Notes: ",notes);

    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }

}

export const getCourseNoteReviewQueue = async (req,res) => {
    try {
        const { courseId = "" } = req.params;
        if(!courseId){
            return sendError(res, 400, "courseId is required");
        }

        const course = await Course.findOne({
            _id: courseId,
            owner: req.user.username
        });
        if(!course){
            return sendError(res, 404, "Course not found");
        }

        const videoIds = (await Video.find({
            playlist: courseId,
            owner: req.user.username
        }).select("_id")).map((item) => item._id);

        if(!videoIds.length){
            return sendSuccess(res, 200, "Review queue fetched successfully", {
                dueNow: [],
                upcoming: [],
                dueCount: 0,
                upcomingCount: 0,
                byCategory: {}
            });
        }

        const now = new Date();
        const notes = await Notes.find({
            videoId: { $in: videoIds },
            isArchived: { $ne: true }
        }).sort({ nextReviewAt: 1 }).limit(1000);

        const dueNow = notes.filter((note) => !note?.nextReviewAt || new Date(note.nextReviewAt) <= now);
        const upcoming = notes.filter((note) => note?.nextReviewAt && new Date(note.nextReviewAt) > now).slice(0, 50);
        const byCategory = notes.reduce((acc, note) => {
            const key = normalizeNoteCategory(note?.category || "theory");
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        return sendSuccess(res, 200, "Review queue fetched successfully", {
            dueNow,
            upcoming,
            dueCount: dueNow.length,
            upcomingCount: upcoming.length,
            byCategory
        });
    } catch (error) {
        console.error("Note Queue Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const suggestVideoNoteCategory = async (req,res) => {
    try {
        const { videoId = "", notesContent = "" } = req.body;
        if(!videoId || !`${notesContent || ""}`.trim()){
            return sendError(res, 400, "videoId and notesContent are required");
        }
        const videoDoc = await Video.findOne({
            _id: videoId,
            owner: req.user.username
        });
        if(!videoDoc){
            return sendError(res, 403, "Video not found or unauthorized");
        }
        const category = await suggestNoteCategoryWithAi({
            content: notesContent,
            title: videoDoc?.title || "",
            description: videoDoc?.description || ""
        });
        return sendSuccess(res, 200, "Suggested note category fetched successfully", {
            category
        });
    } catch (error) {
        console.error("Note Category Suggestion Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const reviewVideoNote = async (req,res) => {
    try {
        const { noteId = "", videoId = "", rating = 3 } = req.body;
        if(!noteId || !videoId){
            return sendError(res, 400, "noteId and videoId are required");
        }

        const videoDoc = await Video.findOne({
            _id: videoId,
            owner: req.user.username
        });
        if(!videoDoc){
            return sendError(res, 403, "Video not found or unauthorized");
        }

        const note = await Notes.findOne({
            _id: noteId,
            videoId: videoDoc._id
        });
        if(!note){
            return sendError(res, 404, "Note not found");
        }

        const ratingNum = Math.max(1, Math.min(5, parseInt(rating, 10) || 3));
        let nextLevel = note.reviewLevel || 0;
        if(ratingNum >= 4){
            nextLevel += 1;
        } else if(ratingNum <= 2){
            nextLevel = Math.max(0, nextLevel - 1);
        }
        nextLevel = Math.max(0, Math.min(6, nextLevel));
        const intervalDays = getNoteReviewIntervalDays(nextLevel);
        const nextReviewAt = toStartOfDay(new Date());
        nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

        note.reviewLevel = nextLevel;
        note.lastReviewedAt = new Date();
        note.nextReviewAt = nextReviewAt;
        note.reviewHistory = [
            {
                reviewedAt: new Date(),
                rating: ratingNum,
                nextReviewAt
            },
            ...(note.reviewHistory || [])
        ].slice(0, 30);
        await note.save();

        return sendSuccess(res, 200, "Note review updated successfully", {
            noteId: note._id,
            reviewLevel: note.reviewLevel,
            nextReviewAt: note.nextReviewAt,
            lastReviewedAt: note.lastReviewedAt
        });
    } catch (error) {
        console.error("Note Review Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const updateVideoNoteMeta = async (req,res) => {
    try {
        const { noteId = "", videoId = "", category = "", notesContent = "" } = req.body;
        if(!noteId || !videoId){
            return sendError(res, 400, "noteId and videoId are required");
        }
        const videoDoc = await Video.findOne({
            _id: videoId,
            owner: req.user.username
        });
        if(!videoDoc){
            return sendError(res, 403, "Video not found or unauthorized");
        }

        const update = {};
        if(`${category || ""}`.trim()){
            update.category = normalizeNoteCategory(category);
        }
        if(`${notesContent || ""}`.trim()){
            update.notesContent = `${notesContent}`.trim();
        }
        if(!Object.keys(update).length){
            return sendError(res, 400, "No valid fields to update");
        }

        const note = await Notes.findOneAndUpdate({
            _id: noteId,
            videoId: videoDoc._id
        }, update, { new: true });
        if(!note){
            return sendError(res, 404, "Note not found");
        }
        return sendSuccess(res, 200, "Note updated successfully", note);
    } catch (error) {
        console.error("Note Update Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const updateLastPlayedCourse = async (req,res) => {
    try {
        const {courseId} = req.body;
        const userId = req.user.id;

        const courseExists = await Course.findOne({
            _id: courseId,
            owner: req.user.username
        });

        if(!courseExists){
            return sendError(res, 403, "Course not found or unauthorized");
        }

        const updateLastPlayed = await User.findByIdAndUpdate(userId, {
            lastCoursePlayed: courseId
        });
        
        return sendSuccess(res, 200, "last played saved successfully", {
            lastplayedId: updateLastPlayed
        });
    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const updateCourseSubject = async (req,res) => {
    try {
        const { courseId = "", subject = "" } = req.body;
        if(!courseId){
            return sendError(res, 400, "courseId is required");
        }

        const normalized = normalizeSubject(subject);
        const updated = await Course.findOneAndUpdate({
            _id: courseId,
            owner: req.user.username
        }, {
            subject: normalized
        }, { new: true });

        if(!updated){
            return sendError(res, 404, "Course not found");
        }

        return sendSuccess(res, 200, "Course subject updated successfully", {
            _id: updated._id,
            title: updated.title,
            subject: updated.subject
        });
    } catch (error) {
        console.error("Course Subject Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const rebuildCourseModulesController = async (req,res) => {
    try {
        const { courseId = "" } = req.body;
        if(!courseId){
            return sendError(res, 400, "courseId is required");
        }

        const course = await Course.findOne({
            _id: courseId,
            owner: req.user.username
        });
        if(!course){
            return sendError(res, 404, "Course not found");
        }

        const modules = await syncCourseLearningModules(courseId);
        return sendSuccess(res, 200, "Course modules rebuilt successfully", {
            courseId,
            modulesCount: modules.length
        });
    } catch (error) {
        console.error("Rebuild Modules Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const prewarmVideoRagController = async (req,res) => {
    try {
        const { videoDbId = "" } = req.body;
        if(!videoDbId){
            return sendError(res, 400, "videoDbId is required");
        }

        const videoDoc = await Video.findOne({
            _id: videoDbId,
            owner: req.user.username
        });
        if(!videoDoc){
            return sendError(res, 404, "Video not found");
        }

        const transcriptDoc = await ensureTranscriptDoc(videoDoc.videoId);
        if(!transcriptDoc){
            logRagEvent("prewarm_status", {
                videoDbId,
                videoId: videoDoc.videoId,
                warmed: false,
                reason: "transcript-unavailable"
            });
            return sendSuccess(res, 200, "RAG prewarm skipped: transcript unavailable", {
                warmed: false,
                reason: "transcript-unavailable"
            });
        }

        try {
            await ensureRagChunksForVideo({
                videoDoc,
                transcriptDoc
            });
        } catch (error) {
            const detailBody = error?.response?.data || {};
            logRagEvent("prewarm_status", {
                videoDbId,
                videoId: videoDoc.videoId,
                warmed: false,
                reason: "rag-fallback",
                detail: error?.message || "",
                body: detailBody
            });
            return sendSuccess(res, 200, "RAG prewarm skipped: index unavailable", {
                warmed: false,
                reason: "rag-fallback",
                detail: error?.message || "",
                body: detailBody
            });
        }

        logRagEvent("prewarm_status", {
            videoDbId,
            videoId: videoDoc.videoId,
            warmed: true,
            chunksCount: transcriptDoc?.rag?.chunksCount || 0
        });
        return sendSuccess(res, 200, "RAG prewarmed successfully", {
            warmed: true,
            videoId: videoDoc.videoId,
            chunksCount: transcriptDoc?.rag?.chunksCount || 0,
            model: transcriptDoc?.rag?.model || PINECONE_EMBED_MODEL
        });
    } catch (error) {
        console.error("RAG Prewarm Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}
export const deleteVideoNotes = async (req,res) => {
    try {
        const {noteId, videoId} = req.body;
        const resp = await Video.findOne({
            _id: videoId,
            owner: req.user.username
        });

        if(!resp){
            return sendError(res, 403, "Video not found or unauthorized");
        }

        const noteExistsInVideo = resp.notes.some((e) => e.toString() === noteId);
        if(!noteExistsInVideo){
            return sendError(res, 404, "Note not found in video");
        }

        const newArr = resp.notes.filter((e) => (e.toString() !== noteId));
        const resp2 = await Notes.findOneAndDelete({
            _id: noteId,
            videoId: videoId
        });

        if(!resp2){
            return sendError(res, 404, "Note not found");
        }

        resp.notes = newArr;
        await resp.save();
        // console.log({ 
        //     message: "Note deleted successfully", notes: resp.notes
        // })
        return sendSuccess(res, 200, "Note deleted successfully", {
            notes: resp.notes
        });
    } catch (error) {
        console.error("Chat Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getVideoQuiz = async (req,res) => {
    try {
        const { videoDbId, adaptive = false, forceRegenerate = false, focusConcept = "" } = req.body;
        if(!videoDbId){
            return sendError(res, 400, "videoDbId is required");
        }

        const videoDoc = await Video.findOne({
            _id: videoDbId,
            owner: req.user.username
        });
        if(!videoDoc){
            return sendError(res, 404, "Video not found");
        }
        const courseDoc = await Course.findOne({
            _id: videoDoc.playlist,
            owner: req.user.username
        });

        let quizDoc = await Quiz.findOne({
            videoDbId: videoDoc._id,
            owner: req.user.username
        });

        const attempts = await QuizAttempt.find({
            quizId: quizDoc?._id,
            owner: req.user.username
        }).sort({ createdAt: -1 }).limit(10);

        const latestAttempt = attempts.length ? attempts[0] : null;
        const adaptiveDifficulty = getAdaptiveDifficulty(latestAttempt);
        const adaptiveCooldownSeconds = Math.max(30, parseInt(process.env.ADAPTIVE_QUIZ_REGEN_COOLDOWN_SECONDS || "120", 10) || 120);
        const quizAgeSeconds = quizDoc?.updatedAt ? Math.floor((Date.now() - new Date(quizDoc.updatedAt).getTime()) / 1000) : Number.MAX_SAFE_INTEGER;
        const shouldRegenerateAdaptive = Boolean(adaptive && quizDoc && latestAttempt && quizAgeSeconds >= adaptiveCooldownSeconds);
        const shouldForceRegenerate = Boolean(adaptive && forceRegenerate && quizDoc);
        const previousQuestionFingerprints = collectPreviousQuestionFingerprints({
            attempts,
            quizDoc
        });
        const previousQuestionsForPrompt = Array.from(previousQuestionFingerprints).slice(0, 20);
        const ragStatus = {
            enabled: getPineconeConfig().isEnabled,
            indexed: false,
            retrievedChunks: 0,
            fallbackReason: "",
            reusedExistingQuiz: false
        };

        if(!quizDoc || shouldRegenerateAdaptive || shouldForceRegenerate){
            const summaryDoc = await Summary.findOne({ videoId: videoDoc.videoId }).sort({ createdAt: -1 });
            const transcriptDoc = await ensureTranscriptDoc(videoDoc.videoId);
            const transcriptRows = (transcriptDoc?.transcript || []).filter((row) => `${row?.text || ""}`.trim());
            const transcriptSampleRows = transcriptRows
                .slice(0, 220)
                .map((row) => ({
                    offset: Math.floor(row?.offset || 0),
                    text: `${row?.text || ""}`.trim().slice(0, 180)
                }));
            let ragTimeline = [];
            try {
                await ensureRagChunksForVideo({
                    videoDoc,
                    transcriptDoc
                });
                ragStatus.indexed = true;
                ragTimeline = await getRagContextForQuiz({
                    videoDoc,
                    summaryText: summaryDoc?.summary || "",
                    focusConcept
                });
                ragStatus.retrievedChunks = ragTimeline.length;
            } catch (ragError) {
                const ragHttpStatus = ragError?.response?.status || "";
                const ragData = ragError?.response?.data;
                console.warn("RAG context fallback:", ragHttpStatus, ragError?.message || ragError, ragData || "");
                ragTimeline = [];
                ragStatus.fallbackReason = ragError?.message || "rag-fallback";
            }
            const videoDurationSeconds = parseIsoDurationToSeconds(videoDoc?.duration || "PT0S");
            const domainProfile = inferQuizDomainProfile({
                course: courseDoc,
                videoDoc,
                transcriptRows
            });
            const difficultyPlan = getQuizDifficultyPlan({
                course: courseDoc,
                videoDoc,
                adaptiveDifficulty,
                domain: domainProfile.domain
            });
            const domainInstructionMap = {
                coding: "Use code-concept reasoning if transcript supports it; do not ask syntax trivia not covered in transcript.",
                science: "Focus on scientific principles/processes mentioned in transcript; avoid coding framing.",
                math: "Focus on method, formula usage, and interpretation from transcript; avoid coding framing.",
                "exam-theory": "Focus on conceptual recall, comparison, and factual understanding from transcript content.",
                language: "Focus on language usage, meaning, grammar, and examples explicitly discussed in transcript.",
                professional: "Focus on product/business/design decisions and frameworks explicitly discussed in transcript.",
                general: "Focus on explanation fidelity to transcript content only."
            };

            let quizQuestions = [];
            try {
                const buildQuizSystemPrompt = (strictRetry = false) => `
You are a strict JSON API for generating a post-video quiz based ONLY on the provided transcript/time-stamped content.
Return only JSON object:
{
  "questions": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "correctOptionIndex": 0,
      "conceptTag": "string",
      "difficulty": "easy|medium|hard",
      "explanation": "string",
      "hint": "string",
      "sourceStartSeconds": 0,
      "sourceEndSeconds": 45,
      "sourceContext": "short quote/paraphrase from transcript segment"
    }
  ]
}
Rules:
- Generate exactly ${QUIZ_QUESTION_COUNT} MCQs.
- Questions must test conceptual understanding and application of the taught topic, not memory of exact wording.
- Use transcript/summary only as topic boundary and factual guardrails. Do not ask "what was said in video" style questions.
- Each question must have exactly 4 options.
- correctOptionIndex must be 0-3.
- Keep conceptTag concise.
- Keep explanations short and useful.
- Hint must guide thought process only, never reveal correct answer.
- sourceStartSeconds and sourceEndSeconds must be valid timestamps from transcript content.
- Keep sourceContext short and directly tied to the referenced transcript segment.
- Keep distractors plausible, close, and exam-like.
- Language must be English only. Never use Hindi or mixed-language options.
- At least 6 questions must be application/problem-solving style.
- Difficulty must strictly progress from earlier to later questions:
  Q1-Q2 easy, Q3-Q5 medium, Q6-Q8 hard.
- Target difficulty: ${adaptiveDifficulty}
- Target domain: ${domainProfile.domain}
- Domain rule: ${domainInstructionMap[domainProfile.domain] || domainInstructionMap.general}
- If focusConcept is provided, prioritize that concept in at least 3 questions.
- Prefer source timestamps from retrievedContext first. If retrievedContext is empty, use transcriptTimeline.
- Avoid repeating previous attempts. At most 2 questions may overlap with previousQuestions.
- Coding domain requirement:
  Ask dry-run, next-step, complexity, edge-case, or debugging-reasoning MCQs (e.g., recursion traces, sorting passes, pointer movement, tree/graph traversal outcomes).
- Non-coding domain requirement:
  Ask scenario/case-based reasoning questions (application, comparison, inference), not direct definition recall.
${strictRetry ? "- Previous output quality failed. Increase rigor and avoid simple/direct questions.\n- Ensure all 5 questions are medium/hard exam quality.\n" : ""}
Do not return markdown.
`;

                const buildQuizUserPayload = () => ({
                    title: videoDoc.title,
                    description: videoDoc.description,
                    subject: courseDoc?.subject || "general",
                    topicTags: videoDoc.topicTags || [],
                    summary: summaryDoc?.summary || "",
                    retrievedContext: ragTimeline,
                    transcriptTimeline: transcriptSampleRows,
                    previousQuestions: previousQuestionsForPrompt,
                    targetDifficulty: adaptiveDifficulty,
                    focusConcept,
                    preferredDifficultyMix: difficultyPlan
                });

                for(let attemptIndex = 0; attemptIndex < 2; attemptIndex += 1){
                    const result = await generateText({
                        model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
                        temperature: attemptIndex === 0 ? 0.1 : 0,
                        messages: [
                            { role: "system", content: buildQuizSystemPrompt(attemptIndex > 0) },
                        { role: "user", content: JSON.stringify({
                            ...buildQuizUserPayload(),
                            retryReason: attemptIndex > 0 ? "Previous set had low-rigor or non-English/direct recall issues." : ""
                        }) }
                        ],
                        response_format: { type: "json_object" }
                    });

                    const parsed = safeJsonParse(result?.text || "");
                    quizQuestions = normalizeQuizQuestions(parsed, { domain: domainProfile.domain });
                    if(quizQuestions.length >= QUIZ_QUESTION_COUNT){
                        break;
                    }
                }
            } catch (quizGenErr) {
                quizQuestions = [];
            }

            if(!quizQuestions.length){
                quizQuestions = buildFallbackQuizQuestions({
                    title: videoDoc.title,
                    topicTags: videoDoc.topicTags || [],
                    transcriptDoc,
                    domain: domainProfile.domain
                });
            }

            quizQuestions = fillQuizQuestionsToTarget({
                questions: quizQuestions,
                title: videoDoc.title,
                topicTags: videoDoc.topicTags || [],
                transcriptDoc,
                domain: domainProfile.domain
            });

            const overlapCount = countQuizOverlap({
                questions: quizQuestions,
                previousFingerprints: previousQuestionFingerprints
            });
            if(overlapCount > 2){
                quizQuestions = diversifyQuizQuestions({
                    questions: quizQuestions,
                    previousFingerprints: previousQuestionFingerprints,
                    title: videoDoc.title,
                    topicTags: videoDoc.topicTags || [],
                    transcriptDoc,
                    domain: domainProfile.domain,
                    maxRepeats: 2
                });
            }

            quizQuestions = fillQuizQuestionsToTarget({
                questions: quizQuestions,
                title: videoDoc.title,
                topicTags: videoDoc.topicTags || [],
                transcriptDoc,
                domain: domainProfile.domain
            });

            quizQuestions = enrichQuestionSources({
                questions: quizQuestions,
                transcriptRows,
                videoDurationSeconds
            });
            quizQuestions = redistributeDifficulty(quizQuestions, difficultyPlan);

            if(quizDoc){
                quizDoc.questions = quizQuestions;
                await quizDoc.save();
            } else {
                quizDoc = new Quiz({
                    videoDbId: videoDoc._id,
                    videoId: videoDoc.videoId,
                    courseId: videoDoc.playlist,
                    owner: req.user.username,
                    questions: quizQuestions
                });
                await quizDoc.save();
            }
        } else {
            ragStatus.reusedExistingQuiz = true;
            const transcriptDoc = await Transcript.findOne({ videoId: videoDoc.videoId }).sort({ createdAt: -1 });
            const hasIndexedRag = Boolean(transcriptDoc?.rag?.indexedAt && (transcriptDoc?.rag?.chunksCount || 0) > 0);
            ragStatus.indexed = hasIndexedRag;

            if(hasIndexedRag && ragStatus.enabled){
                try {
                    const summaryDoc = await Summary.findOne({ videoId: videoDoc.videoId }).sort({ createdAt: -1 });
                    const ragTimeline = await getRagContextForQuiz({
                        videoDoc,
                        summaryText: summaryDoc?.summary || "",
                        focusConcept
                    });
                    ragStatus.retrievedChunks = ragTimeline.length;
                } catch (ragError) {
                    ragStatus.fallbackReason = ragError?.message || "rag-query-fallback";
                }
            }
        }
        logRagEvent("quiz_status", {
            videoDbId: `${videoDbId}`,
            adaptive: Boolean(adaptive),
            shouldRegenerateAdaptive,
            shouldForceRegenerate,
            ragStatus
        });

        const finalAttempts = await QuizAttempt.find({
            quizId: quizDoc._id,
            owner: req.user.username
        }).sort({ createdAt: -1 }).limit(10);

        const finalLatestAttempt = finalAttempts.length ? finalAttempts[0] : null;

        const sanitizedQuiz = {
            _id: quizDoc._id,
            videoDbId: quizDoc.videoDbId,
            videoId: quizDoc.videoId,
            courseId: quizDoc.courseId,
            questions: quizDoc.questions.map((item, idx) => ({
                id: idx,
                question: item.question,
                options: item.options,
                conceptTag: item.conceptTag,
                difficulty: item.difficulty,
                hint: item.hint || "",
                sourceStartSeconds: item.sourceStartSeconds || 0,
                sourceEndSeconds: item.sourceEndSeconds || 0
            }))
        };

        return sendSuccess(res, 200, "Quiz fetched successfully", {
            quiz: sanitizedQuiz,
            latestAttempt: finalLatestAttempt,
            attempts: finalAttempts,
            ragStatus: shouldExposeRagDebug() ? ragStatus : undefined
        });
    } catch (error) {
        console.error("Quiz Fetch Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const submitVideoQuiz = async (req,res) => {
    try {
        const { quizId, videoDbId, answers = [], timeSpentSeconds = 0, engagementMetrics = {} } = req.body;

        if(!quizId || !videoDbId){
            return sendError(res, 400, "quizId and videoDbId are required");
        }
        if(!Array.isArray(answers)){
            return sendError(res, 400, "answers should be an array");
        }

        const videoDoc = await Video.findOne({
            _id: videoDbId,
            owner: req.user.username
        });
        if(!videoDoc){
            return sendError(res, 404, "Video not found");
        }

        const quizDoc = await Quiz.findOne({
            _id: quizId,
            videoDbId: videoDoc._id,
            owner: req.user.username
        });
        if(!quizDoc){
            return sendError(res, 404, "Quiz not found");
        }

        if(answers.length !== quizDoc.questions.length){
            return sendError(res, 400, "Please answer all quiz questions");
        }

        const questionReview = quizDoc.questions.map((item, idx) => {
            const selectedOptionIndex = parseInt(answers[idx], 10);
            const normalizedIndex = Number.isInteger(selectedOptionIndex) ? selectedOptionIndex : -1;
            const isCorrect = normalizedIndex === item.correctOptionIndex;
            return {
                question: item.question,
                selectedOptionIndex: normalizedIndex,
                correctOptionIndex: item.correctOptionIndex,
                selectedOption: item.options?.[normalizedIndex] || "",
                correctOption: item.options?.[item.correctOptionIndex] || "",
                isCorrect,
                conceptTag: item.conceptTag || "general",
                difficulty: item.difficulty || "medium",
                explanation: item.explanation || "",
                sourceStartSeconds: item.sourceStartSeconds || 0,
                sourceEndSeconds: item.sourceEndSeconds || 0,
                sourceContext: item.sourceContext || ""
            };
        });

        const score = questionReview.filter((item) => item.isCorrect).length;
        const totalQuestions = quizDoc.questions.length;
        const percentage = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
        const analysis = buildQuizAnalysis({
            questionReview,
            percentage
        });
        const pauseCount = Math.max(0, parseInt(engagementMetrics?.pauseCount || 0, 10) || 0);
        const avgPlaybackSpeedRaw = Number(engagementMetrics?.avgPlaybackSpeed || 1);
        const avgPlaybackSpeed = Number.isFinite(avgPlaybackSpeedRaw) ? Number(Math.max(0.5, Math.min(3, avgPlaybackSpeedRaw)).toFixed(2)) : 1;
        const watchedSeconds = Math.max(0, parseInt(engagementMetrics?.watchedSeconds || 0, 10) || 0);
        const pausePerMinute = Number(((pauseCount / Math.max(1, watchedSeconds / 60))).toFixed(2));
        const courseDoc = await Course.findOne({
            _id: videoDoc.playlist,
            owner: req.user.username
        });
        const readiness = await buildReadinessAssessment({
            course: courseDoc,
            videoDoc,
            percentage,
            engagement: {
                pauseCount,
                avgPlaybackSpeed,
                watchedSeconds,
                pausePerMinute
            }
        });
        const transcriptDoc = await Transcript.findOne({ videoId: videoDoc.videoId }).sort({ createdAt: -1 });
        const revisionClips = buildRevisionClips({
            questionReview,
            transcriptDoc,
            videoDoc
        });

        const newAttempt = new QuizAttempt({
            quizId: quizDoc._id,
            videoDbId: videoDoc._id,
            videoId: videoDoc.videoId,
            courseId: videoDoc.playlist,
            owner: req.user.username,
            answers: answers.map((item) => parseInt(item, 10)),
            score,
            totalQuestions,
            percentage,
            timeSpentSeconds: Math.max(0, parseInt(timeSpentSeconds || 0, 10) || 0),
            engagement: {
                pauseCount,
                avgPlaybackSpeed,
                watchedSeconds,
                pausePerMinute
            },
            comprehensionScore: readiness.comprehensionScore,
            skillLevel: readiness.skillLevel,
            canProceed: readiness.canProceed,
            readinessReason: readiness.readinessReason,
            nextStep: readiness.nextStep,
            conceptBreakdown: analysis.conceptBreakdown,
            difficultyBreakdown: analysis.difficultyBreakdown,
            strengths: analysis.strengths,
            weakAreas: analysis.weakAreas,
            recommendedActions: analysis.recommendedActions,
            overallFeedback: analysis.overallFeedback,
            questionReview,
            revisionClips
        });
        await newAttempt.save();
        await updateSpacedReviewSchedule({
            owner: req.user.username,
            courseId: videoDoc.playlist,
            videoDoc,
            conceptBreakdown: analysis.conceptBreakdown
        });

        return sendSuccess(res, 201, "Quiz submitted successfully", newAttempt);
    } catch (error) {
        console.error("Quiz Submit Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getQuizMastery = async (req,res) => {
    try {
        const { courseId } = req.params;
        if(!courseId){
            return sendError(res, 400, "courseId is required");
        }

        const courseDoc = await Course.findOne({
            _id: courseId,
            owner: req.user.username
        });
        if(!courseDoc){
            return sendError(res, 404, "Course not found");
        }

        const attempts = await QuizAttempt.find({
            courseId,
            owner: req.user.username
        }).sort({ createdAt: -1 });

        const conceptMap = {};
        attempts.forEach((attempt) => {
            (attempt.conceptBreakdown || []).forEach((item) => {
                if(!conceptMap[item.key]){
                    conceptMap[item.key] = {
                        conceptTag: item.key,
                        correct: 0,
                        total: 0,
                        accuracy: 0
                    };
                }
                conceptMap[item.key].correct += item.correct || 0;
                conceptMap[item.key].total += item.total || 0;
            });
        });

        const mastery = Object.values(conceptMap).map((item) => ({
            ...item,
            accuracy: item.total ? Math.round((item.correct / item.total) * 100) : 0,
            status: item.total ? ((item.correct / item.total) >= 0.8 ? "mastered" : (item.correct / item.total) >= 0.6 ? "improving" : "weak") : "weak"
        })).sort((a, b) => b.accuracy - a.accuracy);

        return sendSuccess(res, 200, "Mastery fetched successfully", {
            mastery,
            totalAttempts: attempts.length
        });
    } catch (error) {
        console.error("Quiz Mastery Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getQuizReviewSchedule = async (req,res) => {
    try {
        const { courseId } = req.params;
        if(!courseId){
            return sendError(res, 400, "courseId is required");
        }

        const courseDoc = await Course.findOne({
            _id: courseId,
            owner: req.user.username
        });
        if(!courseDoc){
            return sendError(res, 404, "Course not found");
        }

        const now = new Date();
        const dueItems = await QuizReviewSchedule.find({
            owner: req.user.username,
            courseId,
            completed: false,
            nextReviewAt: { $lte: now }
        }).sort({ nextReviewAt: 1 }).limit(30);

        const upcomingItems = await QuizReviewSchedule.find({
            owner: req.user.username,
            courseId,
            completed: false,
            nextReviewAt: { $gt: now }
        }).sort({ nextReviewAt: 1 }).limit(30);

        return sendSuccess(res, 200, "Review schedule fetched successfully", {
            dueItems,
            upcomingItems
        });
    } catch (error) {
        console.error("Quiz Schedule Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getQuizStats = async (req,res) => {
    try {
        const { courseId } = req.params;
        if(!courseId){
            return sendError(res, 400, "courseId is required");
        }

        const courseDoc = await Course.findOne({
            _id: courseId,
            owner: req.user.username
        });
        if(!courseDoc){
            return sendError(res, 404, "Course not found");
        }

        const attempts = await QuizAttempt.find({
            courseId,
            owner: req.user.username
        }).sort({ createdAt: -1 });

        const dayMap = {};
        attempts.forEach((attempt) => {
            const dayKey = buildStartOfDay(attempt.createdAt).toISOString();
            if(!dayMap[dayKey]){
                dayMap[dayKey] = 0;
            }
            dayMap[dayKey] += 1;
        });

        const dayKeys = Object.keys(dayMap).sort((a, b) => new Date(b) - new Date(a));
        let streak = 0;
        if(dayKeys.length){
            let cursor = buildStartOfDay(new Date());
            for(let i = 0; i < 365; i += 1){
                const cursorKey = cursor.toISOString();
                if(dayMap[cursorKey]){
                    streak += 1;
                    cursor.setDate(cursor.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        const windowStart = buildStartOfDay(new Date());
        windowStart.setDate(windowStart.getDate() - 29);
        let activeDays = 0;
        Object.keys(dayMap).forEach((key) => {
            const date = new Date(key);
            if(date >= windowStart){
                activeDays += 1;
            }
        });
        const consistencyScore = Math.min(100, Math.round((activeDays / 30) * 100));
        const avgScore = attempts.length
            ? Math.round(attempts.reduce((acc, item) => acc + (item.percentage || 0), 0) / attempts.length)
            : 0;

        return sendSuccess(res, 200, "Quiz stats fetched successfully", {
            streak,
            consistencyScore,
            avgScore,
            totalAttempts: attempts.length,
            activeDaysLast30: activeDays
        });
    } catch (error) {
        console.error("Quiz Stats Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}

export const getQuizInstructorAnalytics = async (req,res) => {
    try {
        const { courseId } = req.params;
        if(!courseId){
            return sendError(res, 400, "courseId is required");
        }

        const courseDoc = await Course.findOne({
            _id: courseId,
            owner: req.user.username
        });
        if(!courseDoc){
            return sendError(res, 404, "Course not found");
        }

        const videos = await Video.find({
            playlist: courseId,
            owner: req.user.username
        }).sort({ createdAt: 1 });

        const attempts = await QuizAttempt.find({
            courseId,
            owner: req.user.username
        });

        const attemptsByVideo = {};
        const conceptMap = {};
        attempts.forEach((attempt) => {
            const key = `${attempt.videoDbId}`;
            if(!attemptsByVideo[key]){
                attemptsByVideo[key] = [];
            }
            attemptsByVideo[key].push(attempt);

            (attempt.conceptBreakdown || []).forEach((item) => {
                if(!conceptMap[item.key]){
                    conceptMap[item.key] = {
                        topic: item.key,
                        correct: 0,
                        total: 0
                    };
                }
                conceptMap[item.key].correct += item.correct || 0;
                conceptMap[item.key].total += item.total || 0;
            });
        });

        const dropoff = videos.map((videoItem, index) => {
            const key = `${videoItem._id}`;
            const videoAttempts = attemptsByVideo[key] || [];
            const avgQuizScore = videoAttempts.length
                ? Math.round(videoAttempts.reduce((acc, item) => acc + (item.percentage || 0), 0) / videoAttempts.length)
                : 0;
            return {
                videoDbId: videoItem._id,
                videoId: videoItem.videoId,
                title: videoItem.title,
                sequence: index + 1,
                completion: videoItem.completed ? 100 : (videoItem.totalDuration ? Math.min(99, Math.round((videoItem.progressTime / videoItem.totalDuration) * 100)) : 0),
                quizAttempts: videoAttempts.length,
                avgQuizScore
            };
        });

        const weakTopicHeatmap = Object.values(conceptMap).map((item) => ({
            topic: item.topic,
            accuracy: item.total ? Math.round((item.correct / item.total) * 100) : 0,
            intensity: item.total ? Math.max(0, 100 - Math.round((item.correct / item.total) * 100)) : 100
        })).sort((a, b) => b.intensity - a.intensity);

        return sendSuccess(res, 200, "Instructor analytics fetched successfully", {
            dropoff,
            weakTopicHeatmap
        });
    } catch (error) {
        console.error("Quiz Analytics Error:", error);
        return sendError(res, 500, "Server Error", error.message);
    }
}
// courseData.data.items.map((vid,idx) => {
        //     const newVid =  new Video({
        //         playlist: newCourse._id,
        //         title:vid.snippet.title,
        //         description:vid.snippet.description,
        //         channelId:vid.snippet.channelId,
        //         channelTitle:vid.snippet.channelTitle,
        //         thumbnail:vid.snippet.thumbnails.maxres.url,
        //         videoId:vid.snippet.resourceId.videoId,
        //         duration:videoData.data.items[idx].contentDetails.duration
        //     })
        //     newVid.save(); 
        // }) - //instead of this use insertMany()

