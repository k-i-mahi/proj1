import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="brand-logo">
              <span className="logo-icon">🏙️</span>
              <span className="logo-text">Civita</span>
            </div>
            <p className="brand-description">
              Empowering communities through digital civic engagement.
              Making neighborhoods better, one issue at a time.
            </p>
            <div className="creator-credit">
              <p>Created by <strong>Khadimul Islam Mahi</strong></p>
              <p className="creator-tagline">Building better communities through technology</p>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Platform</h4>
              <Link to="/issues">Browse Issues</Link>
              <Link to="/map">Issue Map</Link>
              <Link to="/categories">Categories</Link>
            </div>

            <div className="footer-column">
              <h4>Community</h4>
              <Link to="/">Home</Link>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/profile">Profile</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="copyright">
              <p>&copy; 2024 Civita Platform. All rights reserved.</p>
              <p className="creator-small">Developed by Khadimul Islam Mahi</p>
            </div>
            
            <div className="social-links">
              <a href="mailto:khadimulislam.mahi@example.com" className="social-link" title="Contact Developer">
                <span>�</span>
              </a>
            </div>
            
            <div className="footer-meta">
              <span className="version">v1.0.0</span>
              <span className="status online">🟢 All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;