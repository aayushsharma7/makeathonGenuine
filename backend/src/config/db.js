import mongoose from "mongoose"
import 'dotenv/config'

const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_DB_URI}`)
        console.log("Successfully connected to DB")
    } catch (error) {
        console.log("DB Connection failed", error.message);
        process.exit(1); // this is for exit with failure
    }
}

export default connectDB;