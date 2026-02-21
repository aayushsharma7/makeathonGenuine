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
            password: hashedPassword
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
            lastCoursePlayed: user.lastCoursePlayed
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
        lastCoursePlayed: req.user.lastCoursePlayed
    });
}
