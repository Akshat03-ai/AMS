import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  FiBox,
  FiPlusCircle,
  FiClock,
  FiShield,
  FiAlertCircle,
  FiActivity,
  FiMail
} from "react-icons/fi";
import "./OfficerDashboard.css";

function OfficerDashboard() {
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth();

  // =========================================================
  // AUTH + DATA FETCH
  // =========================================================
  useEffect(() => {
    // 🔐 Keep Firebase listener (unchanged)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setError("User not authenticated. Please login again.");
        setLoading(false);
        return;
      }

      try {
        // ✅ NEW: Trust backend via /api/me
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("No token found");
        }

        const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Unauthorized");
        }

        const data = await res.json();

        // 🔐 ROLE CHECK
        if (data.role !== "officer") {
          throw new Error("Not authorized as Officer");
        }

        setOfficer(data);
      } catch (err) {
        console.error("Officer Dashboard Auth Error:", err);
        setError("Not authorized to access Officer dashboard.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // =========================================================
  // HELPERS
  // =========================================================
  const getCurrentDate = () =>
    new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // =========================================================
  // RENDER STATES
  // =========================================================
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Authenticating & loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <FiAlertCircle size={48} />
        <h2>Access Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================
  return (
    <div className="officer-dashboard-container">

      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span>System Operational</span>
        </div>
        <p>{getCurrentDate()}</p>
      </div>

      {/* Header */}
      <header className="officer-header">
        <div className="of-header-content">
          <div className="avatar-circle">
            {officer.photoURL ? (
              <img src={officer.photoURL} alt="Avatar" />
            ) : (
              officer.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1>Welcome, {officer.name}</h1>
            <div className="badges-row">
              <span className="badge badge-designation">
                <FiShield /> {officer.designation}
              </span>
              <span className="badge badge-id">
                ID: {officer.user_id}
              </span>
              <span className="badge badge-department">
                Dept: {officer.department_name || officer.department_id}
              </span>
              <span className="badge badge-office">
                Office: {officer.office_name || officer.office_id}
              </span>
              <span className="badge badge-room">
                <FiMail />Room: {officer.room_id}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Actions */}
      <section>
        <h3 className="section-label">Actions</h3>
        <div className="actions-grid">

          <Link to="/officer/assets" className="action-card">
            <div className="action-header">
              <FiBox className="action-icon" />
              <FiActivity className="arrow-icon" />
            </div>
            <h3>My Assets</h3>
            <p>Assets currently assigned to you.</p>
          </Link>

          <Link to="/officer/request" className="action-card">
            <div className="action-header">
              <FiPlusCircle className="action-icon" />
              <span className="highlight-glow"></span>
            </div>
            <h3>New Request</h3>
            <p>Submit a new request.</p>
          </Link>

          <Link to="/officer/requeststatus" className="action-card">
            <div className="action-header">
              <FiClock className="action-icon" />
            </div>
            <h3>Request History</h3>
            <p>Track submitted requests.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default OfficerDashboard;