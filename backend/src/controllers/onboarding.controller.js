import axios from "axios";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { OnboardingProfile } from "../models/onboardingProfile.model.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const normalizeTopics = (topicText = "") => {
    if(Array.isArray(topicText)){
        return topicText.map((topic) => topic.toLowerCase().trim()).filter(Boolean);
    }
    return topicText.split(",").map((topic) => topic.toLowerCase().trim()).filter(Boolean);
}

const normalizeText = (text = "") => `${text}`.toLowerCase();
const compactText = (text = "") => `${text || ""}`.replace(/\s+/g, " ").trim();

const getDaysSince = (dateStr) => {
    if(!dateStr){
        return 9999;
    }
    const date = new Date(dateStr);
    if(Number.isNaN(date.getTime())){
        return 9999;
    }
    const diff = Date.now() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getCoverageScore = (text, topicGroups = []) => {
    if(!topicGroups.length){
        return {
            score: 1,
            matchedTopics: []
        };
    }

    const matchedTopics = [];
    topicGroups.forEach((topicGroup) => {
        const hasMatch = topicGroup.terms.some((term) => text.includes(term));
        if(hasMatch){
            matchedTopics.push(topicGroup.label);
        }
    });

    return {
        score: matchedTopics.length / topicGroups.length,
        matchedTopics
    };
};

const resolveTrack = (goal = "", preferredLanguage = "") => {
    const goalText = normalizeText(goal);
    const langText = normalizeText(preferredLanguage);
    const withLanguage = langText ? `${goal} ${preferredLanguage}` : goal;

    if(goalText.includes("dsa") || goalText.includes("data structure") || goalText.includes("algorithms")){
        return {
            name: "dsa",
            minCoverage: 0.5,
            minimumVideos: 40,
            targetVideos: 90,
            queryPack: [
                `${withLanguage} complete dsa course playlist`,
                `${withLanguage} data structures and algorithms full playlist`,
                `${withLanguage} dsa interview preparation complete course`
            ],
            topicGroups: [
                { label: "arrays", terms: ["array", "arrays"] },
                { label: "strings", terms: ["string", "strings"] },
                { label: "linked list", terms: ["linked list", "linked-list"] },
                { label: "stack and queue", terms: ["stack", "queue"] },
                { label: "recursion", terms: ["recursion", "backtracking"] },
                { label: "tree", terms: ["tree", "binary tree", "bst"] },
                { label: "graph", terms: ["graph", "bfs", "dfs"] },
                { label: "heap", terms: ["heap", "priority queue"] },
                { label: "sorting and searching", terms: ["sorting", "searching", "binary search"] },
                { label: "dynamic programming", terms: ["dynamic programming", "dp"] }
            ]
        };
    }

    if(goalText.includes("react")){
        return {
            name: "react",
            minCoverage: 0.35,
            minimumVideos: 20,
            targetVideos: 55,
            queryPack: [
                `${withLanguage} react full course playlist`,
                `${withLanguage} react js complete course`,
                `${withLanguage} react projects playlist`
            ],
            topicGroups: [
                { label: "components", terms: ["component", "components"] },
                { label: "hooks", terms: ["hook", "hooks", "useeffect", "usestate"] },
                { label: "routing", terms: ["router", "routing", "react router"] },
                { label: "state", terms: ["state management", "redux", "context"] },
                { label: "api", terms: ["api", "fetch", "axios"] }
            ]
        };
    }

    return {
        name: "general",
        minCoverage: 0.2,
        minimumVideos: 12,
        targetVideos: 45,
        queryPack: [
            `${withLanguage} complete course playlist`,
            `${withLanguage} full course for beginners`,
            `${withLanguage} best playlist`
        ],
        topicGroups: []
    };
};

const getFreshnessScore = (daysSinceLastUpdate) => {
    if(daysSinceLastUpdate <= 240){
        return 1;
    }
    if(daysSinceLastUpdate <= 450){
        return 0.8;
    }
    if(daysSinceLastUpdate <= 730){
        return 0.65;
    }
    if(daysSinceLastUpdate <= 1095){
        return 0.45;
    }
    return 0.25;
};

const getTrustScore = (subscriberCount) => {
    const subscribers = Number(subscriberCount || 0);
    if(subscribers <= 0){
        return 0;
    }
    return Math.min(1, Math.log10(subscribers + 1) / 6);
};

const shouldExcludePlaylist = (title = "", description = "") => {
    const text = normalizeText(`${title} ${description}`);
    const weakSignals = [
        "one shot", "oneshot", "shorts", "single video", "crash course", "part 1", "lecture 1 only"
    ];
    return weakSignals.some((signal) => text.includes(signal));
}

const parseChatSignals = (messages = []) => {
    const userMessages = (messages || []).filter((item) => item?.role === "user");
    const merged = normalizeText(userMessages.map((item) => item?.content || "").join(" "));
    const latest = normalizeText(userMessages[userMessages.length - 1]?.content || "");

    const goalSignals = [];
    if(/dsa|data structure|algorithm|leetcode/.test(merged)){
        goalSignals.push("dsa");
    }
    if(/react|frontend|front end|javascript/.test(merged)){
        goalSignals.push("react");
    }
    if(/backend|node|express/.test(merged)){
        goalSignals.push("backend");
    }
    if(/ai|ml|machine learning|deep learning|llm/.test(merged)){
        goalSignals.push("ai-ml");
    }

    const timeMatch = merged.match(/(\d+(?:\.\d+)?)\s*(hour|hr|hrs|hours|minute|min|mins|minutes)/);
    const languageMatch = merged.match(/\b(javascript|typescript|python|java|c\+\+|c|go|rust|hindi|english)\b/);
    const backgroundSignals = ["beginner", "intermediate", "advanced", "fresher", "experienced"].find((item) => merged.includes(item)) || "";

    const goalText = compactText(latest || merged).slice(0, 220);
    return {
        goal: goalText,
        background: backgroundSignals ? compactText(backgroundSignals) : "",
        timePerDay: timeMatch ? compactText(timeMatch[0]) : "",
        preferredLanguage: languageMatch ? compactText(languageMatch[1]) : "",
        goalSignals
    };
}

const buildMissingPrompt = ({ goal = "", background = "", timePerDay = "", preferredLanguage = "" }) => {
    const missing = [];
    if(!goal){
        missing.push("goal");
    }
    if(!background){
        missing.push("current level/background");
    }
    if(!timePerDay){
        missing.push("time/day");
    }
    if(!preferredLanguage){
        missing.push("preferred language");
    }

    if(!missing.length){
        return "Great, I have enough context. Click Get Recommendations and I will shortlist trusted, complete, and up-to-date playlists.";
    }

    return `Share ${missing.join(", ")} so I can recommend the best complete playlist.`;
}

const safeJsonParse = (text = "") => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = `${text || ""}`.match(/\{[\s\S]*\}/);
        if(match){
            try {
                return JSON.parse(match[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
}

const llmExtractOnboardingSignals = async (messages = []) => {
    const userMessages = (messages || []).filter((item) => item?.role === "user").slice(-10);
    if(!userMessages.length){
        return null;
    }

    try {
        const result = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
You are a strict JSON API.
Extract onboarding details from chat.
Return only JSON:
{
  "goal":"string",
  "background":"string",
  "timePerDay":"string",
  "preferredLanguage":"string",
  "intent":"dsa|react|backend|ai-ml|general",
  "assistantReply":"string"
}
Rules:
- Keep assistantReply short and actionable.
- Ask only for missing crucial fields.
- No markdown.
`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        messages: userMessages
                    })
                }
            ],
            response_format: { type: "json_object" }
        });

        return safeJsonParse(result?.text || "");
    } catch (error) {
        return null;
    }
}

const llmRefineRecommendationOrder = async ({ goal = "", candidates = [] }) => {
    if(!candidates.length){
        return null;
    }

    try {
        const result = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
You are a strict JSON API for ranking course playlist candidates.
Return only JSON:
{
  "rankedPlaylistIds":["id1","id2"],
  "reasons":[{"playlistId":"id","reason":"short reason"}]
}
Rules:
- Preserve trust/completeness signals. Prefer complete up-to-date playlists.
- For DSA, ensure full-topic coverage over narrow sub-topic playlists.
- No markdown.
`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        goal,
                        candidates
                    })
                }
            ],
            response_format: { type: "json_object" }
        });

        return safeJsonParse(result?.text || "");
    } catch (error) {
        return null;
    }
}

export const path1ProfileController = async (req,res) => {
    try {
        const answers = req.body?.answers || {};
        const knownTopics = normalizeTopics(answers.knownTopics || "");
        const payload = {
            ...answers,
            knownTopics
        };

        const createdProfile = await OnboardingProfile.create({
            owner: req.user.username,
            path: "path1",
            goal: answers.targetGoal || "",
            answers: payload
        });

        return sendSuccess(res, 201, "Path 1 profile saved", createdProfile);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to save onboarding profile", error.message);
    }
}

export const path2ChatController = async (req,res) => {
    try {
        const {messages = []} = req.body;
        const heuristicSignals = parseChatSignals(messages);
        const llmSignals = await llmExtractOnboardingSignals(messages);
        const signals = {
            goal: compactText(llmSignals?.goal || heuristicSignals.goal),
            background: compactText(llmSignals?.background || heuristicSignals.background),
            timePerDay: compactText(llmSignals?.timePerDay || heuristicSignals.timePerDay),
            preferredLanguage: compactText(llmSignals?.preferredLanguage || heuristicSignals.preferredLanguage),
            goalSignals: heuristicSignals.goalSignals
        };

        const latestMessage = normalizeText(messages?.[messages.length - 1]?.content || "");
        let reply = llmSignals?.assistantReply || "Tell me your goal, current level, available time/day, and preferred language. I will shortlist trusted and up-to-date full playlists.";

        if(latestMessage.length === 0){
            reply = "Hi! Tell me what you want to learn, your current level, time/day, and preferred language. Then click Get Recommendations.";
        } else if(!llmSignals?.assistantReply){
            if(signals.goalSignals.includes("dsa")){
                reply = `For DSA, I will prioritize complete playlists covering arrays, strings, linked lists, recursion, trees, graphs, and DP. ${buildMissingPrompt(signals)}`;
            } else if(signals.goalSignals.includes("react")){
                reply = `For React, I will prioritize trusted playlists that cover hooks, routing, state management, APIs, and projects. ${buildMissingPrompt(signals)}`;
            } else if(signals.goalSignals.includes("ai-ml")){
                reply = `For AI/ML, I will prioritize updated playlists with practical implementation and core theory balance. ${buildMissingPrompt(signals)}`;
            } else {
                reply = buildMissingPrompt(signals);
            }
        }

        return sendSuccess(res, 200, "Chat response generated", {
            role: "assistant",
            content: reply,
            extracted: {
                goal: signals.goal,
                background: signals.background,
                timePerDay: signals.timePerDay,
                preferredLanguage: signals.preferredLanguage
            }
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to process chat", error.message);
    }
}

export const path2RecommendController = async (req,res) => {
    try {
        const {goal = "", background = "", timePerDay = "", preferredLanguage = ""} = req.body;
        const normalizedGoal = compactText(goal);
        const normalizedBackground = compactText(background);
        const normalizedTimePerDay = compactText(timePerDay);
        const normalizedPreferredLanguage = compactText(preferredLanguage);

        if(!normalizedGoal || normalizedGoal.length < 6){
            return sendError(res, 400, "Please provide a clearer learning goal");
        }
        if(!process.env.YT_API_KEY){
            return sendError(res, 500, "YouTube API key is missing");
        }

        const track = resolveTrack(normalizedGoal, normalizedPreferredLanguage);
        const searchResults = await Promise.all(
            track.queryPack.map((query) =>
                axios.get(`${YOUTUBE_API_BASE}/search`, {
                    params: {
                        key: process.env.YT_API_KEY,
                        part: "snippet",
                        type: "playlist",
                        maxResults: 8,
                        q: query
                    }
                })
            )
        );

        const playlistIds = Array.from(new Set(
            searchResults.flatMap((res) => (res?.data?.items || []).map((item) => item?.id?.playlistId).filter(Boolean))
        )).slice(0, 20);

        if(playlistIds.length === 0){
            return sendError(res, 404, "No playlist recommendations found");
        }

        const playlistDetailsResponse = await axios.get(`${YOUTUBE_API_BASE}/playlists`, {
            params: {
                key: process.env.YT_API_KEY,
                part: "snippet,contentDetails",
                id: playlistIds.join(","),
                maxResults: 50
            }
        });

        const playlistDetails = playlistDetailsResponse?.data?.items || [];
        const channelIds = Array.from(new Set(playlistDetails.map((item) => item?.snippet?.channelId).filter(Boolean)));
        let channelsMap = {};

        if(channelIds.length){
            const channelsResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
                params: {
                    key: process.env.YT_API_KEY,
                    part: "snippet,statistics",
                    id: channelIds.join(","),
                    maxResults: 50
                }
            });

            channelsMap = (channelsResponse?.data?.items || []).reduce((acc, channel) => {
                acc[channel.id] = channel;
                return acc;
            }, {});
        }

        const scoredPlaylistsRaw = await Promise.all(
            playlistDetails.map(async (playlist) => {
                try {
                const playlistId = playlist?.id;
                const playlistTitle = playlist?.snippet?.title || "Untitled Playlist";
                const playlistDescription = playlist?.snippet?.description || "";
                if(shouldExcludePlaylist(playlistTitle, playlistDescription)){
                    return null;
                }
                const channelTitle = playlist?.snippet?.channelTitle || "Unknown Channel";
                const channelId = playlist?.snippet?.channelId || "";
                const itemCount = Number(playlist?.contentDetails?.itemCount || 0);
                if(itemCount < track.minimumVideos){
                    return null;
                }

                let pageToken = "";
                const playlistVideos = [];
                for(let i = 0; i < 3; i++){
                    const playlistItemsResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
                        params: {
                            key: process.env.YT_API_KEY,
                            part: "snippet",
                            playlistId,
                            maxResults: 50,
                            pageToken: pageToken || undefined
                        }
                    });
                    const batch = playlistItemsResponse?.data?.items || [];
                    playlistVideos.push(...batch);
                    pageToken = playlistItemsResponse?.data?.nextPageToken || "";
                    if(!pageToken){
                        break;
                    }
                }

                const latestVideoDate = playlistVideos
                    .map((item) => item?.snippet?.publishedAt)
                    .filter(Boolean)
                    .sort()
                    .reverse()?.[0] || playlist?.snippet?.publishedAt;

                const searchableText = normalizeText([
                    playlistTitle,
                    playlistDescription,
                    channelTitle,
                    ...playlistVideos.map((item) => item?.snippet?.title || ""),
                    ...playlistVideos.map((item) => item?.snippet?.description || "")
                ].join(" "));

                const { score: coverageScore, matchedTopics } = getCoverageScore(searchableText, track.topicGroups);
                const daysSinceLastUpdate = getDaysSince(latestVideoDate);
                const freshnessScore = getFreshnessScore(daysSinceLastUpdate);
                const trustScore = getTrustScore(channelsMap[channelId]?.statistics?.subscriberCount || 0);
                const completenessScore = Math.min(1, itemCount / track.targetVideos);
                const titleQualityBoost = /complete|full course|playlist|roadmap|bootcamp/.test(normalizeText(playlistTitle)) ? 0.08 : 0;
                const adjustedCoverage = Math.min(1, coverageScore + titleQualityBoost);

                const qualityScore = (
                    (adjustedCoverage * 45) +
                    (trustScore * 27) +
                    (completenessScore * 20) +
                    (freshnessScore * 8)
                );

                return {
                    playlistId,
                    title: playlistTitle,
                    playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
                    channelTitle,
                    subscriberCount: Number(channelsMap[channelId]?.statistics?.subscriberCount || 0),
                    videoCount: itemCount,
                    coverageScore: adjustedCoverage,
                    completenessScore,
                    freshnessScore,
                    qualityScore: Number(qualityScore.toFixed(2)),
                    lastUpdated: latestVideoDate,
                    matchedTopics
                };
                } catch (error) {
                    return null;
                }
            })
        );

        const scoredPlaylists = scoredPlaylistsRaw
            .filter(Boolean)
            .filter((item) => item.videoCount >= track.minimumVideos)
            .filter((item) => item.freshnessScore >= 0.25)
            .filter((item) => item.coverageScore >= track.minCoverage)
            .filter((item) => item.subscriberCount >= 25000 || item.qualityScore >= 75)
            .sort((a, b) => b.qualityScore - a.qualityScore)
            .slice(0, 5);

        if(scoredPlaylists.length === 0){
            return sendError(res, 404, "No strong playlist matches found. Try refining your goal and preferred language.");
        }

        const llmRanking = await llmRefineRecommendationOrder({
            goal: normalizedGoal,
            candidates: scoredPlaylists.map((item) => ({
                playlistId: item.playlistId,
                title: item.title,
                channelTitle: item.channelTitle,
                videoCount: item.videoCount,
                freshnessScore: item.freshnessScore,
                coverageScore: item.coverageScore,
                qualityScore: item.qualityScore,
                matchedTopics: item.matchedTopics
            }))
        });
        const reasonMap = new Map((llmRanking?.reasons || []).map((item) => [item.playlistId, compactText(item.reason)]));
        const rankedOrder = Array.isArray(llmRanking?.rankedPlaylistIds) ? llmRanking.rankedPlaylistIds : [];
        const orderMap = new Map(rankedOrder.map((id, idx) => [id, idx]));
        const rankedPlaylists = [...scoredPlaylists].sort((a, b) => {
            const aRank = orderMap.has(a.playlistId) ? orderMap.get(a.playlistId) : Number.MAX_SAFE_INTEGER;
            const bRank = orderMap.has(b.playlistId) ? orderMap.get(b.playlistId) : Number.MAX_SAFE_INTEGER;
            if(aRank !== bRank){
                return aRank - bRank;
            }
            return b.qualityScore - a.qualityScore;
        });

        const recommendations = rankedPlaylists.map((item) => {
            const matchedTopicsText = item.matchedTopics.length ? item.matchedTopics.slice(0, 4).join(", ") : "core topics";
            const trustedChannelText = item.subscriberCount
                ? `${Math.round(item.subscriberCount / 1000)}K+ subscribers`
                : "trusted learning channel";
            const llmReason = reasonMap.get(item.playlistId);

            return {
                title: item.title,
                playlistUrl: item.playlistUrl,
                playlistId: item.playlistId,
                channelTitle: item.channelTitle,
                videoCount: item.videoCount,
                lastUpdated: item.lastUpdated,
                score: item.qualityScore,
                matchedTopics: item.matchedTopics,
                reason: llmReason || `High confidence match for ${normalizedGoal || "your goal"} with strong topic coverage (${matchedTopicsText}), ${item.videoCount} videos, and ${trustedChannelText}.`
            };
        });

        const bestChoice = recommendations[0];

        const createdProfile = await OnboardingProfile.create({
            owner: req.user.username,
            path: "path2",
            goal: normalizedGoal,
            answers: {
                background: normalizedBackground,
                timePerDay: normalizedTimePerDay,
                preferredLanguage: normalizedPreferredLanguage
            },
            recommendations
        });

        return sendSuccess(res, 200, "Recommendations generated", {
            profileId: createdProfile._id,
            recommendations,
            bestChoice
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to generate recommendations", error.message);
    }
}

export const path2SelectController = async (req,res) => {
    try {
        const {profileId, playlistId} = req.body;
        const profile = await OnboardingProfile.findOne({
            _id: profileId,
            owner: req.user.username
        });

        if(!profile){
            return sendError(res, 404, "Onboarding profile not found");
        }

        const selected = profile.recommendations.find((item) => item.playlistId === playlistId);
        if(!selected){
            return sendError(res, 404, "Selected recommendation not found");
        }

        return sendSuccess(res, 200, "Recommendation selected", {
            selected,
            answers: profile.answers
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to select recommendation", error.message);
    }
}
