import { sendError } from "../utils/apiResponse.js";
import { RateLimitUsage } from "../models/rateLimitUsage.model.js";

const inMemoryRateStore = new Map();

const PLAN_LIMITS = {
    free: {
        aiTutor: { perMinute: 6, perDay: 80 },
        quizGenerate: { perMinute: 4, perDay: 50 },
        quizSubmit: { perMinute: 8, perDay: 120 },
        summaryGenerate: { perMinute: 2, perDay: 20 },
        problemsGenerate: { perMinute: 2, perDay: 20 },
        onboardingChat: { perMinute: 8, perDay: 80 },
        onboardingRecommend: { perMinute: 3, perDay: 20 },
        onboardingSave: { perMinute: 12, perDay: 120 },
        youtubeImport: { perMinute: 2, perDay: 15 },
        ragPrewarm: { perMinute: 8, perDay: 120 },
        moduleRebuild: { perMinute: 2, perDay: 20 }
    },
    student: {
        aiTutor: { perMinute: 12, perDay: 260 },
        quizGenerate: { perMinute: 8, perDay: 180 },
        quizSubmit: { perMinute: 15, perDay: 360 },
        summaryGenerate: { perMinute: 5, perDay: 90 },
        problemsGenerate: { perMinute: 5, perDay: 90 },
        onboardingChat: { perMinute: 18, perDay: 260 },
        onboardingRecommend: { perMinute: 6, perDay: 90 },
        onboardingSave: { perMinute: 24, perDay: 400 },
        youtubeImport: { perMinute: 4, perDay: 60 },
        ragPrewarm: { perMinute: 18, perDay: 400 },
        moduleRebuild: { perMinute: 6, perDay: 80 }
    },
    pro: {
        aiTutor: { perMinute: 40, perDay: 2000 },
        quizGenerate: { perMinute: 30, perDay: 1200 },
        quizSubmit: { perMinute: 50, perDay: 2500 },
        summaryGenerate: { perMinute: 20, perDay: 700 },
        problemsGenerate: { perMinute: 20, perDay: 700 },
        onboardingChat: { perMinute: 50, perDay: 2000 },
        onboardingRecommend: { perMinute: 20, perDay: 700 },
        onboardingSave: { perMinute: 60, perDay: 3000 },
        youtubeImport: { perMinute: 15, perDay: 400 },
        ragPrewarm: { perMinute: 60, perDay: 3000 },
        moduleRebuild: { perMinute: 20, perDay: 300 }
    }
};

const normalizePlan = (plan = "") => {
    const safe = `${plan || ""}`.trim().toLowerCase();
    if(["free", "student", "pro"].includes(safe)){
        return safe;
    }
    return "free";
}

const getDayKey = () => {
    return new Date().toISOString().slice(0, 10);
}

const getMinuteKey = () => {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = `${now.getUTCMonth() + 1}`.padStart(2, "0");
    const dd = `${now.getUTCDate()}`.padStart(2, "0");
    const hh = `${now.getUTCHours()}`.padStart(2, "0");
    const min = `${now.getUTCMinutes()}`.padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

const checkAndIncrementBucket = ({ userId, action, bucketType, bucketKey, limit }) => {
    if(!limit || limit <= 0){
        return { allowed: true, remaining: 0 };
    }

    const storeKey = `${userId}:${action}:${bucketType}:${bucketKey}`;
    const current = inMemoryRateStore.get(storeKey);
    const now = Date.now();
    if(current?.expiresAt && current.expiresAt <= now){
        inMemoryRateStore.delete(storeKey);
    }
    const nextCount = (inMemoryRateStore.get(storeKey)?.count || 0) + 1;
    const expiryDate = getExpiryDate(bucketType);
    inMemoryRateStore.set(storeKey, {
        count: nextCount,
        expiresAt: expiryDate.getTime()
    });

    if(nextCount > limit){
        return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: Math.max(0, limit - nextCount) };
}

const getExpiryDate = (bucketType = "minute") => {
    const now = new Date();
    if(bucketType === "minute"){
        return new Date(now.getTime() + (3 * 60 * 1000));
    }
    return new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
}

const checkAndIncrementBucketMongo = async ({ userId, plan, action, bucketType, bucketKey, limit }) => {
    if(!limit || limit <= 0){
        return { allowed: true, remaining: 0 };
    }

    const key = `${userId}:${action}:${bucketType}:${bucketKey}`;
    const expiry = getExpiryDate(bucketType);
    let doc;
    try {
        doc = await RateLimitUsage.findOneAndUpdate(
            { key },
            {
                $setOnInsert: {
                    key,
                    owner: userId,
                    plan,
                    action,
                    bucketType,
                    bucketKey
                },
                $set: {
                    limit,
                    expiresAt: expiry
                },
                $inc: {
                    count: 1
                }
            },
            {
                upsert: true,
                new: true
            }
        );
    } catch (error) {
        if(error?.code !== 11000){
            throw error;
        }
        doc = await RateLimitUsage.findOneAndUpdate(
            { key },
            {
                $set: {
                    limit,
                    expiresAt: expiry
                },
                $inc: {
                    count: 1
                }
            },
            { new: true }
        );
    }

    const count = doc?.count || 0;
    if(count > limit){
        return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: Math.max(0, limit - count) };
}

export const planRateLimit = (actionKey = "") => {
    return async (req,res,next) => {
        try {
            const userId = `${req.user?._id || ""}`;
            if(!userId || !actionKey){
                return next();
            }

            const plan = normalizePlan(req.user?.plan || "free");
            const actionLimit = PLAN_LIMITS[plan]?.[actionKey];
            if(!actionLimit){
                return next();
            }

            let minuteCheck;
            let dayCheck;
            try {
                minuteCheck = await checkAndIncrementBucketMongo({
                    userId,
                    plan,
                    action: actionKey,
                    bucketType: "minute",
                    bucketKey: getMinuteKey(),
                    limit: actionLimit.perMinute
                });
                dayCheck = await checkAndIncrementBucketMongo({
                    userId,
                    plan,
                    action: actionKey,
                    bucketType: "day",
                    bucketKey: getDayKey(),
                    limit: actionLimit.perDay
                });
            } catch (dbError) {
                // Fallback to in-memory counters if DB operation fails.
                minuteCheck = checkAndIncrementBucket({
                    userId,
                    action: actionKey,
                    bucketType: "minute",
                    bucketKey: getMinuteKey(),
                    limit: actionLimit.perMinute
                });
                dayCheck = checkAndIncrementBucket({
                    userId,
                    action: actionKey,
                    bucketType: "day",
                    bucketKey: getDayKey(),
                    limit: actionLimit.perDay
                });
            }

            if(!minuteCheck.allowed){
                res.setHeader("Retry-After", "60");
                return sendError(
                    res,
                    429,
                    `Rate limit reached for ${actionKey}. Upgrade plan or retry after a minute.`,
                    null,
                    {
                        plan,
                        action: actionKey,
                        limitWindow: "minute"
                    }
                );
            }

            if(!dayCheck.allowed){
                const now = new Date();
                const nextUtcMidnight = Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate() + 1,
                    0,
                    0,
                    0
                );
                const secondsToMidnight = Math.max(1, Math.ceil((nextUtcMidnight - now.getTime()) / 1000));
                res.setHeader("Retry-After", `${secondsToMidnight}`);
                return sendError(
                    res,
                    429,
                    `Daily rate limit reached for ${actionKey}. Upgrade plan to continue.`,
                    null,
                    {
                        plan,
                        action: actionKey,
                        limitWindow: "day"
                    }
                );
            }

            res.setHeader("X-RatePlan", plan);
            res.setHeader("X-RateAction", actionKey);
            res.setHeader("X-RateRemainingMinute", `${minuteCheck.remaining}`);
            res.setHeader("X-RateRemainingDay", `${dayCheck.remaining}`);
            return next();
        } catch (error) {
            return sendError(res, 500, "Rate limiter failed", error.message);
        }
    };
};
