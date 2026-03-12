import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import App from './App';
import Login from './pages/Login';
import Signup from './pages/Signup';

export default function AppRouter() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userEncryptionKey, setUserEncryptionKey] = useState(null);

  const Parse = typeof window !== 'undefined' ? window.Parse : null;
  const APP_ID = import.meta.env.VITE_PARSE_APP_ID;
  const JS_KEY = import.meta.env.VITE_PARSE_JS_KEY;
  const SERVER_URL = import.meta.env.VITE_PARSE_SERVER_URL;

  const generateEncryptionKey = (userPassword) =>
    CryptoJS.SHA256(userPassword + "between-app-salt-2026").toString();

  // Initialize Parse
  useEffect(() => {
    if (!Parse) {
      console.error("Parse SDK not loaded from CDN");
      return;
    }
    if (!APP_ID || !JS_KEY || !SERVER_URL) {
      console.warn("Missing env vars:", { APP_ID, JS_KEY, SERVER_URL });
      return;
    }
    
    try {
      Parse.initialize(APP_ID, JS_KEY);
      Parse.serverURL = SERVER_URL;
      console.log("Parse initialized successfully");
      const user = Parse.User.current();
      setCurrentUser(user);
      
      // Restore encryption key
      if (user) {
        const storedKey = localStorage.getItem('encKey');
        if (storedKey) setUserEncryptionKey(storedKey);
      }
    } catch (e) {
      console.error("Parse init failed", e);
    }
  }, [APP_ID, JS_KEY, SERVER_URL, Parse]);

  const handleLogin = async (email, password) => {
    const user = await Parse.User.logIn(email, password);
    setCurrentUser(user);
    const encKey = generateEncryptionKey(password);
    setUserEncryptionKey(encKey);
    localStorage.setItem('encKey', encKey);
    navigate('/');
  };

  const handleSignup = async (name, email, password) => {
    const user = new Parse.User();
    user.set("username", email);
    user.set("email", email);
    user.set("password", password);
    if (name.trim()) user.set("displayName", name.trim());
    
    await user.signUp();
    setCurrentUser(user);
    const encKey = generateEncryptionKey(password);
    setUserEncryptionKey(encKey);
    localStorage.setItem('encKey', encKey);
    navigate('/');
  };

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          currentUser ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } 
      />
      <Route 
        path="/signup" 
        element={
          currentUser ? <Navigate to="/" replace /> : <Signup onSignup={handleSignup} />
        } 
      />
      <Route 
        path="/" 
        element={
          currentUser ? (
            <App currentUser={currentUser} userEncryptionKey={userEncryptionKey} />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      <Route 
        path="*" 
        element={<Navigate to="/" replace />} 
      />
    </Routes>
  );
}