import express from "express"
import { addVideosToCourseController, courseController, createCustomCourseController, getAi,getVideoNotes,getSummary,updateLastPlayedCourse,getRecommendedProblems, getCourse,updateVideoNotes,deleteVideoNotes, getCourseData, getSingleCourse, getVideo, updateCourseProgess, updateVideoProgess, getVideoQuiz, submitVideoQuiz, getQuizMastery, getQuizReviewSchedule, getQuizStats, getQuizInstructorAnalytics, updateCourseSubject, updateCoursePlan, getCourseProgressInsights, rebuildCourseModulesController, prewarmVideoRagController, reviewVideoNote, updateVideoNoteMeta, getCourseNoteReviewQueue, suggestVideoNoteCategory, getVideoAiOverview } from "../controllers/course.controller.js";
import { authCheck } from "../middlewares/authCheck.js";
import { planRateLimit } from "../middlewares/planRateLimit.js";

const router = express.Router()

router.post('/create', authCheck, planRateLimit("youtubeImport"), courseController);
router.post('/create/custom', authCheck, planRateLimit("youtubeImport"), createCustomCourseController);
router.post('/add-videos', authCheck, planRateLimit("youtubeImport"), addVideosToCourseController);

router.get('/', authCheck, getCourse);
router.get('/getCourse/:id', authCheck, getSingleCourse);

router.get('/data/:id', authCheck, getCourseData);
router.get('/progress/insights/:id', authCheck, getCourseProgressInsights);
router.post('/update/course',authCheck, updateCourseProgess);
router.post('/update/plan',authCheck, updateCoursePlan);
router.post('/update/lastplayedcourse',authCheck, updateLastPlayedCourse);
router.post('/update/subject',authCheck, updateCourseSubject);
router.post('/rebuild-modules',authCheck, planRateLimit("moduleRebuild"), rebuildCourseModulesController);
router.post('/rag/prewarm',authCheck, planRateLimit("ragPrewarm"), prewarmVideoRagController);
router.post('/update/video',authCheck, updateVideoProgess)
router.post('/update/video/notes',authCheck, updateVideoNotes)
router.post('/update/video/notes/suggest-category',authCheck, suggestVideoNoteCategory)
router.post('/update/video/notes/meta',authCheck, updateVideoNoteMeta)
router.post('/update/video/notes/review',authCheck, reviewVideoNote)
router.post('/update/video/notes/delete',authCheck, deleteVideoNotes)
router.get('/notes/review-queue/:courseId',authCheck, getCourseNoteReviewQueue);
router.get('/notes/:id',authCheck, getVideoNotes);
router.post('/generate/problems', authCheck, planRateLimit("problemsGenerate"), getRecommendedProblems);
router.post('/generate/summary', authCheck, planRateLimit("summaryGenerate"), getSummary);
router.post('/quiz/get', authCheck, planRateLimit("quizGenerate"), getVideoQuiz);
router.post('/quiz/submit', authCheck, planRateLimit("quizSubmit"), submitVideoQuiz);
router.get('/quiz/mastery/:courseId', authCheck, getQuizMastery);
router.get('/quiz/schedule/:courseId', authCheck, getQuizReviewSchedule);
router.get('/quiz/stats/:courseId', authCheck, getQuizStats);
router.get('/quiz/analytics/:courseId', authCheck, getQuizInstructorAnalytics);


router.post('/getVideoData',authCheck, getVideo)
router.post('/video/ai-overview',authCheck, planRateLimit("aiTutor"), getVideoAiOverview)
router.post('/ai',authCheck, planRateLimit("aiTutor"), getAi);

export default router;
