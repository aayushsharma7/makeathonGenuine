import express, { urlencoded } from "express"
import "dotenv/config"
import connectDB from "./config/db.js";
import authRoute from "./routes/authRoute.js"
import courseRoute from "./routes/courseRoute.js"
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express();
const PORT = process.env.PORT || 3000;


// v imp to set cookies origin and credentials
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))
app.use(cookieParser())

connectDB();

app.use(express.json({ limit: '10mb' }))  // limit increased as we need to accept larger text for ai chat
app.use(urlencoded({extended: true}))

app.use("/auth", authRoute);
app.use("/course",courseRoute);

app.get('/',(req,res) => {
    res.send("working")
});




app.listen(PORT, () => {
    console.log("Port listening on: ", PORT);
});