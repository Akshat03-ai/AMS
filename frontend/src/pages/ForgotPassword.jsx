import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import "../App.css";
import { FiMail } from "react-icons/fi";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      setMessage("Password reset link sent to your email. Check your inbox!");
      setEmail("");
    } catch (err) {
      console.error("RESET ERROR:", err.code, err.message);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleReset}>
        <h2>Reset Password</h2>
        <p className="subtitle">Enter your email to receive a reset link</p>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <label>Email: </label>
        <div className="input-wrapper">
          <span className="input-icon">
            <FiMail />
          </span>
          <input
            type="email"
            placeholder="Enter Email here"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={sent}
          />
        </div>
        <button type="submit" disabled={loading || sent}>
          {loading ? "Sending..." : sent ? "Link Sent" : "Send Reset Link"}
        </button>

        <div className="password-help">
          <Link to="/login">Back to Login</Link>
        </div>

        <footer className="login-footer">
          <p>@ Government of Chhattisgarh</p>
        </footer>
      </form>
    </div>
  );
}

export default ForgotPassword;