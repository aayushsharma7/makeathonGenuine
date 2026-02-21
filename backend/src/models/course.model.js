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
    completedVideos: [{
        type: Number,
    }],
    lastVideoPlayed: {
        type: Number,
        default: 0
    }

},{timestamps: true});


export const Course = mongoose.model("Course", courseModel);