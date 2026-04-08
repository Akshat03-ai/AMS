import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from "firebase/auth";
import axios from "axios";
import { auth } from "../firebase";
import "../App.css";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const API_BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
        await setPersistence(auth, browserSessionPersistence);

      const userCred = await signInWithEmailAndPassword(auth, email, password);

      const token = await userCred.user.getIdToken(true);
      localStorage.setItem("token", token);

      const res = await axios.get(`${API_BASE_URL}/api/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const { role, department_id, office_id } = res.data;

      localStorage.setItem("role", role);
      if (department_id) localStorage.setItem("department_id", department_id);
      if (office_id) localStorage.setItem("office_id", office_id);

      switch (role) {
        case "admin":
          navigate("/admin/dashboard");
          break;

        case "store manager":
          navigate("/store-manager/dashboard");
          break;

        case "officer":
          navigate("/officer/dashboard");
          break;

        default:
          setError("Your account role is not authorized. Please contact the administrator.");
      }

    } catch (err) {
      console.error("LOGIN ERROR:", err);

      // Firebase auth errors
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      }
      else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Try again later.");
      }
      // Backend auth errors
      else if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      }
      else if (err.response?.status === 403) {
        setError("You are not authorized to access this system.");
      }
      else {
        setError("Login failed. Please contact system administrator.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <h2>Asset Management System</h2>
        <p className="subtitle">Authorized Personnel Only</p>

        {error && <div className="error">{error}</div>}

        <label>Email</label>
        <div className="input-wrapper">
          <span className="input-icon"><FiMail /></span>
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <label>Password</label>
        <div className="password-wrapper">
          <span className="input-icon"><FiLock /></span>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="password-input"
          />
          <span
            className="password-toggle"
            onClick={() => setShowPassword(prev => !prev)}
          >
            {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
          </span>
        </div>

        <div className="password-help">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>

        <footer className="login-footer">
          <p>© Government of Chhattisgarh</p>
        </footer>
      </form>
    </div>
  );
}

export default Login;