import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

const isIOS = /iPhone|iPad|iPod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');
const RESTART_DELAY = isIOS ? 600 : 150;

export default function VoiceInput({ onTranscript, currentText = "", placeholder = "Start speaking...", compact = false }) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [paused, setPaused] = useState(false);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const restartTimerRef = useRef(null);
  // Refs to avoid stale closures in event handlers
  const finalsRef = useRef('');       // accumulated final transcription
  const baseTextRef = useRef('');     // text before recording started
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // Initialize recognition once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const r = new SpeechRecognition();
    r.continuous = !isIOS;
    r.interimResults = true;
    r.lang = 'en-US';
    recognitionRef.current = r;

    r.onresult = (event) => {
      let interim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newFinal += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (newFinal) {
        finalsRef.current += newFinal;
        if (isIOS) setPaused(false);
      }

      // Push combined text to parent on every event (live updates)
      const base = baseTextRef.current;
      const spoken = finalsRef.current + interim;
      const combined = base ? base.trimEnd() + ' ' + spoken : spoken;
      onTranscriptRef.current(combined);
    };

    r.onerror = (event) => {
      if (['no-speech', 'aborted', 'network'].includes(event.error)) return;
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        setSupported(false);
      }
      console.error('Speech recognition error:', event.error);
      isListeningRef.current = false;
      setIsListening(false);
      setPaused(false);
    };

    r.onend = () => {
      if (!isListeningRef.current) {
        setIsListening(false);
        setPaused(false);
        return;
      }

      if (isIOS) {
        setPaused(true);
        return;
      }

      // Desktop/Android: auto-restart
      restartTimerRef.current = setTimeout(() => {
        if (!isListeningRef.current) return;
        try {
          recognitionRef.current.start();
        } catch (e) {
          isListeningRef.current = false;
          setIsListening(false);
        }
      }, RESTART_DELAY);
    };

    return () => {
      clearTimeout(restartTimerRef.current);
      isListeningRef.current = false;
      try { r.abort(); } catch (e) {}
    };
  }, []);

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    baseTextRef.current = currentText;
    finalsRef.current = '';
    setPaused(false);
    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = () => {
    clearTimeout(restartTimerRef.current);
    isListeningRef.current = false;
    setIsListening(false);
    setPaused(false);
    try { recognitionRef.current.abort(); } catch (e) {}
  };

  const resumeListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition || !isListeningRef.current) return;
    setPaused(false);
    try {
      recognition.start();
    } catch (e) {
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  if (!supported) {
    return (
      <div style={{ padding: '12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '12px', fontSize: '14px', color: '#92400e' }}>
        Voice input not supported in this browser. Try Chrome, Edge, or Safari.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={toggleListening}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: compact ? '10px 20px' : '12px 20px',
            borderRadius: '12px',
            fontWeight: '500',
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: isListening ? '#ef4444' : compact ? 'transparent' : '#9333ea',
            color: isListening ? 'white' : compact ? '#7c3aed' : 'white',
            border: compact && !isListening ? '1px solid #e9d5ff' : 'none',
            boxShadow: isListening
              ? '0 4px 12px rgba(239,68,68,0.3)'
              : compact ? 'none' : '0 4px 12px rgba(147,51,234,0.3)'
          }}
        >
          {isListening ? <><MicOff size={20} />Stop Recording</> : <><Mic size={20} />Start Voice Input</>}
        </button>

        {isIOS && paused && isListening && (
          <button
            onClick={resumeListening}
            style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #9333ea', background: 'white', color: '#9333ea', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}
          >
            Tap to continue
          </button>
        )}
      </div>

      {isListening && !paused && (
        <div style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '10px', fontSize: '14px', color: '#92400e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={15} style={{ flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontWeight: '500' }}>
              {isIOS ? 'Listening — speak, then pause briefly' : 'Listening...'}
            </span>
          </div>
        </div>
      )}

      {isIOS && paused && isListening && (
        <div style={{ padding: '8px 12px', background: '#ede9fe', borderRadius: '8px', fontSize: '13px', color: '#6d28d9' }}>
          Paused — tap "Tap to continue" to keep recording
        </div>
      )}
    </div>
  );
}
