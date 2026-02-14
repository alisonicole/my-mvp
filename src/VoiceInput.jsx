import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceInput({ onTranscript, currentText = "", placeholder = "Start speaking..." }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const [baseText, setBaseText] = useState(''); // Store the text when recording started
  
  const recognitionRef = useRef(null);

  // Initialize recognition once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';
    
    recognitionRef.current = recognitionInstance;

    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []); // Only run once on mount

  // Set up event handlers
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        return;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }, []); // Only set handlers once

  // Update parent when transcript changes
  useEffect(() => {
    if (transcript && isListening) {
      const combinedText = baseText + (baseText && transcript ? ' ' : '') + transcript;
      onTranscript(combinedText);
    }
  }, [transcript, baseText, isListening, onTranscript]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      try {
        recognition.stop();
        setIsListening(false);
      } catch (e) {
        console.error('Error stopping recognition:', e);
        setIsListening(false);
      }
    } else {
      setBaseText(currentText);
      setTranscript('');
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Error starting recognition:', e);
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
          background: isListening ? '#ef4444' : '#9333ea',
          color: 'white',
          boxShadow: isListening 
            ? '0 4px 12px rgba(239,68,68,0.3)' 
            : '0 4px 12px rgba(147,51,234,0.3)'
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