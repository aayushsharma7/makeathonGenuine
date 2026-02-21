import mongoose from "mongoose";

const transcriptModel = new mongoose.Schema({
    videoId:{
        type: String,
        required: true
    },
    transcript:[{
        text: String,
        duration: Number,
        offset: Number,
        lang: String
    }]
},{timestamps: true});


export const Transcript = mongoose.model("Transcript", transcriptModel);