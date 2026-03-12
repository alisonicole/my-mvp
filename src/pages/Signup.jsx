import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../Logo';

export default function Signup({ onSignup }) {
  const navigate = useNavigate();
  const [signupName, setSignupName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      await onSignup(signupName, email, password);
      // onSignup will handle navigation
    } catch (error) {
      setAuthError(error.message || "Signup failed");
      setAuthLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#f3e8ff',
      padding: '24px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400&family=Work+Sans:wght@400;500&display=swap');
        * { font-family: 'Work Sans', sans-serif; box-sizing: border-box; }
        h1, h2, h3, .serif { font-family: 'Crimson Pro', serif; }
        body, html { margin: 0; padding: 0; min-height: 100vh; background: #f3e8ff; }
      `}</style>

      <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', maxWidth: '600px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <Logo />
        </div>
        <p style={{ color: '#7c3aed', fontSize: '16px', textAlign: 'center', marginBottom: '32px' }}>
          Capture what comes up between therapy sessions and bring it into the room
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: '500',
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: 'rgba(255,255,255,0.6)',
              color: '#7c3aed'
            }}
          >
            Log In
          </button>
          <button
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: '500',
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: '#9333ea',
              color: 'white'
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#7c3aed', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              What can we call you?
            </label>
            <input
              type="text"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              placeholder="Your first name"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'white', color: '#581c87' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#7c3aed', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'white', color: '#581c87' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#7c3aed', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'white', color: '#581c87' }}
            />
            <div style={{ marginTop: '8px', padding: '10px 12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', fontSize: '12px', color: '#581c87', lineHeight: '1.5' }}>
              🔒 Your entries are encrypted with your password. If you forget your password, your data cannot be recovered.
            </div>
          </div>

          {authError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ color: '#dc2626', margin: 0, fontSize: '14px' }}>{authError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '500',
              fontSize: '16px',
              cursor: authLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              background: authLoading ? '#d1d5db' : '#9333ea',
              color: 'white',
              opacity: authLoading ? 0.5 : 1
            }}
          >
            {authLoading ? 'Loading...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
          Already have an account? <button onClick={() => navigate('/login')} style={{ color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Log in here</button>
        </p>
      </div>
    </div>
  );
}
EOF