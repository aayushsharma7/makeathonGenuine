import axios from "axios";
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
        const latestMessage = normalizeText(messages?.[messages.length - 1]?.content || "");
        let reply = "Share your target role, current level, and time/day. I will shortlist trusted and up-to-date full playlists.";

        if(latestMessage.includes("dsa") || latestMessage.includes("data structure") || latestMessage.includes("algorithms")){
            reply = "For DSA, I will prioritize complete playlists that include arrays, strings, linked lists, trees, graphs, recursion, DP, and interview-level problems. Share your timeline and language preference.";
        } else if(latestMessage.includes("react") || latestMessage.includes("frontend")){
            reply = "I will prioritize trusted React playlists that include hooks, routing, projects, and modern best practices. Share your current JS level and target timeline.";
        } else if(latestMessage.length === 0){
            reply = "Hi! Tell me what you want to learn, your current level, time/day, and preferred language. Then click Get Recommendations.";
        }

        return sendSuccess(res, 200, "Chat response generated", {
            role: "assistant",
            content: reply
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to process chat", error.message);
    }
}

export const path2RecommendController = async (req,res) => {
    try {
        const {goal = "", background = "", timePerDay = "", preferredLanguage = ""} = req.body;
        if(!process.env.YT_API_KEY){
            return sendError(res, 500, "YouTube API key is missing");
        }

        const track = resolveTrack(goal, preferredLanguage);
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
                const channelTitle = playlist?.snippet?.channelTitle || "Unknown Channel";
                const channelId = playlist?.snippet?.channelId || "";
                const itemCount = Number(playlist?.contentDetails?.itemCount || 0);

                const playlistItemsResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
                    params: {
                        key: process.env.YT_API_KEY,
                        part: "snippet",
                        playlistId,
                        maxResults: 40
                    }
                });

                const playlistVideos = playlistItemsResponse?.data?.items || [];
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

                const qualityScore = (
                    (coverageScore * 45) +
                    (trustScore * 25) +
                    (completenessScore * 20) +
                    (freshnessScore * 10)
                );

                return {
                    playlistId,
                    title: playlistTitle,
                    playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
                    channelTitle,
                    subscriberCount: Number(channelsMap[channelId]?.statistics?.subscriberCount || 0),
                    videoCount: itemCount,
                    coverageScore,
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
            .sort((a, b) => b.qualityScore - a.qualityScore)
            .slice(0, 5);

        if(scoredPlaylists.length === 0){
            return sendError(res, 404, "No strong playlist matches found. Try refining your goal and preferred language.");
        }

        const recommendations = scoredPlaylists.map((item) => {
            const matchedTopicsText = item.matchedTopics.length ? item.matchedTopics.slice(0, 4).join(", ") : "core topics";
            const trustedChannelText = item.subscriberCount
                ? `${Math.round(item.subscriberCount / 1000)}K+ subscribers`
                : "trusted learning channel";

            return {
                title: item.title,
                playlistUrl: item.playlistUrl,
                playlistId: item.playlistId,
                channelTitle: item.channelTitle,
                videoCount: item.videoCount,
                lastUpdated: item.lastUpdated,
                score: item.qualityScore,
                matchedTopics: item.matchedTopics,
                reason: `High confidence match for ${goal || "your goal"} with strong topic coverage (${matchedTopicsText}), ${item.videoCount} videos, and ${trustedChannelText}.`
            };
        });

        const bestChoice = recommendations[0];

        const createdProfile = await OnboardingProfile.create({
            owner: req.user.username,
            path: "path2",
            goal,
            answers: {
                background,
                timePerDay,
                preferredLanguage
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
