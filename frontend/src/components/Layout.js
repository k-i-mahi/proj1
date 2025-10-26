import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Routes where Navbar should NOT be shown for unauthenticated users
  const authOnlyNavbarRoutes = ['/login', '/register'];
  
  // Routes where Footer should NOT be shown
  const noFooterRoutes = ['/login', '/register', '/map'];
  
  // Routes that need special full-screen handling
  const fullScreenRoutes = ['/map'];

  // Show navbar if:
  // 1. User is authenticated, OR
  // 2. User is not authenticated but not on auth-only routes
  const showNavbar = isAuthenticated || !authOnlyNavbarRoutes.includes(location.pathname);
  
  // Show footer if not on no-footer routes
  const showFooter = !noFooterRoutes.includes(location.pathname);
  
  // Check if current route needs full-screen treatment
  const isFullScreen = fullScreenRoutes.includes(location.pathname);

  return (
    <div className="app-layout">
      {showNavbar && <Navbar />}
      <main className={`main-content ${
        isFullScreen 
          ? 'map-view' 
          : showNavbar 
            ? 'with-navbar' 
            : 'full-height'
      }`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;