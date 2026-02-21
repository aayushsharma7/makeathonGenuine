import { matchPath, Route, Routes, useLocation } from "react-router-dom";
import HomePage from './pages/HomePage';
import CreateCourse from './pages/CreateCourse';
import LandingPage from './pages/LandingPage';
import CoursePlayer from "./pages/CoursePlayer";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import OnboardingPage from "./pages/OnboardingPage";

const App = () => {
const location = useLocation()
  return (
    <div className="bg-[#18181B]">
      {
        matchPath('/courses/:name/:id',location.pathname) ? '': <Navbar />
      }
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/login' element={<Login />} />
        <Route path='/create' element={<CreateCourse />} />
        <Route path='/onboarding' element={<OnboardingPage />} />
        <Route path='/courses' element={<HomePage />} />
        
        <Route path='/profile' element={<Profile />} />
        <Route path='/courses/:name/:id' element={<CoursePlayer />} />
      </Routes>
    </div>
  )
}

export default App
