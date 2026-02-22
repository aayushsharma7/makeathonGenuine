import mongoose from "mongoose";

const breakdownSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true
    },
    correct: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    accuracy: {
        type: Number,
        default: 0
    }
}, { _id: false });

const questionReviewSchema = new mongoose.Schema({
    question: String,
    selectedOptionIndex: Number,
    correctOptionIndex: Number,
    selectedOption: String,
    correctOption: String,
    isCorrect: Boolean,
    conceptTag: String,
    difficulty: String,
    explanation: String,
    sourceStartSeconds: Number,
    sourceEndSeconds: Number,
    sourceContext: String
}, { _id: false });

const revisionClipSchema = new mongoose.Schema({
    conceptTag: String,
    startSeconds: Number,
    endSeconds: Number,
    label: String,
    reason: String
}, { _id: false });

const quizAttemptModel = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
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
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    answers: [{
        type: Number
    }],
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    percentage: {
        type: Number,
        required: true
    },
    timeSpentSeconds: {
        type: Number,
        default: 0
    },
    engagement: {
        pauseCount: {
            type: Number,
            default: 0
        },
        avgPlaybackSpeed: {
            type: Number,
            default: 1
        },
        watchedSeconds: {
            type: Number,
            default: 0
        },
        pausePerMinute: {
            type: Number,
            default: 0
        }
    },
    comprehensionScore: {
        type: Number,
        default: 0
    },
    skillLevel: {
        type: String,
        default: "developing"
    },
    canProceed: {
        type: Boolean,
        default: false
    },
    readinessReason: {
        type: String,
        default: ""
    },
    nextStep: {
        type: String,
        default: "reattempt"
    },
    conceptBreakdown: [breakdownSchema],
    difficultyBreakdown: [breakdownSchema],
    strengths: [String],
    weakAreas: [String],
    recommendedActions: [String],
    overallFeedback: {
        type: String,
        default: ""
    },
    questionReview: [questionReviewSchema],
    revisionClips: [revisionClipSchema]
}, { timestamps: true });

quizAttemptModel.index({ quizId: 1, owner: 1, createdAt: -1 });

export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptModel);
