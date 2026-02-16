import React, { useEffect, useMemo, useState } from "react";
import CryptoJS from 'crypto-js';
import {
  Calendar,
  FileText,
  Home,
  User,
  Sparkles,
  ArrowRight,
  Save,
  Loader2,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  LogOut,
  BookOpen,
  Archive,
  MessageSquare,
  PenTool,
  Lock,
  MessageCircle,
  Star,
} from "lucide-react";
import AdminDashboard from './AdminDashboard';
import Logo from './Logo';
import VoiceInput from './VoiceInput';

export default function App() {
  const getDate = () => new Date().toISOString().split("T")[0];

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Main tabs: "journal" or "sessions"
  const [tab, setTab] = useState("home"); // "home", "journal", "sessions", "account"
  
  // Journal sub-tabs
  const [journalView, setJournalView] = useState("write"); // "write" or "log"
  
  // Sessions sub-tabs
  const [sessionView, setSessionView] = useState("pre"); // "pre" or "post"

  const [expanded, setExpanded] = useState({});
  const [date, setDate] = useState(getDate());
  const [entry, setEntry] = useState({ text: "", prompt: "" }); // Add prompt field
  const [activePrompt, setActivePrompt] = useState(""); // Currently displayed prompt
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ text: "" });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisTimestamp, setAnalysisTimestamp] = useState(null);
  const [lastAnalyzedEntries, setLastAnalyzedEntries] = useState([]);
  const [history, setHistory] = useState([]);
  const [sessionDate, setSessionDate] = useState(getDate());
  const [notes, setNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [editStmt, setEditStmt] = useState(false);
  const [tempStmt, setTempStmt] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [logFilter, setLogFilter] = useState("all"); // "all", "entries", "snapshots"
  const [favoritedPatterns, setFavoritedPatterns] = useState([]); // [{text, favoritedAt}]
  const [showWelcome, setShowWelcome] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savedPrompts, setSavedPrompts] = useState([]); // [{text, savedAt}]
  const [showMyPrompts, setShowMyPrompts] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [userEncryptionKey, setUserEncryptionKey] = useState(null);

  const streak = useMemo(() => {
    const dateSet = new Set(entries.map(e => e.date));
    // Also include session snapshot dates in the streak
    history.forEach(s => {
      const d = s.sessionDate || s.timestamp?.split('T')[0];
      if (d) dateSet.add(d);
    });
    // Only count today if there's been activity in the last 24 hours
    const now = Date.now();
    const recentEntry = entries.find(e => now - new Date(e.timestamp).getTime() < 86400000);
    const recentSnapshot = history.find(s => now - new Date(s.timestamp).getTime() < 86400000);
    const hasActivityToday = !!(recentEntry || recentSnapshot);
    let count = 0;
    const d = new Date();
    if (!hasActivityToday) d.setDate(d.getDate() - 1); // start from yesterday
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (dateSet.has(dateStr)) { count++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return count;
  }, [entries, history]);


  // Encryption helpers — key derived from user's password
  const generateEncryptionKey = (userPassword) =>
    CryptoJS.SHA256(userPassword + "between-app-salt-2026").toString();

  const encryptText = (text, key) => {
    if (!text || !key) return text || "";
    return CryptoJS.AES.encrypt(text, key).toString();
  };

  const decryptText = (encryptedText, key) => {
    if (!encryptedText || !key) return encryptedText || "";
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, key);
      const decoded = bytes.toString(CryptoJS.enc.Utf8);
      // If decryption returns empty string, text was stored unencrypted (legacy) — return as-is
      return decoded || encryptedText;
    } catch (e) {
      return encryptedText; // Legacy plaintext — return as-is
    }
  };

  const APP_ID = import.meta.env.VITE_PARSE_APP_ID;
  const JS_KEY = import.meta.env.VITE_PARSE_JS_KEY;
  const SERVER_URL = import.meta.env.VITE_PARSE_SERVER_URL;

  const Parse = typeof window !== 'undefined' ? window.Parse : null;
  const PARSE_READY = Boolean(Parse && APP_ID && JS_KEY && SERVER_URL);

  const isPaidSubscriber = true; // All features enabled for all users

  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const formatDate = (d) =>
    new Date(d + "T12:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

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
    } catch (e) {
      console.error("Parse init failed", e);
    }
  }, [APP_ID, JS_KEY, SERVER_URL, Parse]);

  // Restore encryption key from session storage on page reload
  useEffect(() => {
    if (currentUser) {
      const storedKey = sessionStorage.getItem('encKey');
      if (storedKey) setUserEncryptionKey(storedKey);
    }
  }, [currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const user = await Parse.User.logIn(email, password);
      setCurrentUser(user);
      const encKey = generateEncryptionKey(password);
      setUserEncryptionKey(encKey);
      sessionStorage.setItem('encKey', encKey);
      setTab("home");
      setEmail("");
      setPassword("");
    } catch (error) {
      setAuthError(error.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    
    try {
      const user = new Parse.User();
      user.set("username", email);
      user.set("email", email);
      user.set("password", password);
      if (signupName.trim()) user.set("displayName", signupName.trim());

      await user.signUp();
      setCurrentUser(user);
      if (signupName.trim()) setDisplayName(signupName.trim());
      const encKey = generateEncryptionKey(password);
      setUserEncryptionKey(encKey);
      sessionStorage.setItem('encKey', encKey);
      setTab("journal");
      setJournalView("log");
      setShowWelcome(true);
      setEmail("");
      setPassword("");
    } catch (error) {
      setAuthError(error.message || "Signup failed");
    } finally {
      setAuthLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await Parse.User.logOut();
    setCurrentUser(null);
    setUserEncryptionKey(null);
    sessionStorage.removeItem('encKey');
    setEntries([]);
    setHistory([]);
    setAnalysis(null);
    setAnalysisTimestamp(null);
    setLastAnalyzedEntries([]);
    setActivePrompt("");
    setGeneratedPrompt("");
    setEntry({ text: "", prompt: "" });
    setNotes("");
    setNextSteps("");
    setDisplayName("");
    setSavedPrompts([]);
    setFavoritedPatterns([]);
    setTab("home");
    setJournalView("write");
    setSessionView("pre");
    setEditingId(null);
    setEditDraft({ text: "" });
  };

  async function fetchEntries() {
    if (!PARSE_READY || !currentUser) return [];
    const Entry = Parse.Object.extend("Entry");
    const q = new Parse.Query(Entry);
    q.equalTo("user", currentUser);
    q.descending("timestamp");
    q.limit(500);
    const res = await q.find();
    return res.map((o) => ({
      parseId: o.id,
      id: o.get("clientId") ?? o.id,
      date: o.get("date") ?? getDate(),
      text: decryptText(o.get("text") ?? "", userEncryptionKey),
      prompt: decryptText(o.get("prompt") ?? "", userEncryptionKey),
      timestamp: o.get("timestamp") ?? o.createdAt?.toISOString?.() ?? new Date().toISOString(),
    }));
  }

  async function createEntry(eObj) {
    if (!PARSE_READY || !currentUser) throw new Error("Parse not configured");
    const Entry = Parse.Object.extend("Entry");
    const obj = new Entry();
    obj.set("user", currentUser);
    obj.set("clientId", eObj.id);
    obj.set("date", eObj.date);
    obj.set("text", encryptText(eObj.text || "", userEncryptionKey));
    obj.set("prompt", encryptText(eObj.prompt || "", userEncryptionKey));
    obj.set("timestamp", eObj.timestamp || new Date().toISOString());
    const saved = await obj.save();
    return { ...eObj, parseId: saved.id };
  }

  async function updateEntry(parseId, patch) {
    if (!PARSE_READY || !currentUser) throw new Error("Parse not configured");
    const Entry = Parse.Object.extend("Entry");
    const q = new Parse.Query(Entry);
    q.equalTo("user", currentUser);
    const obj = await q.get(parseId);
    if (typeof patch.text === "string") obj.set("text", encryptText(patch.text, userEncryptionKey));
    if (typeof patch.date === "string") obj.set("date", patch.date);
    await obj.save();
  }

  async function deleteEntry(parseId) {
    if (!PARSE_READY || !currentUser) throw new Error("Parse not configured");
    const Entry = Parse.Object.extend("Entry");
    const q = new Parse.Query(Entry);
    q.equalTo("user", currentUser);
    const obj = await q.get(parseId);
    await obj.destroy();
  }

  async function fetchSnapshots() {
    if (!PARSE_READY || !currentUser) return [];
    const Snap = Parse.Object.extend("SessionSnapshot");
    const q = new Parse.Query(Snap);
    q.equalTo("user", currentUser);
    q.descending("timestamp");
    q.limit(200);
    const res = await q.find();
    return res.map((o) => ({
      parseId: o.id,
      id: o.get("clientId") ?? o.id,
      sessionDate: o.get("sessionDate") ?? getDate(),
      timestamp: o.get("timestamp") ?? o.createdAt?.toISOString?.() ?? new Date().toISOString(),
      themes: (o.get("themes") ?? []).map(t => decryptText(t, userEncryptionKey)),
      avoiding: (o.get("avoiding") ?? []).map(t => decryptText(t, userEncryptionKey)),
      questions: (o.get("questions") ?? []).map(t => decryptText(t, userEncryptionKey)),
      openingStatement: decryptText(o.get("openingStatement") ?? "", userEncryptionKey),
      notes: decryptText(o.get("notes") ?? "", userEncryptionKey),
      nextSteps: decryptText(o.get("nextSteps") ?? "", userEncryptionKey),
    }));
  }

  async function createSnapshot(payload) {
    if (!PARSE_READY || !currentUser) throw new Error("Parse not configured");
    const Snap = Parse.Object.extend("SessionSnapshot");
    const obj = new Snap();
    obj.set("user", currentUser);
    obj.set("clientId", payload.id ?? Date.now());
    obj.set("sessionDate", payload.sessionDate ?? getDate());
    obj.set("timestamp", payload.timestamp ?? new Date().toISOString());
    obj.set("themes", (payload.themes ?? []).map(t => encryptText(t, userEncryptionKey)));
    obj.set("avoiding", (payload.avoiding ?? []).map(t => encryptText(t, userEncryptionKey)));
    obj.set("questions", (payload.questions ?? []).map(t => encryptText(t, userEncryptionKey)));
    obj.set("openingStatement", encryptText(payload.openingStatement ?? "", userEncryptionKey));
    obj.set("notes", encryptText(payload.notes ?? "", userEncryptionKey));
    obj.set("nextSteps", encryptText(payload.nextSteps ?? "", userEncryptionKey));
    const saved = await obj.save();
    return { ...payload, parseId: saved.id };
  }

  async function deleteSnapshot(parseId) {
    if (!PARSE_READY || !currentUser) throw new Error("Parse not configured");
    const Snap = Parse.Object.extend("SessionSnapshot");
    const q = new Parse.Query(Snap);
    q.equalTo("user", currentUser);
    const obj = await q.get(parseId);
    await obj.destroy();
  }

  async function saveAnalysisToUser(analysisData) {
    if (!PARSE_READY || !currentUser) return;
    try {
      currentUser.set("lastAnalysis", analysisData);
      await currentUser.save();
    } catch (error) {
      console.error("Failed to save analysis:", error);
    }
  }

  async function loadAnalysisFromUser() {
    if (!PARSE_READY || !currentUser) return null;
    try {
      await currentUser.fetch();
      return currentUser.get("lastAnalysis");
    } catch (error) {
      console.error("Failed to load analysis:", error);
      return null;
    }
  }

  useEffect(() => {
    if (!currentUser || !userEncryptionKey) return;

    const load = async () => {
      try {
        const [e, s, savedAnalysis] = await Promise.all([
          fetchEntries(), 
          fetchSnapshots(),
          loadAnalysisFromUser()
        ]);
        setEntries(e);
        setHistory(s);

        if (savedAnalysis) {
          setAnalysis(savedAnalysis);
          setAnalysisTimestamp(new Date().toISOString());
        }

        const savedFavs = currentUser.get("favoritedPatterns");
        if (Array.isArray(savedFavs)) {
          // Support both old Set-style (array of strings) and new object format
          setFavoritedPatterns(savedFavs.map(f =>
            typeof f === 'string' ? { text: f, favoritedAt: new Date().toISOString() } : f
          ));
        }

        const dn = currentUser.get("displayName");
        if (dn) setDisplayName(dn);

        const sp = currentUser.get("savedPrompts");
        if (Array.isArray(sp)) setSavedPrompts(sp);

        setLastAnalyzedEntries([]);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [PARSE_READY, currentUser, userEncryptionKey]);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isMobile && !hasSeenPrompt && !isInstalled && currentUser) {
      const t = setTimeout(() => setShowInstallPrompt(true), 3000);
      return () => clearTimeout(t);
    }
  }, [currentUser]);

  const genAnalysis = async () => {
    if (entries.length < 3) {
      const empty = {
        themes: ["Add at least 3 journal entries to see patterns"],
        avoiding: ["Begin your journaling journey"],
        questions: ["What would you like to explore?"],
        openingStatement: "I think what I'd like to talk about today is just getting started.",
      };
      setAnalysis((prev) => ({
        ...(prev ?? {}),
        ...empty,
        notes: prev?.notes ?? "",
        nextSteps: prev?.nextSteps ?? "",
        sessionDate: prev?.sessionDate ?? getDate(),
      }));
      return;
    }

    const lastSnapshot = history?.[0];
    const journalEntries = entries;

    let entriesToAnalyze = [];
    let previousPatterns = null;

    if (lastSnapshot) {
      const snapshotTime = new Date(lastSnapshot.timestamp).getTime();
      const newEntries = journalEntries.filter(e => {
        const entryTime = new Date(e.timestamp).getTime();
        return entryTime > snapshotTime;
      });

      if (newEntries.length > 0) {
        entriesToAnalyze = newEntries.slice(0, 20);
        previousPatterns = {
          themes: lastSnapshot.themes || [],
          avoiding: lastSnapshot.avoiding || [],
          questions: lastSnapshot.questions || []
        };
      } else {
        setAnalysis((prev) => ({
          ...(prev ?? {}),
          themes: lastSnapshot.themes || [],
          avoiding: lastSnapshot.avoiding || [],
          questions: lastSnapshot.questions || [],
          openingStatement: lastSnapshot.openingStatement || "I think what I'd like to talk about today is…",
          sessionDate: sessionDate || getDate(),
          showNewEntryWarning: true,
        }));
        return;
      }
    } else {
      entriesToAnalyze = journalEntries.slice(0, 20);
    }
    
    const entriesHash = JSON.stringify(entriesToAnalyze.map(e => e.parseId));
    if (analysis && lastAnalyzedEntries === entriesHash && !analysis.showNewEntryWarning) {
      console.log("Using cached analysis");
      return;
    }

    setLoading(true);
    try {
      const result = await Parse.Cloud.run("analyzeJournal", {
        entries: entriesToAnalyze.map(e =>
          e.prompt ? `Prompt: ${e.prompt}\n\nEntry: ${e.text}` : e.text
        ),
        previousPatterns: previousPatterns,
        isIncremental: !!previousPatterns
      });

      const newAnalysis = {
        themes: result.themes || [],
        avoiding: result.avoiding || [],
        questions: result.questions || [],
        openingStatement: result.openingStatement || "I think what I'd like to talk about today is…",
        sessionDate: sessionDate || getDate(),
        showNewEntryWarning: false,
      };

      setAnalysis((prev) => ({
        ...newAnalysis,
        notes: prev?.notes ?? "",
        nextSteps: prev?.nextSteps ?? "",
      }));
      setAnalysisTimestamp(new Date().toISOString());
      setLastAnalyzedEntries(entriesHash);
      
      await saveAnalysisToUser(newAnalysis);
    } catch (error) {
      console.error("Error analyzing journal:", error);
      alert("Analysis failed. Make sure your Anthropic API key is set in Back4app environment variables.");
    } finally {
      setLoading(false);
    }
  };

  const moveToArchive = async () => {
    if (!analysis) return;

    const visibleSlice = (arr) => isPaidSubscriber ? (arr || []) : (arr || []).slice(0, 2);
    const payload = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      sessionDate: sessionDate || getDate(),
      themes: visibleSlice(analysis.themes),
      avoiding: visibleSlice(analysis.avoiding),
      questions: visibleSlice(analysis.questions),
      openingStatement: analysis.openingStatement || "",
      notes: notes || "",
      nextSteps: nextSteps || "",
    };

    try {
      await createSnapshot(payload);
      const refreshed = await fetchSnapshots();
      setHistory(refreshed);

      setNotes("");
      setNextSteps("");
      setTab("journal");
      setJournalView("log");
    } catch (e) {
      console.error(e);
      alert("Archive failed. Check Back4App CLP for SessionSnapshot (Create).");
    }
  };

  const handleReplyToQuestion = (question) => {
    if (!isPaidSubscriber) return; // Only for paid users
    
    // Set the active prompt (don't pre-fill text)
    setActivePrompt(question);
    setTab('journal');
    setJournalView('write');
  };

  const handleGeneratePrompt = async () => {
    if (!isPaidSubscriber || !history || history.length === 0) return;

    const lastSnapshot = history[0];
    setLoading(true);
    try {
      const result = await Parse.Cloud.run("generateJournalPrompt", {
        themes: lastSnapshot.themes || [],
        avoiding: lastSnapshot.avoiding || [],
        questions: lastSnapshot.questions || [],
      });
      setActivePrompt(result.prompt);
      setTab('journal');
      setJournalView('write');
    } catch (error) {
      console.error('Error generating prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (text) => {
    setFavoritedPatterns(prev => {
      const alreadyFaved = prev.some(f => f.text === text);
      const next = alreadyFaved
        ? prev.filter(f => f.text !== text)
        : [...prev, { text, favoritedAt: new Date().toISOString() }];
      if (currentUser && Parse) {
        currentUser.set("favoritedPatterns", next);
        currentUser.save().catch(() => {});
      }
      return next;
    });
  };

  const savePromptForLater = (text) => {
    setSavedPrompts(prev => {
      if (prev.some(p => p.text === text)) return prev;
      const next = [...prev, { text, savedAt: new Date().toISOString() }];
      if (currentUser && Parse) {
        currentUser.set("savedPrompts", next);
        currentUser.save().catch(() => {});
      }
      return next;
    });
  };

  const removeSavedPrompt = (text) => {
    setSavedPrompts(prev => {
      const next = prev.filter(p => p.text !== text);
      if (currentUser && Parse) {
        currentUser.set("savedPrompts", next);
        currentUser.save().catch(() => {});
      }
      return next;
    });
  };

  const combined = useMemo(() => {
    const items = [
      ...entries.map((e) => ({
        id: `e-${e.parseId || e.id}`,
        type: "entry",
        data: e,
        date: e.date,
        ts: e.timestamp,
      })),
      ...history.map((s) => ({
        id: `s-${s.parseId || s.id}`,
        type: "snap",
        data: s,
        date: s.sessionDate || new Date(s.timestamp).toISOString().split("T")[0],
        ts: s.timestamp,
      })),
    ];
    return items.sort(
      (a, b) =>
        new Date(b.date) - new Date(a.date) || new Date(b.ts) - new Date(a.ts)
    );
  }, [entries, history]);

  const lastSnapshot = history?.[0] ?? null;

  if (!currentUser) {
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

        <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', maxWidth: '420px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <Logo />
          </div>
          <p style={{ color: '#7c3aed', fontSize: '16px', textAlign: 'center', marginBottom: '32px' }}>
            Capture what comes up between therapy sessions and bring it into the room
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: '500',
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: authMode === "login" ? '#9333ea' : 'rgba(255,255,255,0.6)',
                color: authMode === "login" ? 'white' : '#7c3aed'
              }}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: '500',
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: authMode === "signup" ? '#9333ea' : 'rgba(255,255,255,0.6)',
                color: authMode === "signup" ? 'white' : '#7c3aed'
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={authMode === "login" ? handleLogin : handleSignup}>
            {authMode === "signup" && (
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
            )}
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
              {authMode === "signup" && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', fontSize: '12px', color: '#92400e', lineHeight: '1.5' }}>
                  🔒 Your entries are encrypted with your password. If you forget your password, your data cannot be recovered.
                </div>
              )}
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
              {authLoading ? 'Loading...' : (authMode === "login" ? "Log In" : "Sign Up")}
            </button>
          </form>

          <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
            {authMode === "login" ? "Don't have an account? Click Sign Up above." : "Already have an account? Click Log In above."}
          </p>
        </div>
      </div>
    );
  }

  if (showAdmin) {
    return <AdminDashboard onExit={() => setShowAdmin(false)} />;
  }

  // If logged in but encryption key lost (e.g. different tab), prompt re-login
  if (currentUser && !userEncryptionKey) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '400px', textAlign: 'center', margin: '16px' }}>
          <h2 style={{ fontSize: '24px', color: '#581c87', marginBottom: '12px' }}>Session Expired</h2>
          <p style={{ color: '#7c3aed', marginBottom: '24px', fontSize: '15px' }}>Please log in again.</p>
          <button
            onClick={handleLogout}
            style={{ padding: '12px 24px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
          >
            Log In Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper" style={{ 
      minHeight: '100vh', 
      background: '#f3e8ff',
      padding: '24px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      width: '100%'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400&family=Work+Sans:wght@400;500&display=swap');
        * { 
          font-family: 'Work Sans', sans-serif; 
          box-sizing: border-box;
        }
        h1, h2, h3, .serif { font-family: 'Crimson Pro', serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: #f3e8ff;
        }
        
        .main-container {
          max-width: 1000px;
          width: 100%;
          margin: 0 auto;
          padding: 28px;
        }
        
        input[type="date"] {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          font-family: 'Work Sans', sans-serif;
        }
        
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
        
        input[type="date"]::-webkit-date-and-time-value {
          text-align: left;
        }
        
        input, textarea, select {
          max-width: 100%;
          box-sizing: border-box;
        }
        
        p, li, div {
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        
        .archive-card, .archive-card * {
          word-break: break-word;
          overflow-wrap: break-word;
        }
        
        @media (max-width: 768px) {
          .app-wrapper {
            padding: 12px !important;
          }
          
          .main-container {
            width: 100% !important;
            padding: 16px !important;
          }
          
          h1 {
            font-size: 36px !important;
          }
          
          .mobile-card {
            padding: 20px !important;
            border: 1px solid #e9d5ff !important;
            backdrop-filter: none !important;
            background: rgba(255,255,255,0.9) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
            overflow: hidden !important;
          }
          
          .mobile-card > div {
            max-width: 100%;
          }
          
          .mobile-heading {
            font-size: 20px !important;
          }
          
          .last-session-card {
            padding: 16px !important;
          }
          
          .tab-button {
            padding: 10px 16px !important;
            font-size: 14px !important;
            border-radius: 12px !important;
          }
          
          input[type="date"] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 12px 16px !important;
            font-size: 16px !important;
            box-sizing: border-box !important;
            display: block !important;
            border: 2px solid #e9d5ff !important;
            border-radius: 12px !important;
            background: rgba(255,255,255,0.8) !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
          }
          
          input[type="text"], 
          textarea {
            width: 100% !important;
            min-width: 0 !important;
            padding: 12px 16px !important;
            font-size: 16px !important;
            box-sizing: border-box !important;
          }
          
          .capture-content-wrapper {
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
        
        @media (min-width: 769px) {
          .capture-content-wrapper {
            width: auto;
          }
        }

        @media (min-width: 1024px) {
          body {
            background: #f3e8ff;
          }
          #root {
            width: 100%;
            background: #f3e8ff;
            min-height: 100vh;
          }
        }
      `}</style>

      <div className="main-container">
        {/* Header with logo and account icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ width: '72px' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ fontSize: '22px', fontWeight: '300', color: '#581c87', margin: 0 }}>between</h1>
            {tab === 'home' && (
              <p style={{ color: '#7c3aed', fontSize: '13px', margin: '4px 0 0 0' }}>
                Capture what comes up between therapy sessions and bring it into the room
              </p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', width: '72px' }}>
            <button
              onClick={() => setTab('account')}
              title="Account"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e9d5ff', borderRadius: '50%', width: '40px', height: '40px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            >
              <User size={20} color="#7c3aed" />
            </button>
            {currentUser?.get('username') === 'lee.alisonnicole@gmail.com' && (
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                title="Analytics"
                style={{ background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#7c3aed', fontSize: '12px', fontWeight: '500' }}
              >
                📊
              </button>
            )}
          </div>
        </div>

        {/* Content area with more bottom padding for nav bar */}
        <div style={{ paddingBottom: '100px' }}>

        {/* HOME TAB */}
        {tab === "home" && (() => {
          const raw = currentUser?.get('username') || '';
          const firstName = raw.split('@')[0].split('.')[0];
          const fallbackName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
          const name = displayName || fallbackName;

          const prompts = [
            "What's on your mind today?",
            "How are you feeling right now?",
            "What's one thing you'd like to process?",
            "What came up for you today?",
            "What are you carrying with you right now?",
          ];
          const todayPrompt = prompts[new Date().getDay() % prompts.length];

          const lastEntry = entries[0];
          const lastEntryAgo = lastEntry ? (() => {
            const diff = Date.now() - new Date(lastEntry.timestamp).getTime();
            const hours = Math.floor(diff / 3600000);
            if (hours < 1) return 'just now';
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
          })() : null;

          return (
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Greeting */}
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '500', color: '#581c87', margin: '0 0 6px 0' }}>
                  Hi {name} 👋
                </h2>
                <p style={{ fontSize: '16px', color: '#7c3aed', margin: 0 }}>{todayPrompt}</p>
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => { setTab('journal'); setJournalView('write'); }}
                style={{
                  width: '100%',
                  height: '70px',
                  background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '18px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 20px rgba(147,51,234,0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(147,51,234,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(147,51,234,0.35)'; }}
              >
                <PenTool size={22} />
                Write Journal Entry
              </button>

              {/* Secondary CTA — voice (paid only) */}
              {isPaidSubscriber && (
                <button
                  onClick={() => { setTab('journal'); setJournalView('write'); }}
                  style={{
                    width: '100%',
                    height: '48px',
                    background: 'rgba(147,51,234,0.08)',
                    color: '#7c3aed',
                    border: '1px solid rgba(147,51,234,0.2)',
                    borderRadius: '14px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(147,51,234,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(147,51,234,0.08)'; }}
                >
                  🎤 Start Voice Entry
                </button>
              )}

              {/* Tertiary actions */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e9d5ff' }} />
                  <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>or explore</span>
                  <div style={{ flex: 1, height: '1px', background: '#e9d5ff' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setTab('patterns')}
                    style={{ flex: 1, height: '44px', background: 'rgba(255,255,255,0.7)', border: '1px solid #e9d5ff', borderRadius: '12px', fontSize: '13px', fontWeight: '500', color: '#581c87', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Sparkles size={15} />
                    View Patterns
                  </button>
                  <button
                    onClick={() => { setTab('sessions'); setSessionView('pre'); }}
                    style={{ flex: 1, height: '44px', background: 'rgba(255,255,255,0.7)', border: '1px solid #e9d5ff', borderRadius: '12px', fontSize: '13px', fontWeight: '500', color: '#581c87', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Calendar size={15} />
                    Prep for Session
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '20px', padding: '6px 14px' }}>
                  <span style={{ fontSize: '16px' }}>🔥</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                    {streak > 0 ? `${streak} day${streak !== 1 ? 's' : ''} in a row` : 'Start your streak today'}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>📊 {entries.length} entries</span>
                {lastEntryAgo && <span style={{ fontSize: '12px', color: '#9ca3af' }}>💜 {lastEntryAgo}</span>}
              </div>

            </div>
          );
        })()}

        {/* ACCOUNT TAB */}
        {tab === "account" && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '300', color: '#581c87', marginBottom: '8px' }}>
                Account
              </h2>
              <p style={{ color: '#7c3aed', fontSize: '14px' }}>
                Your profile and settings
              </p>
            </div>

            <div style={{ 
              background: 'rgba(255,255,255,0.7)', 
              backdropFilter: 'blur(10px)', 
              border: '1px solid rgba(255,255,255,0.8)', 
              borderRadius: '24px', 
              padding: '32px', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)' 
            }}>
              {/* Profile Section */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  {displayName ? (
                    <span style={{ fontSize: '32px', fontWeight: '600', color: 'white' }}>
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User size={40} color="white" />
                  )}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#581c87', marginBottom: '4px' }}>
                  {displayName || currentUser?.get('username') || 'User'}
                </h3>
              </div>

              {/* Account Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Name field */}
                <div style={{ padding: '16px', background: 'rgba(147,51,234,0.05)', borderRadius: '12px', border: '1px solid rgba(147,51,234,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '500' }}>Name</div>
                    <button
                      onClick={() => {
                        if (editingName) {
                          const trimmed = nameInput.trim();
                          setDisplayName(trimmed);
                          setEditingName(false);
                          if (currentUser && Parse) {
                            currentUser.set("displayName", trimmed);
                            currentUser.save().catch(() => {});
                          }
                        } else {
                          setNameInput(displayName);
                          setEditingName(true);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#9333ea', cursor: 'pointer', fontSize: '12px', fontWeight: '500', padding: '2px 6px' }}
                    >
                      {editingName ? 'Save' : 'Edit'}
                    </button>
                  </div>
                  {editingName ? (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      placeholder="Your first name"
                      autoFocus
                      style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '2px solid #9333ea', outline: 'none', fontSize: '16px', background: 'transparent', color: '#581c87' }}
                    />
                  ) : (
                    <div style={{ fontSize: '16px', color: '#581c87' }}>
                      {displayName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not set</span>}
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '16px',
                  background: 'rgba(147,51,234,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(147,51,234,0.1)'
                }}>
                  <div style={{ fontSize: '12px', color: '#7c3aed', marginBottom: '4px', fontWeight: '500' }}>
                    Email
                  </div>
                  <div style={{ fontSize: '16px', color: '#581c87' }}>
                    {currentUser?.get('username') || 'Not available'}
                  </div>
                </div>

                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(147,51,234,0.05)', 
                  borderRadius: '12px',
                  border: '1px solid rgba(147,51,234,0.1)'
                }}>
                  <div style={{ fontSize: '12px', color: '#7c3aed', marginBottom: '4px', fontWeight: '500' }}>
                    Member Since
                  </div>
                  <div style={{ fontSize: '16px', color: '#581c87' }}>
                    {currentUser?.createdAt
                      ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Not available'}
                  </div>
                </div>

                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(147,51,234,0.05)', 
                  borderRadius: '12px',
                  border: '1px solid rgba(147,51,234,0.1)'
                }}>
                  <div style={{ fontSize: '12px', color: '#7c3aed', marginBottom: '4px', fontWeight: '500' }}>
                    Journal Entries
                  </div>
                  <div style={{ fontSize: '16px', color: '#581c87' }}>
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                  </div>
                </div>

                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(147,51,234,0.05)', 
                  borderRadius: '12px',
                  border: '1px solid rgba(147,51,234,0.1)'
                }}>
                  <div style={{ fontSize: '12px', color: '#7c3aed', marginBottom: '4px', fontWeight: '500' }}>
                    Sessions Recorded
                  </div>
                  <div style={{ fontSize: '16px', color: '#581c87' }}>
                    {history.length} {history.length === 1 ? 'session' : 'sessions'}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #e9d5ff',
                  background: 'white',
                  color: '#7c3aed',
                  fontWeight: '500',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#faf5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <LogOut size={20} />
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* JOURNAL TAB */}
        {tab === "journal" && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '600px' }}>

            <div className="capture-content-wrapper" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              {journalView === "log" ? (
                <div className="mobile-card" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                  {showWelcome && (
                    <div style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1px solid #ddd6fe', borderRadius: '16px', padding: '20px', marginBottom: '20px', position: 'relative' }}>
                      <button onClick={() => setShowWelcome(false)} style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                      <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#581c87', margin: '0 0 8px 0' }}>Welcome to between 👋</h3>
                      <p style={{ fontSize: '14px', color: '#7c3aed', margin: '0 0 12px 0', lineHeight: '1.6' }}>
                        Start your journaling journey with between and invite clarity, gratitude, and reflection.
                      </p>
                      <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.7' }}>
                        <strong style={{ color: '#581c87' }}>Between Basic</strong> is free — journal entries, session snapshots, and core pattern analysis.<br />
                        <strong style={{ color: '#9333ea' }}>Between Premium</strong> includes AI journaling prompts, full pattern analysis (all themes, avoidances & open questions), and the ability to reply to open questions.
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={() => setJournalView('write')}
                        style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                      >
                        ← Write Entry
                      </button>
                      <h2 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', margin: 0 }}>Log</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[["all", "All"], ["entries", "Entries"], ["snapshots", "Snapshots"], ["favorites", `★ Favorites${favoritedPatterns.length > 0 ? ` (${favoritedPatterns.length})` : ''}`]].map(([f, label]) => (
                        <button
                          key={f}
                          onClick={() => setLogFilter(f)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '20px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: logFilter === f ? '#9333ea' : 'rgba(147,51,234,0.08)',
                            color: logFilter === f ? 'white' : '#7c3aed',
                            transition: 'all 0.2s'
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {logFilter === "favorites" ? (
                    favoritedPatterns.length === 0 ? (
                      <p style={{ color: '#7c3aed', textAlign: 'center', padding: '32px 0' }}>
                        No favorites yet. Star patterns in the Patterns tab to save them here.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[...favoritedPatterns].reverse().map((fav, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid #e9d5ff', padding: '12px 14px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(147,51,234,0.08)', borderRadius: '20px', padding: '2px 8px', marginBottom: '6px' }}>
                                <Star size={10} fill="#9333ea" style={{ color: '#9333ea' }} />
                                <span style={{ fontSize: '10px', fontWeight: '600', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Favorite Pattern</span>
                              </div>
                              <p style={{ fontSize: '14px', color: '#581c87', margin: '0 0 4px 0', lineHeight: '1.5' }}>{fav.text}</p>
                              <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                                Saved {new Date(fav.favoritedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleFavorite(fav.text)}
                              title="Remove from favorites"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, color: '#f59e0b' }}
                            >
                              <Star size={16} fill="#f59e0b" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  ) : !entries.length && !history.length ? (
                    <p style={{ color: '#7c3aed', textAlign: 'center', padding: '32px 0' }}>
                      No entries yet. Start journaling to build your log.
                    </p>
                  ) : (() => {
                    const filtered = combined.filter(item => {
                      if (logFilter === "entries") return item.type === "entry";
                      if (logFilter === "snapshots") return item.type === "snap";
                      return true;
                    });
                    return filtered.length === 0 ? (
                      <p style={{ color: '#7c3aed', textAlign: 'center', padding: '32px 0' }}>
                        No {logFilter === "entries" ? "journal entries" : "session snapshots"} yet.
                      </p>
                    ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filtered.map((item) => (
                        <div key={item.id} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '16px', border: '1px solid #e9d5ff', overflow: 'hidden', maxWidth: '100%' }}>
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', cursor: 'pointer', gap: '8px', flexWrap: 'wrap' }}
                            onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '0', overflow: 'hidden' }}>
                              {expanded[item.id] ? (
                                <ChevronDown size={20} style={{ color: '#7c3aed', flexShrink: 0 }} />
                              ) : (
                                <ChevronRight size={20} style={{ color: '#7c3aed', flexShrink: 0 }} />
                              )}

                              <div style={{
                                width: '70px',
                                height: '32px',
                                padding: '4px 6px',
                                borderRadius: '8px',
                                background: item.type === "entry" ? '#dbeafe' : '#ede9fe',
                                color: item.type === "entry" ? '#1e40af' : '#5b21b6',
                                fontSize: '10px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                flexShrink: 0,
                                lineHeight: '1.2'
                              }}>
                                {item.type === "entry" ? "Journal\nEntry" : "Session\nSnapshot"}
                              </div>

                              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                <h3 style={{ fontWeight: '500', color: '#581c87', marginBottom: '4px', margin: 0 }}>
                                  {formatDate(item.date)}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#7c3aed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                  {item.type === "entry"
                                    ? (item.data.text || "").substring(0, 60) + "..."
                                    : (item.data.openingStatement || "")
                                        .replace(/^I think what I'd like to talk about today is\s*/i, "")
                                        .replace(/\.$/, "")}
                                </p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              {item.type === "entry" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(item.data.parseId);
                                    setEditDraft({ text: item.data.text || "", date: item.data.date || getDate() });
                                    setExpanded((p) => ({ ...p, [item.id]: true }));
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}

                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    if (item.type === "entry") {
                                      await deleteEntry(item.data.parseId);
                                      setEntries(await fetchEntries());
                                    } else {
                                      await deleteSnapshot(item.data.parseId);
                                      setHistory(await fetchSnapshots());
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    alert("Delete failed. Check Back4App permissions.");
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {expanded[item.id] && (
                            <div style={{ padding: '12px', paddingTop: 0, borderTop: '1px solid #e9d5ff', maxWidth: '100%', overflow: 'hidden' }}>
                              {item.type === "entry" ? (
                                <>
                                  {/* Show AI Prompt if exists */}
                                  {item.data.prompt && (
                                    <div style={{
                                      marginTop: '12px',
                                      padding: '16px',
                                      background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                                      border: '1px solid #e9d5ff',
                                      borderRadius: '12px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <div style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '6px',
                                          background: '#9333ea',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0
                                        }}>
                                          <Sparkles size={14} color="white" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#9333ea', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            AI Prompt
                                          </div>
                                          <p style={{ fontSize: '14px', color: '#581c87', margin: 0, lineHeight: '1.5' }}>
                                            {item.data.prompt}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {editingId === item.data.parseId ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                      <input
                                        type="date"
                                        value={editDraft.date}
                                        onChange={(e) => setEditDraft((p) => ({ ...p, date: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'rgba(255,255,255,0.8)', color: '#581c87' }}
                                      />
                                      <textarea
                                        value={editDraft.text}
                                        onChange={(e) => setEditDraft((p) => ({ ...p, text: e.target.value }))}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.8)', color: '#581c87', height: '160px' }}
                                      />
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                          onClick={async () => {
                                            try {
                                              await updateEntry(item.data.parseId, { text: editDraft.text, date: editDraft.date });
                                              setEntries(await fetchEntries());
                                              setEditingId(null);
                                            } catch (err) {
                                              console.error(err);
                                              alert("Edit failed. Check Entry Update permission.");
                                            }
                                          }}
                                          style={{ flex: 1, padding: '8px 16px', borderRadius: '12px', background: '#9333ea', color: 'white', fontWeight: '500', border: 'none', cursor: 'pointer' }}
                                        >
                                          Save changes
                                        </button>
                                        <button
                                          onClick={() => setEditingId(null)}
                                          style={{ flex: 1, padding: '8px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.7)', color: '#7c3aed', fontWeight: '500', border: '1px solid #e9d5ff', cursor: 'pointer' }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p style={{ color: '#581c87', whiteSpace: 'pre-wrap', marginTop: '12px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                      {item.data.text}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <div className="archive-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                                  <div>
                                    <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px' }}>
                                      Session Starter
                                    </h4>
                                    <p style={{ color: '#581c87', whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                      {item.data.openingStatement || "—"}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px' }}>
                                      Notes
                                    </h4>
                                    <p style={{ color: '#7c3aed', whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                      {item.data.notes || "—"}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px' }}>
                                      Next Steps
                                    </h4>
                                    <p style={{ color: '#7c3aed', whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                      {item.data.nextSteps || "—"}
                                    </p>
                                  </div>
                                  
                                  {(item.data.themes?.length > 0 || item.data.avoiding?.length > 0 || item.data.questions?.length > 0) && (
                                    <div>
                                      <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '12px', fontSize: '14px' }}>
                                        Session Summary
                                      </h4>
                                      {item.data.themes?.length > 0 && (
                                        <div style={{ marginBottom: '12px' }}>
                                          <p style={{ fontWeight: '500', color: '#7c3aed', marginBottom: '4px', fontSize: '13px' }}>What's trying to come up:</p>
                                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#581c87' }}>
                                            {item.data.themes.map((theme, i) => (
                                              <li key={i} style={{ marginBottom: '4px' }}>{theme}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {item.data.avoiding?.length > 0 && (
                                        <div style={{ marginBottom: '12px' }}>
                                          <p style={{ fontWeight: '500', color: '#7c3aed', marginBottom: '4px', fontSize: '13px' }}>Things I might be avoiding:</p>
                                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#581c87' }}>
                                            {item.data.avoiding.map((avoid, i) => (
                                              <li key={i} style={{ marginBottom: '4px' }}>{avoid}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {item.data.questions?.length > 0 && (
                                        <div>
                                          <p style={{ fontWeight: '500', color: '#7c3aed', marginBottom: '4px', fontSize: '13px' }}>Questions:</p>
                                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#581c87' }}>
                                            {item.data.questions.map((question, i) => (
                                              <li key={i} style={{ marginBottom: '4px' }}>{question}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="mobile-card" style={{ position: 'relative', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>

                  {/* View Log link — top-right */}
                  <button
                    onClick={() => setJournalView('log')}
                    style={{ position: 'absolute', top: '20px', right: '24px', background: 'none', border: 'none', color: '#7c3aed', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    View Log ({entries.length + history.length}) →
                  </button>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', marginBottom: '8px', fontWeight: '500' }}>
                      <Calendar size={20} />
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'rgba(255,255,255,0.8)', color: '#581c87' }}
                    />
                  </div>

                  {/* Active Prompt Display */}
                  {activePrompt && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px 14px',
                      background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                      border: '1px solid #e9d5ff',
                      borderRadius: '12px',
                      position: 'relative'
                    }}>
                      <button
                        onClick={() => setActivePrompt('')}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px', padding: '2px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingRight: '16px' }}>
                        <Sparkles size={14} style={{ color: '#9333ea', flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '13px', color: '#581c87', margin: 0, lineHeight: '1.5' }}>
                          {activePrompt}
                        </p>
                      </div>
                    </div>
                  )}

                  <h2 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', marginBottom: '12px' }}>
                    What's on your mind?
                  </h2>

                  {/* Generate Journaling Prompt + My Prompts */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {(() => {
                      const noSession = !history || history.length === 0;
                      return (
                        <button
                          onClick={noSession ? undefined : handleGeneratePrompt}
                          disabled={loading || noSession}
                          title={noSession ? 'Log your first session to get a custom journal prompt' : ''}
                          style={{
                            padding: '7px 14px',
                            borderRadius: '20px',
                            border: '1px solid #e9d5ff',
                            background: (loading || noSession) ? '#f3f4f6' : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                            color: (loading || noSession) ? '#9ca3af' : '#7c3aed',
                            fontWeight: '500',
                            fontSize: '12px',
                            cursor: (loading || noSession) ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {noSession ? <Lock size={14} /> : <Sparkles size={14} />}
                          {loading && !noSession ? 'Generating...' : 'Generate Journaling Prompt'}
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => setShowMyPrompts(p => !p)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '20px',
                        border: '1px solid #e9d5ff',
                        background: showMyPrompts ? '#9333ea' : 'rgba(255,255,255,0.8)',
                        color: showMyPrompts ? 'white' : '#7c3aed',
                        fontWeight: '500',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <BookOpen size={14} />
                      My Prompts ({savedPrompts.length})
                    </button>
                  </div>

                  {/* My Prompts panel */}
                  {showMyPrompts && savedPrompts.length > 0 && (
                    <div style={{ marginBottom: '12px', border: '1px solid #e9d5ff', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: '#f5f3ff', borderBottom: '1px solid #e9d5ff', fontSize: '12px', fontWeight: '600', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={12} />
                        Saved Prompts — tap to use
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {savedPrompts.map((p, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', padding: '10px 14px', borderBottom: i < savedPrompts.length - 1 ? '1px solid #f3f4f6' : 'none', background: 'white' }}>
                            <button
                              onClick={() => { setActivePrompt(p.text); setShowMyPrompts(false); }}
                              style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#581c87', lineHeight: '1.5', padding: 0 }}
                            >
                              {p.text}
                            </button>
                            <button
                              onClick={() => removeSavedPrompt(p.text)}
                              title="Remove"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px', flexShrink: 0 }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <VoiceInput
                      currentText={entry.text}
                      onTranscript={(text) => {
                        setEntry(prev => ({ ...prev, text }));
                      }}
                    />
                  </div>

                  <textarea
                    value={entry.text}
                    onChange={(e) => setEntry((p) => ({ ...p, text: e.target.value }))}
                    placeholder="Start writing..."
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.8)', color: '#581c87', marginBottom: '16px', height: '192px' }}
                  />

                  <button
                    onClick={async () => {
                      if (!entry.text) return;
                      const n = {
                        id: Date.now(),
                        date,
                        text: entry.text,
                        prompt: activePrompt,
                        timestamp: new Date().toISOString(),
                      };
                      try {
                        await createEntry(n);
                        setEntries(await fetchEntries());
                        setEntry({ text: "", prompt: "" });
                        setActivePrompt("");
                        setJournalView("log");
                      } catch (err) {
                        console.error(err);
                        alert("Save failed. Check Back4App CLP for Entry (Create).");
                      }
                    }}
                    disabled={!entry.text}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: entry.text ? 'pointer' : 'not-allowed', transition: 'all 0.2s', background: entry.text ? '#9333ea' : '#d1d5db', color: 'white', width: '100%', opacity: entry.text ? 1 : 0.5 }}
                  >
                    <Save size={20} />
                    Save
                  </button>

                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#6b7280', fontSize: '12px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Your data is private and secure.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PATTERNS TAB */}
        {tab === "patterns" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '600px' }}>
            {/* Refresh Analysis Button */}
            {loading ? (
              <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <Loader2 size={48} style={{ color: '#9333ea', margin: '0 auto 16px' }} className="animate-spin" />
                <p style={{ color: '#7c3aed', fontSize: '16px', margin: 0 }}>Analyzing your reflections...</p>
              </div>
            ) : !analysis ? (
              <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <Sparkles size={48} style={{ color: '#c4b5fd', margin: '0 auto 16px' }} />
                <button
                  onClick={genAnalysis}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px 32px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', background: '#9333ea', color: 'white', boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}
                >
                  <Sparkles size={20} />
                  Run Analysis
                </button>
                {entries.length < 3 && (
                  <p style={{ color: '#7c3aed', fontSize: '14px', marginTop: '16px' }}>
                    Add at least 3 journal entries to see patterns ({entries.length}/3)
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={genAnalysis}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', background: '#9333ea', color: 'white', width: '100%', boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}
              >
                <RefreshCw size={20} />
                Refresh Analysis
              </button>
            )}

            {analysis?.showNewEntryWarning && !loading && (
              <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#92400e' }}>
                💡 Enter a new journal entry to refresh your analysis and get new insights
              </div>
            )}

            {analysis && !loading && (
              <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {/* Entry count info */}
                  {analysisTimestamp && (() => {
                    const lastSnapshot = history?.[0];
                    let entryCount = entries.length;
                    if (lastSnapshot) {
                      const snapshotTime = new Date(lastSnapshot.timestamp).getTime();
                      const newEntries = entries.filter(e => new Date(e.timestamp).getTime() > snapshotTime);
                      entryCount = newEntries.length;
                      return (
                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, textAlign: 'center' }}>
                          {entryCount} new {entryCount === 1 ? 'entry' : 'entries'} since last session
                        </p>
                      );
                    }
                    return (
                      <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, textAlign: 'center' }}>
                        Based on {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                      </p>
                    );
                  })()}

                  {/* What's trying to come up */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Sparkles size={18} style={{ color: '#9333ea' }} />
                      <h4 style={{ fontSize: '17px', fontWeight: '600', color: '#581c87', margin: 0 }}>
                        What's trying to come up
                      </h4>
                    </div>
                    {(analysis.themes || []).length ? (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(analysis.themes || []).slice(0, isPaidSubscriber ? undefined : 2).map((item, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <span style={{ color: '#8b5cf6', fontSize: '16px', flexShrink: 0 }}>•</span>
                            <span style={{ color: '#581c87', fontSize: '15px', flex: 1, lineHeight: '1.6' }}>{item}</span>
                            <button onClick={() => toggleFavorite(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, color: favoritedPatterns.some(f => f.text === item) ? '#f59e0b' : '#d1d5db' }}>
                              <Star size={14} fill={favoritedPatterns.some(f => f.text === item) ? '#f59e0b' : 'none'} />
                            </button>
                          </li>
                        ))}
                        {!isPaidSubscriber && (analysis.themes || []).length > 2 && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f3f4f6', borderRadius: '8px' }}>
                            <Lock size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>{(analysis.themes || []).length - 2} more — upgrade to unlock</span>
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p style={{ color: '#7c3aed', fontSize: '14px', margin: 0 }}>—</p>
                    )}
                  </div>

                  {/* Things I might be avoiding */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Sparkles size={18} style={{ color: '#9333ea' }} />
                      <h4 style={{ fontSize: '17px', fontWeight: '600', color: '#581c87', margin: 0 }}>
                        Things I might be avoiding
                      </h4>
                    </div>
                    {(analysis.avoiding || []).length ? (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(analysis.avoiding || []).slice(0, isPaidSubscriber ? undefined : 2).map((item, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <span style={{ color: '#8b5cf6', fontSize: '16px', flexShrink: 0 }}>•</span>
                            <span style={{ color: '#581c87', fontSize: '15px', flex: 1, lineHeight: '1.6' }}>{item}</span>
                            <button onClick={() => toggleFavorite(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, color: favoritedPatterns.some(f => f.text === item) ? '#f59e0b' : '#d1d5db' }}>
                              <Star size={14} fill={favoritedPatterns.some(f => f.text === item) ? '#f59e0b' : 'none'} />
                            </button>
                          </li>
                        ))}
                        {!isPaidSubscriber && (analysis.avoiding || []).length > 2 && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f3f4f6', borderRadius: '8px' }}>
                            <Lock size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>{(analysis.avoiding || []).length - 2} more — upgrade to unlock</span>
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p style={{ color: '#7c3aed', fontSize: '14px', margin: 0 }}>—</p>
                    )}
                  </div>

                  {/* Open Questions */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Sparkles size={18} style={{ color: '#9333ea' }} />
                      <h4 style={{ fontSize: '17px', fontWeight: '600', color: '#581c87', margin: 0 }}>
                        Open Questions
                      </h4>
                    </div>
                    {(analysis.questions || []).length ? (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(analysis.questions || []).slice(0, isPaidSubscriber ? undefined : 2).map((item, i) => (
                          <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(147,51,234,0.05)', borderRadius: '8px', border: '1px solid rgba(147,51,234,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <span style={{ color: '#8b5cf6', fontSize: '16px', flexShrink: 0 }}>•</span>
                              <span style={{ color: '#581c87', fontSize: '15px', flex: 1, lineHeight: '1.6' }}>{item}</span>
                              <button onClick={() => toggleFavorite(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, color: favoritedPatterns.some(f => f.text === item) ? '#f59e0b' : '#d1d5db' }}>
                                <Star size={14} fill={favoritedPatterns.some(f => f.text === item) ? '#f59e0b' : 'none'} />
                              </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              {isPaidSubscriber ? (
                                <button
                                  onClick={() => savePromptForLater(item)}
                                  disabled={savedPrompts.some(p => p.text === item)}
                                  title={savedPrompts.some(p => p.text === item) ? 'Already saved' : 'Save for later'}
                                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e9d5ff', background: savedPrompts.some(p => p.text === item) ? '#f3f4f6' : 'white', color: savedPrompts.some(p => p.text === item) ? '#9ca3af' : '#7c3aed', fontSize: '13px', fontWeight: '500', cursor: savedPrompts.some(p => p.text === item) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <BookOpen size={14} />
                                  {savedPrompts.some(p => p.text === item) ? 'Saved' : 'Save for Later'}
                                </button>
                              ) : (
                                <div title="Upgrade to save prompts" style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f3f4f6', color: '#6b7280', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'not-allowed' }}>
                                  <Lock size={14} />
                                  Save for Later
                                </div>
                              )}
                              {isPaidSubscriber ? (
                                <button
                                  onClick={() => handleReplyToQuestion(item)}
                                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #9333ea', background: '#9333ea', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#7c3aed'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#9333ea'; }}
                                >
                                  <MessageCircle size={14} />
                                  Reply
                                </button>
                              ) : (
                                <div title="Upgrade to unlock" style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f3f4f6', color: '#6b7280', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'not-allowed' }}>
                                  <Lock size={14} />
                                  Reply
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                        {!isPaidSubscriber && (analysis.questions || []).length > 2 && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f3f4f6', borderRadius: '8px' }}>
                            <Lock size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>{(analysis.questions || []).length - 2} more — upgrade to unlock</span>
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p style={{ color: '#7c3aed', fontSize: '14px', margin: 0 }}>—</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {analysis && !loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '12px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#92400e', lineHeight: '1.5' }}>
                    Save your patterns when you log a session snapshot to keep a record of your progress.
                  </p>
                  <button
                    onClick={() => { setTab('sessions'); setSessionView('post'); }}
                    style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', background: '#f59e0b', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    Log a Session Snapshot →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SESSIONS TAB */}
        {tab === "sessions" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '600px' }}>
            {/* Sub-tabs: Pre-Session | Post-Session */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
              {[
                ["pre", "Pre-Session"],
                ["post", "Post-Session"],
              ].map(([view, label]) => (
                <button
                  key={view}
                  onClick={() => setSessionView(view)}
                  className="tab-button"
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: '16px',
                    fontWeight: '600',
                    fontSize: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: sessionView === view ? '#9333ea' : 'rgba(255,255,255,0.6)',
                    color: sessionView === view ? 'white' : '#7c3aed',
                    boxShadow: sessionView === view ? '0 4px 12px rgba(147,51,234,0.3)' : 'none'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* PRE-SESSION VIEW */}
            {sessionView === "pre" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Refresh Analysis Button - Always visible at top */}
                {loading ? (
                  <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <Loader2 size={48} style={{ color: '#9333ea', margin: '0 auto 16px' }} className="animate-spin" />
                    <p style={{ color: '#7c3aed', fontSize: '16px', margin: 0 }}>Analyzing your reflections...</p>
                  </div>
                ) : !analysis ? (
                  <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <Sparkles size={48} style={{ color: '#c4b5fd', margin: '0 auto 16px' }} />
                    <button
                      onClick={genAnalysis}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px 32px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', background: '#9333ea', color: 'white', boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}
                    >
                      <Calendar size={20} />
                      Prep for your next session
                    </button>
                    {entries.length < 3 && (
                      <p style={{ color: '#7c3aed', fontSize: '14px', marginTop: '16px' }}>
                        Add at least 3 journal entries to see patterns ({entries.length}/3)
                      </p>
                    )}
                  </div>
                ) : null}

                {analysis?.showNewEntryWarning && !loading && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#92400e' }}>
                    💡 Enter a new journal entry to refresh your analysis and get new insights
                  </div>
                )}

                {/* SESSION STARTER */}
                {!loading && analysis && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                    border: '1px solid #ddd6fe',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(147,51,234,0.1)'
                  }}>
                    <div style={{ padding: '32px' }}>
                      <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Sparkles size={20} style={{ color: '#9333ea' }} />
                              <h3 style={{
                                fontSize: '20px',
                                fontWeight: '500',
                                color: '#581c87',
                                margin: 0
                              }}>
                                Session Starter
                              </h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                onClick={genAnalysis}
                                disabled={loading}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: loading ? '#d1d5db' : '#7c3aed',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px'
                                }}
                              >
                                <RefreshCw size={14} />
                                Refresh
                              </button>
                              <button
                                onClick={() => {
                                  if (editStmt) {
                                    setAnalysis((p) => ({ ...(p ?? {}), openingStatement: tempStmt }));
                                    setEditStmt(false);
                                  } else {
                                    setTempStmt(analysis.openingStatement || "");
                                    setEditStmt(true);
                                  }
                                }}
                                disabled={loading}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: loading ? '#d1d5db' : '#7c3aed',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px'
                                }}
                              >
                                <Edit2 size={14} />
                                {editStmt ? "Save" : "Edit"}
                              </button>
                            </div>
                          </div>

                          {editStmt ? (
                            <textarea
                              value={tempStmt}
                              onChange={(e) => setTempStmt(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '2px solid #e9d5ff',
                                outline: 'none',
                                fontSize: '16px',
                                resize: 'none',
                                background: 'white',
                                color: '#581c87',
                                height: '120px',
                                lineHeight: '1.6'
                              }}
                              rows="4"
                            />
                          ) : (
                            <p style={{
                              fontSize: '14px',
                              lineHeight: '1.7',
                              color: '#581c87',
                              margin: 0,
                              fontStyle: 'italic'
                            }}>
                              "{analysis.openingStatement || "I think what I'd like to talk about today is…"}"
                            </p>
                          )}

                          <p style={{
                            fontSize: '13px',
                            color: '#7c3aed',
                            marginTop: '16px',
                            marginBottom: 0
                          }}>
                            💡 Use this to start your next therapy session
                          </p>
                        </div>
                    </div>
                  </div>
                )}

                {/* LAST SESSION */}
                {!loading && lastSnapshot && (
                  <div style={{
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.8)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ padding: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Archive size={20} style={{ color: '#9333ea' }} />
                        <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#581c87', margin: 0 }}>
                          Last Session
                        </h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Session Date
                          </div>
                          <div style={{ fontSize: '16px', color: '#581c87' }}>
                            {formatDate(lastSnapshot?.sessionDate || getDate())}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            What you talked about
                          </div>
                          <p style={{ color: '#581c87', whiteSpace: 'pre-wrap', margin: 0, fontSize: '15px', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {lastSnapshot?.notes || "—"}
                          </p>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Next steps
                          </div>
                          <p style={{ color: '#581c87', whiteSpace: 'pre-wrap', margin: 0, fontSize: '15px', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {lastSnapshot?.nextSteps || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* POST-SESSION VIEW */}
            {sessionView === "post" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {!analysis ? (
                  <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <Sparkles size={48} style={{ color: '#c4b5fd', margin: '0 auto 16px' }} />
                    <p style={{ color: '#7c3aed', fontSize: '16px', marginBottom: '16px' }}>
                      Create session prep first to record session notes
                    </p>
                    <button
                      onClick={() => setSessionView("pre")}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px 32px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', background: '#9333ea', color: 'white', boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}
                    >
                      <Calendar size={20} />
                      Go to Pre-Session
                    </button>
                  </div>
                ) : (
                  <div className="capture-content-wrapper" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                    <div className="mobile-card" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', marginBottom: '8px', fontWeight: '500' }}>
                          <Calendar size={20} />
                          Session Date
                        </label>
                        <input
                          type="date"
                          value={sessionDate}
                          onChange={(e) => setSessionDate(e.target.value)}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'rgba(255,255,255,0.8)', color: '#581c87' }}
                        />
                      </div>

                      <h2 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', marginBottom: '12px' }}>
                        How did your session go?
                      </h2>

                      <div style={{ marginBottom: '16px' }}>
                        <VoiceInput 
                          currentText={notes}
                          onTranscript={(text) => {
                            setNotes(text);
                          }}
                        />
                      </div>

                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What did you talk about? What came up for you?"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.8)', color: '#581c87', marginBottom: '24px', height: '192px' }}
                      />

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: '#7c3aed', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                          Next Steps
                        </label>
                        <textarea
                          value={nextSteps}
                          onChange={(e) => setNextSteps(e.target.value)}
                          placeholder="Homework, things to work on, reminders for next time..."
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.8)', color: '#581c87', height: '128px' }}
                        />
                      </div>

                      <button
                        onClick={moveToArchive}
                        disabled={!notes}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: notes ? 'pointer' : 'not-allowed', transition: 'all 0.2s', background: notes ? '#7c3aed' : '#d1d5db', color: 'white', width: '100%', opacity: notes ? 1 : 0.5 }}
                      >
                        <ArrowRight size={20} />
                        Save to Log
                      </button>

                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#6b7280', fontSize: '12px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <span>Your session notes are private and secure.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Close content area */}
        </div>

        {/* INSTALL PROMPT */}
        {showInstallPrompt && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '24px', boxShadow: '0 -4px 20px rgba(0,0,0,0.2)', zIndex: 9999, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', animation: 'slideUp 0.3s ease-out' }}>
            <button
              onClick={() => { setShowInstallPrompt(false); localStorage.setItem('hasSeenInstallPrompt', 'true'); }}
              style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '24px', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
            >
              ×
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📱</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#581c87', marginBottom: '8px' }}>Add Between to Your Home Screen</h3>
              <p style={{ fontSize: '15px', color: '#7c3aed', marginBottom: '16px', lineHeight: '1.5' }}>Get quick access to your journal anytime</p>
              {/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
                <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '12px', textAlign: 'left', fontSize: '14px', color: '#581c87', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>How to install:</p>
                  <p style={{ margin: '4px 0' }}>1. Tap the Share button ⬆️</p>
                  <p style={{ margin: '4px 0' }}>2. Click '...' and tap "Add to Home Screen"</p>
                  <p style={{ margin: '4px 0' }}>3. Tap "Add" in the top right</p>
                </div>
              )}
              {/Android/i.test(navigator.userAgent) && (
                <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '12px', textAlign: 'left', fontSize: '14px', color: '#581c87', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>How to install:</p>
                  <p style={{ margin: '4px 0' }}>1. Tap the menu button (⋮)</p>
                  <p style={{ margin: '4px 0' }}>2. Tap "Add to Home screen" or "Install app"</p>
                  <p style={{ margin: '4px 0' }}>3. Tap "Add" or "Install"</p>
                </div>
              )}
              <button
                onClick={() => { setShowInstallPrompt(false); localStorage.setItem('hasSeenInstallPrompt', 'true'); }}
                style={{ marginTop: '16px', padding: '12px 24px', background: 'transparent', border: '1px solid #e9d5ff', borderRadius: '12px', color: '#7c3aed', fontSize: '14px', fontWeight: '500', cursor: 'pointer', width: '100%' }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(147,51,234,0.2)',
          padding: '8px 16px 20px 16px',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            display: 'flex',
            gap: '4px',
            justifyContent: 'space-around'
          }}>
            {[
              ["home", "Home", Home],
              ["journal", "Journal", FileText],
              ["patterns", "Patterns", Sparkles],
              ["sessions", "Sessions", Calendar],
            ].map(([t, label, Icon]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === 'journal') setJournalView('write');
                  if (t === 'sessions') setSessionView('pre');
                  setExpanded({});
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '12px',
                  fontWeight: tab === t ? '600' : '500',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: tab === t ? '#9333ea' : 'transparent',
                  color: tab === t ? 'white' : '#7c3aed',
                  minWidth: '60px'
                }}
              >
                <Icon size={22} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}