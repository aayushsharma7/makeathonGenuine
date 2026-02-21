import mongoose from "mongoose";

const videoModel = new mongoose.Schema({
    playlist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    title:{
        type: String,
        required: true,
        default: ""
    },
    description:{
        type: String,
        default: ""
    },
    channelId:{
        type: String,
        required: true,        
        default: ""
    },
    channelTitle:{
        type: String,
        required: true,
        default: ""        
    },
    thumbnail:{
        type: String,
        default: ""
    },
    videoId:{
        type: String,
        required: true ,
        default: "" 
    },
    duration:{
        type: String,
        default: ""
    },
    progressTime: {
        type: Number,
        default: 0,
    },
    totalDuration: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    },
    notes:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notes",
    }],
    owner: {
        type: String,
    },
    topicTags: [{
        type: String
    }],
    recommendationAction: {
        type: String,
        default: "watch"
    },
    recommendationReason: {
        type: String,
        default: ""
    },
    moduleTitle: {
        type: String,
        default: "General"
    },
    priorityScore: {
        type: Number,
        default: 50
    }

},{timestamps: true});


export const Video = mongoose.model("Video", videoModel);
