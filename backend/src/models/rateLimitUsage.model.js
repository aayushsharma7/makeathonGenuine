import mongoose from "mongoose";

const rateLimitUsageModel = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    owner: {
        type: String,
        required: true
    },
    plan: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    bucketType: {
        type: String,
        enum: ["minute", "day"],
        required: true
    },
    bucketKey: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        default: 0
    },
    limit: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

rateLimitUsageModel.index({ key: 1 }, { unique: true });
rateLimitUsageModel.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitUsage = mongoose.model("RateLimitUsage", rateLimitUsageModel);

