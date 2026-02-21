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



export const courseController = async (req,res) => {
    try {

        const playlistID = await req.body.url.split('list=')[1];
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
                lastVideoPlayed: 0
            })
            newCourse.save();

            const videoArray = courseData.data.items.filter((e) => e.snippet.title !== "Deleted video" && e.snippet.title !== "Private video").map((vid,idx) => { //array of vid objects
                return {
                    playlist: newCourse._id,
                    title:vid.snippet.title ?? "No title",  // ?? is nullish check basically provides default value incase its null/undefined
                    description:vid.snippet.description ?? "No description",
                    channelId:vid.snippet.channelId,
                    channelTitle:vid.snippet.channelTitle,
                    thumbnail:vid.snippet.thumbnails.maxres?.url || vid.snippet.thumbnails.standard?.url || vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.default?.url,
                    //maxres wasnt available in some vids so set OR
                    videoId:vid.snippet.resourceId.videoId,
                    duration:videoData.data?.items?.[idx]?.contentDetails?.duration ?? "PT0S",
                    progressTime: 0,
                    totalDuration: 0,
                    completed: false,
                    owner: req.user.username
                }
            })

            const videosAll = await Video.insertMany(videoArray)

            const videoIDs = videosAll.map((vid,idx) => {
                return vid._id;
            })
            
            const updatedCourse  = await Course.findByIdAndUpdate(newCourse._id, {
                videos: videoIDs
            })

            res.status(200).send(`Course created successfully` );
        }
        else{
            res.status(409).send("Already Exists");
            console.log("Course not created: Already Exists");
        }

    } catch (error) {
        res.status(400).send("Error occured")
        console.log("error: ",error)
    }
}


export const getCourse =  async (req,res) => {
    try {
        const courses = await Course.find({
            owner: req.user.username
        })
        if(courses.length===0){
            res.status(200).send("No courses found")
        }
        else{
            res.status(200).send(courses)
        }
    } catch (error) {
        console.log(error)
    }
}
export const getSingleCourse =  async (req,res) => {
    try {
        const courses = await Course.find({
            _id: req.params.id
        })
        if(courses.length===0){
            res.status(200).send("No courses found")
        }
        else{
            res.status(200).send(courses)
        }
    } catch (error) {
        console.log(error)
    }
}

export const getVideo =  async (req,res) => {
    try {
        const {videoId} = req.body;
        const video =  await Video.find({
            videoId,
            owner: req.user.username
        });
        if(video.length === 0){
            // console.log("ho")
            res.status(200).send({
                code: 404,
                data: "No video found"
            });
        }
        else{
            // console.log("ha")
            res.status(200).send({
                code: 200,
                data: video[0]
            });
        }
        
    } catch (error) {
        console.log(error)
    }
}

export const getCourseData = async(req,res) => {

    try {
        const courses = await Video.find({
            playlist: req.params.id
        })
        if(courses.length===0){
            res.status(200).send("No courses found")
        }
        else{
            res.status(200).send(courses)
        }
    } catch (error) {
        console.log(error);
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
            res.status(200).send(result.text);
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
            res.status(200).send(result.text);
        }
        

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Server Error" });
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
            res.status(200).json(data);
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
            res.status(200).json(newSummary);
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
        res.status(500).json({ error: "Server Error" });
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
            res.status(200).json(data);
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
            res.status(200).json(newProblems);
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
        res.status(500).json({ error: "Server Error" });
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
        const {completed_videos, last_video_played, courseId} = req.body;
        
        const newUpdatedCourse = await Course.findByIdAndUpdate(courseId, {
            completedVideos: completed_videos,
            lastVideoPlayed: last_video_played,
        });

        res.status(200).send("Course Progress Updated Successfully")
        // console.log("Course Progress Updated Successfully")

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
}
export const updateVideoProgess = async (req,res) => {
    try {
        const {progress_time, duration, completed, videoId} = req.body;
        const newUpdatedVideo = await Video.findByIdAndUpdate(videoId, {
            progressTime: progress_time,
            totalDuration: duration,
            completed: completed
        });

        res.status(200).send({
            data: "Video Progress Updated Successfully"
        })
                // console.log("Video Progress Updated Successfully")


    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
}

export const updateVideoNotes = async (req,res) => {
    try {
        const {newNote, videoId} = req.body;
        const createdNewNote = new Notes(newNote);
        createdNewNote.save();
        const resp = await Video.findById(videoId);
        resp.notes.push(createdNewNote._id);
        await resp.save();
        // console.log({ 
        //     message: "Note updated successfully", notes: resp.notes
        // })
        res.status(200).json({ 
            message: "Note updated successfully", notes: resp.notes
        });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
}
export const getVideoNotes = async (req,res) => {
    try {
        const notes = await Notes.find({
            videoId: req.params.id
        })
        if(notes.length===0){
            res.status(200).send([{
                videoId: req.params.id,
                timestamp: 200,
                notesContent: "Sample Note"
            }])
        }
        else{
            res.status(200).send(notes);
            // console.log("Notes: ",notes);
        }

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Server Error" });
    }

}

export const updateLastPlayedCourse = async (req,res) => {
    try {
        const {courseId} = req.body;
        const userId = req.user.id;

        const updateLastPlayed = await User.findByIdAndUpdate(userId, {
            lastCoursePlayed: courseId
        });
        
        res.status(200).json({ 
            message: "last played saved successfully", lastplayedId: updateLastPlayed
        });
    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
}
export const deleteVideoNotes = async (req,res) => {
    try {
        const {noteId, videoId} = req.body;
        const resp = await Video.findById(videoId);
        const newArr = resp.notes.filter((e) => (e !== noteId));
        const resp2 = await Notes.findByIdAndDelete(noteId);
        resp.notes = newArr;
        await resp.save();
        // console.log({ 
        //     message: "Note deleted successfully", notes: resp.notes
        // })
        res.status(200).json({ 
            message: "Note deleted successfully", notes: resp.notes
        });
    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Server Error" });
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

