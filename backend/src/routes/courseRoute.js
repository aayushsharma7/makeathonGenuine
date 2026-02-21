import express from "express"
import { courseController, getAi,getVideoNotes,getSummary,updateLastPlayedCourse,getRecommendedProblems, getCourse,updateVideoNotes,deleteVideoNotes, getCourseData, getSingleCourse, getVideo, updateCourseProgess, updateVideoProgess } from "../controllers/course.controller.js";
import { authCheck } from "../middlewares/authCheck.js";

const router = express.Router()

router.post('/create', authCheck, courseController);

router.get('/', authCheck, getCourse);
router.get('/getCourse/:id', authCheck, getSingleCourse);

router.get('/data/:id', getCourseData);
router.post('/update/course',authCheck, updateCourseProgess);
router.post('/update/lastplayedcourse',authCheck, updateLastPlayedCourse);
router.post('/update/video',authCheck, updateVideoProgess)
router.post('/update/video/notes',authCheck, updateVideoNotes)
router.post('/update/video/notes/delete',authCheck, deleteVideoNotes)
router.get('/notes/:id',authCheck, getVideoNotes);
router.post('/generate/problems', authCheck, getRecommendedProblems);
router.post('/generate/summary', authCheck, getSummary);


router.post('/getVideoData',authCheck, getVideo)
router.post('/ai',authCheck, getAi);

export default router;