import mongoose from "mongoose";

const onboardingProfileModel = new mongoose.Schema({
    owner: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    goal: {
        type: String,
        default: ""
    },
    answers: {
        experienceLevel: String,
        timePerDay: String,
        learningStyle: String,
        goalUrgency: String,
        codingConfidence: String,
        priorExposure: String,
        targetGoal: String,
        knownTopics: [String],
        preferredLanguage: String,
        background: String
    },
    recommendations: [{
        title: String,
        playlistUrl: String,
        playlistId: String,
        reason: String,
        channelTitle: String,
        videoCount: Number,
        lastUpdated: String,
        score: Number,
        matchedTopics: [String]
    }]
},{timestamps: true});

export const OnboardingProfile = mongoose.model("OnboardingProfile", onboardingProfileModel);
