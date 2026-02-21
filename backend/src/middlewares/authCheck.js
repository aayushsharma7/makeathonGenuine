import { User } from "../models/user.model.js";
import 'dotenv/config'
import jwt from 'jsonwebtoken'

export const authCheck = async (req,res,next) => {
    // const username = req.params.owner;
    // const userExist = User.find({username});
    // if(userExist.length === 0){
    //     res.status(200).send({
    //         message: "User does not exist",
    //         code: 404
    //     });
    // }
    if(!req.cookies.token){
        res.status(200).send({
            message: "Please login to access",
            code: 404
        });
    }
    else{
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        const userFound = await User.findById(decoded.id);
        req.user = userFound
        next();
    }
    
}