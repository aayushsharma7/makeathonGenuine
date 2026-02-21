import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
const LandingPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
        withCredentials: true,
      });
      if (responsePost.data.code === 200) {
        setIsLoggedIn(true);
        navigate("/courses");
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen w-full ">
      <div
        className="absolute inset-0 z-0 animate-grid"
        style={{
          backgroundColor: "#0a0a0a",
          backgroundImage: `
      radial-gradient(circle at 25% 25%, #222222 0.5px, transparent 1px),
      radial-gradient(circle at 75% 75%, #111111 0.5px, transparent 1px)
    `,
          backgroundSize: "10px 10px",
          imageRendering: "pixelated",
        }}
      />
      {/* HERO SECTION */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">

        <h1 className="md:mt-0 mt-15 text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Create Courses for{" "}
          
          <span className="text-blue-500">Free.</span>{" "}
          <br />
          Learn Without Limits.
        </h1>

        <p className="text-gray-400 max-w-2xl mb-10 text-lg md:text-xl">
          OpenCourse lets you create, organize, and learn from courses effortlessly —
          no subscriptions, no hidden costs.
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => navigate("/signup")}
            className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
          >
            Get Started for Free
          </button>

          <button
            onClick={() => navigate("/login")}
            className="px-7 py-3 border border-gray-600 hover:border-gray-400 text-gray-200 rounded-lg transition-all"
          >
            Login
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
        100% Free
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div className="relative z-10 max-w-6xl mx-auto py-24 px-6">
  
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-14">
          Everything You Need to Learn & Create
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Feature 1 */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800/60 transition">
            <h3 className="text-xl font-semibold text-white mb-2">
              📚 Free Course Creation
            </h3>
            <p className="text-gray-400">
              Create complete courses from any playlist and share knowledge for free.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800/60 transition">
            <h3 className="text-xl font-semibold text-white mb-2">
              📝 Smart Notes
            </h3>
            <p className="text-gray-400">
              Get structured notes alongside your courses to revise faster and retain more.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800/60 transition">
            <h3 className="text-xl font-semibold text-white mb-2">
              🤖 AI Doubt Solver
            </h3>
            <p className="text-gray-400">
               Ask doubts anytime and get instant AI-powered explanations.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800/60 transition">
            <h3 className="text-xl font-semibold text-white mb-2">
              💻 Inbuilt Code Editor
            </h3>
            <p className="text-gray-400">
              Practice coding directly while learning — no need to switch tabs.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800/60 transition">
            <h3 className="text-xl font-semibold text-white mb-2">
              ✍️ Interactive Whiteboard
            </h3>
            <p className="text-gray-400">
             Draw, write, and visually explain concepts just like a classroom.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800/60 transition">
            <h3 className="text-xl font-semibold text-white mb-2">
              ❓ Recommended Questions
            </h3>
            <p className="text-gray-400">
              Practice curated questions tailored to what you're learning.
            </p>
          </div>

        </div>
      </div>

      {/* HOW IT WORKS SECTION */}
        <div className="relative z-10 max-w-6xl mx-auto py-24 px-6">

          <h2 className="text-3xl md:text-4xl text-white text-center mb-16">
            How <span className="font-bold">Open</span>
            <span className="font-bold text-blue-500">Course</span> Works
          </h2>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">

            {/* Step 1 */}
            <div  className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center text-center hover:bg-neutral-800/60 hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xl mb-4">
                1
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                Sign Up
              </h3>
              <p className="text-gray-400">
                Create a free account in seconds.
              </p>

            </div>


            {/* Step 2 */}
            <div  className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center text-center hover:bg-neutral-800/60 hover:-translate-y-1 transition-all duration-300">

              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xl mb-4">
                2
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                Create or Choose a Course
              </h3>

              <p className="text-gray-400">
                Build a course from any playlist or start learning instantly.
              </p>

            </div>


            {/* Step 3 */}
            <div  className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center text-center hover:bg-neutral-800/60 hover:-translate-y-1 transition-all duration-300">

              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xl mb-4">
                3
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                Learn, Practice & Track
              </h3>
              <p className="text-gray-400">
                Use notes, AI, code editor, and whiteboard in one place.
              </p>

            </div>  
          </div>
        </div>

        {/* FINAL CTA SECTION */}
        <div className="relative z-10 max-w-6xl mx-auto py-28 px-6 text-center">

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start Creating Courses for Free
          </h2>

          <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-lg">
            Build courses, take notes, practice with AI and code editor —
            all in one place, completely free.
          </p>

          <button
            onClick={() => navigate("/signup")}
            className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-all"
          >
            Get Started Now
          </button>
        </div>

          {/* FOOTER */}
            <footer className="relative z-10 border-t border-neutral-800 py-10 px-6">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="text-gray-400 text-sm">
                  © {new Date().getFullYear()} OpenCourse. All rights reserved.
                </div>

                <div className="flex gap-6 text-sm text-gray-400">
                  {/* <span className="hover:text-white cursor-pointer transition">
                    About
                  </span> */}
                  <a
                    href="https://github.com/Ideathon-2025/Team-Genuine"
                    target="_blank" rel="noopener noreferrer"
                   className="hover:text-white cursor-pointer transition">
                    GitHub
                  </a>
                  {/* <span className="hover:text-white cursor-pointer transition">
                    Contact
                  </span> */}
                </div>

              </div>
            </footer>

    </div>
  );
};

export default LandingPage;
