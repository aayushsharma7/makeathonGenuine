import { User } from "../models/user.model.js";
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { sendError } from "../utils/apiResponse.js";

export const authCheck = async (req,res,next) => {
    // const username = req.params.owner;
    // const userExist = User.find({username});
    // if(userExist.length === 0){
    //     res.status(200).send({
    //         message: "User does not exist",
    //         code: 404
    //     });
    // }
    try {
        if(!req.cookies.token){
            return sendError(res, 401, "Please login to access");
        }

        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        const userFound = await User.findById(decoded.id);

        if(!userFound){
            return sendError(res, 401, "Please login to access");
        }

        req.user = userFound
        next();
    } catch (error) {
        return sendError(res, 401, "Invalid or expired token");
    }
    
}
