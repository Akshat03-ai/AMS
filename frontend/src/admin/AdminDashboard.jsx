import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  FiUsers,
  FiLayers,
  FiBarChart2,
  FiShield,
  FiAlertCircle,
  FiMail
} from "react-icons/fi";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepartments: 0,
    totalOffices: 0,
  });

  // =========================================================
  // AUTH + DATA FETCH
  // =========================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setError("User not authenticated. Please login again.");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found");

        const res = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();

        if (data.role !== "admin") {
          throw new Error("Not authorized as Admin");
        }

        setAdmin(data);

        // ==============================
        // FETCH ADMIN DASHBOARD STATS
        // ==============================
        const statsRes = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/admin/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

      } catch (err) {
        console.error("Admin Dashboard Auth Error:", err);
        setError("Not authorized to access Admin dashboard.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

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
        <p>Authenticating & loading admin dashboard…</p>
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
    <div className="admin-dashboard-container">

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
        <div className="header-content">
          <div className="avatar-circle">
            {admin.photoURL ? (
              <img src={admin.photoURL} alt="Avatar" />
            ) : (
              admin.name?.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <h1>Welcome, {admin.name}</h1>
            <div className="badges-row">
              <span className="badge badge-designation">
                <FiShield /> Administrator
              </span>
              <span className="badge badge-id">
                ID: {admin.user_id}
              </span>
              <span className="badge badge-email">
                <FiMail /> {admin.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Overview Stats */}
      <section>
        <h3 className="section-label">Overview</h3>

        <div className="info-grid">
          <div className="info-card">
            <FiUsers />
            <div className="info-data">
              <label>Total Users</label>
              <p className="highlight-text">
                {stats.totalUsers ?? 0}
              </p>
            </div>
          </div>

          <div className="info-card">
            <FiLayers />
            <div className="info-data">
              <label>Total Departments</label>
              <p className="highlight-text">
                {stats.totalDepartments ?? 0}
              </p>
            </div>
          </div>

          <div className="info-card">
            <FiBarChart2 />
            <div className="info-data">
              <label>Total Offices</label>
              <p className="highlight-text">
                {stats.totalOffices ?? 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section>
        <h3 className="section-label">Actions</h3>

        <div className="action-grid">

          <Link to="/admin/users" className="action-card">
            <div className="action-header">
              <FiUsers className="action-icon" />
            </div>
            <h3>User Management</h3>
            <p>Create, update, and deactivate users.</p>
          </Link>

          <Link to="/admin/departments" className="action-card">
            <div className="action-header">
              <FiLayers className="action-icon" />
            </div>
            <h3>Departments & Offices</h3>
            <p>Manage organisational structure.</p>
          </Link>

          <Link to="/admin/audit" className="action-card">
            <div className="action-header">
              <FiBarChart2 className="action-icon" />
            </div>
            <h3>Reports & Audits</h3>
            <p>System-wide analytics and logs.</p>
          </Link>

        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;