import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Chore, UserProfile, Family } from '../types';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface HabitsAnalysisModalProps {
  onClose: () => void;
  chores: Chore[];
  members: UserProfile[];
  family: Family;
}

export const HabitsAnalysisModal = ({ onClose, chores, members, family }: HabitsAnalysisModalProps) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const analyzeHabits = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Prepare data for analysis
        const data = {
          currentDate: new Date().toISOString(),
          family: family.name,
          members: members.map(m => ({ id: m.uid, name: m.displayName, role: m.role })),
          chores: chores.map(c => ({
            title: c.title,
            assignedTo: members.find(m => m.uid === c.assignedTo)?.displayName || 'Unassigned',
            status: c.status,
            points: c.points,
            dueDate: c.dueDate ? c.dueDate.toDate().toISOString() : null,
            completedAt: c.completedAt ? c.completedAt.toDate().toISOString() : null,
            isRecurring: c.isRecurring,
            recurrence: c.recurrence
          }))
        };

        const prompt = `
          You are an expert family dynamics coach and productivity consultant.
          Analyze the following family chore data and provide deep insights and actionable suggestions.
          
          Current Date: ${data.currentDate}

          Please look at:
          1. **Weekly Leaderboard & Contribution**: Who is doing the most? Is the load balanced?
          2. **Punctuality & Reliability**: When are chores being checked off? Are they on time, late, or early?
          3. **Scheduling Trends**: Who is consistently ahead of schedule? Who is falling behind?
          4. **Task Complexity**: Are the point values (weights) fair for the effort required?

          Provide specific, constructive suggestions for:
          - **Rebalancing**: How to redistribute tasks if one person is overloaded.
          - **Weighting**: Suggesting point adjustments for tasks that seem undervalued or overvalued.
          - **Reminders & Motivation**: Specific advice for family members who might need a nudge or a different approach.
          - **Process Improvement**: Any general tips for making the family's chore system smoother.

          Format the output in beautiful Markdown with clear headings (H2, H3), bold text for emphasis, and bullet points.
          Maintain a warm, encouraging, and helpful tone.
          
          Data:
          ${JSON.stringify(data, null, 2)}
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });

        setAnalysis(response.text);
      } catch (err) {
        console.error("Error analyzing habits:", err);
        setError("Failed to analyze habits. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    analyzeHabits();
  }, [chores, members, family]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
      />
      <motion.div 
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative modern-box w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 outline-none"
      >
        <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <h2 className="text-2xl font-display text-zinc-900 dark:text-white">Family Habits Analysis</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-full transition-all"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
              <Loader2 className="animate-spin mb-4 text-emerald-500" size={32} />
              <p className="font-hand italic text-lg">Analyzing family habits...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>{error}</p>
            </div>
          ) : (
            <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-hand prose-h3:text-xl prose-p:text-zinc-600 dark:prose-p:text-zinc-300">
              <ReactMarkdown>{analysis || ''}</ReactMarkdown>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
