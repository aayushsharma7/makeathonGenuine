import mongoose from "mongoose";

const notesModel = new mongoose.Schema({
    videoId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        required: true
    },
    timestamp: {
        type: Number,
        default: 0,
        required: true
    },
    notesContent: {
        type: String,
        default: "",
        required: true
    }
},{timestamps: true});


export const Notes = mongoose.model("Notes", notesModel);