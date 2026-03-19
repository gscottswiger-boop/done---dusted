import { 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import React, { useState, useEffect, useRef, createContext, useContext, Component, ReactNode } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { auth, db } from './firebase';
import { userService, familyService, choreService } from './services';
import { UserProfile, Family, Chore } from './types';
import { 
  LayoutGrid, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Users, 
  LogOut, 
  Trash2, 
  Calendar as CalendarIcon,
  Shield,
  User as UserIcon,
  Home,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  List,
  Trophy,
  Award,
  Sparkles,
  UserPlus,
  X,
  Edit2,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  startOfDay,
  isBefore
} from 'date-fns';
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { ManageFamilyModal } from './components/ManageFamilyModal';
import { HabitsAnalysisModal } from './components/HabitsAnalysisModal';
import { SuggestChoreModal } from './components/SuggestChoreModal';
import { cn, getUserColor, getSafeDate } from './utils';

// --- Context ---
interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  family: Family | null;
  loading: boolean;
  dataDeleted: boolean;
  setDataDeleted: (val: boolean) => void;
  familyCreated: boolean;
  setFamilyCreated: (val: boolean) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// --- Simple Error Wrapper ---
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// --- Components ---

const Login = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-12 modern-box max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Home className="text-rose-600" size={32} />
        </div>
        <h1 className="text-3xl font-display mb-3 text-violet-950 dark:text-white">FamilyFlow</h1>
        <p className="text-zinc-500 mb-8 font-display italic text-lg">Harmonious homes, one chore at a time.</p>
        
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 transition-all active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
};

const FamilySetup = () => {
  const { user, refreshProfile, setFamilyCreated } = useApp();
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoPopup, setShowDemoPopup] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !user) return;
    setLoading(true);
    setError(null);
    try {
      await familyService.createFamily(name, user.uid);
      setFamilyCreated(true);
      await refreshProfile();
    } catch (error) {
      console.error("Error creating family:", error);
      setError("Failed to create family. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !user) return;
    setLoading(true);
    setError(null);
    try {
      const success = await familyService.joinFamily(code, user.uid);
      if (success) {
        await refreshProfile();
      } else {
        setError("Invalid invite code");
      }
    } catch (error) {
      console.error("Error joining family:", error);
      setError("Failed to join family. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <AnimatePresence mode="wait">
        {mode === 'choice' && (
          <motion.div 
            key="choice"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-10 modern-box max-w-lg w-full"
          >
            <h2 className="text-3xl font-display mb-8 text-center">Welcome, {user?.displayName?.split(' ')[0]}</h2>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => setMode('create')}
                className="group flex items-center justify-between p-6 modern-box-sm border border-zinc-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all text-left"
              >
                <div>
                  <h3 className="font-bold text-violet-950 dark:text-white text-lg">Create a Family</h3>
                  <p className="text-zinc-500">Start a new group and invite others</p>
                </div>
                <ChevronRight className="text-zinc-300 group-hover:text-rose-500 transition-colors" />
              </button>
              <button 
                onClick={() => setShowDemoPopup(true)}
                className="group flex items-center justify-between p-6 modern-box-sm border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-100/50 transition-all text-left"
              >
                <div>
                  <h3 className="font-bold text-violet-950 dark:text-white text-lg">Join a Family</h3>
                  <p className="text-zinc-500">Enter an invite code from a family member</p>
                </div>
                <ChevronRight className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div 
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-10 modern-box max-w-md w-full"
          >
            <button onClick={() => setMode('choice')} className="text-zinc-400 hover:text-zinc-600 mb-6 flex items-center gap-1 text-sm">
              ← Back
            </button>
            <h2 className="text-2xl font-display mb-6">Name your family</h2>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
            <form onSubmit={handleCreate}>
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. The Robinsons"
                className="w-full p-4 modern-input mb-6 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
              />
              <button 
                disabled={loading || !name}
                className="w-full py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 disabled:opacity-50 transition-all"
              >
                {loading ? 'Creating...' : 'Create Family'}
              </button>
            </form>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div 
            key="join"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-10 modern-box max-w-md w-full"
          >
            <button onClick={() => setMode('choice')} className="text-zinc-400 hover:text-zinc-600 mb-6 flex items-center gap-1 text-sm">
              ← Back
            </button>
            <h2 className="text-2xl font-display mb-6">Enter invite code</h2>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
            <form onSubmit={handleJoin}>
              <input 
                autoFocus
                type="text" 
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
                className="w-full p-4 modern-input mb-6 focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 outline-none transition-all text-center text-2xl font-mono tracking-widest"
              />
              <button 
                disabled={loading || code.length < 6}
                className="w-full py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 disabled:opacity-50 transition-all"
              >
                {loading ? 'Joining...' : 'Join Family'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Popup */}
      <AnimatePresence>
        {showDemoPopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-violet-600/40 backdrop-blur-sm" onClick={() => setShowDemoPopup(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative modern-box w-full max-w-md p-8 text-center max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900"
            >
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-display text-violet-950 dark:text-white mb-3">Sharing Disabled</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
                This feature has been disabled for this demo to protect user data. If you'd like to create your own version of the app and enable sharing, click the remix button!
              </p>
              <button 
                autoFocus
                onClick={() => setShowDemoPopup(false)}
                className="w-full py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20"
                title="Got it"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Dashboard = () => {
  const { profile, family, user, darkMode, setDarkMode } = useApp();
  const [chores, setChores] = useState<Chore[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [viewingChore, setViewingChore] = useState<Chore | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending'>('all');
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [showManageFamily, setShowManageFamily] = useState(false);
  const [showHabitsAnalysis, setShowHabitsAnalysis] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showDemoPopup, setShowDemoPopup] = useState(false);

  useEffect(() => {
    if (!family) return;
    const unsubscribeChores = choreService.subscribeToChores(family.id, setChores);
    
    // Subscribe to members
    const q = query(collection(db, 'users'), where('familyId', '==', family.id));
    const unsubscribeMembers = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubscribeChores();
      unsubscribeMembers();
    };
  }, [family]);

  const filteredChores = chores.filter(c => {
    if (filter === 'mine') return c.assignedTo === user?.uid;
    if (filter === 'pending') return c.status === 'pending';
    return true;
  }).sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'pending' ? -1 : 1;
  });

  const stats = {
    pending: chores.filter(c => c.status === 'pending').length,
    completed: chores.filter(c => c.status === 'done').length,
    myTasks: chores.filter(c => c.assignedTo === user?.uid && c.status === 'pending').length
  };

  const startOfMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  const leaderboardData = members.map(member => {
    const weeklyPoints = chores
      .filter(c => 
        c.assignedTo === member.uid && 
        c.status === 'done' && 
        c.completedAt && 
        c.completedAt && getSafeDate(c.completedAt) >= startOfMonday
      )
      .reduce((sum, c) => sum + (c.points || 0), 0);
    
    return {
      ...member,
      weeklyPoints
    };
  }).sort((a, b) => b.weeklyPoints - a.weeklyPoints);

  const handleAddChore = () => {
    setEditingChore(null);
    setShowModal(true);
  };

  const handleEditChore = (chore: Chore) => {
    if (profile?.role !== 'organizer') return;
    setEditingChore(chore);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-transparent pb-20">
      {/* Header */}
      <header className="bg-[#fdfbf7]/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-slate-800 px-6 py-8 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display text-violet-950 dark:text-white">{family?.name}</h1>
              <button 
                onClick={() => setShowManageFamily(true)}
                className="p-1.5 bg-white dark:bg-slate-800 text-zinc-400 hover:text-violet-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-slate-700 rounded-full transition-all shadow-sm border border-zinc-100 dark:border-slate-700"
                title="Manage Family"
              >
                <Shield size={18} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button 
                onClick={() => setShowDemoPopup(true)}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-2 py-1 rounded-full border border-rose-200 dark:border-rose-900/50 transition-colors"
              >
                <UserPlus size={12} />
                Invite Member
              </button>
              <span className={cn(
                "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full",
                profile?.role === 'organizer' 
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" 
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
              )}>
                {profile?.role}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white dark:bg-slate-800 text-zinc-400 hover:text-violet-950 dark:hover:text-white rounded-full transition-all shadow-sm border border-zinc-100 dark:border-slate-700"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex bg-zinc-100 dark:bg-slate-800 p-1 rounded-full border border-zinc-200 dark:border-slate-700">
              <button 
                onClick={() => setView('list')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  view === 'list' ? "shadow-sm text-violet-950 dark:text-white bg-white dark:bg-slate-700" : "text-zinc-400 hover:text-zinc-600"
                )}
                title="List View"
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setView('calendar')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  view === 'calendar' ? "shadow-sm text-violet-950 dark:text-white bg-white dark:bg-slate-700" : "text-zinc-400 hover:text-zinc-600"
                )}
                title="Calendar View"
              >
                <CalendarIcon size={18} />
              </button>
            </div>
            <button 
              onClick={() => setShowHabitsAnalysis(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 modern-btn text-xs font-bold tracking-wide hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
              title="Analyze Habits"
            >
              <Sparkles size={14} />
              Analyze Habits
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => signOut(auth)}
                className="p-2 bg-white dark:bg-slate-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-700 rounded-full transition-all shadow-sm border border-zinc-100 dark:border-slate-700"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
              <img src={user?.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" alt="Profile" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Chores Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'mine', 'pending'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 modern-btn text-sm font-medium transition-all capitalize",
                  filter === f ? "bg-violet-600 text-white" : "bg-white dark:bg-slate-800 text-zinc-500 dark:text-zinc-400 hover:text-violet-950 dark:hover:text-white border border-transparent dark:border-slate-700"
                )}
                title={`Filter by ${f}`}
              >
                {f}
              </button>
            ))}
          </div>
          {profile?.role === 'organizer' && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <button 
                onClick={() => setShowSuggestModal(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 modern-btn font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-95"
                title="Get AI chore suggestions"
              >
                <Sparkles size={18} />
                Suggest chore
              </button>
              <button 
                onClick={handleAddChore}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white modern-btn font-medium hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                title="Create a new chore"
              >
                <Plus size={20} />
                Add Chore
              </button>
            </div>
          )}
        </div>

        {view === 'list' ? (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredChores.map(chore => (
                <ChoreCard 
                  key={chore.id} 
                  chore={chore} 
                  members={members} 
                  isOrganizer={profile?.role === 'organizer'} 
                  onEdit={() => handleEditChore(chore)}
                />
              ))}
            </AnimatePresence>
            {filteredChores.length === 0 && (
              <div className="text-center py-20 modern-box">
                <CheckCircle2 className="mx-auto text-zinc-300 mb-4" size={48} />
                <p className="text-zinc-500 font-display italic text-lg">All caught up! No chores found.</p>
              </div>
            )}
          </div>
        ) : (
          <CalendarView 
            chores={filteredChores} 
            members={members} 
            onEditChore={handleEditChore} 
            onViewChore={setViewingChore}
          />
        )}

      {/* Weekly Leaderboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 md:p-8 modern-box mt-16"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-500" size={24} />
              <h2 className="text-2xl font-display text-violet-950 dark:text-white">Weekly Leaderboard</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowHabitsAnalysis(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 modern-btn text-sm font-bold tracking-wide hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                title="Analyze Habits"
              >
                <Sparkles size={16} />
                Analyze Habits
              </button>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-zinc-100 dark:border-slate-700">
                Resets Monday
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {leaderboardData.map((member, index) => (
              <div 
                key={member.uid}
                className={cn(
                  "flex items-center justify-between p-4 modern-box-sm border transition-all",
                  index === 0 ? "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30" : "border-zinc-100 dark:border-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                    index === 0 ? "bg-amber-200 text-amber-700" : "bg-zinc-200 dark:bg-slate-700 text-zinc-600 dark:text-zinc-400"
                  )}>
                    {index + 1}
                  </div>
                  <img src={member.photoURL} className={cn("w-10 h-10 rounded-full border-2 shadow-sm shrink-0", getUserColor(member.uid).split(' ')[2])} alt={member.displayName} />
                  <div>
                    <p className="font-medium text-violet-950 dark:text-white">{member.displayName}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right mr-2">
                    <p className="text-xl font-display text-violet-950 dark:text-white">{member.weeklyPoints}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Points</p>
                  </div>
                  {index === 0 && member.weeklyPoints > 0 && (
                    <Award className="text-amber-500" size={20} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Chore Detail Modal */}
      <AnimatePresence>
        {viewingChore && (
          <ChoreDetailModal
            chore={viewingChore}
            members={members}
            onClose={() => setViewingChore(null)}
            onEdit={() => {
              setEditingChore(viewingChore);
              setViewingChore(null);
              setShowModal(true);
            }}
            isOrganizer={profile?.role === 'organizer'}
          />
        )}
      </AnimatePresence>

      {/* Chore Modal */}
      <AnimatePresence>
        {showModal && (
          <ChoreModal 
            onClose={() => setShowModal(false)} 
            familyId={family?.id || ''} 
            members={members}
            initialChore={editingChore}
          />
        )}
      </AnimatePresence>
      {/* Manage Family Modal */}
      <AnimatePresence>
        {showManageFamily && family && user && (
          <ManageFamilyModal 
            family={family} 
            members={members} 
            onClose={() => setShowManageFamily(false)} 
            currentUserId={user.uid}
          />
        )}
      </AnimatePresence>
      {/* Habits Analysis Modal */}
      <AnimatePresence>
        {showHabitsAnalysis && family && (
          <HabitsAnalysisModal
            onClose={() => setShowHabitsAnalysis(false)}
            chores={chores}
            members={members}
            family={family}
          />
        )}
      </AnimatePresence>
      {/* Suggest Chore Modal */}
      <AnimatePresence>
        {showSuggestModal && family && user && (
          <SuggestChoreModal
            onClose={() => setShowSuggestModal(false)}
            chores={chores}
            family={family}
            userUid={user.uid}
          />
        )}
      </AnimatePresence>
      {/* Demo Popup */}
      <AnimatePresence>
        {showDemoPopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-violet-600/40 backdrop-blur-sm" onClick={() => setShowDemoPopup(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative modern-box w-full max-w-md p-8 text-center max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900"
            >
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-display text-violet-950 dark:text-white mb-3">Sharing Disabled</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
                This feature has been disabled for this demo to protect user data. If you'd like to create your own version of the app and enable sharing, click the remix button!
              </p>
              <button 
                autoFocus
                onClick={() => setShowDemoPopup(false)}
                className="w-full py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20"
                title="Got it"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomSelect = ({ value, options, onChange, className }: { value: any, options: { label: string, value: any }[], onChange: (val: any) => void, className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between gap-2 p-1 sm:p-2 text-xs sm:text-lg font-display text-violet-950 dark:text-white bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 transition-all",
          className
        )}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown size={14} className={cn("transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-[70] top-full left-0 mt-1 min-w-[140px] bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs sm:text-sm rounded-md transition-colors",
                    opt.value === value 
                      ? "bg-violet-600 text-white" 
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CalendarView = ({ chores, members, onEditChore, onViewChore }: { chores: Chore[], members: UserProfile[], onEditChore: (chore: Chore) => void, onViewChore: (chore: Chore) => void }) => {
  const { user } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getChoresForDay = (day: Date) => {
    const dayChoresMap = new Map<string, Chore & { isProjected?: boolean }>();
    
    // 1. Process real chores first
    chores.forEach(chore => {
      if (!chore.dueDate || !isSameDay(getSafeDate(chore.dueDate), day)) return;
      
      const seriesId = chore.originalChoreId || chore.id;
      const existing = dayChoresMap.get(seriesId);
      
      // If we already have a chore for this series on this day:
      // - Prefer "Done" over "Pending"
      // - Prefer "Instance" (has originalChoreId) over "Template" (is originalChoreId)
      if (!existing || 
          (existing.status === 'pending' && chore.status === 'done') || 
          (!existing.originalChoreId && chore.originalChoreId)) {
        dayChoresMap.set(seriesId, chore);
      }
    });
    
    // 2. Process projections
    chores.forEach(chore => {
      if (chore.status === 'pending' && chore.isRecurring && chore.recurrence && chore.recurrence !== 'none' && chore.dueDate) {
        const choreDate = getSafeDate(chore.dueDate);
        const choreEndDate = chore.endDate ? getSafeDate(chore.endDate) : undefined;
        
        // Only project if the template's current dueDate is BEFORE the day we are looking at
        if (choreDate < startOfDay(day)) {
          if (choreEndDate && day > choreEndDate) return;

          let nextDate = new Date(choreDate);
          const interval = chore.recurrenceInterval || 1;
          while (nextDate <= day) {
            if (chore.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + interval);
            else if (chore.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + (7 * interval));
            else if (chore.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + interval);
            else break;
            
            if (isSameDay(nextDate, day)) {
              const seriesId = chore.id;
              // Only add projection if there isn't already a real chore for this series today
              if (!dayChoresMap.has(seriesId)) {
                dayChoresMap.set(seriesId, { 
                  ...chore, 
                  id: `${chore.id}-projected-${nextDate.getTime()}`, 
                  dueDate: Timestamp.fromDate(new Date(nextDate)), 
                  isProjected: true 
                });
              }
              break;
            }
          }
        }
      }
    });
    
    // 3. Final cleanup: if a series is "Done" today, don't show any "Pending" for it
    const result = Array.from(dayChoresMap.values());
    const doneSeriesIds = new Set(result.filter(c => c.status === 'done').map(c => c.originalChoreId || c.id));
    
    return result.filter(chore => {
      const seriesId = chore.originalChoreId || chore.id;
      if (chore.status === 'pending' && doneSeriesIds.has(seriesId)) {
        return false;
      }
      return true;
    });
  };

  const handleToggle = async (e: React.MouseEvent, chore: Chore) => {
    e.stopPropagation();
    if (!user) return;
    const newStatus = chore.status === 'done' ? 'pending' : 'done';
    await choreService.toggleChoreStatus(chore.id, newStatus, user.uid);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="modern-box bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800"
    >
      <div className="relative z-20 p-2 sm:p-6 md:p-8 border-b border-zinc-100 dark:border-slate-800 flex flex-row flex-wrap items-center justify-between gap-1 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-4">
          <div className="flex gap-1 sm:gap-2">
            <CustomSelect 
              value={currentDate.getMonth()}
              onChange={(val) => {
                const newDate = new Date(currentDate);
                newDate.setMonth(val);
                setCurrentDate(newDate);
              }}
              options={Array.from({ length: 12 }).map((_, i) => ({
                label: format(new Date(2000, i, 1), 'MMMM'),
                value: i
              }))}
            />
            <CustomSelect 
              value={currentDate.getFullYear()}
              onChange={(val) => {
                const newDate = new Date(currentDate);
                newDate.setFullYear(val);
                setCurrentDate(newDate);
              }}
              options={Array.from({ length: 10 }).map((_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return { label: year.toString(), value: year };
              })}
            />
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setCurrentDate(subMonths(currentDate, 1));
              }
            }}
            className="p-1 sm:p-2 hover:bg-zinc-50 dark:hover:bg-slate-800 rounded-full transition-all text-zinc-400 hover:text-violet-950 dark:hover:text-white focus:ring-2 focus:ring-violet-500 outline-none"
            title="Previous Month"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setCurrentDate(new Date());
              }
            }}
            className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all focus:ring-2 focus:ring-violet-500 outline-none"
          >
            Today
          </button>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setCurrentDate(addMonths(currentDate, 1));
              }
            }}
            className="p-1 sm:p-2 hover:bg-zinc-50 dark:hover:bg-slate-800 rounded-full transition-all text-zinc-400 hover:text-violet-950 dark:hover:text-white focus:ring-2 focus:ring-violet-500 outline-none"
            title="Next Month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-slate-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayChores = getChoresForDay(day);
              const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);
              
              return (
                <div 
                  key={i} 
                  className={cn(
                    "min-h-[140px] p-3 border-r border-b border-zinc-50 dark:border-slate-800/50 last:border-r-0",
                    !isCurrentMonth && "bg-zinc-50/50 dark:bg-slate-900/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      isToday(day) ? "bg-violet-600 text-white" : "text-zinc-400 dark:text-zinc-500",
                      !isCurrentMonth && "opacity-30"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                    {dayChores.map(chore => {
                      const assigned = members.find(m => m.uid === chore.assignedTo);
                      const isDone = chore.status === 'done';
                      const userColorClass = getUserColor(chore.assignedTo);
                      const choreColor = chore.color;
                      
                      return (
                        <div 
                          key={chore.id}
                          onClick={() => onViewChore(chore)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onViewChore(chore);
                            }
                          }}
                          className={cn(
                            "text-[10px] p-1.5 rounded-md shadow-sm border truncate cursor-pointer transition-all flex items-center gap-1 focus:ring-2 focus:ring-violet-500 outline-none",
                            isDone 
                              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 opacity-60" 
                              : "bg-white dark:bg-slate-800 border-zinc-100 dark:border-slate-700 text-violet-950 dark:text-zinc-300 hover:border-violet-200 dark:hover:border-violet-800"
                          )}
                          style={!isDone && choreColor ? { borderLeft: `3px solid ${choreColor}` } : {}}
                          title={`${chore.title}${assigned ? ` - ${assigned.displayName}` : ''}`}
                        >
                          <button 
                            onClick={(e) => handleToggle(e, chore)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className={cn(
                              "flex-shrink-0 transition-colors focus:ring-2 focus:ring-violet-500 outline-none rounded-full",
                              isDone ? "text-rose-500" : "opacity-50 hover:opacity-100"
                            )}
                            title={isDone ? "Mark Pending" : "Mark Complete"}
                          >
                            {isDone ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                          </button>
                          <span className="truncate">
                            {assigned && <span className="font-bold mr-1">{assigned.displayName?.split(' ')[0]}:</span>}
                            {chore.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ChoreDetailModal = ({ chore, members, onClose, onEdit, isOrganizer }: { chore: Chore, members: UserProfile[], onClose: () => void, onEdit: () => void, isOrganizer: boolean }) => {
  const { user } = useApp();
  const assignedUser = members.find(m => m.uid === chore.assignedTo);
  const isDone = chore.status === 'done';
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleToggle = async () => {
    if (!user) return;
    setLoading(true);
    const newStatus = isDone ? 'pending' : 'done';
    await choreService.toggleChoreStatus(chore.id, newStatus, user.uid);
    setLoading(false);
    onClose();
  };

  const handleClaim = async () => {
    if (!user) return;
    setLoading(true);
    await choreService.claimChore(chore.id, user.uid);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-violet-600/40 backdrop-blur-sm"
      />
      <motion.div 
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md modern-box overflow-hidden bg-white dark:bg-slate-900 flex flex-col max-h-[90vh] outline-none"
      >
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-display text-violet-950 dark:text-white truncate">{chore.title}</h2>
                {chore.isRecurring && <RefreshCw size={16} className="text-rose-500 shrink-0" />}
              </div>
              {chore.description && (
                <p className="text-zinc-500 dark:text-zinc-400 font-serif italic">{chore.description}</p>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-slate-800 rounded-full transition-all shrink-0"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-slate-800/50 rounded-2xl border border-zinc-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", isDone ? "bg-emerald-500" : "bg-amber-500")} />
                  <span className="text-sm font-medium capitalize dark:text-zinc-300">{chore.status}</span>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-slate-800/50 rounded-2xl border border-zinc-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Points</p>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">+{chore.points || 0} pts</p>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-slate-800/50 rounded-2xl border border-zinc-100 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Assigned To</p>
              {assignedUser ? (
                <div className="flex items-center gap-3">
                  <img src={assignedUser.photoURL} className={cn("w-8 h-8 rounded-full border-2", getUserColor(assignedUser.uid).split(' ')[2])} alt={assignedUser.displayName} />
                  <span className="text-sm font-medium dark:text-zinc-300">{assignedUser.displayName}</span>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 italic">Unassigned</p>
              )}
            </div>

            {chore.dueDate && (
              <div className="p-4 bg-zinc-50 dark:bg-slate-800/50 rounded-2xl border border-zinc-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Due Date</p>
                <div className="flex items-center gap-2 text-sm font-medium dark:text-zinc-300">
                  <CalendarIcon size={14} className="text-zinc-400" />
                  {format(getSafeDate(chore.dueDate), 'MMMM d, yyyy')}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {!isDone && (
              <button
                onClick={handleToggle}
                disabled={loading}
                className="w-full py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
                title="Mark as Complete"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Mark as Complete
              </button>
            )}
            
            {isDone && (
              <button
                onClick={handleToggle}
                disabled={loading}
                className="w-full py-4 bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-zinc-400 modern-btn font-medium hover:bg-zinc-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                title="Mark as Pending"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                Mark as Pending
              </button>
            )}

            {!assignedUser && !isDone && (
              <button
                onClick={handleClaim}
                disabled={loading}
                className="w-full py-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 modern-btn font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all flex items-center justify-center gap-2"
                title="Claim Chore"
              >
                <UserPlus size={20} />
                Claim Chore
              </button>
            )}

            {isOrganizer && (
              <button
                onClick={onEdit}
                className="w-full py-4 bg-white dark:bg-slate-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-slate-700 modern-btn font-medium hover:bg-zinc-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                title="Edit Chore"
              >
                <Edit2 size={20} />
                Edit Chore
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ChoreCard = ({ chore, members, isOrganizer, key, onEdit }: { chore: Chore, members: UserProfile[], isOrganizer: boolean, key?: string, onEdit: () => void }) => {
  const { user } = useApp();
  const assignedUser = members.find(m => m.uid === chore.assignedTo);
  const isDone = chore.status === 'done';

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newStatus = isDone ? 'pending' : 'done';
    await choreService.toggleChoreStatus(chore.id, newStatus, user.uid);
  };

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await choreService.claimChore(chore.id, user.uid);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await choreService.deleteChore(chore.id);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onEdit}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
      className={cn(
        "group p-6 modern-box transition-all flex flex-col sm:flex-row sm:items-center gap-6 cursor-pointer hover:shadow-2xl hover:shadow-violet-600/5 focus:ring-2 focus:ring-violet-500 outline-none",
        isDone && "opacity-70"
      )}
      style={!isDone && chore.color ? { borderLeft: `4px solid ${chore.color}` } : {}}
    >
      <button 
        onClick={handleToggle}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
          isDone ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 dark:bg-slate-800 text-zinc-400 hover:bg-violet-100 hover:text-violet-600"
        )}
        title={isDone ? "Mark Pending" : "Mark Complete"}
      >
        {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={cn("text-xl font-bold text-violet-950 dark:text-white truncate", isDone && "line-through text-zinc-400")}>
            {chore.title}
          </h3>
          {chore.isRecurring && <RefreshCw size={14} className="text-rose-500" />}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          {chore.dueDate && (
            <div className={cn(
              "flex items-center gap-1",
              !isDone && isBefore(getSafeDate(chore.dueDate), startOfDay(new Date())) ? "text-red-500 font-bold" : "text-zinc-500"
            )}>
              <CalendarIcon size={12} />
              {format(getSafeDate(chore.dueDate), 'MMM d')}
              {chore.endDate && (
                <>
                  <span className="mx-1">-</span>
                  {format(getSafeDate(chore.endDate), 'MMM d')}
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
            <Trophy size={12} />
            {chore.points} pts
          </div>
          {chore.recurrence && chore.recurrence !== 'none' && (
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
              {chore.recurrenceInterval && chore.recurrenceInterval > 1 
                ? `Every ${chore.recurrenceInterval} ${chore.recurrence === 'daily' ? 'days' : chore.recurrence === 'weekly' ? 'weeks' : 'months'}`
                : chore.recurrence}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
        {assignedUser ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            onKeyDown={(e) => e.stopPropagation()}
            className="flex items-center gap-2 bg-zinc-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-zinc-100 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-700 transition-all focus:ring-2 focus:ring-violet-500 outline-none"
            title={`Assigned to ${assignedUser.displayName} - Click to edit`}
          >
            <img src={assignedUser.photoURL} className={cn("w-6 h-6 rounded-full border shadow-sm", getUserColor(assignedUser.uid).split(' ')[2])} alt={assignedUser.displayName} />
            <span className="text-xs font-medium text-violet-950 dark:text-zinc-300">{assignedUser.displayName?.split(' ')[0]}</span>
          </button>
        ) : (
          <button 
            onClick={handleClaim}
            onKeyDown={(e) => e.stopPropagation()}
            className="text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-full border border-rose-100 dark:border-rose-900/30 transition-all focus:ring-2 focus:ring-rose-500 outline-none"
            title="Claim this chore"
          >
            Claim
          </button>
        )}

        {isOrganizer && (
          <button 
            onClick={handleDelete}
            onKeyDown={(e) => e.stopPropagation()}
            className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 group-focus:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-red-500 outline-none"
            title="Delete Chore"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

const ChoreModal = ({ onClose, familyId, members, initialChore }: { onClose: () => void, familyId: string, members: UserProfile[], initialChore?: Chore | null }) => {
  const { user } = useApp();
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  const [title, setTitle] = useState(initialChore?.title || '');
  const [description, setDescription] = useState(initialChore?.description || '');
  const [assignedTo, setAssignedTo] = useState(initialChore?.assignedTo || '');
  const [points, setPoints] = useState(initialChore?.points?.toString() || '5');
  const [dueDate, setDueDate] = useState(initialChore?.dueDate ? format(getSafeDate(initialChore.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(initialChore?.endDate ? format(getSafeDate(initialChore.endDate), 'yyyy-MM-dd') : '');
  const [color, setColor] = useState(initialChore?.color || '#6366f1');
  const [isRecurring, setIsRecurring] = useState(initialChore?.isRecurring || false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(initialChore?.recurrence || 'none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(initialChore?.recurrenceInterval || 1);
  const [updateMode, setUpdateMode] = useState<'single' | 'series'>('series');
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !user) return;
    if (isRecurring && recurrence === 'none') {
      setError("Please select a recurrence frequency (Daily, Weekly, or Monthly).");
      return;
    }
    setError(null);
    setLoading(true);
    
    const choreData = {
      familyId,
      title,
      description,
      assignedTo: assignedTo || null,
      status: initialChore?.status || 'pending',
      points: parseInt(points) || 0,
      createdBy: initialChore?.createdBy || user.uid,
      dueDate: Timestamp.fromDate(new Date(dueDate + 'T00:00:00')),
      endDate: (isRecurring && endDate) ? Timestamp.fromDate(new Date(endDate + 'T00:00:00')) : null,
      isRecurring,
      recurrence: isRecurring ? recurrence : 'none',
      recurrenceInterval: isRecurring ? recurrenceInterval : 1,
      color: color || null
    };

    if (initialChore) {
      await choreService.updateChore(initialChore.id, choreData, updateMode);
    } else {
      await choreService.addChore(choreData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-violet-600/40 backdrop-blur-sm"
      />
      <motion.div 
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg modern-box overflow-hidden outline-none"
      >
        <div className="p-8 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-display mb-8">{initialChore ? 'Edit chore' : 'Create new chore'}</h2>
          {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Chore Title</label>
              <input 
                autoFocus
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Empty the dishwasher"
                className="w-full p-4 modern-input focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Assign To</label>
                <select 
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-full p-4 modern-input focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all appearance-none"
                >
                  <option value="">Anyone</option>
                  {members.map(m => (
                    <option key={m.uid} value={m.uid}>{m.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Points</label>
                <input 
                  type="number" 
                  value={points}
                  onChange={e => setPoints(e.target.value)}
                  className="w-full p-4 modern-input focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className={cn("grid gap-4", isRecurring ? "grid-cols-2" : "grid-cols-1")}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                  {isRecurring ? "Start Date" : "Due Date"}
                </label>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full p-4 modern-input focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                />
              </div>
              {isRecurring && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">End Date (Optional)</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full p-4 modern-input focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Chore Color</label>
              <div className="flex flex-wrap gap-2">
                {['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      color === c ? "border-zinc-900 dark:border-white scale-110 shadow-md" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="p-6 modern-box-sm border border-zinc-100">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-zinc-700">Recurring Chore</label>
                <button 
                  type="button"
                  onClick={() => {
                    setIsRecurring(!isRecurring);
                    if (!isRecurring && recurrence === 'none') {
                      setRecurrence('daily');
                    }
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    isRecurring ? "bg-rose-500" : "bg-zinc-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full transition-all",
                    isRecurring ? "left-7 bg-white" : "left-1 bg-zinc-500"
                  )} />
                </button>
              </div>
              
              <AnimatePresence>
                {isRecurring && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Frequency</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-500">Every</span>
                        <div className="flex items-center border border-zinc-200 modern-box-sm overflow-hidden">
                          <button 
                            type="button"
                            onClick={() => setRecurrenceInterval(Math.max(1, recurrenceInterval - 1))}
                            className="px-3 py-1 hover:bg-zinc-50 text-zinc-600 border-r border-zinc-200"
                          >
                            -
                          </button>
                          <span className="px-4 py-1 text-sm font-bold min-w-[40px] text-center">{recurrenceInterval}</span>
                          <button 
                            type="button"
                            onClick={() => setRecurrenceInterval(recurrenceInterval + 1)}
                            className="px-3 py-1 hover:bg-zinc-50 text-zinc-600 border-l border-zinc-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['daily', 'weekly', 'monthly'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRecurrence(r)}
                          className={cn(
                            "py-2 modern-btn text-xs font-bold border transition-all capitalize",
                            recurrence === r 
                              ? "bg-violet-600 border-zinc-900 dark:border-violet-500 text-white" 
                              : "border-zinc-200 dark:border-slate-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-slate-600"
                          )}
                        >
                          {r === 'daily' ? 'Days' : r === 'weekly' ? 'Weeks' : 'Months'}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {initialChore && (initialChore.isRecurring || initialChore.isProjected) && (
              <div className="p-4 modern-box-sm border border-zinc-200">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Update Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdateMode('single')}
                    className={cn(
                      "flex-1 py-2 px-3 modern-btn text-xs font-bold border transition-all",
                      updateMode === 'single' 
                        ? "bg-violet-600 border-zinc-900 dark:border-violet-500 text-white" 
                        : "border-zinc-200 dark:border-slate-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-slate-600"
                    )}
                  >
                    This occurrence only
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('series')}
                    className={cn(
                      "flex-1 py-2 px-3 modern-btn text-xs font-bold border transition-all",
                      updateMode === 'series' 
                        ? "bg-violet-600 border-zinc-900 dark:border-violet-500 text-white" 
                        : "border-zinc-200 dark:border-slate-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-slate-600"
                    )}
                  >
                    Entire series
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {initialChore && (
                <button 
                  type="button"
                  onClick={async () => {
                    await choreService.deleteChore(initialChore.id);
                    onClose();
                  }}
                  className="p-4 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-all"
                  title="Delete Chore"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-zinc-100 text-zinc-600 modern-btn font-medium hover:bg-zinc-200 transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={loading || !title}
                className="flex-[2] py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 disabled:opacity-50 transition-all shadow-lg shadow-violet-600/30"
              >
                {loading ? (initialChore ? 'Saving...' : 'Creating...') : (initialChore ? 'Save Changes' : 'Create Chore')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App Logic ---

const AppContent = () => {
  const { user, profile, loading, dataDeleted, setDataDeleted, familyCreated, setFamilyCreated } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full"
        />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {dataDeleted && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-violet-600/40 backdrop-blur-sm" onClick={() => setDataDeleted(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative modern-box w-full max-w-md p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-display text-violet-950 dark:text-white mb-3">Data Reset</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-8 leading-relaxed">
                Your data has been deleted because it was older than 24 hours. This is a demo app. If you'd like your data to persist, please remix the app to create your own version!
              </p>
              <button 
                autoFocus
                onClick={() => setDataDeleted(false)}
                className="w-full py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 transition-all"
              >
                I understand
              </button>
            </motion.div>
          </div>
        )}
        {familyCreated && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-violet-600/40 backdrop-blur-sm" onClick={() => setFamilyCreated(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative modern-box w-full max-w-md p-8 text-center"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles size={32} />
              </div>
              <h3 className="text-2xl font-display text-violet-950 dark:text-white mb-3">Welcome to the Demo!</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-8 leading-relaxed">
                This is just a demo and your data will be deleted after 24 hours. If you'd like to create your own version of the app and keep your data, please remix the app!
              </p>
              <button 
                autoFocus
                onClick={() => setFamilyCreated(false)}
                className="w-full py-4 bg-violet-600 text-white modern-btn font-medium hover:bg-violet-700 transition-all"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!user ? <Login /> : !profile?.familyId ? <FamilySetup /> : <Dashboard />}
    </>
  );
};

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataDeleted, setDataDeleted] = useState(false);
  const [familyCreated, setFamilyCreated] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    const p = await userService.getProfile(auth.currentUser.uid);
    setProfile(p);
    if (p?.familyId) {
      const f = await familyService.getFamily(p.familyId);
      setFamily(f);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          let p = await userService.getProfile(u.uid);
          
          // Check if data is older than 24 hours
          if (p) {
            let shouldDelete = false;
            if (p.createdAt) {
              const createdAt = getSafeDate(p.createdAt);
              const now = new Date();
              const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
              if (hoursDiff >= 24) shouldDelete = true;
            } else {
              // If createdAt is missing, it's an old account from before the timestamp was added
              shouldDelete = true;
            }
            
            if (shouldDelete) {
              await userService.deleteUserData(u.uid, p.familyId);
              p = null; // Force recreation
              setDataDeleted(true);
            }
          }

          if (!p) {
            // New user
            p = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'Anonymous',
              role: 'contributor', // Default
              photoURL: u.photoURL || ''
            };
            await userService.createProfile(p);
          }
          setProfile(p);
          if (p.familyId) {
            const f = await familyService.getFamily(p.familyId);
            setFamily(f);
          }
        } else {
          setProfile(null);
          setFamily(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ user, profile, family, loading, dataDeleted, setDataDeleted, familyCreated, setFamilyCreated, darkMode, setDarkMode, refreshProfile }}>
      {children}
    </AppContext.Provider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
