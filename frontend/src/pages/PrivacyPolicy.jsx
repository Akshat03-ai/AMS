import { FiShield, FiDatabase, FiEyeOff, FiUserCheck, FiLock, FiFileText } from "react-icons/fi";
import { useEffect } from "react";
import "./PrivacyPolicy.css";

function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="privacy-container">
      {/* Header */}
      <header className="privacy-header">
        <div className="privacy-header-content">
          <FiShield className="privacy-header-icon" size={48} />
          <h1>Privacy Policy</h1>
          <p className="subtitle">Government Asset Management System</p>
          <p className="effective-date">
            <strong>Effective Date:</strong> 1st January 2026
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="privacy-content">
        {/* Introduction */}
        <section className="privacy-section">
          <h2><FiFileText /> 1. Introduction & Scope</h2>
          <p>
            This Privacy Policy governs the collection, use, storage, and disclosure of personal information
            in the Government Asset Management System (AMS). This system is operated by the respective government
            department or authority responsible for asset administration in accordance with the Information
            Technology Act, 2000, and relevant data protection regulations.
          </p>
          <p>
            This policy applies to all users including government employees, contractors,
            and authorized personnel who access or use the Asset Management System.
          </p>
        </section>

        {/* Data Collection */}
        <section className="privacy-section">
          <h2><FiDatabase /> 2. Information We Collect</h2>
          <div className="data-grid">
            <div className="data-card">
              <h3>Personal Information</h3>
              <ul>
                <li>Full Name and Employee ID</li>
                <li>Official Email Address</li>
                <li>Department and Designation</li>
                <li>Contact Numbers (Official)</li>
                <li>Digital Signature Details</li>
              </ul>
            </div>
            <div className="data-card">
              <h3>System Usage Data</h3>
              <ul>
                <li>Login Timestamps and IP Addresses</li>
                <li>Asset Transactions History</li>
                <li>Access Logs and Activity Trails</li>
                <li>System Preferences</li>
                <li>Audit Trail Records</li>
              </ul>
            </div>
            <div className="data-card">
              <h3>Asset Related Data</h3>
              <ul>
                <li>Asset Assignment Records</li>
                <li>Maintenance History</li>
                <li>Transfer and Disposal Records</li>
                <li>Asset location and assignment records</li>
                <li>Usage Statistics</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Purpose of Collection */}
        <section className="privacy-section">
          <h2><FiEyeOff /> 3. Purpose of Data Collection</h2>
          <p>Personal data is collected solely for legitimate government purposes including:</p>
          <div className="purpose-list">
            <div className="purpose-item">
              <FiUserCheck />
              <div>
                <h4>User Authentication</h4>
                <p>Verifying identity and system access permissions</p>
              </div>
            </div>
            <div className="purpose-item">
              <FiLock />
              <div>
                <h4>Security & Compliance</h4>
                <p>Ensuring system security and regulatory compliance</p>
              </div>
            </div>
            <div className="purpose-item">
              <FiDatabase />
              <div>
                <h4>Asset Management</h4>
                <p>Tracking, maintaining, and optimizing government assets</p>
              </div>
            </div>
            <div className="purpose-item">
              <FiFileText />
              <div>
                <h4>Audit & Accountability</h4>
                <p>Maintaining transparent audit trails and accountability</p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Protection */}
        <section className="privacy-section highlight">
          <h2><FiShield /> 4. Data Protection Measures</h2>
          <div className="protection-grid">
            <div className="protection-item">
              <h3>Encryption</h3>
              <p>Industry-standard encryption mechanisms for data transmission and storage 
                Periodic security reviews and assessments
              </p>
            </div>
            <div className="protection-item">
              <h3>Access Controls</h3>
              <p>Role-based access control with minimum necessary privilege principle</p>
            </div>
            <div className="protection-item">
              <h3>Audit Logging</h3>
              <p>Comprehensive audit trails for all data access and modifications</p>
            </div>
            <div className="protection-item">
              <h3>Regular Audits</h3>
              <p>Quarterly security audits and vulnerability assessments</p>
            </div>
          </div>
        </section>

        {/* Data Sharing */}
        <section className="privacy-section">
          <h2>5. Data Sharing & Disclosure</h2>
          <p>
            Personal data may be shared only under the following circumstances:
          </p>
          <div className="disclosure-box">
            <ul>
              <li>
                <strong>Internal Sharing:</strong> With authorized personnel within the same
                government department for official purposes
              </li>
              <li>
                <strong>Legal Requirements:</strong> As required by law, court orders, or
                government regulations
              </li>
              <li>
                <strong>Audit Authorities:</strong> With authorized audit agencies for
                compliance verification
              </li>
              <li>
                <strong>Security Agencies:</strong> With law enforcement for criminal
                investigations with proper authorization
              </li>
            </ul>
            <div className="notice-box warning">
              <h4><FiEyeOff /> Important Notice</h4>
              <p>
                Personal data is <strong>never sold, traded, or shared</strong> with private
                third-party entities for commercial purposes.
              </p>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section className="privacy-section">
          <h2>6. Data Retention Policy</h2>
          <table className="retention-table">
            <thead>
              <tr>
                <th>Data Type</th>
                <th>Retention Period</th>
                <th>Disposal Method</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>User Activity Logs</td>
                <td>7 Years</td>
                <td>Authentication credentials and verification metadata</td>
              </tr>
              <tr>
                <td>Asset Transaction Records</td>
                <td>10 Years</td>
                <td>Archived & Encrypted</td>
              </tr>
              <tr>
                <td>Audit Trail Data</td>
                <td>Permanent</td>
                <td>Secure archival storage</td>
              </tr>
              <tr>
                <td>Temporary System Logs</td>
                <td>90 Days</td>
                <td>Automated Deletion</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* User Rights */}
        <section className="privacy-section">
          <h2>7. Your Rights</h2>
          <p>As a system user, you have the following rights regarding your personal data:</p>
          <div className="rights-grid">
            <div className="right-card">
              <h3>Right to Access</h3>
              <p>Request access to your personal data stored in the system</p>
            </div>
            <div className="right-card">
              <h3>Right to Correction</h3>
              <p>Request correction of inaccurate or incomplete data</p>
            </div>
            <div className="right-card">
              <h3>Right to Grievance</h3>
              <p>File grievances regarding data handling practices</p>
            </div>
            <div className="right-card">
              <h3>Right to Information</h3>
              <p>Know how your data is being used and processed</p>
            </div>
          </div>
        </section>

        {/* Policy Updates */}
        <section className="privacy-section update-notice">
          <h2>Policy Updates</h2>
          <p>
            This privacy policy may be updated periodically to reflect changes in
            regulations or system functionality. Users will be notified of significant
            changes through official communication channels.
          </p>
          <p className="last-updated">
            <strong>Last Updated:</strong> 1st January 2026
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;