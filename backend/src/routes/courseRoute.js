import express from "express"
import { addVideosToCourseController, courseController, createCustomCourseController, getAi,getVideoNotes,getSummary,updateLastPlayedCourse,getRecommendedProblems, getCourse,updateVideoNotes,deleteVideoNotes, getCourseData, getSingleCourse, getVideo, updateCourseProgess, updateVideoProgess, getVideoQuiz, submitVideoQuiz, getQuizMastery, getQuizReviewSchedule, getQuizStats, getQuizInstructorAnalytics, updateCourseSubject, updateCoursePlan, getCourseProgressInsights } from "../controllers/course.controller.js";
import { authCheck } from "../middlewares/authCheck.js";

const router = express.Router()

router.post('/create', authCheck, courseController);
router.post('/create/custom', authCheck, createCustomCourseController);
router.post('/add-videos', authCheck, addVideosToCourseController);

router.get('/', authCheck, getCourse);
router.get('/getCourse/:id', authCheck, getSingleCourse);

router.get('/data/:id', authCheck, getCourseData);
router.get('/progress/insights/:id', authCheck, getCourseProgressInsights);
router.post('/update/course',authCheck, updateCourseProgess);
router.post('/update/plan',authCheck, updateCoursePlan);
router.post('/update/lastplayedcourse',authCheck, updateLastPlayedCourse);
router.post('/update/subject',authCheck, updateCourseSubject);
router.post('/update/video',authCheck, updateVideoProgess)
router.post('/update/video/notes',authCheck, updateVideoNotes)
router.post('/update/video/notes/delete',authCheck, deleteVideoNotes)
router.get('/notes/:id',authCheck, getVideoNotes);
router.post('/generate/problems', authCheck, getRecommendedProblems);
router.post('/generate/summary', authCheck, getSummary);
router.post('/quiz/get', authCheck, getVideoQuiz);
router.post('/quiz/submit', authCheck, submitVideoQuiz);
router.get('/quiz/mastery/:courseId', authCheck, getQuizMastery);
router.get('/quiz/schedule/:courseId', authCheck, getQuizReviewSchedule);
router.get('/quiz/stats/:courseId', authCheck, getQuizStats);
router.get('/quiz/analytics/:courseId', authCheck, getQuizInstructorAnalytics);


router.post('/getVideoData',authCheck, getVideo)
router.post('/ai',authCheck, getAi);

export default router;
