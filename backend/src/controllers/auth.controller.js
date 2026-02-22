import bcrypt from "bcrypt"
import { User } from "../models/user.model.js";
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { sendError, sendSuccess } from "../utils/apiResponse.js";


export const signupController = async (req,res) => {
    try {
        console.log(req.body);
        const {username, email, password} = req.body;
        const emailCheck = await User.findOne({email:email});
        const nameCheck = await User.findOne({username:username});

        if(emailCheck){
            return sendError(res, 409, "User already exists");
        }

        if(nameCheck){
            return sendError(res, 409, "Username already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            plan: "free",
            planUpdatedAt: new Date()
        })
        await newUser.save();

        console.log("User saved successfully!")
        return sendSuccess(res, 201, "User successfully created");
        
    } catch (error) {
        return sendError(res, 500, "Error occured", error.message);
    }
}
export const loginController = async (req,res) => {
    try {
        const {email,password} = req.body;
        const user  = await User.findOne({email});
        if(!user){
            return sendError(res, 404, "User not found");
        }

        const passwordCheck  = await bcrypt.compare(password, user.password)
        if(!passwordCheck){
            return sendError(res, 401, "Email or password is wrong");
        }

        const token = jwt.sign({
            username: user.username,
            email,
            id: user._id,
            createdAt: user.createdAt,
            lastCoursePlayed: user.lastCoursePlayed
        },process.env.JWT_SECRET,{expiresIn: '1d'})
        res.cookie("token",token,{
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 1 * 24 * 60 * 60 * 1000
        });

        return sendSuccess(res, 200, "Logged in", {
            username: user.username,
            email: user.email,
            id: user._id,
            createdAt: user.createdAt,
            lastCoursePlayed: user.lastCoursePlayed,
            plan: user.plan || "free"
        });
        
    } catch (error) {
        return sendError(res, 500, "Error occured", error.message);
    }
}
export const logoutController = async (req,res) => {
    if(!req.cookies.token){
        return sendError(res, 401, "User not logged in")
    }

    res.clearCookie("token",{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    })
    return sendSuccess(res, 200, "Logged out Successfully")
}

export const continueController = async (req,res) => {
    return sendSuccess(res, 200, "User verified", {
        username: req.user.username,
        email: req.user.email,
        id: req.user._id,
        createdAt: req.user.createdAt,
        lastCoursePlayed: req.user.lastCoursePlayed,
        plan: req.user.plan || "free",
        planUpdatedAt: req.user.planUpdatedAt || null,
        heatmapActivity: req.user.heatmapActivity || [],
        courseDailyProgress: req.user.courseDailyProgress || [],
        planPaymentHistory: req.user.planPaymentHistory || []
    });
}

export const getPlanController = async (req,res) => {
    return sendSuccess(res, 200, "Plan fetched successfully", {
        plan: req.user.plan || "free",
        planUpdatedAt: req.user.planUpdatedAt || null,
        paymentHistory: req.user.planPaymentHistory || []
    });
}

export const updatePlanController = async (req,res) => {
    try {
        const { plan = "free" } = req.body;
        const normalized = `${plan || ""}`.trim().toLowerCase();
        if(!["free", "student", "pro"].includes(normalized)){
            return sendError(res, 400, "Invalid plan");
        }

        req.user.plan = normalized;
        req.user.planUpdatedAt = new Date();
        await req.user.save();

        return sendSuccess(res, 200, "Plan updated successfully", {
            plan: req.user.plan,
            planUpdatedAt: req.user.planUpdatedAt
        });
    } catch (error) {
        return sendError(res, 500, "Error occured", error.message);
    }
}

export const checkoutTestController = async (req,res) => {
    try {
        const { plan = "", amount = 0, currency = "INR" } = req.body;
        const normalized = `${plan || ""}`.trim().toLowerCase();
        if(!["student", "pro"].includes(normalized)){
            return sendError(res, 400, "Invalid paid plan");
        }

        const paidAmount = Number(amount || 0);
        req.user.plan = normalized;
        req.user.planUpdatedAt = new Date();
        req.user.planPaymentHistory = [
            {
                plan: normalized,
                amount: Number.isFinite(paidAmount) ? paidAmount : 0,
                currency: `${currency || "INR"}`.trim().toUpperCase() || "INR",
                paymentStatus: "success",
            transactionRef: `TEST_${Date.now()}_${Math.floor(Math.random() * 10000)}`
        },
            ...(req.user.planPaymentHistory || [])
        ].slice(0, 20);
        await req.user.save();

        return sendSuccess(res, 200, "Test payment successful", {
            plan: req.user.plan,
            planUpdatedAt: req.user.planUpdatedAt,
            paymentHistory: req.user.planPaymentHistory || []
        });
    } catch (error) {
        return sendError(res, 500, "Error occured", error.message);
    }
}

// Backward-compatible export for existing imports/routes.
export const checkoutSandboxController = checkoutTestController;

export const activitySummaryController = async (req,res) => {
    try {
        const activity = req.user.heatmapActivity || [];
        const map = {};
        activity.forEach((item) => {
            if(!item?.date){
                return;
            }
            map[item.date] = {
                count: item.count || 0,
                minutes: item.minutes || 0
            };
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let streak = 0;
        for(let i = 0; i < 365; i += 1){
            const probe = new Date(today);
            probe.setDate(today.getDate() - i);
            const key = probe.toISOString().slice(0, 10);
            if(map[key]?.count > 0){
                streak += 1;
            } else {
                break;
            }
        }

        return sendSuccess(res, 200, "Activity summary fetched successfully", {
            heatmap: map,
            streak,
            totalActiveDays: Object.keys(map).length
        });
    } catch (error) {
        return sendError(res, 500, "Error occured", error.message);
    }
}
