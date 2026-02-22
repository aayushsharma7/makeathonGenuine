import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctOptionIndex: {
        type: Number,
        required: true
    },
    conceptTag: {
        type: String,
        default: "general"
    },
    difficulty: {
        type: String,
        default: "medium"
    },
    explanation: {
        type: String,
        default: ""
    },
    hint: {
        type: String,
        default: ""
    },
    sourceStartSeconds: {
        type: Number,
        default: 0
    },
    sourceEndSeconds: {
        type: Number,
        default: 0
    },
    sourceContext: {
        type: String,
        default: ""
    }
}, { _id: false });

const quizModel = new mongoose.Schema({
    videoDbId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        required: true
    },
    videoId: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    questions: [quizQuestionSchema]
}, { timestamps: true });

quizModel.index({ videoDbId: 1, owner: 1 }, { unique: true });

export const Quiz = mongoose.model("Quiz", quizModel);
