import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Shield,
  Building,
  Users,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Download,
  Eye
} from "lucide-react";
import "./Home.css";

const Home = () => {
  const [statsData, setStatsData] = useState({
    totalAssets: null,
    totalDepartments: null,
    totalValue: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    fetch("/api/public/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setStatsData({
          totalAssets: data.totalAssets ?? 0,
          totalDepartments: data.totalDepartments ?? 0,
          totalValue: data.totalValue ?? 0,
          loading: false,
        });
      })
      .catch((err) => {
        console.error("Failed to load public stats:", err);
        if (mounted) setStatsData((s) => ({ ...s, loading: false }));
      });

    return () => {
      mounted = false;
    };
  }, []);

  const formatCurrency = (n) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n || 0);
    } catch (e) {
      return `₹${n}`;
    }
  };

  const stats = [
    {
      value: statsData.loading ? "..." : `${statsData.totalAssets}`,
      label: "Assets Tracked",
      change: "+12%",
    },
    {
      value: statsData.loading ? "..." : `${statsData.totalDepartments}`,
      label: "Departments",
      change: "Active",
    },
    { value: "97.8%", label: "System Uptime", change: "This month" },
    {
      value: statsData.loading ? "..." : formatCurrency(statsData.totalValue),
      label: "Asset Value",
      change: "Total worth",
    },
  ];

  const featuresData = [
    {
      title: "Real-time Asset Tracking",
      desc: "Monitor assets across all departments with live location updates and status monitoring.",
      icon: <BarChart3 size={24} />,
      color: "blue"
    },
    {
      title: "Department Allocation",
      desc: "Assign, transfer, and manage assets with complete audit trails and accountability.",
      icon: <Building size={24} />,
      color: "green"
    },
    {
      title: "Military-grade Security",
      desc: "Role-based authentication, encryption, and compliance with government security standards.",
      icon: <Shield size={24} />,
      color: "purple"
    },
    {
      title: "Comprehensive Reports",
      desc: "Generate PDF/Excel reports for audits, compliance, and financial tracking.",
      icon: <Download size={24} />,
      color: "orange"
    },
    {
      title: "Multi-user Collaboration",
      desc: "Role-specific dashboards for administrators, store managers, and employees.",
      icon: <Users size={24} />,
      color: "red"
    },
    {
      title: "Audit Trail",
      desc: "Complete history of all asset movements, modifications, and transactions.",
      icon: <Eye size={24} />,
      color: "teal"
    }
  ];

  const rolesData = [
    {
      title: "Administrator",
      description: "Full system control, department management, user administration, and system configuration.",
      color: "admin"
    },
    {
      title: "Store Manager",
      description: "Asset management including procurement, assignment, maintenance, and disposal.",
      color: "manager"
    },
    {
      title: "Government Employee",
      description: "Access to assigned assets, request new assets, and report issues or maintenance needs.",
      color: "employee"
    }
  ];

  return (
    <div className="home-container">
      {/* Hero Section (Merged Version) */}
      <section className="hero">
        <div className="hero-content">

          {/* Logo Branding Side */}
          <div className="hero-image-wrapper">
            <img
              src="/images/logo.png"
              alt="Government Asset Management System"
              className="home-logo"
            />
          </div>

          {/* Text Content Side */}
          <div className="hero-text">
            <h1 className="hero-title">
              Government Asset Management System
            </h1>

            <p className="hero-subtitle">
              A secure, centralized digital platform for tracking, allocating, and
              managing government assets with complete transparency and accountability.
            </p>

            {/* 🔒 BUTTONS — UNCHANGED */}
            <div className="hero-actions">
              <Link to="/about" className="cta-button primary">
                <span>Learn More</span>
              </Link>
              <a href="#features" className="cta-button outline">
                <span>Explore Features</span>
              </a>
            </div>

            {/* ✅ TRUST BADGES — UNCHANGED */}
            <div className="hero-trust-badges">
              <div className="trust-badge">
                <CheckCircle size={16} />
                <span>100% Data Security</span>
              </div>
              <div className="trust-badge">
                <Shield size={16} />
                <span>Govt. Certified</span>
              </div>
              <div className="trust-badge">
                <TrendingUp size={16} />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>

          {/* Visual Side */}
          <div className="hero-visual">
            <img
              src="/images/home.jpg"
              alt="Dashboard Preview"
              className="hero-img"
            />
          </div>
        </div>
      </section>

      {/* Stats Bar with Animation */}
      <section className="stats-section">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stats-card">
              <div className="stats-content">
                <span className="stats-value">{stat.value}</span>
                <span className="stats-label">{stat.label}</span>
                <span className="stats-change">{stat.change}</span>
              </div>
              <div className="stats-icon">
                <TrendingUp size={20} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-title-decor" aria-hidden="true">
              &#47;&#47;
            </span>
            Comprehensive Features
            <span className="section-title-decor" aria-hidden="true">
              &#47;&#47;
            </span>
          </h2>
          <p className="section-subtitle">
            Everything you need for efficient government asset management
          </p>
        </div>

        <div className="features-grid">
          {featuresData.map((feature, index) => (
            <div
              className={`feature-card feature-${feature.color}`}
              key={index}
            >
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* User Roles Section */}
      <section className="roles-section">
        <div className="section-header">
          <h2 className="section-title">Role-Based Access</h2>
          <p className="section-subtitle">
            Secure, permission-based access for different government roles
          </p>
        </div>

        <div className="roles-grid">
          {rolesData.map((role, index) => (
            <div className={`role-card role-${role.color}`} key={index}>
              <div className="role-header">
                <h3>{role.title}</h3>
                <div className="role-badge">{role.color.toUpperCase()}</div>
              </div>
              <p className="role-description">{role.description}</p>
              <Link to={`/About#users`} className="role-link">
                View more about {role.title}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;