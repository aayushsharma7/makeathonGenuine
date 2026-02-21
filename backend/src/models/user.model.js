import mongoose from "mongoose";

const userModel = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    lastCoursePlayed: {
        type: String
    },
    heatmapActivity: [{
        date: {
            type: String
        },
        count: {
            type: Number,
            default: 0
        },
        minutes: {
            type: Number,
            default: 0
        }
    }],
    courseDailyProgress: [{
        date: {
            type: String
        },
        courseId: {
            type: String
        },
        completedVideos: {
            type: Number,
            default: 0
        },
        completedMinutes: {
            type: Number,
            default: 0
        }
    }]
    
},{timestamps: true})

export const User = mongoose.model('User', userModel);
