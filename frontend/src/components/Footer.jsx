import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>© 2026 Government Asset Management System (AMS)</p>
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/Contact">Contact Support</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
