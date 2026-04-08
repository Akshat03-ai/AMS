import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./About.css";
import {
  FaShieldAlt as Shield,
  FaBullseye as Target,
  FaUsers as Users,
  FaDatabase as Database,
  FaLock as Lock,
  FaMicrochip as Cpu,
  FaChartBar as BarChart,
  FaBolt as Zap,
  FaExclamationTriangle as AlertCircle,
  FaCheckCircle as CheckCircle,
  FaChartLine as TrendingUp // Using FaChartLine instead
} from "react-icons/fa";

const About = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);
  return (
    <div className="about-container">
      {/* Hero Banner */}
      <section className="about-hero">
        <div className="about-hero-content">
          <div className="badge">
            <Shield size={20} />
            <span>Official Government System</span>
          </div>
          <h1 className="about-title">
            About the Government Asset Management System
          </h1>
          <p className="about-subtitle">
            A secure, centralized platform for transparent and accountable
            management of government assets across all departments
          </p>
          <div className="trust-indicators">
            <div className="trust-item">
              <CheckCircle color="#27ae60" size={18} />
              <span>ISO 27001 Compliant</span>
            </div>
            <div className="trust-item">
              <CheckCircle color="#27ae60" size={18} />
              <span>Data Privacy Certified</span>
            </div>
            <div className="trust-item">
              <CheckCircle color="#27ae60" size={18} />
              <span>Audit-Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement Card */}
      <section className="mission-card">
        <div className="mission-icon">
          <Target size={32} />
        </div>
        <div>
          <h2>Our Mission</h2>
          <p>
            To replace manual and spreadsheet-based record-keeping currently
            used in many government offices with a secure, centralized digital
            system that improves accountability and operational efficiency.
          </p>
        </div>
      </section>

      {/* Objectives - Visual Grid */}
      <section className="section">
        <div className="section-header">
          <h2>Key Objectives</h2>
          <p>Clear goals for transparent governance</p>
        </div>
        <div className="objectives-grid">
          {[
            {
              icon: <Database />,
              title: "Centralized Digital Inventory",
              desc: "Single source of truth for all government assets"
            },
            {
              icon: <TrendingUp />, // Now this works with FaChartLine
              title: "Reduce Asset Loss",
              desc: "Minimize mismanagement and duplication"
            },
            {
              icon: <BarChart />,
              title: "Support Audits",
              desc: "Comprehensive reporting for decision-making"
            },
            {
              icon: <Zap />,
              title: "Real-time Access",
              desc: "Live asset information across departments"
            },
          ].map((obj, index) => (
            <div className="objective-card" key={index}>
              <div className="objective-icon">{obj.icon}</div>
              <h3>{obj.title}</h3>
              <p>{obj.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* User Roles - Visual Cards */}
      <section id="users" className="section alt-bg">
        <div className="section-header">
          <h2>User Roles & Responsibilities</h2>
          <p>Clear role-based access control for accountability</p>
        </div>
        <div className="roles-grid">
          <div className="role-card">
            <div className="role-header">
              <Users size={24} />
              <h3>Administrator</h3>
            </div>
            <div className="role-duties">
              <p>Full system control, department management, user administration, and system configuration.</p>
            </div>
            <ul className="role-duties">
              <li>Manage departments and offices</li>
              <li>Configure system settings</li>
              <li>Oversee user permissions</li>
              <li>System monitoring</li>
            </ul>
          </div>

          <div className="role-card highlight">
            <div className="role-header">
              <Database size={24} />
              <h3>Store Manager</h3>
            </div>
            <div className="role-duties">
              <p>Asset lifecycle management including procurement, assignment, maintenance, and disposal.</p>
            </div>
            <ul className="role-duties">
              <li>Asset lifecycle management</li>
              <li>Purchase and disposal</li>
              <li>Assignment and maintenance</li>
              <li>Inventory control</li>
            </ul>
          </div>

          <div className="role-card">
            <div className="role-header">
              <Users size={24} />
              <h3>Government Employee</h3>
            </div>
            <div className="role-duties">
              <p>Access to assigned assets, request new assets, and report issues or maintenance needs.</p>
            </div>
            <ul className="role-duties">
              <li>View assigned assets</li>
              <li>Raise service requests</li>
              <li>Update asset status</li>
              <li>Track asset history</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Asset Request & Approval Workflow</h2>
          <p>Structured request handling with approvals and audit trails</p>
        </div>

        <div className="workflow-steps">
          <div className="workflow-step" data-step="STEP 1">
            <h3>1. Request Submission</h3>
            <p>
              Government employees submit asset requests with justification and priority
              through their dashboard.
            </p>
          </div>

          <div className="workflow-step" data-step="STEP 2">
            <h3>2. Review & Approval</h3>
            <p>
              Store Managers review requests based on availability, necessity, and
              department policies.
            </p>
          </div>

          <div className="workflow-step" data-step="STEP 3">
            <h3>3. Allocation & Audit</h3>
            <p>
              Approved assets are allocated and all actions are logged for audit and
              compliance purposes.
            </p>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="section">
        <div className="section-header">
          <h2>Technology Stack</h2>
          <p>Built on secure, modern, and scalable technologies</p>
        </div>
        <div className="tech-stack">
          <div className="tech-category">
            <h3>Frontend</h3>
            <div className="tech-tags">
              <span className="tech-tag">React.js</span>
              <span className="tech-tag">HTML5</span>
              <span className="tech-tag">CSS3</span>
            </div>
          </div>
          <div className="tech-category">
            <h3>Backend</h3>
            <div className="tech-tags">
              <span className="tech-tag">Node.js</span>
              <span className="tech-tag">Express.js</span>
            </div>
          </div>
          <div className="tech-category">
            <h3>Database & Security</h3>
            <div className="tech-tags">
              <span className="tech-tag">Firebase Firestore</span>
              <span className="tech-tag">Firebase Auth</span>
              <span className="tech-tag">RBAC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="section alt-bg">
        <div className="section-header">
          <h2>Security & Compliance</h2>
          <Lock className="section-icon" />
          <p>Enterprise-grade security for government data</p>
        </div>
        <div className="security-grid">
          <div className="security-item">
            <Lock size={20} />
            <div>
              <h3>Authentication</h3>
              <p>Multi-factor authentication with Firebase</p>
            </div>
          </div>
          <div className="security-item">
            <Shield size={20} />
            <div>
              <h3>Access Control</h3>
              <p>Role-based permissions (RBAC)</p>
            </div>
          </div>
          <div className="security-item">
            <Cpu size={20} />
            <div>
              <h3>Data Protection</h3>
              <p>Encrypted data transmission and storage</p>
            </div>
          </div>
        </div>
      </section>

      {/* Limitations & Future - Split View */}
      <section className="section split-section">
        <div className="split-card caution">
          <div className="split-header">
            <AlertCircle size={24} />
            <h2>Current Limitations</h2>
          </div>
          <ul>
            <li>Requires stable internet connectivity</li>
            <li>Basic mobile responsiveness</li>
            <li>Limited advanced analytics</li>
            <li>Initial data migration from legacy records requires manual verification</li>
          </ul>
        </div>

        <div className="split-card future">
          <div className="split-header">
            <TrendingUp size={24} />
            <h2>Future Roadmap</h2>
          </div>
          <ul>
            <li>Mobile application using React Native integrated with the existing backend</li>
            <li>Integration with finance systems</li>
            <li>Advanced analytics dashboards</li>
            <li>Asset depreciation tracking</li>
            <li>Comprehensive audit logs</li>
          </ul>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <h2>Need More Information?</h2>
        <p>Contact the System Administration Team</p>
        <div className="cta-buttons">
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=akshat00312@gmail.com&su=AMS%20Support%20Request"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            Contact Support
          </a>
        </div>
      </section>
    </div>
  );
};

export default About;