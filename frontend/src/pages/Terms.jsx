import {
  FiBook,
  FiUserCheck,
  FiAlertTriangle,
  FiShield,
  FiLock,
  FiFileText,
  FiUserX,
  FiClock,
  FiTag,
  FiGlobe
} from "react-icons/fi";
import { useEffect } from "react";
import "./Terms.css";

function Terms() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);


  return (
    <div className="terms-container">
      {/* Header */}
      <header className="terms-header">
        <div className="terms-header-content">
          <FiBook className="terms-header-icon" size={48} />
          <h1>Terms of Service</h1>
          <p className="subtitle">Government Asset Management System</p>
          <div className="header-info">
            <div className="info-item">
              <FiClock size={18} />
              <span>Effective: 1st January 2026</span>
            </div>
            <div className="info-item">
              <FiTag size={18} />
              <span>Version: 1.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* TOC */}
      <nav className="table-of-contents">
        <h3>Table of Contents</h3>
        <ul>
          <li><a href="#acceptance">1. Acceptance of Terms</a></li>
          <li><a href="#definitions">2. Definitions</a></li>
          <li><a href="#eligibility">3. User Eligibility</a></li>
          <li><a href="#access">4. System Access & Credentials</a></li>
          <li><a href="#acceptable-use">5. Acceptable Use Policy</a></li>
          <li><a href="#prohibited">6. Prohibited Activities</a></li>
          <li><a href="#intellectual">7. Intellectual Property</a></li>
          <li><a href="#liability">8. Liability & Indemnification</a></li>
          <li><a href="#termination">9. Termination of Access</a></li>
          <li><a href="#dispute">10. Dispute Resolution</a></li>
          <li><a href="#amendments">11. Amendments</a></li>
          <li><a href="#governing-law">12. Governing Law</a></li>
        </ul>
      </nav>

      {/* Main Content */}
      <div className="terms-content">
        {/* Section 1 */}
        <section id="acceptance" className="terms-section">
          <h2><FiBook /> 1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Government Asset Management System (hereinafter "the System"),
            you acknowledge that you have read, understood, and agree to be bound by these Terms of
            Service. If you do not agree to these terms, you must immediately cease using the System.
          </p>
          <div className="notice-box important">
            <h4><FiAlertTriangle /> Important Notice</h4>
            <p>
              Use of this System constitutes acceptance of these terms. Continued use following any
              amendments constitutes acceptance of the revised terms.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section id="definitions" className="terms-section">
          <h2>2. Definitions</h2>
          <div className="definitions-grid">
            <div className="definition-card">
              <h3>"User"</h3>
              <p>Any authorized government employee, contractor, or personnel granted access to the System.</p>
            </div>
            <div className="definition-card">
              <h3>"Asset"</h3>
              <p>Any government property, equipment, or resource recorded in the System.</p>
            </div>
            <div className="definition-card">
              <h3>"Unauthorized Access"</h3>
              <p>Access without proper authorization or beyond granted permissions.</p>
            </div>
            <div className="definition-card">
              <h3>"Confidential Information"</h3>
              <p>Any non-public information accessible through the System.</p>
            </div>
            <div className="definition-card">
              <h3>"System"</h3>
              <p>The Government Asset Management System (AMS), including all software,
                databases, and related services.</p>
            </div>
            <div className="definition-card">
              <h3>"Role-Based Access Control"</h3>
              <p>A security mechanism that restricts system access based on assigned user
                roles and permissions.</p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section id="eligibility" className="terms-section">
          <h2><FiUserCheck /> 3. User Eligibility</h2>
          <div className="eligibility-box">
            <h3>Authorized Users Include:</h3>
            <ul className="check-list">
              <li>Permanent government employees with valid service IDs</li>
              <li>Contractual staff with authorized department approval</li>
              <li>Audit personnel with official audit mandates</li>
              <li>System administrators and technical support staff</li>
              <li>Other personnel as specifically authorized by competent authority</li>
            </ul>
            <div className="verification-notice">
              <FiLock />
              <div>
                <h4>Identity Verification Required</h4>
                <p>All users must complete mandatory identity verification before system access.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="access" className="terms-section">
          <h2><FiShield /> 4. System Access & Credentials</h2>
          <div className="responsibility-grid">
            <div className="responsibility-card">
              <h3>User Responsibilities</h3>
              <ul>
                <li>Maintain confidentiality of login credentials</li>
                <li>Immediately report suspected security breaches</li>
                <li>Change passwords periodically as per applicable security policy</li>
                <li>Never share credentials or allow proxy access</li>
                <li>Log out after each session</li>
              </ul>
            </div>
            <div className="responsibility-card">
              <h3>Administrator Rights</h3>
              <ul>
                <li>Monitor user activity and access patterns</li>
                <li>Revoke access for policy violations</li>
                <li>Implement security updates and patches</li>
                <li>Maintain system access logs</li>
                <li>Conduct security audits periodically</li>
              </ul>
            </div>
          </div>
          <div className="warning-box">
            <FiAlertTriangle />
            <p>
              <strong>Warning:</strong> Unauthorized access attempts will be logged and may result in
              disciplinary action under the Official Secrets Act and relevant IT laws.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section id="acceptable-use" className="terms-section highlight">
          <h2>5. Acceptable Use Policy</h2>
          <p>The System may only be used for legitimate government business purposes including:</p>
          <div className="use-cases">
            <div className="use-case">
              <div className="use-icon">✓</div>
              <div>
                <h4>Asset Registration</h4>
                <p>Recording new government assets in the System</p>
              </div>
            </div>
            <div className="use-case">
              <div className="use-icon">✓</div>
              <div>
                <h4>Asset Tracking</h4>
                <p>Monitoring asset location, condition, and status</p>
              </div>
            </div>
            <div className="use-case">
              <div className="use-icon">✓</div>
              <div>
                <h4>Maintenance Records</h4>
                <p>Logging maintenance schedules and histories</p>
              </div>
            </div>
            <div className="use-case">
              <div className="use-icon">✓</div>
              <div>
                <h4>Reporting</h4>
                <p>Generating official reports for audit and review</p>
              </div>
            </div>
            <div className="use-case">
              <div className="use-icon">✓</div>
              <div>
                <h4>Asset Requests & Allocation</h4>
                <p>Submitting and approving asset requests in accordingly</p>
              </div>
            </div>

            <div className="use-case">
              <div className="use-icon">✓</div>
              <div>
                <h4>Audit & Compliance Activities</h4>
                <p>Reviewing asset records and logs for compliance and verification purposes</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section id="prohibited" className="terms-section warning">
          <h2><FiUserX /> 6. Prohibited Activities</h2>
          <div className="prohibited-grid">
            <div className="prohibited-item severe">
              <h3>Severe Violations</h3>
              <ul>
                <li>Unauthorized data modification or deletion</li>
                <li>Attempting to bypass system security</li>
                <li>Sharing login credentials with unauthorized persons</li>
                <li>Using the system for personal gain or commercial purposes</li>
              </ul>
            </div>
            <div className="prohibited-item moderate">
              <h3>Moderate Violations</h3>
              <ul>
                <li>Accessing data outside authorized scope</li>
                <li>Downloading data without authorization</li>
                <li>Using unauthorized devices to access the system</li>
                <li>Failing to report security incidents</li>
              </ul>
            </div>
          </div>
          <div className="penalty-notice">
            <h4><FiAlertTriangle /> Penalties for Violations</h4>
            <p>
              Violations may result in disciplinary action, access revocation, and legal proceedings
              under applicable laws including the Information Technology Act, 2000.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section id="intellectual" className="terms-section">
          <h2>7. Intellectual Property Rights</h2>
          <div className="ip-box">
            <div className="ip-item">
              <h3>Government Ownership</h3>
              <p>
                All intellectual property rights in the System, including software, databases,
                and documentation, are owned by the Government of India.
              </p>
            </div>
            <div className="ip-item">
              <h3>User-Generated Content</h3>
              <p>
                All data entered into the System becomes property of the government and is
                subject to public records laws.
              </p>
            </div>
            <div className="ip-item">
              <h3>No Commercial Use</h3>
              <p>
                The System or any component thereof may not be used for commercial purposes
                without explicit government authorization.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8 */}
        <section id="liability" className="terms-section">
          <h2>8. Liability & Indemnification</h2>
          <div className="liability-content">
            <h3>Limitation of Liability</h3>
            <p>
              The Government shall not be liable for any indirect, incidental, special, or
              consequential damages arising from the use or inability to use the System.
            </p>

            <h3>User Indemnification</h3>
            <p>
              Users agree to indemnify and hold harmless the Government from any claims,
              damages, or losses resulting from their violation of these terms.
            </p>

            <div className="disclaimer">
              <h4><FiAlertTriangle /> System Availability Disclaimer</h4>
              <p>
                The System is provided on an "as-is" basis. The Government does not guarantee
                uninterrupted access and reserves the right to conduct maintenance without prior notice.
              </p>
            </div>
          </div>
        </section>

        {/* Section 9 */}
        <section id="termination" className="terms-section">
          <h2>9. Termination of Access</h2>
          <div className="termination-grid">
            <div className="termination-card">
              <h3>Automatic Termination</h3>
              <ul>
                <li>Upon retirement or resignation</li>
                <li>Transfer to another department</li>
                <li>Contract expiration</li>
                <li>Official suspension from service</li>
              </ul>
            </div>
            <div className="termination-card">
              <h3>Discretionary Termination</h3>
              <ul>
                <li>Violation of terms of service</li>
                <li>Security policy breaches</li>
                <li>Misuse of system access</li>
                <li>Unauthorized data access</li>
              </ul>
            </div>
          </div>
          <p className="termination-notice">
            <strong>Note:</strong> Upon termination, all access rights are revoked immediately.
            Users must return any government property in their possession.
          </p>
        </section>

        {/* Section 10 */}
        <section id="dispute" className="terms-section">
          <h2>10. Dispute Resolution</h2>
          <div className="dispute-process">
            <div className="process-step">
              <div className="step-number">1</div>
              <div>
                <h3>Internal Resolution</h3>
                <p>Report issue to departmental Grievance Officer within 30 days</p>
              </div>
            </div>
            <div className="process-step">
              <div className="step-number">2</div>
              <div>
                <h3>Appeal Process</h3>
                <p>Escalate to appellate authority if unsatisfied with resolution</p>
              </div>
            </div>
            <div className="process-step">
              <div className="step-number">3</div>
              <div>
                <h3>Legal Recourse</h3>
                <p>Jurisdiction lies exclusively with courts within india</p>
              </div>
            </div>
            <div className="process-step">
              <div className="step-number">4</div>
              <div>
                <h3>Government Rights</h3>
                <p>Nothing in this section shall prevent the Government from initiating action under applicable laws.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 11 */}
        <section id="amendments" className="terms-section">
          <h2>11. Amendments to Terms</h2>
          <div className="amendment-box">
            <div className="amendment-item">
              <FiFileText />
              <div>
                <h3>Right to Amend</h3>
                <p>The Government reserves the right to modify these terms at any time.</p>
              </div>
            </div>
            <div className="amendment-item">
              <FiClock />
              <div>
                <h3>Notification Period</h3>
                <p>Users will be notified of changes at least 15 days before implementation.</p>
              </div>
            </div>
            <div className="amendment-item">
              <FiAlertTriangle />
              <div>
                <h3>Continued Use</h3>
                <p>Continued use after amendments constitutes acceptance of new terms.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 12 */}
        <section id="governing-law" className="terms-section final">
          <h2><FiGlobe /> 12. Governing Law & Jurisdiction</h2>
          <div className="governing-content">
            <h3>Applicable Laws</h3>
            <p>
              These Terms of Service shall be governed by and construed in accordance with:
            </p>
            <ul>
              <li>The Information Technology Act, 2000 and amendments</li>
              <li>Official Secrets Act, 1923</li>
              <li>Relevant government service rules and regulations</li>
              <li>Any other applicable laws of India</li>
            </ul>

            <div className="jurisdiction-box">
              <h4>Jurisdiction</h4>
              <p>
                Any disputes arising from these terms shall be subject to the exclusive
                jurisdiction of the courts within India.
              </p>
            </div>
          </div>
        </section>

        {/* Acknowledgment */}
        <section className="acknowledgment-section">
          <h3>Acknowledgment of Terms</h3>
          <p>
            By accessing the Government Asset Management System, I acknowledge that I have
            read, understood, and agree to be bound by these Terms of Service.
          </p>
          <div className="acknowledgment-info">
            <p><strong>System:</strong> Government Asset Management System (AMS)</p>
            <p><strong>Version:</strong> 1.0</p>
            <p><strong>Effective Date:</strong> 1st January 2026</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Terms;