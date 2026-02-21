import mongoose from "mongoose";

const problemsModel = new mongoose.Schema({
    videoId:{
        type:String,
        required: true
    },
    relevant: {
        type: Boolean,
        required: true
    },
    problemsList: [{
        relevant: Boolean,
        topic: String,
        problems:[
            {
                title: String,
                platform: String,
                link: String,
                difficulty: String,
                tags: [String]
            }
        ]
    }]
    
},{timestamps: true});


export const Problems = mongoose.model("Problems", problemsModel);