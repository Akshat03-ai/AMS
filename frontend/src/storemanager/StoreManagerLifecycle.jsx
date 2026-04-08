import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiShoppingCart, FiTool, FiTrash2 } from "react-icons/fi";
import "./StoreManagerLifecycle.css";

function StoreManagerLifecycle() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="lifecycle-wrapper">
      <div className="lifecycle-header">
        <button className="back-btn" onClick={() => navigate("/store-manager/dashboard")}>
          ← Back
        </button>
        <h1>Lifecycle Management</h1>
        <p>Manage purchases, maintenance, and disposal operations</p>
      </div>

      <div className="lifecycle-grid">

        <Link
          to="/store-manager/lifecycle/purchases"
          className="lifecycle-card"
        >
          <FiShoppingCart className="lifecycle-icon" />
          <h3>Purchases</h3>
          <p>Manage vendors and purchase records</p>
        </Link>

        <Link
          to="/store-manager/lifecycle/maintenance"
          className="lifecycle-card"
        >
          <FiTool className="lifecycle-icon" />
          <h3>Maintenance</h3>
          <p>Manage maintenance logs and workers</p>
        </Link>

        <Link
          to="/store-manager/lifecycle/disposals"
          className="lifecycle-card"
        >
          <FiTrash2 className="lifecycle-icon" />
          <h3>Disposals</h3>
          <p>Manage asset disposal records</p>
        </Link>

      </div>
    </div>
  );
}

export default StoreManagerLifecycle;