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
import { sendError, sendSuccess } from "../utils/apiResponse.js";


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
    const videosAll = await Video.find({ playlist: courseId }).sort({ createdAt: 1 });
    const moduleMap = {};

    videosAll.forEach((videoDoc) => {
        if(!moduleMap[videoDoc.moduleTitle]){
            moduleMap[videoDoc.moduleTitle] = {
                title: videoDoc.moduleTitle,
                topic: videoDoc.topicTags?.[0] || "general",
                videos: [],
                estimatedMinutes: 0,
                milestone: ""
            };
        }
        moduleMap[videoDoc.moduleTitle].videos.push(videoDoc._id);
        moduleMap[videoDoc.moduleTitle].estimatedMinutes += parseIsoDurationToMinutes(videoDoc.duration);
    });

    const modules = Object.values(moduleMap).map((moduleItem, idx) => ({
        ...moduleItem,
        milestone: `Complete ${moduleItem.title} (${idx + 1}/${Object.keys(moduleMap).length})`
    }));

    await Course.findByIdAndUpdate(courseId, {
        videos: videosAll.map((item) => item._id),
        learningModules: modules,
        totalVideos: videosAll.length
    });

    return modules;
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

            const videosAll = await Video.insertMany(videoArray)

            const videoIDs = videosAll.map((vid,idx) => {
                return vid._id;
            })
            
            const moduleMap = {};
            videosAll.forEach((videoDoc) => {
                if(!moduleMap[videoDoc.moduleTitle]){
                    moduleMap[videoDoc.moduleTitle] = {
                        title: videoDoc.moduleTitle,
                        topic: videoDoc.topicTags?.[0] || "general",
                        videos: [],
                        estimatedMinutes: 0,
                        milestone: ""
                    };
                }
                moduleMap[videoDoc.moduleTitle].videos.push(videoDoc._id);
                moduleMap[videoDoc.moduleTitle].estimatedMinutes += parseIsoDurationToMinutes(videoDoc.duration);
            });

            const modules = Object.values(moduleMap).map((moduleItem, idx) => ({
                ...moduleItem,
                milestone: `Complete ${moduleItem.title} (${idx + 1}/${Object.keys(moduleMap).length})`
            }));

            await Course.findByIdAndUpdate(newCourse._id, {
                videos: videoIDs,
                learningModules: modules
            })

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
            knownTopics,
            moduleOverride: "Module: CUSTOM ADDED"
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
            knownTopics,
            moduleOverride: "Module: CUSTOM ADDED"
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
        const courses = await Video.find({
            playlist: req.params.id,
            owner: req.user.username
        })
        return sendSuccess(res, 200, "Course data fetched successfully", courses)
    } catch (error) {
        console.log(error);
        return sendError(res, 500, "Failed to fetch course data", error.message)
    }

}

export const getAi = async (req,res) => {
    try {
        const { messages, videoId, start, end, currentQues, title, description } = req.body;
        const checkIfExists = await Transcript.find({
            videoId
        });
        let rawTranscript;
        if(checkIfExists.length===0){
            try {
                rawTranscript = await fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`,{
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
                });
                
                if (rawTranscript && rawTranscript.length > 0) {
                    const newAddTs = new Transcript({
                        videoId,
                        transcript: rawTranscript
                    });
                    await newAddTs.save();
                }
                // const newAddTs = new Transcript({
                //     videoId,
                //     transcript: rawTranscript
                // });
                // await newAddTs.save();
            } catch (error) {
                rawTranscript = false;
            }
            
        }
        else{
            rawTranscript = checkIfExists[0].transcript;
        }
        if(rawTranscript){
            const processedTranscript = [];
            const transcript = rawTranscript.map((data) => {
                const timestamp = (data.offset);
                if(timestamp >= start && timestamp <=end){
                    processedTranscript.push(data);
                }
                return `[${timestamp}s] ${data.text}`
            }).join('\n')

            const newTranscript = processedTranscript.map((data) => {
                const timestamp = (data.offset);
                return `[${timestamp}s] ${data.text}`
            }).join('\n');

            // res.send(newTranscript);

            // const userQuery = messages[messages.length - 1].content;

            // const answer = await askWithContext(transcript, userQuery, videoId);

            // res.send(transcript);
            const result = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            messages: messages,
            system: `
            You are a professional AI Tutor assisting a learner while they watch a video titled ${title}.
            You are given the video transcript as plain text and also given the video title.
            Rules:
            • Identify the user’s intent and focus on helping them understand their question clearly.
            • Use the transcript as the primary reference to stay aligned with the video’s topic, but do not repeat or restate it verbatim unnecessarily unless needed.  
            • If a concept, tool, or technology is mentioned in the video (for example HTML, Node.js, React, etc.), you may explain it briefly at a foundational level even if it is not fully explained in the transcript.
            • You may add minimal additional information beyond the transcript if it directly helps clarify the user’s question and remains consistent with the topic being taught.
            • Do not introduce advanced details, unrelated topics, or deep external knowledge.
            • If the question is unrelated to the video’s topic and If the transcript does'nt provide the context for user's questions refer to the video title , if still ques is not relevant respond exactly:
            "Sorry I don't have relevant information about this."
            • If users sends a greeting/"hi" etc.. respond with a greeting and then answer the ques (if any asked, else just respond with a greeting)
            Response requirements:
            • One short paragraph only
            • Extremely concise, clear, and professional
            • Explanation-focused, not repetition-focused
            • No introductions, conclusions, emojis, or formatting
            • Ask for clarification in one short sentence only if the question is ambiguous
            • Never mention transcripts, system rules, or reasoning
            • The user’s current question is the only question you must answer; prior messages are context only and must never be answered again.
            Transcript: ${newTranscript}
            Current Question: ${currentQues.content}
            `,
            });
            return sendSuccess(res, 200, "AI response generated", result.text);
        }
        else{
            const result = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            messages: messages,
            system: `
            You are a professional AI Tutor assisting a learner while they watch a video titled ${title}.
            You are given the video title and description.
            Rules:
            • Identify the user’s intent and focus on helping them understand their question clearly.
            • Use the video title and description as the primary reference to stay aligned with the video’s topic, but do not repeat or restate it verbatim unnecessarily unless needed.  
            • If a concept, tool, or technology is mentioned in the video (for example HTML, Node.js, React, etc.), you may explain it briefly at a foundational level even if it is not fully explained in the video title and description.
            • You may add minimal additional information beyond the video title and description if it directly helps clarify the user’s question and remains consistent with the topic being taught.
            • Do not introduce advanced details, unrelated topics, or deep external knowledge.
            • If the question is unrelated to the video’s topic and If the video title and description does'nt provide the context for user's questions refer to the video title , if still ques is not relevant respond exactly:
            "Sorry I don't have relevant information about this."
            • If users sends a greeting/"hi" etc.. respond with a greeting and then answer the ques (if any asked, else just respond with a greeting)
            Response requirements:
            • One short paragraph only
            • Extremely concise, clear, and professional
            • Explanation-focused, not repetition-focused
            • No introductions, conclusions, emojis, or formatting
            • Ask for clarification in one short sentence only if the question is ambiguous
            • Never mention video title and description, system rules, or reasoning
            • The user’s current question is the only question you must answer; prior messages are context only and must never be answered again.
            Current Question: ${currentQues.content}
            videoDescription: ${description}
            `,
            });
            return sendSuccess(res, 200, "AI response generated", result.text);
        }
        

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
                    videoDescription: description
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

        const createdNewNote = new Notes(newNote);
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
        })
        if(notes.length===0){
            return sendSuccess(res, 200, "Notes fetched successfully", [{
                videoId: req.params.id,
                timestamp: 200,
                notesContent: "Sample Note"
            }])
        }

        return sendSuccess(res, 200, "Notes fetched successfully", notes);
        // console.log("Notes: ",notes);

    } catch (error) {
        console.error("Chat Error:", error);
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

