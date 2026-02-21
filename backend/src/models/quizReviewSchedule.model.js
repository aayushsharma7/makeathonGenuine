import mongoose from "mongoose";

const quizReviewScheduleModel = new mongoose.Schema({
    owner: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    videoDbId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        required: true
    },
    videoId: {
        type: String,
        required: true
    },
    conceptTag: {
        type: String,
        required: true
    },
    stage: {
        type: Number,
        default: 0
    },
    nextReviewAt: {
        type: Date,
        required: true
    },
    lastAccuracy: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

quizReviewScheduleModel.index({
    owner: 1,
    courseId: 1,
    videoDbId: 1,
    conceptTag: 1
}, { unique: true });

quizReviewScheduleModel.index({ owner: 1, courseId: 1, nextReviewAt: 1 });

export const QuizReviewSchedule = mongoose.model("QuizReviewSchedule", quizReviewScheduleModel);
