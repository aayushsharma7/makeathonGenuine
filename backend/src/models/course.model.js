import mongoose, { mongo } from "mongoose";

const courseModel = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    playlistId:{
        type: String,
        required: true
    },
    thumbnail:{
        type: String,
        required: true
    },
    totalVideos:{
        type: Number,
        required: true
    },
    videos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        required: true
    }],
    owner: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        default: "general"
    },
    targetEndDate: {
        type: Date
    },
    completedVideos: [{
        type: Number,
    }],
    lastVideoPlayed: {
        type: Number,
        default: 0
    },
    recommendedPace: {
        type: String,
        default: "Balanced"
    },
    personalizationProfile: {
        experienceLevel: String,
        timePerDay: String,
        learningStyle: String,
        goalUrgency: String,
        codingConfidence: String,
        priorExposure: String,
        targetGoal: String,
        knownTopics: [String]
    },
    learningModules: [{
        title: String,
        topic: String,
        videos: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video"
        }],
        estimatedMinutes: Number,
        milestone: String
    }],
    onboardingPath: {
        type: String,
        default: "direct"
    }

},{timestamps: true});


export const Course = mongoose.model("Course", courseModel);
