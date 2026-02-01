import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
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
} from "lucide-react";

export default function App() {
  const getDate = () => new Date().toISOString().split("T")[0];

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState("capture");
  const [showArchive, setShowArchive] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [date, setDate] = useState(getDate());
  const [entry, setEntry] = useState({ title: "", text: "" });
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: "", text: "" });
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

  const APP_ID = import.meta.env.VITE_PARSE_APP_ID;
  const JS_KEY = import.meta.env.VITE_PARSE_JS_KEY;
  const SERVER_URL = import.meta.env.VITE_PARSE_SERVER_URL;

  const Parse = useMemo(() => window.Parse, []);
  const PARSE_READY = Boolean(Parse && APP_ID && JS_KEY && SERVER_URL);

  const formatDate = (d) =>
    new Date(d + "T12:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  useEffect(() => {
    if (!Parse) {
      console.error("Parse SDK missing.");
      return;
    }
    if (!APP_ID || !JS_KEY || !SERVER_URL) {
      console.warn("Missing env vars:", { APP_ID, JS_KEY, SERVER_URL });
      return;
    }
    try {
      Parse.initialize(APP_ID, JS_KEY);
      Parse.serverURL = SERVER_URL;
      
      // Check if user is already logged in
      const user = Parse.User.current();
      setCurrentUser(user);
    } catch (e) {
      console.error("Parse init failed", e);
    }
  }, [APP_ID, JS_KEY, SERVER_URL, Parse]);

  // Auth functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    
    try {
      const user = await Parse.User.logIn(email, password);
      setCurrentUser(user);
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
      
      await user.signUp();
      setCurrentUser(user);
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
    setEntries([]);
    setHistory([]);
    setAnalysis(null);
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
      title: o.get("title") ?? "",
      text: o.get("text") ?? "",
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
    obj.set("title", eObj.title || "");
    obj.set("text", eObj.text || "");
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
    if (typeof patch.title === "string") obj.set("title", patch.title);
    if (typeof patch.text === "string") obj.set("text", patch.text);
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
      themes: o.get("themes") ?? [],
      avoiding: o.get("avoiding") ?? [],
      questions: o.get("questions") ?? [],
      openingStatement: o.get("openingStatement") ?? "",
      notes: o.get("notes") ?? "",
      nextSteps: o.get("nextSteps") ?? "",
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
    obj.set("themes", payload.themes ?? []);
    obj.set("avoiding", payload.avoiding ?? []);
    obj.set("questions", payload.questions ?? []);
    obj.set("openingStatement", payload.openingStatement ?? "");
    obj.set("notes", payload.notes ?? "");
    obj.set("nextSteps", payload.nextSteps ?? "");
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
    if (!currentUser) return;
    
    const load = async () => {
      try {
        const [e, s, savedAnalysis] = await Promise.all([
          fetchEntries(), 
          fetchSnapshots(),
          loadAnalysisFromUser()
        ]);
        setEntries(e);
        setHistory(s);
        
        // Load saved analysis if available
        if (savedAnalysis) {
          setAnalysis(savedAnalysis);
          setAnalysisTimestamp(new Date().toISOString());
        }
        
        // Invalidate cache when entries change
        setLastAnalyzedEntries([]);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [PARSE_READY, currentUser]);

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

    // Get the last session snapshot (if any)
    const lastSnapshot = history?.[0];
    
    // If we have a snapshot, only send NEW entries since that snapshot
    let entriesToAnalyze = [];
    let previousPatterns = null;
    
    if (lastSnapshot) {
      // Get entries created AFTER the last snapshot
      const snapshotTime = new Date(lastSnapshot.timestamp).getTime();
      const newEntries = entries.filter(e => {
        const entryTime = new Date(e.timestamp).getTime();
        return entryTime > snapshotTime;
      });
      
      // If there are new entries, use them
      if (newEntries.length > 0) {
        entriesToAnalyze = newEntries.slice(0, 20); // Limit to 20 most recent
        previousPatterns = {
          themes: lastSnapshot.themes || [],
          avoiding: lastSnapshot.avoiding || [],
          questions: lastSnapshot.questions || []
        };
      } else {
        // No new entries since last snapshot, use cached analysis with warning
        setAnalysis((prev) => ({
          ...(prev ?? {}),
          themes: lastSnapshot.themes || [],
          avoiding: lastSnapshot.avoiding || [],
          questions: lastSnapshot.questions || [],
          openingStatement: lastSnapshot.openingStatement || "I think what I'd like to talk about today is…",
          sessionDate: sessionDate || getDate(),
          showNewEntryWarning: true, // Flag to show warning
        }));
        return;
      }
    } else {
      // No previous snapshot, analyze recent entries (limit to 20)
      entriesToAnalyze = entries.slice(0, 20);
    }
    
    // Check cache - only if analyzing same entries
    const entriesHash = JSON.stringify(entriesToAnalyze.map(e => e.parseId));
    if (analysis && lastAnalyzedEntries === entriesHash && !analysis.showNewEntryWarning) {
      console.log("Using cached analysis");
      return;
    }

    setLoading(true);
    try {
      // Call Back4app Cloud Function with incremental analysis
      const result = await Parse.Cloud.run("analyzeJournal", {
        entries: entriesToAnalyze.map(e => e.text),
        previousPatterns: previousPatterns, // Pass previous patterns for context
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
      
      // Save to Parse for persistence across sessions
      await saveAnalysisToUser(newAnalysis);
    } catch (error) {
      console.error("Error analyzing journal:", error);
      alert("Analysis failed. Make sure your Anthropic API key is set in Back4app environment variables.");
    } finally {
      setLoading(false);
    }
  };

  const refreshSessionStarter = async () => {
    if (!entries.length) return;
    
    // Get the last session snapshot (if any)
    const lastSnapshot = history?.[0];
    
    // Determine which entries to send
    let entriesToAnalyze = [];
    
    if (lastSnapshot) {
      // Get entries created AFTER the last snapshot
      const snapshotTime = new Date(lastSnapshot.timestamp).getTime();
      const newEntries = entries.filter(e => {
        const entryTime = new Date(e.timestamp).getTime();
        return entryTime > snapshotTime;
      });
      entriesToAnalyze = newEntries.slice(0, 20);
    } else {
      // No previous snapshot, use recent entries
      entriesToAnalyze = entries.slice(0, 20);
    }
    
    if (entriesToAnalyze.length === 0) {
      // No new entries to analyze
      return;
    }
    
    setLoading(true);
    try {
      // Call Back4app Cloud Function
      const result = await Parse.Cloud.run("generateSessionStarter", {
        entries: entriesToAnalyze.map(e => e.text)
      });

      setAnalysis((prev) => ({
        ...(prev ?? {}),
        openingStatement: result.openingStatement || prev?.openingStatement || "",
      }));
      setAnalysisTimestamp(new Date().toISOString());
    } catch (error) {
      console.error("Error generating session starter:", error);
    } finally {
      setLoading(false);
    }
  };

  const moveToArchive = async () => {
    if (!analysis) return;

    const payload = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      sessionDate: sessionDate || getDate(),
      themes: analysis.themes || [],
      avoiding: analysis.avoiding || [],
      questions: analysis.questions || [],
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
      setTab("capture");
      setShowArchive(true);
    } catch (e) {
      console.error(e);
      alert("Archive failed. Check Back4App CLP for SessionSnapshot (Create).");
    }
  };

  const combined = () => {
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
  };

  const lastSnapshot = history?.[0] ?? null;

  // Show login/signup screen if not authenticated
  if (!currentUser) {
    return (
      <div className="container-padding" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #fce7f3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400&family=Work+Sans:wght@400;500&display=swap');
          * { font-family: 'Work Sans', sans-serif; box-sizing: border-box; }
          h1, h2, h3, .serif { font-family: 'Crimson Pro', serif; }
          body, html { margin: 0; padding: 0; min-height: 100vh; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #fce7f3 100%); }

          .container-padding { padding: 24px; }
          .auth-card-padding { padding: 48px; }

          @media (max-width: 768px) {
            .container-padding { padding: 16px; }
            .auth-card-padding { padding: 24px; }
          }

          @media (max-width: 640px) {
            .container-padding { padding: 12px; }
            .auth-card-padding { padding: 16px; }
          }
        `}</style>

        <div className="auth-card-padding" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', margin: '0 auto' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '300', color: '#581c87', marginBottom: '8px', textAlign: 'center' }}>between</h1>
          <p style={{ color: '#7c3aed', fontSize: '16px', textAlign: 'center', marginBottom: '32px' }}>
            Capture what comes up between sessions
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

  return (
    <div className="container-padding" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #fce7f3 100%)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400&family=Work+Sans:wght@400;500&display=swap');
        * { font-family: 'Work Sans', sans-serif; box-sizing: border-box; }
        h1, h2, h3, .serif { font-family: 'Crimson Pro', serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }

        .container-padding { padding: 24px; }
        .card-padding { padding: 32px; }
        .tab-gap { gap: 16px; }

        @media (max-width: 768px) {
          .container-padding { padding: 16px; }
          .card-padding { padding: 24px; }
          .tab-gap { gap: 12px; }
        }

        @media (max-width: 640px) {
          .container-padding { padding: 12px; }
          .card-padding { padding: 16px; }
          .tab-gap { gap: 8px; }
        }
      `}</style>

      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative' }}>
          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.7)',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={20} />
          </button>
          <h1 style={{ fontSize: '48px', fontWeight: '300', color: '#581c87', marginBottom: '8px' }}>between</h1>
          <p style={{ color: '#7c3aed', fontSize: '16px' }}>
            Capture what comes up between sessions and bring it into the room
          </p>
        </div>

        <div className="tab-gap" style={{ display: 'flex', marginBottom: '24px' }}>
          {[
            ["capture", "Capture your thoughts"],
            ["prep", "Prep for your session"],
            ["during", "Use in your session"],
          ].map(([t, label]) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setExpanded({});
              }}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '16px',
                fontWeight: '500',
                fontSize: '16px',
                border: tab === t ? '1px solid rgba(255,255,255,0.8)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: tab === t ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
                backdropFilter: tab === t ? 'blur(10px)' : 'none',
                color: tab === t ? '#581c87' : '#7c3aed',
                boxShadow: tab === t ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CAPTURE TAB */}
        {tab === "capture" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                [false, "Journal Entry"],
                [true, `Archive (${entries.length + history.length})`],
              ].map(([isArchive, label]) => (
                <button
                  key={String(isArchive)}
                  onClick={() => setShowArchive(isArchive)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontWeight: '500',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: showArchive === isArchive ? '#9333ea' : 'rgba(255,255,255,0.6)',
                    color: showArchive === isArchive ? 'white' : '#7c3aed',
                    boxShadow: showArchive === isArchive ? '0 2px 8px rgba(147,51,234,0.3)' : 'none'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {showArchive ? (
              <div className="card-padding" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', marginBottom: '24px' }}>Archive</h2>

                {!entries.length && !history.length ? (
                  <p style={{ color: '#7c3aed', textAlign: 'center', padding: '32px 0' }}>
                    No entries yet. Start journaling to build your archive.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {combined().map((item) => (
                      <div key={item.id} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '16px', border: '1px solid #e9d5ff', overflow: 'hidden' }}>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', cursor: 'pointer' }}
                          onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            {expanded[item.id] ? (
                              <ChevronDown size={20} style={{ color: '#7c3aed', flexShrink: 0 }} />
                            ) : (
                              <ChevronRight size={20} style={{ color: '#7c3aed', flexShrink: 0 }} />
                            )}

                            <div style={{
                              width: '80px',
                              height: '36px',
                              padding: '4px 8px',
                              borderRadius: '8px',
                              background: item.type === "entry" ? '#dbeafe' : '#ede9fe',
                              color: item.type === "entry" ? '#1e40af' : '#5b21b6',
                              fontSize: '12px',
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

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{ fontWeight: '500', color: '#581c87', marginBottom: '4px', margin: 0 }}>
                                {formatDate(item.date)}
                              </h3>
                              <p style={{ fontSize: '14px', color: '#7c3aed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                {item.type === "entry"
                                  ? item.data.title || (item.data.text || "").substring(0, 60) + "..."
                                  : (item.data.openingStatement || "")
                                      .replace(/^I think what I'd like to talk about today is\s*/i, "")
                                      .replace(/\.$/, "")}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {item.type === "entry" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(item.data.parseId);
                                  setEditDraft({ title: item.data.title || "", text: item.data.text || "" });
                                  setExpanded((p) => ({ ...p, [item.id]: true }));
                                }}
                                style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: '4px' }}
                              >
                                <Edit2 size={18} />
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
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {expanded[item.id] && (
                          <div style={{ padding: '16px', paddingTop: 0, borderTop: '1px solid #e9d5ff' }}>
                            {item.type === "entry" ? (
                              <>
                                {editingId === item.data.parseId ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                    <input
                                      value={editDraft.title}
                                      onChange={(e) => setEditDraft((p) => ({ ...p, title: e.target.value }))}
                                      placeholder="Title (optional)"
                                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'rgba(255,255,255,0.8)', color: '#581c87', fontWeight: '500' }}
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
                                            await updateEntry(item.data.parseId, { title: editDraft.title, text: editDraft.text });
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
                                  <p style={{ color: '#581c87', whiteSpace: 'pre-wrap', marginTop: '12px' }}>
                                    {item.data.text}
                                  </p>
                                )}
                              </>
                            ) : (
                              <div className="archive-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                                {/* 1. Session Starter */}
                                <div>
                                  <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px' }}>
                                    Session Starter
                                  </h4>
                                  <p style={{ color: '#581c87', whiteSpace: 'pre-wrap', margin: 0 }}>
                                    {item.data.openingStatement || "—"}
                                  </p>
                                </div>
                                
                                {/* 2. Notes */}
                                <div>
                                  <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px' }}>
                                    Notes
                                  </h4>
                                  <p style={{ color: '#7c3aed', whiteSpace: 'pre-wrap', margin: 0 }}>
                                    {item.data.notes || "—"}
                                  </p>
                                </div>
                                
                                {/* 3. Next Steps */}
                                <div>
                                  <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px' }}>
                                    Next Steps
                                  </h4>
                                  <p style={{ color: '#7c3aed', whiteSpace: 'pre-wrap', margin: 0 }}>
                                    {item.data.nextSteps || "—"}
                                  </p>
                                </div>
                                
                                {/* 4. Patterns (Session Summary) */}
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
                                        <p style={{ fontWeight: '500', color: '#7c3aed', marginBottom: '4px', fontSize: '13px' }}>Questions and confusions:</p>
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
                )}
              </div>
            ) : (
              <div className="card-padding" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
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

                <h2 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', marginBottom: '16px' }}>
                  What's on your mind?
                </h2>

                <input
                  type="text"
                  value={entry.title}
                  onChange={(e) => setEntry((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Title (optional)"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'rgba(255,255,255,0.8)', color: '#581c87', marginBottom: '16px', fontWeight: '500' }}
                />

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
                      ...entry,
                      timestamp: new Date().toISOString(),
                    };
                    try {
                      await createEntry(n);
                      setEntries(await fetchEntries());
                      setEntry({ title: "", text: "" });
                      setShowArchive(true);
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
        )}

        {/* PREP TAB */}
        {tab === "prep" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card-padding" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', marginBottom: '16px' }}>
                Last session
              </h3>
              {!lastSnapshot ? (
                <p style={{ color: '#7c3aed', margin: 0 }}>
                  Archive your first session snapshot to get a recap of your last session
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ color: '#7c3aed', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#581c87' }}>Session Date: </span>
                    {formatDate(lastSnapshot.sessionDate)}
                  </div>

                  <div>
                    <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px', margin: '0 0 8px 0' }}>
                      What you talked about
                    </h4>
                    <p style={{ color: '#7c3aed', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {lastSnapshot.notes || "—"}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px', margin: '0 0 8px 0' }}>
                      Next steps
                    </h4>
                    <p style={{ color: '#7c3aed', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {lastSnapshot.nextSteps || "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>

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
            ) : (
              <>
                <button
                  onClick={genAnalysis}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', background: '#9333ea', color: 'white', width: '100%', boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}
                >
                  <RefreshCw size={20} />
                  Refresh Analysis
                </button>

                <div className="card-padding" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
                    <Sparkles size={20} style={{ color: '#7c3aed', marginTop: '4px' }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', margin: 0 }}>Patterns</h3>
                      {analysisTimestamp && (() => {
                        const lastSnapshot = history?.[0];
                        let entryCount = entries.length;
                        if (lastSnapshot) {
                          const snapshotTime = new Date(lastSnapshot.timestamp).getTime();
                          const newEntries = entries.filter(e => new Date(e.timestamp).getTime() > snapshotTime);
                          entryCount = newEntries.length;
                          return (
                            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                              {entryCount} new {entryCount === 1 ? 'entry' : 'entries'} since last session
                            </p>
                          );
                        }
                        return (
                          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                            Based on {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                          </p>
                        );
                      })()}
                      {analysis?.showNewEntryWarning && (
                        <div style={{ 
                          background: '#fef3c7', 
                          border: '1px solid #fbbf24', 
                          borderRadius: '8px', 
                          padding: '8px 12px', 
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#92400e'
                        }}>
                          💡 Enter a new journal entry to refresh your analysis and get new insights
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {[
                      ["What's trying to come up", analysis.themes || []],
                      ["Things I might be avoiding", analysis.avoiding || []],
                      ["Questions and confusions", analysis.questions || []],
                    ].map(([title, items]) => (
                      <div key={title}>
                        <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '12px', margin: '0 0 12px 0' }}>{title}</h4>
                        {items.length ? (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {items.map((item, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <span style={{ color: '#8b5cf6', fontSize: '16px' }}>•</span>
                                <span style={{ color: '#7c3aed', fontSize: '16px' }}>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: '#7c3aed', fontSize: '14px', margin: 0 }}>—</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* DURING TAB */}
        {tab === "during" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {!analysis ? (
              <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <Sparkles size={48} style={{ color: '#c4b5fd', margin: '0 auto 16px' }} />
                <p style={{ color: '#7c3aed', fontSize: '16px', marginBottom: '16px' }}>
                  Create session prep first to use during-session tools
                </p>
                <button
                  onClick={() => setTab("prep")}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px 32px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', background: '#9333ea', color: 'white', boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}
                >
                  <Calendar size={20} />
                  Go to Prep
                </button>
              </div>
            ) : (
              <>
                <div className="card-padding" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', marginBottom: '16px' }}>
                    Session Date
                  </h3>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'rgba(255,255,255,0.8)', color: '#581c87' }}
                  />
                </div>

                <div className="card-padding" style={{
                  background: 'linear-gradient(to right, #e9d5ff, #ddd6fe)',
                  borderRadius: '24px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  border: '1px solid #c4b5fd',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <Loader2 size={48} style={{ color: '#9333ea', margin: '0 auto 16px' }} className="animate-spin" />
                      <p style={{ color: '#7c3aed', fontSize: '16px', margin: 0 }}>Refreshing your session starter...</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', margin: 0 }}>
                          Your Session Starter
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={refreshSessionStarter}
                            disabled={loading}
                            style={{ background: 'none', border: 'none', color: loading ? '#d1d5db' : '#7c3aed', fontSize: '12px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
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
                            style={{ background: 'none', border: 'none', color: loading ? '#d1d5db' : '#7c3aed', fontSize: '12px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
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
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', resize: 'none', background: 'white', color: '#581c87', height: '80px' }}
                          rows="3"
                        />
                      ) : (
                        <p style={{ color: '#581c87', fontSize: '16px', whiteSpace: 'pre-wrap', margin: 0 }}>
                          "{analysis.openingStatement || "I think what I'd like to talk about today is…"}"
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="card-padding" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', marginBottom: '16px' }}>
                    Notes
                  </h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes or context for your session..."
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.8)', color: '#581c87', height: '128px' }}
                  />
                </div>

                <div className="card-padding" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '300', color: '#581c87', marginBottom: '16px' }}>
                    Next steps
                  </h3>
                  <textarea
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    placeholder="Add any next steps, homework, or things to remember for next session..."
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.8)', color: '#581c87', height: '128px' }}
                  />
                </div>

                <button
                  onClick={moveToArchive}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', background: '#7c3aed', color: 'white', width: '100%', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
                >
                  <ArrowRight size={20} />
                  Move to Archive
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}