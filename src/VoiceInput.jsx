import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceInput({ onTranscript, placeholder = "Start speaking..." }) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [supported, setSupported] = useState(true);
  
  // Use refs to avoid stale closures
  const finalTranscriptRef = useRef('');
  const isListeningRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  // Keep callback ref updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Update listening ref
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      // Accumulate final results
      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
      }

      // Combine accumulated final + current interim for LIVE display
      const completeTranscript = finalTranscriptRef.current + interimTranscript;
      
      // Call the current callback with the complete transcript
      if (onTranscriptRef.current) {
        onTranscriptRef.current(completeTranscript);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        return;
      }
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      if (isListeningRef.current) {
        try {
          recognitionInstance.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, []); // Empty dependency array - only run once!

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      try {
        recognition.stop();
        setIsListening(false);
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    } else {
      try {
        finalTranscriptRef.current = '';
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Error starting recognition:', e);
        alert('Microphone permission required. Please allow microphone access and try again.');
      }
    }
  };

  if (!supported) {
    return (
      <div style={{ 
        padding: '12px', 
        background: '#fef3c7', 
        border: '1px solid #fbbf24', 
        borderRadius: '12px',
        fontSize: '14px',
        color: '#92400e'
      }}>
        Voice input not supported in this browser. Try Chrome or Edge.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <button
        onClick={toggleListening}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderRadius: '12px',
          border: 'none',
          fontWeight: '500',
          fontSize: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          background: isListening ? '#ef4444' : '#ddd6fe',
          color: isListening ? 'white' : '#581c87',
          boxShadow: isListening 
            ? '0 4px 12px rgba(239,68,68,0.3)' 
            : '0 4px 12px rgba(221,214,254,0.4)'
        }}
      >
        {isListening ? (
          <>
            <MicOff size={20} />
            Stop Recording
          </>
        ) : (
          <>
            <Mic size={20} />
            Start Voice Input
          </>
        )}
      </button>

      {isListening && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: '#fef3c7',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          <Volume2 size={16} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span>Listening...</span>
        </div>
      )}
    </div>
  );
}