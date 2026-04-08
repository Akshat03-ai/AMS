import { FiMail, FiClock, FiAlertCircle, FiShield } from "react-icons/fi";
import "./Contact.css";
import { useEffect } from "react";

function Contact() {
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="contact-container">
      {/* Header */}
      <header className="contact-header">
        <h1>Contact Support</h1>
        <p>
          This page provides official contact information for technical support
          and system-related assistance.
        </p>
      </header>

      {/* Main Content */}
      <section className="contact-content">
        {/* Support Info */}
        <div className="contact-card">
          <div className="contact-icon">
            <FiMail size={24} />
          </div>
          <div>
            <h3>Technical Support Email</h3>
            <p>
              For login issues, access problems, or system errors, please contact
              the Asset Management System support team.
            </p>
            <p className="contact-highlight">
              <br />
              Write to us at
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=akshat00312@gmail.com&su=AMS%20Support%20Request"
                target="_blank"
                rel="noopener noreferrer"
              >
                akshat00312@gmail.com
              </a>
            </p>
          </div>
        </div>

        {/* Working Hours */}
        <div className="contact-card">
          <div className="contact-icon">
            <FiClock size={24} />
          </div>
          <div>
            <h3>Support Hours</h3>
            <p>
              Support services are available during official working hours only.
            </p>
            <p className="contact-highlight">
              Monday to Friday, 10:00 AM – 5:30 PM
              <br />
              <span className="muted">(Excluding public holidays)</span>
            </p>
          </div>
        </div>

        {/* Escalation */}
        <div className="contact-card">
          <div className="contact-icon warning">
            <FiAlertCircle size={24} />
          </div>
          <div>
            <h3>Issue Escalation</h3>
            <p>
              If an issue remains unresolved beyond 48 working hours, please
              escalate the matter through your department administrator.
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="contact-card security">
          <div className="contact-icon security-icon">
            <FiShield size={24} />
          </div>
          <div>
            <h3>Security Notice</h3>
            <p>
              This is an internal government system. Unauthorized access,
              misuse, or data manipulation is strictly prohibited and may
              attract disciplinary or legal action.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Contact;