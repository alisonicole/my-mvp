import React, { useState } from 'react';

export default function EngagementMessage({ message, type, onDismiss }) {
  const [visible, setVisible] = useState(true);

  const isMilestone = type === 'entry5' || type === 'sessionSnapshot';

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!visible || !message) return null;

  return (
    <div style={{
      background: isMilestone
        ? 'linear-gradient(135deg, #6B4C93 0%, #9B6BB5 100%)'
        : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      backdropFilter: 'blur(10px)',
      border: isMilestone ? '1px solid rgba(255,255,255,0.2)' : '1px solid #ddd6fe',
      borderRadius: '16px',
      padding: '20px 24px',
      margin: '0 0 16px 0',
      color: isMilestone ? '#fff' : '#581c87',
      position: 'relative',
    }}>
      {isMilestone && (
        <div style={{ fontSize: '20px', marginBottom: '8px' }}>
          {type === 'entry5' ? '✨' : '🌿'}
        </div>
      )}
      <p style={{
        margin: 0,
        fontSize: '15px',
        lineHeight: '1.6',
        fontStyle: 'italic',
        opacity: isMilestone ? 0.95 : 1,
        color: isMilestone ? '#fff' : '#581c87',
        paddingRight: '20px',
      }}>
        {message}
      </p>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          background: 'none',
          border: 'none',
          color: isMilestone ? 'rgba(255,255,255,0.6)' : '#9ca3af',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
