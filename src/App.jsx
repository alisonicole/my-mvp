import React, { useEffect, useMemo, useState } from "react";
import CryptoJS from 'crypto-js';
import {
  Calendar,
  Home,
  User,
  Sparkles,
  ArrowRight,
  Save,
  Loader2,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  LogOut,
  BookOpen,
  Archive,
  MessageSquare,
  Lock,
  MessageCircle,
  Star,
  Bookmark,
  RefreshCw,
} from "lucide-react";
import AdminDashboard from './AdminDashboard';
import Logo from './Logo';
import VoiceInput from './VoiceInput';
import EngagementMessage from './components/EngagementMessage';
import {
  getEntry1Message,
  getEntry2Message,
  getEntry3Message,
  getEntry5MilestoneMessage,
  getSessionSnapshotMessage,
} from './services/engagementService';
import { hasMilestoneFired, recordMilestoneFired } from './services/milestoneTracker';

const DAILY_PROMPTS = [
  "What's been weighing on your mind lately that you haven't said out loud?",
  "Describe a moment this week when you felt most like yourself.",
  "What emotion have you been avoiding, and why?",
  "What do you wish someone would ask you right now?",
  "What's something you keep telling yourself that might not be true?",
  "When did you last feel genuinely at ease? What was happening?",
  "What boundary did you struggle to hold this week?",
  "What would you do differently if you weren't afraid of the outcome?",
  "Who or what are you most grateful for today, and have you told them?",
  "What's a feeling you've been carrying that you haven't named yet?",
  "What does 'taking care of yourself' actually look like right now?",
  "Is there something you've been waiting for permission to do?",
  "What would you tell a close friend who was going through exactly what you are?",
  "What part of your life feels most out of alignment right now?",
  "What do you need more of? Less of?",
  "When did you last feel proud of yourself, and why?",
  "What's a pattern you've noticed in how you respond to stress?",
  "What relationship in your life could use more attention or honesty?",
  "What are you holding onto that might be worth letting go?",
  "How have you grown in the past year that you don't give yourself credit for?",
  "What does your inner critic say most often? Is it accurate?",
  "What's one thing you'd change about how you showed up this week?",
  "What small thing brought you unexpected comfort or joy recently?",
  "What part of your past still feels unresolved?",
  "What are you currently pretending is fine?",
  "What do you need to hear right now that no one is saying?",
  "What does your body tell you when you're overwhelmed? Do you listen?",
  "What story about yourself are you ready to rewrite?",
  "When you imagine the best version of your life, what's different?",
  "What conversation have you been putting off, and what's stopping you?",
];

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const getDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Main tabs: "journal" or "sessions"
  const [tab, setTab] = useState("sessions"); // "home" | "sessions" | "account"

  // Journal sub-tabs (used within sessions/between)
  const [journalView, setJournalView] = useState("write"); // "write" or "log"

  // Sessions sub-tabs
  const [sessionView, setSessionView] = useState("between"); // "between" | "prep" | "after"

  const [expanded, setExpanded] = useState({});
  const [date, setDate] = useState(getDate());
  const [entry, setEntry] = useState({ text: "", prompt: "" }); // Add prompt field
  const [pendingBookmark, setPendingBookmark] = useState(false);
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
  const [sessionPrepNote, setSessionPrepNote] = useState("");
  const [prepNoteSaved, setPrepNoteSaved] = useState(false);
  const [patternsData, setPatternsData] = useState(() => {
    try { const s = localStorage.getItem('between_patternsData'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [patternsLastEntryId, setPatternsLastEntryId] = useState(() => {
    return localStorage.getItem('between_patternsLastEntry') || null;
  });
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsError, setPatternsError] = useState(null);
  const [checkedTopics, setCheckedTopics] = useState(new Set());
  const [extraTopics, setExtraTopics] = useState(() => {
    try { const s = localStorage.getItem('between_extraTopics'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const [flaggedForSession, setFlaggedForSession] = useState(() => {
    try { const s = localStorage.getItem('between_flagged'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [bookmarkedEntries, setBookmarkedEntries] = useState(() => {
    try { const s = localStorage.getItem('between_bookmarks'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [flaggedEntryModal, setFlaggedEntryModal] = useState(null); // { text, date }
  const [newTopicInput, setNewTopicInput] = useState('');
  const [editingTopics, setEditingTopics] = useState(false);
  const [tempTopics, setTempTopics] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [logFilter, setLogFilter] = useState("all"); // "all", "entries", "snapshots"
  const [favoritedPatterns, setFavoritedPatterns] = useState([]); // [{text, favoritedAt}]
  const [showWelcome, setShowWelcome] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savedPrompts, setSavedPrompts] = useState([]); // [{text, savedAt}]
  const [showMyPrompts, setShowMyPrompts] = useState(false);
  const [showDailyPrompt, setShowDailyPrompt] = useState(false);
  const [showOpenQuestions, setShowOpenQuestions] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [userEncryptionKey, setUserEncryptionKey] = useState(null);

  // Home session snapshot modal
  const [homeSessionModal, setHomeSessionModal] = useState(null);

  // AI summary of last session notes (cached by parseId, persisted to localStorage)
  const [sessionNotesSummary, setSessionNotesSummary] = useState(() => {
    try { const s = localStorage.getItem('between_sessionSummary'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Intention (used in after-session logging)
  const [sessionIntention, setSessionIntention] = useState("");

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [therapyDays, setTherapyDays] = useState([]); // array of day names
  const [therapyTime, setTherapyTime] = useState('');
  const [onboardingEntry, setOnboardingEntry] = useState('');

  // Engagement messages
  const [engagementMessage, setEngagementMessage] = useState(null); // { text, type }

  // Intention daily check-in
  const [intentionCheckedIn, setIntentionCheckedIn] = useState(() => {
    try { return localStorage.getItem(`between_checkin_${getDate()}`) === '1'; } catch { return false; }
  });

  const streak = useMemo(() => {
    const toLocalDateStr = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dateSet = new Set();
    // Add journal entry dates, excluding welcome entries
    entries.filter(e => !e.isWelcomeEntry).forEach(e => { if (e.date) dateSet.add(e.date); });
    // Add session snapshot dates
    history.forEach(s => {
      const d = s.sessionDate || s.timestamp?.split('T')[0];
      if (d) dateSet.add(d);
    });

    const todayStr = toLocalDateStr(new Date());
    const hasActivityToday = dateSet.has(todayStr);

    let count = 0;
    const d = new Date();
    if (!hasActivityToday) d.setDate(d.getDate() - 1); // start from yesterday
    while (true) {
      const dateStr = toLocalDateStr(d);
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

  // Restore encryption key from local storage on page reload
  useEffect(() => {
    if (currentUser) {
      const storedKey = localStorage.getItem('encKey');
      if (storedKey) setUserEncryptionKey(storedKey);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('between_flagged', JSON.stringify(flaggedForSession));
  }, [flaggedForSession]);

  useEffect(() => {
    localStorage.setItem('between_bookmarks', JSON.stringify(bookmarkedEntries));
  }, [bookmarkedEntries]);

  useEffect(() => {
    localStorage.setItem('between_sessionSummary', JSON.stringify(sessionNotesSummary));
  }, [sessionNotesSummary]);

  useEffect(() => {
    if (patternsData) localStorage.setItem('between_patternsData', JSON.stringify(patternsData));
  }, [patternsData]);

  useEffect(() => {
    if (patternsLastEntryId) localStorage.setItem('between_patternsLastEntry', patternsLastEntryId);
  }, [patternsLastEntryId]);

  // Auto-save session prep note (debounced)
  useEffect(() => {
    if (!currentUser) return;
    setPrepNoteSaved(false);
    const t = setTimeout(() => {
      currentUser.set("sessionPrepNote", sessionPrepNote);
      currentUser.save().catch(() => {}).then(() => setPrepNoteSaved(true));
    }, 1500);
    return () => clearTimeout(t);
  }, [sessionPrepNote]);

  // Persist key topics to Parse (cross-device) and localStorage (offline fallback)
  useEffect(() => {
    localStorage.setItem('between_extraTopics', JSON.stringify(extraTopics));
    if (currentUser && Parse) {
      currentUser.set("keyTopics", extraTopics);
      currentUser.save().catch(() => {});
    }
  }, [extraTopics]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const user = await Parse.User.logIn(email, password);
      setCurrentUser(user);
      const encKey = generateEncryptionKey(password);
      setUserEncryptionKey(encKey);
      localStorage.setItem('encKey', encKey);
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
      localStorage.setItem('encKey', encKey);
      setTab("home");
      setShowOnboarding(true);
      setOnboardingStep(1);
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
    localStorage.removeItem('encKey');
    localStorage.removeItem('between_extraTopics');
    setExtraTopics([]);
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
    setSessionIntention("");
    setSessionPrepNote("");
    setTherapyDays([]);
    setTherapyTime('');
    setDisplayName("");
    setSavedPrompts([]);
    setFavoritedPatterns([]);
    setTab("home");
    setJournalView("write");
    setSessionView("between");
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
      isWelcomeEntry: o.get("isWelcomeEntry") ?? false,
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
    if (eObj.isWelcomeEntry) obj.set("isWelcomeEntry", true);
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
      intention: decryptText(o.get("intention") ?? "", userEncryptionKey),
      intentionCheckIns: o.get("intentionCheckIns") ?? [],
      isExampleSnapshot: o.get("isExampleSnapshot") ?? false,
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
    obj.set("intention", encryptText(payload.intention ?? "", userEncryptionKey));
    obj.set("intentionCheckIns", payload.intentionCheckIns ?? []);
    obj.set("discussedTopics", payload.discussedTopics ?? []);
    if (payload.isExampleSnapshot) obj.set("isExampleSnapshot", true);
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
        // Replace any old welcome entries with the current welcome entry
        const oldWelcome = e.filter(entry => entry.text.startsWith('Welcome to Between! 👋'));
        const realEntries = e.filter(entry => !entry.text.startsWith('Welcome to Between! 👋'));
        if (oldWelcome.length > 0) {
          await Promise.all(oldWelcome.map(entry => deleteEntry(entry.parseId).catch(() => {})));
        }
        const finalSnapshots = s;

        // Create welcome entry for brand-new users (no real entries)
        let finalEntries = realEntries;
        if (realEntries.length === 0) {
          const welcomeEntry = {
            id: Date.now(),
            date: getDate(),
            text: `Welcome to Between! 👋

Here's how to get the most out of your journaling practice:

📝 Write Between Sessions
Capture thoughts, feelings, and moments as they come up between therapy sessions. Don't wait until your next appointment — write when something resonates.

✨ Get AI Insights
After a few entries, go to the Patterns tab to see what themes are emerging in your life.

💬 Prep for Therapy
Before your session, tap Sessions to review what you've been working through and get a suggested conversation starter.

🎤 Use Voice Input
Don't feel like typing? Use voice input to speak your thoughts.

📊 Track Your Progress
Watch your streak build as you journal consistently.

🔒 Your Privacy Matters
Everything you write is end-to-end encrypted and private.`,
            prompt: "",
            timestamp: new Date().toISOString(),
            isWelcomeEntry: true,
          };
          try {
            await createEntry(welcomeEntry);
            finalEntries = await fetchEntries();
          } catch (err) {
            console.error("Welcome entry failed:", err);
          }
        }
        setEntries(finalEntries);
        setHistory(finalSnapshots);

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

        const tds = currentUser.get("therapyDays");
        const tt = currentUser.get("therapyTime");
        if (Array.isArray(tds) && tds.length > 0) {
          setTherapyDays(tds);
        } else {
          const legacyTd = currentUser.get("therapyDay");
          if (legacyTd) setTherapyDays([legacyTd]);
        }
        if (tt) setTherapyTime(tt);

        // Load key topics from Parse (cross-device); if none set, pre-populate from analysis avoiding
        const kt = currentUser.get("keyTopics");
        if (Array.isArray(kt) && kt.length > 0) {
          setExtraTopics(kt);
        }

        const spn = currentUser.get("sessionPrepNote");
        if (spn) setSessionPrepNote(spn);

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

  // Auto-summarize last session notes when opening prep view
  useEffect(() => {
    if (tab !== 'sessions' || sessionView !== 'prep') return;
    const snap = history.filter(h => !h.isExampleSnapshot)[0] ?? history[0] ?? null;
    if (!snap?.notes || !snap?.parseId) return;
    if (sessionNotesSummary[snap.parseId] !== undefined) return;
    setSummaryLoading(true);
    window.Parse.Cloud.run('summarizeSessionNotes', { notes: snap.notes })
      .then(result => {
        setSessionNotesSummary(prev => ({ ...prev, [snap.parseId]: result.bullets ?? [] }));
      })
      .catch(() => {
        setSessionNotesSummary(prev => ({ ...prev, [snap.parseId]: [] }));
      })
      .finally(() => setSummaryLoading(false));
  }, [tab, sessionView]);

  const genAnalysis = async () => {
    if (entries.length < 3) {
      const empty = {
        themes: ["Capture at least 3 thoughts to see patterns"],
        avoiding: ["Begin capturing your thoughts between sessions"],
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
      const discussedTopics = Array.from(checkedTopics).map(i => extraTopics[i]).filter(Boolean);
      const result = await Parse.Cloud.run("analyzeJournal", {
        entries: entriesToAnalyze.map(e =>
          e.prompt ? `Prompt: ${e.prompt}\n\nEntry: ${e.text}` : e.text
        ),
        previousPatterns: previousPatterns,
        isIncremental: !!previousPatterns,
        discussedTopics: discussedTopics.length > 0 ? discussedTopics : undefined,
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
      setCheckedTopics(new Set());
      
      await saveAnalysisToUser(newAnalysis);
    } catch (error) {
      console.error("Error analyzing journal:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatterns = async () => {
    const realEntries = entries.filter(e => !e.isWelcomeEntry);
    if (!realEntries.length) return;
    setPatternsLoading(true);
    setPatternsError(null);
    try {
      // Only analyze entries since the latest session snapshot (current between-session period)
      const latestSnapshot = history.filter(h => !h.isExampleSnapshot)[0];
      const cutoffDate = latestSnapshot?.sessionDate || latestSnapshot?.timestamp?.slice(0, 10);
      const relevantEntries = cutoffDate
        ? realEntries.filter(e => e.date >= cutoffDate)
        : realEntries;
      const entriesPayload = relevantEntries.slice(0, 15).map(e => ({ text: e.text, date: e.date }));
      const result = await window.Parse.Cloud.run('analyzePatterns', { entries: entriesPayload });
      setPatternsData(result);
      // Record the most recent entry id so we can tell when new entries have been added
      if (realEntries[0]?.parseId) setPatternsLastEntryId(realEntries[0].parseId);
    } catch (err) {
      console.error('[patterns] full error:', err);
      setPatternsError(`${err?.message || String(err)}`);
    } finally {
      setPatternsLoading(false);
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
      intention: sessionIntention || "",
      intentionCheckIns: [],
      discussedTopics: Array.from(checkedTopics).map(i => extraTopics[i]).filter(Boolean),
    };

    try {
      await createSnapshot(payload);
      const refreshed = await fetchSnapshots();
      setHistory(refreshed);

      setNotes("");
      setNextSteps("");
      setSessionIntention("");
      setSessionPrepNote("");
      setCheckedTopics(new Set());
      setExtraTopics([]);
      setFlaggedForSession([]);
      setTab("journal");
      setJournalView("log");
      // Fire session snapshot message async (don't block UI)
      handleSessionSnapshotMessage(entries, payload.notes);
    } catch (e) {
      console.error(e);
      alert("Archive failed. Check Back4App CLP for SessionSnapshot (Create).");
    }
  };

  const handlePostEntrySave = async (allEntries) => {
    if (!currentUser) return;
    const userId = currentUser.id;
    const realEntries = allEntries.filter(e => !e.isWelcomeEntry);
    const count = realEntries.length;
    console.log('[engagement] entry count (real):', count);

    const milestoneMap = {
      1: { key: 'entry1', fn: () => getEntry1Message(realEntries[0]) },
      2: { key: 'entry2', fn: () => getEntry2Message(realEntries.slice(0, 2)) },
      3: { key: 'entry3', fn: () => getEntry3Message(realEntries.slice(0, 3)) },
      5: { key: 'entry5', fn: () => getEntry5MilestoneMessage(realEntries.slice(0, 5)) },
    };

    const milestone = milestoneMap[count];
    if (!milestone) { console.log('[engagement] no milestone for count', count); return; }

    try {
      const alreadyFired = await hasMilestoneFired(userId, milestone.key);
      console.log('[engagement] milestone:', milestone.key, 'alreadyFired:', alreadyFired);
      if (alreadyFired) return;
      console.log('[engagement] calling cloud function getEngagementMessage...');
      const message = await milestone.fn();
      console.log('[engagement] message received:', message?.slice(0, 60));
      await recordMilestoneFired(userId, milestone.key);
      setEngagementMessage({ text: message, type: milestone.key });
    } catch (err) {
      console.warn('[engagement] FAILED — is getEngagementMessage deployed in Back4App?', err?.message || err);
    }
  };

  const handleSessionSnapshotMessage = async (allEntries, prepNotes) => {
    if (!currentUser) return;
    const userId = currentUser.id;
    const milestoneKey = `sessionSnapshot_${new Date().toISOString().split('T')[0]}`;
    try {
      const alreadyFired = await hasMilestoneFired(userId, milestoneKey);
      if (alreadyFired) return;
      const realEntries = allEntries.filter(e => !e.isWelcomeEntry).slice(0, 10);
      const message = await getSessionSnapshotMessage(realEntries, prepNotes);
      await recordMilestoneFired(userId, milestoneKey);
      setEngagementMessage({ text: message, type: 'sessionSnapshot' });
    } catch (err) {
      console.warn('Session snapshot message failed — is getEngagementMessage deployed in Back4App?', err?.message || err);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!isPaidSubscriber) return;
    const source = realHistory.length > 0 ? realHistory[0] : analysis;
    if (!source) return;

    setLoading(true);
    try {
      const result = await Parse.Cloud.run("generateJournalPrompt", {
        themes: source.themes || [],
        avoiding: source.avoiding || [],
        questions: source.questions || [],
      });
      setActivePrompt(result.prompt);
      setTab('sessions');
      setSessionView('between');
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

  const realHistory = history.filter(h => !h.isExampleSnapshot);
  const lastSnapshot = realHistory[0] ?? history[0] ?? null;



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

        <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', maxWidth: '600px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', margin: '0 auto' }}>
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
                <div style={{ marginTop: '8px', padding: '10px 12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', fontSize: '12px', color: '#581c87', lineHeight: '1.5' }}>
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

  // ── ONBOARDING OVERLAY ──────────────────────────────────────────────────────
  const saveTherapySchedule = async (day, time) => {
    if (currentUser && Parse) {
      currentUser.set("therapyDays", day);
      currentUser.set("therapyTime", time);
      await currentUser.save().catch(() => {});
    }
    setTherapyDays(day);
    setTherapyTime(time);
  };

  const finishOnboarding = async (firstEntryText) => {
    if (firstEntryText && firstEntryText.trim()) {
      const n = {
        id: Date.now(),
        date: getDate(),
        text: firstEntryText.trim(),
        prompt: "",
        timestamp: new Date().toISOString(),
      };
      try {
        await createEntry(n);
        const updatedEntries = await fetchEntries();
        setEntries(updatedEntries);
        handlePostEntrySave(updatedEntries);
      } catch (err) {
        console.error("First entry save failed:", err);
      }
    }
    if (currentUser && Parse) {
      currentUser.set("onboardingComplete", true);
      currentUser.save().catch(() => {});
    }
    setShowOnboarding(false);
    setOnboardingEntry('');
  };

  if (showOnboarding) {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const TIMES = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'];

    const stepContent = () => {
      if (onboardingStep === 1) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>👋</div>
              <h2 style={{ fontSize: '26px', fontWeight: '400', color: '#581c87', margin: '0 0 10px 0', fontFamily: "'Crimson Pro', serif" }}>
                Welcome to between
              </h2>
              <p style={{ fontSize: '16px', color: '#7c3aed', margin: 0, lineHeight: '1.6' }}>
                A private space to process what comes up between therapy sessions.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {[
                { icon: '📝', title: 'Write between sessions', desc: 'Capture thoughts, feelings, and moments as they arise — not just before your appointment.' },
                { icon: '✨', title: 'Discover patterns', desc: 'After a few entries, AI surfaces themes and what you might be avoiding.' },
                { icon: '💬', title: 'Prep for therapy', desc: 'Get a suggested opening statement and key topics to bring into the room.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(147,51,234,0.05)', border: '1px solid rgba(147,51,234,0.12)', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ fontSize: '24px', flexShrink: 0, lineHeight: 1 }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#581c87', fontSize: '15px', marginBottom: '4px' }}>{title}</div>
                    <div style={{ fontSize: '14px', color: '#7c3aed', lineHeight: '1.5' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setOnboardingStep(2)}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 16px rgba(147,51,234,0.35)' }}
            >
              Get Started →
            </button>
          </div>
        );
      }

      if (onboardingStep === 2) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🗓️</div>
              <h2 style={{ fontSize: '24px', fontWeight: '400', color: '#581c87', margin: '0 0 8px 0', fontFamily: "'Crimson Pro', serif" }}>
                When is your therapy session?
              </h2>
              <p style={{ fontSize: '14px', color: '#7c3aed', margin: 0, lineHeight: '1.5' }}>
                We'll personalize your home screen based on where you are in the week.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              <div>
                <label style={{ display: 'block', color: '#7c3aed', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Day(s) of the week <span style={{ color: '#9ca3af', fontWeight: '400' }}>(select all that apply)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DAYS.map(d => (
                    <button
                      key={d}
                      onClick={() => setTherapyDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                      style={{ padding: '8px 16px', borderRadius: '20px', border: '2px solid', borderColor: therapyDays.includes(d) ? '#9333ea' : '#e9d5ff', background: therapyDays.includes(d) ? '#9333ea' : 'white', color: therapyDays.includes(d) ? 'white' : '#7c3aed', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#7c3aed', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Approximate time <span style={{ color: '#9ca3af', fontWeight: '400' }}>(optional)</span>
                </label>
                <select
                  value={therapyTime}
                  onChange={e => setTherapyTime(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', background: 'white', color: '#581c87', cursor: 'pointer' }}
                >
                  <option value="">Select a time...</option>
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={async () => {
                if (therapyDays.length > 0) await saveTherapySchedule(therapyDays, therapyTime);
                setOnboardingStep(3);
              }}
              style={{ width: '100%', padding: '14px', background: therapyDays.length > 0 ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' : '#d1d5db', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: therapyDays.length > 0 ? 'pointer' : 'not-allowed', boxShadow: therapyDays.length > 0 ? '0 4px 16px rgba(147,51,234,0.35)' : 'none', marginBottom: '10px' }}
            >
              Continue →
            </button>
            <button
              onClick={() => setOnboardingStep(3)}
              style={{ width: '100%', padding: '10px', background: 'transparent', color: '#9ca3af', border: 'none', fontSize: '14px', cursor: 'pointer' }}
            >
              Skip for now
            </button>
          </div>
        );
      }

      // Step 3: First entry — skip if user already has entries
      if (entries.filter(e => !e.isWelcomeEntry).length > 0) {
        finishOnboarding('');
        return null;
      }
      return (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>✏️</div>
            <h2 style={{ fontSize: '24px', fontWeight: '400', color: '#581c87', margin: '0 0 8px 0', fontFamily: "'Crimson Pro', serif" }}>
              Capture your first thought
            </h2>
            <p style={{ fontSize: '14px', color: '#7c3aed', margin: 0, lineHeight: '1.5' }}>
              What came up today? There's no right or wrong way to start.
            </p>
          </div>

          <textarea
            value={onboardingEntry}
            onChange={e => setOnboardingEntry(e.target.value)}
            placeholder="I've been thinking about..."
            autoFocus
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.9)', color: '#581c87', height: '180px', marginBottom: '16px', lineHeight: '1.6' }}
          />

          <button
            onClick={() => finishOnboarding(onboardingEntry)}
            disabled={!onboardingEntry.trim()}
            style={{ width: '100%', padding: '14px', background: onboardingEntry.trim() ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' : '#d1d5db', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: onboardingEntry.trim() ? 'pointer' : 'not-allowed', boxShadow: onboardingEntry.trim() ? '0 4px 16px rgba(147,51,234,0.35)' : 'none', marginBottom: '10px' }}
          >
            Save & Start Journaling
          </button>
          <button
            onClick={() => finishOnboarding('')}
            style={{ width: '100%', padding: '10px', background: 'transparent', color: '#9ca3af', border: 'none', fontSize: '14px', cursor: 'pointer' }}
          >
            Skip for now
          </button>
        </div>
      );
    };

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 10000, overflowY: 'auto' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400&family=Work+Sans:wght@400;500&display=swap');
          * { font-family: 'Work Sans', sans-serif; box-sizing: border-box; }
          h1, h2, h3 { font-family: 'Crimson Pro', serif; }
        `}</style>
        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '24px', padding: '40px', maxWidth: '480px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', position: 'relative' }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '28px' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ width: s === onboardingStep ? '24px' : '8px', height: '8px', borderRadius: '4px', background: s <= onboardingStep ? '#9333ea' : '#e9d5ff', transition: 'all 0.3s' }} />
            ))}
          </div>
          {stepContent()}
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
          font-family: 'Work Sans', sans-serif;
        }

        input[type="date"]::-webkit-date-and-time-value {
          text-align: left;
        }

        @media (min-width: 769px) {
          input[type="date"]::-webkit-calendar-picker-indicator {
            cursor: pointer;
            opacity: 0.6;
          }
          input[type="date"]::-webkit-calendar-picker-indicator:hover {
            opacity: 1;
          }
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
          input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important;
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

          return (
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 24px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Greeting */}
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '500', color: '#581c87', margin: 0 }}>
                  Hi {name} 👋
                </h2>
              </div>

              {/* INTENTION OF THE WEEK */}
              {(() => {
                const intention = lastSnapshot?.intention || sessionIntention;
                if (!intention) return null;
                return (
                  <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '16px 20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Intention of the Week
                    </div>
                    <p style={{ fontSize: '15px', color: '#581c87', margin: '0 0 12px 0', lineHeight: '1.5', fontStyle: 'italic' }}>
                      {intention}
                    </p>
                    {intentionCheckedIn ? (
                      <div style={{ fontSize: '12px', color: '#9333ea', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>✓</span> Reflected on today
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          localStorage.setItem(`between_checkin_${getDate()}`, '1');
                          setIntentionCheckedIn(true);
                        }}
                        style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #e9d5ff', background: 'none', color: '#7c3aed', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                      >
                        ✓ I reflected on this today
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* WHAT TO DO NOW */}
              <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e9d5ff', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3e8ff' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    What do you want to do today?
                  </span>
                </div>
                {[
                  { label: 'Capture a Thought', subtitle: 'Something on your mind?', action: () => { setTab('sessions'); setSessionView('between'); setJournalView('write'); }, primary: true },
                  { label: 'Prep for Session', subtitle: 'Organize your thoughts before therapy', action: () => { setTab('sessions'); setSessionView('prep'); }, primary: false },
                  { label: 'Reflect on Session', subtitle: 'How did your session go?', action: () => { setTab('sessions'); setSessionView('after'); }, primary: false },
                  { label: 'View All Thoughts', subtitle: "Review what you've captured", action: () => { setTab('sessions'); setSessionView('between'); setJournalView('log'); }, primary: false },
                ].map(({ label, subtitle, action, primary }, idx, arr) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: idx < arr.length - 1 ? '1px solid #f3e8ff' : 'none', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: primary ? '600' : '500', color: primary ? '#9333ea' : '#581c87' }}>{label}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{subtitle}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: '#c4b5fd', flexShrink: 0 }} />
                  </button>
                ))}
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

                <div style={{ padding: '16px', background: 'rgba(147,51,234,0.05)', borderRadius: '12px', border: '1px solid rgba(147,51,234,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '500' }}>Therapy Schedule</div>
                    <button
                      onClick={() => { setShowOnboarding(true); setOnboardingStep(2); }}
                      style={{ background: 'none', border: 'none', color: '#9333ea', cursor: 'pointer', fontSize: '12px', fontWeight: '500', padding: '2px 6px' }}
                    >
                      {therapyDays.length > 0 ? 'Edit' : 'Set'}
                    </button>
                  </div>
                  <div style={{ fontSize: '16px', color: '#581c87' }}>
                    {therapyDays.length > 0 ? `${therapyDays.join(', ')}${therapyTime ? ` at ${therapyTime}` : ''}` : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not set</span>}
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

        {/* SESSIONS SUB-TABS — rendered first so they appear above content */}
        {tab === "sessions" && sessionView !== "between" && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 24px 12px', width: '100%' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                ["prep", "Before"],
                ["after", "After"],
              ].map(([view, label]) => (
                <button
                  key={view}
                  onClick={() => setSessionView(view)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '14px',
                    fontWeight: '600',
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    background: sessionView === view ? '#9333ea' : 'rgba(255,255,255,0.6)',
                    color: sessionView === view ? 'white' : '#7c3aed',
                    boxShadow: sessionView === view ? '0 4px 12px rgba(147,51,234,0.3)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BETWEEN VIEW (journal write/log) */}
        {tab === "sessions" && sessionView === "between" && (
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

                  {engagementMessage && (
                    <EngagementMessage
                      message={engagementMessage.text}
                      type={engagementMessage.type}
                      onDismiss={() => setEngagementMessage(null)}
                    />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      onClick={() => setJournalView('write')}
                      style={{ padding: '7px 16px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      + Capture a thought
                    </button>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[["all", "All"], ["entries", `Thoughts (${entries.length})`], ["snapshots", `Sessions (${realHistory.length})`], ["bookmarked", `Bookmarked${bookmarkedEntries.length > 0 ? ` (${bookmarkedEntries.length})` : ''}`], ["favorites", `★ Favorites${favoritedPatterns.length > 0 ? ` (${favoritedPatterns.length})` : ''}`]].map(([f, label]) => (
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

                  {logFilter === "bookmarked" ? (
                    bookmarkedEntries.length === 0 ? (
                      <p style={{ color: '#7c3aed', textAlign: 'center', padding: '32px 0' }}>
                        No bookmarks yet. Tap the bookmark icon on any entry to save it here.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[...bookmarkedEntries].reverse().map((entry, i) => (
                          <div key={entry.parseId || i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid #e9d5ff', padding: '12px 14px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '11px', color: '#9333ea', fontWeight: '600', margin: '0 0 4px 0' }}>
                                {entry.date ? new Date(entry.date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                              </p>
                              <p style={{ fontSize: '14px', color: '#581c87', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{entry.text}</p>
                            </div>
                            <button
                              onClick={() => setBookmarkedEntries(prev => prev.filter(b => b.parseId !== entry.parseId))}
                              title="Remove bookmark"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, color: '#9333ea' }}
                            >
                              <Bookmark size={16} fill="#9333ea" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  ) : logFilter === "favorites" ? (
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
                        No {logFilter === "entries" ? "thoughts captured" : "session snapshots"} yet.
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
                                {item.type === "entry" && (
                                  <p style={{ fontSize: '14px', color: '#7c3aed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                    {(item.data.text || "").substring(0, 60) + "..."}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              {item.type === "entry" && (() => {
                                const isBookmarked = bookmarkedEntries.some(b => b.parseId === item.data.parseId);
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBookmarkedEntries(prev =>
                                        isBookmarked
                                          ? prev.filter(b => b.parseId !== item.data.parseId)
                                          : [...prev, { parseId: item.data.parseId, text: item.data.text, date: item.data.date }]
                                      );
                                    }}
                                    title={isBookmarked ? "Remove bookmark" : "Bookmark this entry"}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, color: isBookmarked ? '#9333ea' : '#d1d5db' }}
                                  >
                                    <Bookmark size={16} fill={isBookmarked ? '#9333ea' : 'none'} />
                                  </button>
                                );
                              })()}
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
                                  {item.data.discussedTopics?.length > 0 && (
                                    <div>
                                      <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px' }}>
                                        Key Topics
                                      </h4>
                                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#581c87' }}>
                                        {item.data.discussedTopics.map((t, i) => (
                                          <li key={i} style={{ marginBottom: '4px', fontSize: '14px', lineHeight: '1.5' }}>{t}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div>
                                    <h4 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px', fontSize: '14px' }}>
                                      What You Covered
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
                                          <p style={{ fontWeight: '500', color: '#7c3aed', marginBottom: '4px', fontSize: '13px' }}>What kept coming up:</p>
                                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#581c87' }}>
                                            {item.data.themes.map((theme, i) => (
                                              <li key={i} style={{ marginBottom: '4px' }}>{theme}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {item.data.avoiding?.length > 0 && (
                                        <div style={{ marginBottom: '12px' }}>
                                          <p style={{ fontWeight: '500', color: '#7c3aed', marginBottom: '4px', fontSize: '13px' }}>Worth a closer look:</p>
                                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#581c87' }}>
                                            {item.data.avoiding.map((avoid, i) => (
                                              <li key={i} style={{ marginBottom: '4px' }}>{avoid}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {item.data.questions?.length > 0 && (
                                        <div>
                                          <p style={{ fontWeight: '500', color: '#7c3aed', marginBottom: '4px', fontSize: '13px' }}>Questions to sit with:</p>
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button
                      onClick={() => setJournalView('log')}
                      style={{ padding: '5px 12px', background: 'transparent', color: '#9333ea', border: '1px solid #e9d5ff', borderRadius: '14px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                    >
                      View log →
                    </button>
                  </div>

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
                    What came up today?
                  </h2>

                  {/* Prompt buttons: My Prompts | Prompt of the Day | Generate Journaling Prompt */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {/* My Prompts */}
                    <button
                      onClick={() => { setShowMyPrompts(p => !p); setShowDailyPrompt(false); }}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e9d5ff', background: showMyPrompts ? '#9333ea' : 'rgba(255,255,255,0.8)', color: showMyPrompts ? 'white' : '#7c3aed', fontWeight: '500', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                    >
                      <BookOpen size={14} />
                      My Prompts ({savedPrompts.length})
                    </button>

                    {/* Prompt of the Day */}
                    <button
                      onClick={() => { setShowDailyPrompt(p => !p); setShowMyPrompts(false); setShowOpenQuestions(false); }}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e9d5ff', background: showDailyPrompt ? '#9333ea' : 'rgba(255,255,255,0.8)', color: showDailyPrompt ? 'white' : '#7c3aed', fontWeight: '500', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                    >
                      <Calendar size={14} />
                      Prompt of the Day
                    </button>

                    {/* Open Questions */}
                    {analysis && (analysis.questions || []).length > 0 && (
                      <button
                        onClick={() => { setShowOpenQuestions(p => !p); setShowDailyPrompt(false); setShowMyPrompts(false); }}
                        style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e9d5ff', background: showOpenQuestions ? '#9333ea' : 'rgba(255,255,255,0.8)', color: showOpenQuestions ? 'white' : '#7c3aed', fontWeight: '500', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                      >
                        <MessageCircle size={14} />
                        Open Questions
                      </button>
                    )}

                    {/* Generate Journaling Prompt */}
                    {(() => {
                      const noSource = !realHistory?.length && !analysis;
                      return (
                        <button
                          onClick={noSource ? undefined : handleGeneratePrompt}
                          disabled={loading || noSource}
                          title={noSource ? 'Capture a few thoughts first to get a custom prompt' : ''}
                          style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e9d5ff', background: (loading || noSource) ? '#f3f4f6' : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', color: (loading || noSource) ? '#9ca3af' : '#7c3aed', fontWeight: '500', fontSize: '12px', cursor: (loading || noSource) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                        >
                          {noSource ? <Lock size={14} /> : <Sparkles size={14} />}
                          {loading && !noSource ? 'Generating...' : 'Generate Journaling Prompt'}
                        </button>
                      );
                    })()}
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

                  {/* Prompt of the Day panel */}
                  {showDailyPrompt && (() => {
                    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
                    const dailyPrompt = DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
                    return (
                      <div style={{ marginBottom: '12px', border: '1px solid #ddd6fe', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 14px', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe', fontSize: '12px', fontWeight: '600', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} />
                          Today's Prompt
                        </div>
                        <div style={{ padding: '12px 14px', background: 'white', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                          <p style={{ flex: 1, fontSize: '13px', color: '#581c87', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>{dailyPrompt}</p>
                          <button
                            onClick={() => { setActivePrompt(dailyPrompt); setShowDailyPrompt(false); }}
                            style={{ flexShrink: 0, padding: '5px 12px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '16px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                          >
                            Use →
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Open Questions panel */}
                  {showOpenQuestions && analysis && (analysis.questions || []).length > 0 && (
                    <div style={{ marginBottom: '12px', border: '1px solid #ddd6fe', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe', fontSize: '12px', fontWeight: '600', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageCircle size={12} />
                        Open Questions
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {(analysis.questions || []).map((q, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', padding: '10px 14px', borderBottom: i < analysis.questions.length - 1 ? '1px solid #f3f4f6' : 'none', background: 'white' }}>
                            <p style={{ flex: 1, fontSize: '13px', color: '#581c87', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>{q}</p>
                            <button
                              onClick={() => { setActivePrompt(q); setShowOpenQuestions(false); }}
                              style={{ flexShrink: 0, padding: '5px 12px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '16px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                            >
                              Use →
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

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '0' }}>
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
                          const updatedEntries = await fetchEntries();
                          setEntries(updatedEntries);
                          if (pendingBookmark) {
                            const saved = updatedEntries.find(e => e.id === n.id || e.timestamp === n.timestamp);
                            if (saved) setBookmarkedEntries(prev => [...prev, { parseId: saved.parseId, text: n.text, date: n.date }]);
                          }
                          if (activePrompt && savedPrompts.some(p => p.text === activePrompt)) {
                            removeSavedPrompt(activePrompt);
                          }
                          setEntry({ text: "", prompt: "" });
                          setActivePrompt("");
                          setPendingBookmark(false);
                          setJournalView("log");
                          handlePostEntrySave(updatedEntries);
                        } catch (err) {
                          console.error(err);
                          alert("Save failed. Check Back4App CLP for Entry (Create).");
                        }
                      }}
                      disabled={!entry.text}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: entry.text ? 'pointer' : 'not-allowed', transition: 'all 0.2s', background: entry.text ? '#9333ea' : '#d1d5db', color: 'white', flex: 1, opacity: entry.text ? 1 : 0.5 }}
                    >
                      <Save size={20} />
                      Save
                    </button>
                    <button
                      onClick={() => setPendingBookmark(p => !p)}
                      title={pendingBookmark ? "Remove bookmark" : "Bookmark this entry"}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', borderRadius: '12px', border: `2px solid ${pendingBookmark ? '#9333ea' : '#e9d5ff'}`, background: pendingBookmark ? 'rgba(147,51,234,0.08)' : 'rgba(255,255,255,0.8)', color: pendingBookmark ? '#9333ea' : '#c4b5fd', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                    >
                      <Bookmark size={20} fill={pendingBookmark ? '#9333ea' : 'none'} />
                    </button>
                  </div>

                  <p style={{ margin: '8px 0 4px', textAlign: 'right', fontSize: '12px', color: '#a78bfa' }}>
                    Bookmark to bring up in your next session
                  </p>

                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#6b7280', fontSize: '12px' }}>
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

        {/* SESSIONS PREP VIEW */}
        {tab === "sessions" && sessionView === "prep" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* LAST SESSION */}
                {lastSnapshot && (
                  <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Archive size={20} style={{ color: '#9333ea' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#581c87', margin: 0 }}>
                          Recall Your Last Session
                        </h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session Date</div>
                          <div style={{ fontSize: '16px', color: '#581c87' }}>{formatDate(lastSnapshot?.sessionDate || getDate())}</div>
                        </div>
                        {lastSnapshot?.notes && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What You Covered</div>
                            {summaryLoading && !sessionNotesSummary[lastSnapshot?.parseId] ? (
                              <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>Summarizing…</div>
                            ) : sessionNotesSummary[lastSnapshot?.parseId]?.length > 0 ? (
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {sessionNotesSummary[lastSnapshot.parseId].map((bullet, i) => (
                                  <li key={i} style={{ fontSize: '14px', color: '#581c87', lineHeight: '1.5', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ color: '#9333ea', fontWeight: '600', flexShrink: 0 }}>•</span>
                                    {bullet}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {lastSnapshot.notes.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3).map((line, i) => (
                                  <li key={i} style={{ fontSize: '14px', color: '#581c87', lineHeight: '1.5', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ color: '#9333ea', fontWeight: '600', flexShrink: 0 }}>•</span>
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        {lastSnapshot?.nextSteps && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Follow Ups</div>
                            <p style={{ color: '#581c87', whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{lastSnapshot.nextSteps}</p>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setHomeSessionModal(lastSnapshot)}
                          style={{ padding: '8px 18px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
                        >
                          View Session Snapshot →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTENTION OF THE WEEK */}
                {lastSnapshot?.intention && (
                  <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '18px 24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Intention of the Week
                    </div>
                    <p style={{ fontSize: '15px', color: '#581c87', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
                      {lastSnapshot.intention}
                    </p>
                  </div>
                )}

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
                        Capture at least 3 thoughts to see patterns ({entries.length}/3)
                      </p>
                    )}
                  </div>
                ) : null}

                {analysis?.showNewEntryWarning && !loading && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#92400e' }}>
                    💡 Capture a new thought to refresh your analysis and get new insights
                  </div>
                )}

                {/* BOOKMARKED ENTRIES */}
                {bookmarkedEntries.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid #e9d5ff', borderRadius: '24px', padding: '24px 28px', boxShadow: '0 4px 16px rgba(147,51,234,0.06)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bookmark size={13} />
                      Bookmarked entries
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {bookmarkedEntries.map((entry, i) => (
                        <button
                          key={entry.parseId || i}
                          onClick={() => setFlaggedEntryModal(entry)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e9d5ff', background: 'rgba(147,51,234,0.04)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                        >
                          <span style={{ fontSize: '14px', color: '#581c87', fontWeight: '500' }}>
                            {entry.date ? new Date(entry.date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Journal'} — journal entry
                          </span>
                          <ChevronRight size={16} style={{ color: '#9333ea', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* WHAT I WANT TO DISCUSS */}
                <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid #e9d5ff', borderRadius: '24px', padding: '28px 32px', boxShadow: '0 4px 16px rgba(147,51,234,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      What I Want to Discuss
                    </div>
                    {sessionPrepNote.trim() && (
                      <span style={{ fontSize: '11px', color: prepNoteSaved ? '#16a34a' : '#a78bfa', fontWeight: '500' }}>
                        {prepNoteSaved ? '✓ Saved' : 'Saving…'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: '#a78bfa', margin: '0 0 14px 0' }}>In your own words — what feels most important to bring up?</p>
                  <textarea
                    value={sessionPrepNote}
                    onChange={e => { setSessionPrepNote(e.target.value); setPrepNoteSaved(false); }}
                    placeholder={"e.g. I keep ending up in the same pattern and I want to understand why I can't just pursue what I actually want instead of seeking approval."}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '15px', resize: 'none', background: 'rgba(255,255,255,0.8)', color: '#581c87', height: '140px', lineHeight: '1.6', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {/* KEY TOPICS */}
                {analysis && (
                  <div style={{
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #e9d5ff',
                    borderRadius: '24px',
                    padding: '28px 32px',
                    boxShadow: '0 4px 16px rgba(147,51,234,0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Key Topics to Cover
                      </div>
                      <button
                        onClick={() => {
                          if (editingTopics) {
                            const items = tempTopics.split('\n').map(s => s.trim()).filter(Boolean);
                            setExtraTopics(items);
                            setEditingTopics(false);
                          } else {
                            setTempTopics(extraTopics.join('\n'));
                            setEditingTopics(true);
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#9333ea', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}
                      >
                        <Edit2 size={12} />{editingTopics ? 'Save' : 'Edit'}
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#a78bfa', margin: '0 0 14px 0' }}>Add your own or bring up from patterns</p>
                    {editingTopics ? (
                      <textarea
                        value={tempTopics}
                        onChange={e => setTempTopics(e.target.value)}
                        placeholder="One topic per line"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '14px', resize: 'none', background: 'white', color: '#581c87', height: '120px', lineHeight: '1.6', boxSizing: 'border-box' }}
                      />
                    ) : (
                      <>{extraTopics.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
                          {extraTopics.map((theme, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < extraTopics.length - 1 ? '1px solid #f3e8ff' : 'none' }}>
                              <input
                                type="checkbox"
                                id={`topic-${i}`}
                                checked={checkedTopics.has(i)}
                                onChange={() => setCheckedTopics(prev => {
                                  const next = new Set(prev);
                                  next.has(i) ? next.delete(i) : next.add(i);
                                  return next;
                                })}
                                style={{ width: '18px', height: '18px', accentColor: '#9333ea', flexShrink: 0, cursor: 'pointer' }}
                              />
                              <label htmlFor={`topic-${i}`} style={{ fontSize: '15px', color: checkedTopics.has(i) ? '#9ca3af' : '#581c87', cursor: 'pointer', lineHeight: '1.5', textDecoration: checkedTopics.has(i) ? 'line-through' : 'none', flex: 1 }}>
                                {theme}
                              </label>
                              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                                <button
                                  onClick={() => setExtraTopics(prev => { const a = [...prev]; if (i === 0) return a; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; })}
                                  disabled={i === 0}
                                  style={{ background: 'none', border: 'none', padding: '1px 2px', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#e5e7eb' : '#9ca3af', lineHeight: 1 }}
                                >
                                  <ChevronUp size={13} />
                                </button>
                                <button
                                  onClick={() => setExtraTopics(prev => { const a = [...prev]; if (i === a.length - 1) return a; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; })}
                                  disabled={i === extraTopics.length - 1}
                                  style={{ background: 'none', border: 'none', padding: '1px 2px', cursor: i === extraTopics.length - 1 ? 'default' : 'pointer', color: i === extraTopics.length - 1 ? '#e5e7eb' : '#9ca3af', lineHeight: 1 }}
                                >
                                  <ChevronDown size={13} />
                                </button>
                              </div>
                              <button onClick={() => setExtraTopics(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', padding: '0 2px', flexShrink: 0 }}>×</button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 8px 0' }}>No topics yet — add one below or move from Patterns.</p>
                      )}</>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <input
                        type="text"
                        value={newTopicInput}
                        onChange={e => setNewTopicInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newTopicInput.trim()) { setExtraTopics(prev => [...prev, newTopicInput.trim()]); setNewTopicInput(''); } }}
                        placeholder="+ Add a topic..."
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px dashed #c084fc', outline: 'none', fontSize: '14px', background: 'rgba(255,255,255,0.8)', color: '#581c87' }}
                      />
                      <button
                        onClick={() => { if (newTopicInput.trim()) { setExtraTopics(prev => [...prev, newTopicInput.trim()]); setNewTopicInput(''); } }}
                        style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: '#9333ea', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* PATTERNS */}
                <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={20} style={{ color: '#9333ea' }} />
                      <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#581c87', margin: 0, flex: 1 }}>Patterns</h3>
                      {(() => {
                        const realEntries = entries.filter(e => !e.isWelcomeEntry);
                        const latestEntry = realEntries[0];
                        const latestSnap = realHistory[0];
                        // Disable if: loading, no entries, most recent item is a snapshot, or no new entries since last refresh
                        const snapshotIsNewer = latestSnap && latestEntry && latestSnap.sessionDate > latestEntry.date;
                        const noNewEntries = latestEntry && latestEntry.parseId === patternsLastEntryId;
                        const disabled = patternsLoading || !latestEntry || snapshotIsNewer || noNewEntries;
                        const title = patternsLoading ? '' : snapshotIsNewer ? 'Log a journal entry to refresh' : noNewEntries ? 'No new entries since last refresh' : '';
                        return (
                          <button
                            onClick={loadPatterns}
                            disabled={disabled}
                            title={title}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: 'none', background: '#9333ea', color: 'white', fontSize: '13px', fontWeight: '500', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}
                          >
                            <RefreshCw size={13} style={{ animation: patternsLoading ? 'spin 1s linear infinite' : 'none' }} />
                            {patternsLoading ? 'Analyzing…' : 'Refresh'}
                          </button>
                        );
                      })()}
                    </div>

                    {patternsLoading && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: '#a78bfa', fontSize: '14px' }}>Analyzing your entries…</div>
                    )}

                    {patternsError && (
                      <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>{patternsError}</div>
                    )}

                    {!patternsLoading && !patternsData && (
                      <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 12px 0' }}>Hit Refresh to analyze your recent entries.</p>
                      </div>
                    )}

                    {!patternsLoading && patternsData && (() => {
                      const themes = patternsData.themes || [];
                      const contradictions = patternsData.contradictions || [];
                      const unfinished = patternsData.unfinishedThoughts || [];
                      const associations = patternsData.wordAssociations || [];

                      const PatternCard = ({ pattern }) => (
                        <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(216,180,254,0.15)', border: '1px solid rgba(147,51,234,0.12)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{pattern.label}</div>
                          {pattern.description && <p style={{ fontSize: '14px', color: '#581c87', margin: 0, lineHeight: '1.6' }}>{pattern.description}</p>}
                          {(pattern.quotes || []).map((q, qi) => (
                            <div key={qi} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', borderLeft: '3px solid #c084fc' }}>
                              <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '600', marginBottom: '4px' }}>{q.date}</div>
                              <div style={{ fontSize: '13px', color: '#581c87', lineHeight: '1.5', fontStyle: 'italic' }}>"{q.text}"</div>
                            </div>
                          ))}
                          {pattern.prompt && <p style={{ fontSize: '13px', color: '#7c3aed', margin: 0, fontStyle: 'italic' }}>{pattern.prompt}</p>}
                        </div>
                      );

                      return (
                        <>
                          {/* Themes */}
                          {themes.length > 0 && (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                                What you wrote about
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {themes.map((theme, i) => {
                                  const key = theme.name || theme;
                                  const isSelected = selectedPatterns.includes(key);
                                  return (
                                    <div key={i}
                                      onClick={() => setSelectedPatterns(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])}
                                      style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', paddingLeft: isSelected ? '9px' : '12px', background: isSelected ? 'rgba(187,247,208,0.55)' : 'rgba(237,233,254,0.5)', borderRadius: '10px', border: '1px solid rgba(147,51,234,0.1)', borderLeft: isSelected ? '4px solid #16a34a' : '1px solid rgba(147,51,234,0.1)', cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' }}
                                    >
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: theme.exampleWords?.length ? '4px' : 0 }}>
                                          <span style={{ fontSize: '15px', color: '#581c87', fontWeight: '500', lineHeight: '1.4' }}>{theme.name || theme}</span>
                                          {theme.mentionCount && (
                                            <span style={{ fontSize: '12px', color: '#9333ea', fontWeight: '600', background: 'rgba(147,51,234,0.1)', padding: '1px 8px', borderRadius: '20px', flexShrink: 0 }}>
                                              {theme.mentionCount}×
                                            </span>
                                          )}
                                        </div>
                                        {theme.exampleWords?.length > 0 && (
                                          <div style={{ fontSize: '12px', color: '#a78bfa' }}>{theme.exampleWords.join(', ')}</div>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0, marginTop: '2px' }}>✓</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Patterns worth exploring */}
                          {(contradictions.length > 0 || unfinished.length > 0 || associations.length > 0) && (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                                Patterns worth exploring
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {contradictions.map((p, i) => <PatternCard key={`c${i}`} pattern={{
                                  label: p.label || 'Contradiction',
                                  description: p.description || p.pattern,
                                  quotes: p.quotes || [p.entry1, p.entry2].filter(Boolean).map(t => ({ date: '', text: t })),
                                  prompt: p.prompt
                                }} />)}
                                {unfinished.map((p, i) => <PatternCard key={`u${i}`} pattern={{
                                  label: p.label || 'Unfinished thought',
                                  description: p.description || p.phrase,
                                  prompt: p.prompt || p.context
                                }} />)}
                                {associations.map((p, i) => <PatternCard key={`a${i}`} pattern={{
                                  label: p.label || p.word,
                                  description: p.description || (Array.isArray(p.associations) ? p.associations.join(' · ') : p.associations),
                                  prompt: p.prompt
                                }} />)}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                  </div>
                </div>

                {analysis && !loading && realHistory.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
                    <div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#581c87', lineHeight: '1.5' }}>
                        Save your patterns when you log a session snapshot to keep a record of your progress.
                      </p>
                      <button
                        onClick={() => { setTab('sessions'); setSessionView('after'); }}
                        style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', background: '#f59e0b', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        Log a Session Snapshot →
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

        {/* SESSIONS AFTER VIEW */}
        {tab === "sessions" && sessionView === "after" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {!analysis ? (
                  <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px', padding: '48px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <Sparkles size={48} style={{ color: '#c4b5fd', margin: '0 auto 16px' }} />
                    <p style={{ color: '#7c3aed', fontSize: '16px', marginBottom: '16px' }}>
                      Create session prep first to record session notes
                    </p>
                    <button
                      onClick={() => setSessionView("prep")}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px 32px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', background: '#9333ea', color: 'white', boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}
                    >
                      <Calendar size={20} />
                      Go to Prep for Session
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

                      {/* Intention of the week */}
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: '#7c3aed', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                          Intention of the week
                        </label>
                        <input
                          type="text"
                          value={sessionIntention}
                          onChange={(e) => setSessionIntention(e.target.value)}
                          placeholder="What do you want to carry forward from this session?"
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e9d5ff', outline: 'none', fontSize: '15px', background: 'rgba(255,255,255,0.8)', color: '#581c87', boxSizing: 'border-box' }}
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

                      <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>📋</span>
                        <div>
                          <p style={{ fontSize: '13px', color: '#6b21a8', margin: '0 0 4px 0', lineHeight: '1.5', fontWeight: '500' }}>What gets saved in your Session Snapshot</p>
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>Your session reflections and summary, key topics, themes, patterns, and open questions.</p>
                        </div>
                      </div>

                      <button
                        onClick={moveToArchive}
                        disabled={!notes}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', fontWeight: '500', fontSize: '16px', cursor: notes ? 'pointer' : 'not-allowed', transition: 'all 0.2s', background: notes ? '#7c3aed' : '#d1d5db', color: 'white', width: '100%', opacity: notes ? 1 : 0.5 }}
                      >
                        <ArrowRight size={20} />
                        Log Session
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

        {/* Close content area */}
        </div>

        {/* FLAGGED ENTRY MODAL */}
        {flaggedEntryModal && (
          <div
            onClick={() => setFlaggedEntryModal(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 10000, padding: '0' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Flagged journal entry</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#581c87' }}>
                    {flaggedEntryModal.date
                      ? new Date(flaggedEntryModal.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                      : 'Journal Entry'}
                  </div>
                </div>
                <button onClick={() => setFlaggedEntryModal(null)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#9ca3af', cursor: 'pointer', padding: '4px', lineHeight: 1 }}>×</button>
              </div>
              <p style={{ fontSize: '15px', color: '#581c87', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>{flaggedEntryModal.text}</p>
            </div>
          </div>
        )}

        {/* SESSION SNAPSHOT MODAL */}
        {homeSessionModal && (
          <div
            onClick={() => setHomeSessionModal(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 10000, padding: '0' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Session</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#581c87' }}>
                    {homeSessionModal.sessionDate
                      ? new Date(homeSessionModal.sessionDate + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                      : 'Session'}
                  </div>
                </div>
                <button
                  onClick={() => setHomeSessionModal(null)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', color: '#9ca3af', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
                >×</button>
              </div>

              {homeSessionModal.discussedTopics?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Key Topics</div>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#581c87', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {homeSessionModal.discussedTopics.map((t, i) => (
                      <li key={i} style={{ fontSize: '14px', lineHeight: '1.5' }}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>What You Covered</div>
                {homeSessionModal.notes
                  ? <p style={{ fontSize: '14px', color: '#581c87', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{homeSessionModal.notes}</p>
                  : <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>—</p>
                }
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Next Steps</div>
                {homeSessionModal.nextSteps
                  ? <p style={{ fontSize: '14px', color: '#581c87', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{homeSessionModal.nextSteps}</p>
                  : <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>—</p>
                }
              </div>

              {(() => {
                const themes = (homeSessionModal.themes ?? []).filter(t => t && t !== 'Capture at least 3 thoughts to see patterns');
                const avoiding = (homeSessionModal.avoiding ?? []).filter(Boolean);
                const questions = (homeSessionModal.questions ?? []).filter(Boolean);
                if (!themes.length && !avoiding.length && !questions.length) return null;
                return (
                  <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session Summary</div>
                    {themes.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#7c3aed', marginBottom: '6px' }}>What kept coming up</div>
                        {themes.slice(0, isPaidSubscriber ? undefined : 2).map((t, i) => (
                          <div key={i} style={{ fontSize: '14px', color: '#581c87', lineHeight: '1.5', display: 'flex', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ color: '#9333ea', flexShrink: 0 }}>•</span>{t}
                          </div>
                        ))}
                      </div>
                    )}
                    {avoiding.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#7c3aed', marginBottom: '6px' }}>Worth a closer look</div>
                        {avoiding.slice(0, isPaidSubscriber ? undefined : 2).map((t, i) => (
                          <div key={i} style={{ fontSize: '14px', color: '#581c87', lineHeight: '1.5', display: 'flex', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ color: '#9333ea', flexShrink: 0 }}>•</span>{t}
                          </div>
                        ))}
                      </div>
                    )}
                    {questions.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#7c3aed', marginBottom: '6px' }}>Questions to sit with</div>
                        {questions.slice(0, isPaidSubscriber ? undefined : 2).map((t, i) => (
                          <div key={i} style={{ fontSize: '14px', color: '#581c87', lineHeight: '1.5', display: 'flex', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ color: '#9333ea', flexShrink: 0 }}>•</span>{t}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

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

        {/* PATTERNS STICKY SELECTION BAR */}
        {tab === 'sessions' && sessionView === 'prep' && selectedPatterns.length > 0 && (
          <div style={{ position: 'fixed', bottom: '68px', left: 0, right: 0, zIndex: 999, padding: '0 16px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', background: '#581c87', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(88,28,135,0.4)' }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{selectedPatterns.length} {selectedPatterns.length === 1 ? 'topic' : 'topics'} selected</span>
              <button
                onClick={() => {
                  setExtraTopics(prev => {
                    const toAdd = selectedPatterns.filter(t => !prev.includes(t));
                    return [...prev, ...toAdd];
                  });
                  setSelectedPatterns([]);
                }}
                style={{ background: '#9333ea', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Bring this up
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(147,51,234,0.2)', padding: '8px 16px 20px 16px', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', zIndex: 1000 }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-around' }}>
            {[
              { id: 'home',     label: 'Home',        Icon: Home,     active: tab === 'home',                                       action: () => { setTab('home'); setExpanded({}); } },
              { id: 'between',  label: 'Journal',     Icon: BookOpen, active: tab === 'sessions' && sessionView === 'between',      action: () => { setTab('sessions'); setSessionView('between'); setExpanded({}); } },
              { id: 'sessions', label: 'My Sessions',  Icon: Calendar, active: tab === 'sessions' && sessionView !== 'between',     action: () => { setTab('sessions'); setSessionView('prep'); setExpanded({}); } },
              { id: 'account',  label: 'You',          Icon: User,     active: tab === 'account',                                   action: () => { setTab('account'); setExpanded({}); } },
            ].map(({ id, label, Icon, active, action }) => (
              <button key={id} onClick={action} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 4px', border: 'none', cursor: 'pointer', background: 'none', color: active ? '#9333ea' : '#9ca3af' }}>
                <Icon size={22} />
                <span style={{ fontSize: '11px', fontWeight: active ? '600' : '400' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}