import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// Keep your existing imports
import axios from "axios";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [infor, setInfor] = useState({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const checkAuth = async () => {
    try {
      const responsePost = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check`, {
        withCredentials: true,
      });
      if (responsePost.data.code === 200) {
        setIsLoggedIn(true);
        setInfor(responsePost.data.info);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log(error);
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkAuth();
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    if (isLoggedIn) {
      const apiRes = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );
      localStorage.clear();
      sessionStorage.clear();
      console.log(apiRes);
      if (apiRes.data.code === 200) {
        navigate("/login");
      } else {
        console.log(apiRes);
      }
    } else {
      navigate("/login");
    }
  };

  return (
    <>
      <nav
        className={`fixed z-50 transition-all duration-500 ease-in-out flex justify-center items-start 
        ${
          isScrolled
            ? "top-5 left-0 right-0 md:px-5"
            : "top-0 left-0 right-0 md:px-10"
        }
        `}
      >
        <div
          className={`
            relative flex items-center justify-between transition-all duration-500 ease-in-out
            ${
              isScrolled
                ? "w-[90%] md:w-[65%] lg:w-[55%] bg-[#18181B]/80 backdrop-blur-xl border border-white/10 rounded-xl py-3 px-6 shadow-lg shadow-black/20"
                : "w-full bg-transparent border-transparent py-6 px-6 lg:px-12"
            }
          `}
        >
          {/* --- Left: Logo --- */}
          <Link
            to={isLoggedIn ? '/courses':'/'}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            {/* Logo Icon */}
            <div className="w-7 h-7 flex items-center justify-center transition-transform group-hover:scale-110">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <path
                  d="M13 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H13V4Z"
                  fill="#2563EB"
                />
                <path
                  d="M11 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H11V4Z"
                  fill="#ffffff"
                  fillOpacity="0.8"
                />
              </svg>
            </div>
            {/* Logo Text */}
            <span className="text-lg font-bold tracking-tight text-white">
              Open<span className="text-gray-100">Course</span>
            </span>
          </Link>

          {/* --- Center: Nav Links (Desktop) --- */}
          <div
            className={`hidden md:flex items-center gap-1 md:-ml-20 transition-opacity duration-300 ${
              isScrolled ? "opacity-100" : "opacity-90"
            } `}
          >
            {[
              {
                name: "Home",
                path: "/",
              },
              {
                name: "Create",
                path: "/create",
              },
              {
                name: "Courses",
                path: "/courses",
              },
              {
                name: "Profile",
                path: "/profile",
              },
            ].map((item, idx) => (
              <Link
                to={item.path}
                key={idx}
                className={`px-4 py-1.5 ${
                  !isLoggedIn ? "hidden" : ""
                } text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all duration-200`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* --- Right: Auth Buttons --- */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to={"/login"}
                  className="px-5 py-2 text-sm font-semibold text-white border border-white  rounded-lg  shadow-white/20 transition-all duration-300 transform hover:scale-105"
                >
                  Login
                </Link>
                <Link
                  to={"/signup"}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg  transition-all duration-300 transform hover:scale-105"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* --- Mobile Menu Toggle --- */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* --- Mobile Menu Dropdown (UPDATED) --- */}
          <div
            className={`
              absolute top-full right-0  w-64 p-4 mr-6 
              bg-[#0a0a0a] border border-white/10 rounded-2xl 
              flex flex-col gap-2 shadow-2xl origin-top-right transition-all duration-300
              ${
                isMobileMenuOpen
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-4 pointer-events-none"
              }
            `}
          >
            {/* Mobile Nav Links */}
            {[
              { name: "Home", path: "/" },
              { name: "Create", path: "/create" },
              { name: "Courses", path: "/courses" },
              { name: "Profile", path: "/profile" },
            ].map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors ${
                  !isLoggedIn ? "hidden" : ""
                }`}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile Auth Buttons */}
            <div className="" />
            
            {isLoggedIn ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Logout
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;