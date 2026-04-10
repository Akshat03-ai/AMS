import React, { useState, useEffect } from "react";
import { useNavigate, NavLink, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";
import { AiOutlineHome, AiOutlineInfoCircle } from "react-icons/ai";
import { BiLogIn, BiLogOut } from "react-icons/bi";
import { MdDashboard } from "react-icons/md";
import { FiUser } from "react-icons/fi";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setFirebaseUser(currentUser);
      setUserRole(null);

      if (!currentUser) {
        setLoadingRole(false);
        return;
      }

      try {
        const token = await currentUser.getIdToken();
        const res = await axios.get(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUserRole(res.data.role);
        setProfilePhoto(res.data.photoURL || null);
      } catch (err) {
        console.error("Navbar role fetch failed:", err);
      } finally {
        setLoadingRole(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handlePhotoUpdate = (event) => {
      setProfilePhoto(event.detail);
    };

    window.addEventListener("profilePhotoUpdated", handlePhotoUpdate);

    return () => {
      window.removeEventListener("profilePhotoUpdated", handlePhotoUpdate);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserRole(null);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const dashboardPath =
    userRole === "admin"
      ? "/admin/dashboard"
      : userRole === "store manager"
        ? "/store-manager/dashboard"
        : userRole === "officer"
          ? "/officer/dashboard"
          : null;

  const profilePath = "/profile";

  const links = [
    { name: "Home", path: "/", icon: <AiOutlineHome /> },
    { name: "About", path: "/about", icon: <AiOutlineInfoCircle /> },
  ];

  return (
    <nav className="navbar">
      <Link to="/" className="logo-link"> 
        <div className="logo">
          <img
            src="/images/logo.png"
            alt="AMS Logo"
            className="logo-img"
          />
          <span className="logo-text">AMS</span>
        </div>
      </Link>

      <button
        type="button"
        className="menu-toggle"
        aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        {isMenuOpen ? <HiX /> : <HiMenuAlt3 />}
      </button>

      <ul className={`nav-links ${isMenuOpen ? "nav-links-open" : ""}`}>
        {links.map((link) => (
          <li key={link.name} className="nav-item">
            <NavLink
              to={link.path}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="icon">{link.icon}</span>
              {link.name}
            </NavLink>
          </li>
        ))}

        {/* Dashboard */}
        {firebaseUser && !loadingRole && dashboardPath && (
          <li className="nav-item">
            <NavLink
              to={dashboardPath}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="icon"><MdDashboard /></span>
              Dashboard
            </NavLink>
          </li>
        )}

        {/* Profile */}
        {firebaseUser && !loadingRole && profilePath && (
          <li className="nav-item">
            <NavLink
              to={profilePath}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="icon">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="nav-avatar"
                  />
                ) : (
                  <FiUser />
                )}
              </span>
              Profile
            </NavLink>
          </li>
        )}

        {/* Login / Logout */}
        {!firebaseUser ? (
          <li className="nav-item">
            <button
              onClick={() => navigate("/login")}
              className="login-btn"
              type="button"
            >
              <span className="icon"><BiLogIn /></span>
              Login
            </button>
          </li>
        ) : (
          <li className="nav-item">
            <button
              onClick={handleLogout}
              className="logout-btn"
              type="button"
            >
              <span className="icon"><BiLogOut /></span>
              Logout
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
