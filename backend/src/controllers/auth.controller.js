import bcrypt, { hash } from "bcrypt"
import { User } from "../models/user.model.js";
import 'dotenv/config'
import jwt from 'jsonwebtoken'


export const signupController = async (req,res) => {
    try {
        console.log(req.body);
        const {username, email, password} = req.body;
        const emailCheck = await User.find({email:email});
        const nameCheck = await User.find({username:username});
        if(emailCheck.length != 0){
            res.status(200).json({
                message: "User already exists",
                code: 409
            })
        }
        else if(nameCheck.length != 0){
            res.status(200).send({
                message: "Username already exists",
                code: 409
            })
        }
        else{
            bcrypt.hash(password, 10, async function(err, hash) {
                try {
                    const newUser = new User({
                        username,
                        email,
                        password: hash
                    })
                    const userInfo = await newUser.save();
                   res.status(200).send({
                    message: "User successfully created",
                    code: 200
                })
                    console.log("User saved successfully!")

                } catch (err) {
                    console.log(err)
                    res.status(401).send("Error occured");
                }
            });
        }
        
    } catch (error) {
        res.status(400).send(error.message);
    }
}
export const loginController = async (req,res) => {
    try {
        const {email,password} = req.body;
        const user  = await User.find({email});
        if(user.length===0){
            res.status(200).send({
                message: "User not found",
                code: 404
            })
        }
        else{
            // res.status(200).send(check)
            const passwordCheck  = await bcrypt.compare(password, user[0].password)
            if(!passwordCheck){
                res.status(200).send({
                    message: "Email or password is wrong",
                    code: 409
                })
            }
            else{
                const token = jwt.sign({

                    username: user[0].username,
                    email,
                    id: user[0]._id,
                    createdAt: user[0].createdAt,
                    lastCoursePlayed: user[0].lastCoursePlayed
                },process.env.JWT_SECRET,{expiresIn: '1d'})
                res.cookie("token",token,{
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                    maxAge: 1 * 24 * 60 * 60 * 1000
                });
                res.status(200).send({
                    message: "Logged in",
                    code: 200,
                    info: user[0]
                });
            }
        }
        
    } catch (error) {
        res.status(400).send(error.message);
    }
}
export const logoutController = async (req,res) => {
    if(!req.cookies.token){
        res.status(200).send({
            message: "User not logged in",
            code: 404
        })
    }
    else{
        res.clearCookie("token",{
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        })
        res.status(200).send({
            message: "Logged out Successfully",
            code: 200
        })
    }
}

export const continueController = async (req,res) => {
    res.send({
        message: "User verified",
        code: 200,
        info: req.user
    });
}
