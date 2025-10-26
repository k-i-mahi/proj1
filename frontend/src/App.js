import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CategoryProvider } from './context/CategoryContext';
import { IssueProvider } from './context/IssueContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeServices } from './services';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Categories from './pages/Categories';
import IssueList from './pages/IssueList';
import IssueDetail from './pages/IssueDetail';
import IssueForm from './pages/IssueForm';
import Map from './pages/Map';
import Analytics from './pages/Analytics';

// Styles
import './App.css';


// 404 Not Found Component
const NotFound = () => (
  <div className="not-found-page">
    <div className="not-found-content">
      <div className="not-found-icon">🔍</div>
      <h1 className="not-found-title">404 - Page Not Found</h1>
      <p className="not-found-message">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="not-found-actions">
        <a href="/" className="btn btn-primary">
          Go Home
        </a>
        <a href="/issues" className="btn btn-outline">
          Browse Issues
        </a>
      </div>
    </div>
  </div>
);

function App() {
  const [servicesReady, setServicesReady] = useState(false);
  const [serviceError, setServiceError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const result = await initializeServices();
        
        if (result.success) {
          setServicesReady(true);
          console.log('✅ All services initialized successfully');
        } else {
          setServiceError(result.error);
          console.error('❌ Service initialization failed:', result.error);
        }
      } catch (error) {
        setServiceError(error.message);
        console.error('❌ Fatal error during initialization:', error);
      }
    };

    init();
  }, []);

  if (serviceError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>⚠️ Service Initialization Error</h2>
        <p>{serviceError}</p>
        <p>Please ensure the backend server is running at:</p>
        <code>{process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}</code>
        <br />
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!servicesReady) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>🔄 Loading Services...</h2>
        <p>Connecting to backend and initializing services</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <CategoryProvider>
              <IssueProvider>
                <NotificationProvider>
                  <div className="App">
                    <Layout>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Protected Routes - All Authenticated Users */}
                        <Route 
                          path="/dashboard" 
                          element={
                            <PrivateRoute>
                              <Dashboard />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="/profile" 
                          element={
                            <PrivateRoute>
                              <Profile />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="/issues" 
                          element={
                            <PrivateRoute>
                              <IssueList />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="/issues/:id" 
                          element={
                            <PrivateRoute>
                              <IssueDetail />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="/issues/new" 
                          element={
                            <PrivateRoute>
                              <IssueForm />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="/issues/:id/edit" 
                          element={
                            <PrivateRoute>
                              <IssueForm />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="/map" 
                          element={
                            <PrivateRoute>
                              <Map />
                            </PrivateRoute>
                          } 
                        />

                        {/* Authority & Admin Routes */}
                        <Route 
                          path="/analytics" 
                          element={
                            <PrivateRoute roles={['authority', 'admin']}>
                              <Analytics />
                            </PrivateRoute>
                          } 
                        />

                        {/* Admin Only Routes */}
                        <Route 
                          path="/categories" 
                          element={
                            <PrivateRoute roles={['admin']}>
                              <Categories />
                            </PrivateRoute>
                          } 
                        />

                        {/* Fallback Routes */}
                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                      </Routes>
                    </Layout>
                  </div>
                </NotificationProvider>
              </IssueProvider>
            </CategoryProvider>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;