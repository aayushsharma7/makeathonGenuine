import mongoose from "mongoose";

const summaryModel = new mongoose.Schema({
    videoId:{
        type:String,
        required: true
    },
    summary: {
        type: String,
        required:true
    }
    
},{timestamps: true});


export const Summary = mongoose.model("Summary", summaryModel);