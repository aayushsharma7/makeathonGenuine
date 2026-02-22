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
    },
    category: {
        type: String,
        default: "theory"
    },
    reviewLevel: {
        type: Number,
        default: 0
    },
    nextReviewAt: {
        type: Date,
        default: Date.now
    },
    lastReviewedAt: {
        type: Date,
        default: null
    },
    reviewHistory: [{
        reviewedAt: {
            type: Date,
            default: Date.now
        },
        rating: {
            type: Number,
            default: 3
        },
        nextReviewAt: {
            type: Date,
            default: Date.now
        }
    }],
    isArchived: {
        type: Boolean,
        default: false
    }
},{timestamps: true});


export const Notes = mongoose.model("Notes", notesModel);
