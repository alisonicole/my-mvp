import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

export default function VoiceRecorder({ onTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const timerRef = useRef(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Voice recording started');
      isListeningRef.current = true;
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Send combined transcript to parent
      const fullText = finalTranscriptRef.current + interimTranscript;
      if (onTranscript) {
        onTranscript(fullText.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors during continuous recording
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.log('Already running');
          }
        }
      }
      
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      console.log('Recognition ended');
      // Auto-restart if still supposed to be recording
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition already started');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    try {
      if (!recognitionRef.current) {
        alert('Speech recognition not available');
        return;
      }

      finalTranscriptRef.current = '';
      setRecordingTime(0);
      setIsRecording(true);
      isListeningRef.current = true;

      recognitionRef.current.start();

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
      isListeningRef.current = false;
    }
  };

  const stopRecording = () => {
    try {
      isListeningRef.current = false;
      setIsRecording(false);

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Final transcript is already sent via onTranscript
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <div style={{
        padding: '24px',
        background: '#faf5ff',
        borderRadius: '12px',
        border: '2px solid #e9d5ff',
        textAlign: 'center'
      }}>
        <Loader2 size={32} style={{ color: '#9333ea', margin: '0 auto 12px' }} className="animate-spin" />
        <p style={{ color: '#7c3aed', fontSize: '14px', margin: 0 }}>
          Processing your memo...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      background: isRecording ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#faf5ff',
      borderRadius: '12px',
      border: `2px solid ${isRecording ? '#fbbf24' : '#e9d5ff'}`,
      transition: 'all 0.3s ease'
    }}>
      <div style={{ textAlign: 'center' }}>
        {!isRecording ? (
          <>
            <div style={{ marginBottom: '12px' }}>
              <Mic size={32} style={{ color: '#9333ea' }} />
            </div>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '500', 
              color: '#581c87',
              marginBottom: '8px',
              margin: '0 0 8px 0'
            }}>
              Record Post-Session Memo
            </h4>
            <p style={{ 
              fontSize: '14px', 
              color: '#7c3aed',
              marginBottom: '16px',
              margin: '0 0 16px 0'
            }}>
              Capture your thoughts right after your session
            </p>
            <button
              onClick={startRecording}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: '#9333ea',
                color: 'white',
                fontWeight: '500',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Mic size={20} />
              Start Recording
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto',
                borderRadius: '50%',
                background: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <Mic size={32} style={{ color: 'white' }} />
              </div>
            </div>
            
            <div style={{
              fontSize: '32px',
              fontWeight: '500',
              color: '#92400e',
              marginBottom: '8px',
              fontFamily: 'monospace'
            }}>
              {formatTime(recordingTime)}
            </div>
            
            <p style={{ 
              fontSize: '14px', 
              color: '#92400e',
              marginBottom: '16px',
              margin: '0 0 16px 0'
            }}>
              Recording in progress...
            </p>
            
            <button
              onClick={stopRecording}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: '#dc2626',
                color: 'white',
                fontWeight: '500',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Square size={20} />
              Stop Recording
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}