import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceInput({ onTranscript, placeholder = "Start speaking..." }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true; // Keep listening
    recognitionInstance.interimResults = true; // Show results as you speak
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      const currentTranscript = transcript + finalTranscript;
      setTranscript(currentTranscript);
      
      // Call parent callback with updated transcript
      // Accumulate final results in a ref
    if (finalTranscript) {
    finalTranscriptRef.current += finalTranscript;
    }

    // Combine final + interim for LIVE display
    const completeTranscript = finalTranscriptRef.current + interimTranscript;

    // Update IMMEDIATELY - no waiting for pauses!
    onTranscript(completeTranscript);
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Just keep listening
        return;
      }
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      if (isListening) {
        // Restart if still listening (browser auto-stops after ~60s)
        recognitionInstance.start();
      }
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setTranscript(''); // Clear previous transcript
      recognition.start();
      setIsListening(true);
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
          background: isListening ? '#ef4444' : '#ddd6fe',  // Light purple when not recording
          color: isListening ? 'white' : '#581c87',  // Dark purple text
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