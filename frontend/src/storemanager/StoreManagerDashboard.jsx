import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  FiUserPlus,
  FiClipboard,
  FiBox,
  FiShuffle,
  FiTool,
  FiShield,
  FiAlertCircle,
  FiFileText
} from "react-icons/fi";
import "./StoreManagerDashboard.css";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { HiOutlineOfficeBuilding } from "react-icons/hi";


function StoreManagerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalAssets: 0,
    assignedAssets: 0,
    inventoryAssets: 0,
    pendingRequests: 0,
    assetsvalue: 0
  });

  const auth = getAuth();

  useEffect(() => {
    // 🔐 We keep Firebase auth listener (as requested)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        // ✅ NEW: Use backend as source of truth
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
        if (data.role !== "store manager") {
          throw new Error("Not authorized as Store Manager");
        }

        setUser(data);
      } catch (err) {
        console.error("Store Manager Auth Error:", err);
        setError("Not authorized as Store Manager");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/store-manager/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch stats");

        const data = await res.json();

        setStats({
          totalAssets: data.totalAssets,
          assignedAssets: data.assignedAssets || 0,
          inventoryAssets: data.inventoryAssets || 0,
          pendingRequests: data.pendingRequests || 0,
          assetsvalue: data.totalValue,
        });

      } catch (err) {
        console.error("Dashboard stats error:", err);
      }
    };

    fetchStats();
  }, [user]);

  const getCurrentDate = () =>
    new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  /* =======================
     RENDER STATES
     ======================= */

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Store Manager Dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <FiAlertCircle size={42} />
        <p>{error}</p>
      </div>
    );
  }

  /* =======================
     MAIN DASHBOARD
     ======================= */

  return (
    <div className="sm-dashboard-container">

      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span>System Operational</span>
        </div>
        <p>{getCurrentDate()}</p>
      </div>

      {/* Header */}
      <header className="sm-header">
        <div className="sm-header-content">
          <div className="avatar-circle">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" />
            ) : (
              user.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1>Welcome, {user.name}</h1>
            <div className="sm-meta">
              <span className="badge badge-designation">
                <FiShield /> {user.role?.charAt(0).toUpperCase() + user.role?.slice(1, 6)
                  + user.role?.charAt(6).toUpperCase() + user.role?.slice(7)}
              </span>
              <span className="badge badge-id">
                <HiOutlineBuildingOffice2 />Department: {user.department_name || user.department_id}
              </span>
              <span className="badge badge-email">
                <HiOutlineOfficeBuilding /> Office: {user.office_name || user.office_id}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="quick-stats">
        <div className="stat-card">
          <h2>{stats.totalAssets ?? 0}</h2>
          <p>Total Assets</p>
        </div>

        <div className="stat-card">
          <h2>{stats.assignedAssets ?? 0}</h2>
          <p>Assets Assigned</p>
        </div>

        <div className="stat-card">
          <h2>{stats.pendingRequests ?? 0}</h2>
          <p>Pending Requests</p>
        </div>

        <div className="stat-card">
          <h2>
            {stats.assetsvalue
              ? `₹${stats.assetsvalue.toLocaleString("en-IN")}`
              : "₹0"}
          </h2>
          <p>Total Assets Value</p>
        </div>
      </section>

      {/* Action Grid */}
      <h3 className="section-label">Actions</h3>
      <section className="sm-actions">

        <Link to="../create-user" className="sm-card">
          <FiUserPlus />
          <h3>Create Users</h3>
          <p>Onboard officers and managers</p>
        </Link>

        <Link to="/store-manager/requests" className="sm-card">
          <FiClipboard />
          <h3>Pending Requests</h3>
          <p>Approve or reject asset requests</p>
        </Link>

        <Link to="/store-manager/assets" className="sm-card">
          <FiBox />
          <h3>Asset Inventory</h3>
          <p>View and manage assets</p>
        </Link>

        <Link to="/store-manager/assignments" className="sm-card">
          <FiShuffle />
          <h3>Asset Assignments</h3>
          <p>Assign assets to users</p>
        </Link>

        <Link to="/store-manager/lifecycle" className="sm-card">
          <FiTool />
          <h3>Lifecycle Management</h3>
          <p>Purchase, maintenance & disposal</p>
        </Link>

        <Link to="/store-manager/audit" className="sm-card">
          <FiFileText />
          <h3>Audit Log</h3>
          <p>View system audit trails</p>
        </Link>
      </section>
    </div>
  );
}

export default StoreManagerDashboard;