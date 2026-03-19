import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Loader2, Check, RefreshCw, Plus, Edit2 } from 'lucide-react';
import { Chore, UserProfile, Family } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import { choreService } from '../services';
import { Timestamp } from 'firebase/firestore';

interface SuggestChoreModalProps {
  onClose: () => void;
  chores: Chore[];
  family: Family;
  userUid: string;
}

interface SuggestedChore {
  title: string;
  description: string;
  points: number;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'none';
  recurrenceInterval: number;
}

export const SuggestChoreModal = ({ onClose, chores, family, userUid }: SuggestChoreModalProps) => {
  const [suggestions, setSuggestions] = useState<SuggestedChore[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SuggestedChore | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const getSuggestions = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const existingChoreTitles = chores.map(c => c.title);

        const prompt = `
          You are a helpful assistant for a family chore tracking app.
          The family currently has the following chores:
          ${existingChoreTitles.length > 0 ? existingChoreTitles.join(', ') : 'None'}

          Suggest 5 new, common household chores that are NOT in the list above.
          For example, if they don't have "Dusting", suggest it.
          Provide a title, a short description, a suggested point value (1-20), and a suggested recurrence (daily, weekly, monthly, or none) and interval (e.g., 1 for every week).
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "The title of the chore" },
                  description: { type: Type.STRING, description: "A short description of the chore" },
                  points: { type: Type.INTEGER, description: "Suggested point value (1-20)" },
                  recurrence: { type: Type.STRING, description: "One of: daily, weekly, monthly, none" },
                  recurrenceInterval: { type: Type.INTEGER, description: "The interval for the recurrence (e.g., 1)" }
                },
                required: ["title", "description", "points", "recurrence", "recurrenceInterval"]
              }
            }
          }
        });

        const jsonStr = response.text.trim();
        const parsedSuggestions = JSON.parse(jsonStr) as SuggestedChore[];
        setSuggestions(parsedSuggestions);
      } catch (err) {
        console.error("Error getting suggestions:", err);
        setError("Failed to get suggestions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    getSuggestions();
  }, [chores]);

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const handleEdit = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditForm({ ...suggestions[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editForm) {
      const newSuggestions = [...suggestions];
      newSuggestions[editingIndex] = editForm;
      setSuggestions(newSuggestions);
      setEditingIndex(null);
      setEditForm(null);
      
      // Auto-select if edited
      const newSelection = new Set(selectedIndices);
      newSelection.add(editingIndex);
      setSelectedIndices(newSelection);
    }
  };

  const handleAddSelected = async () => {
    if (selectedIndices.size === 0) return;
    setSaving(true);
    
    try {
      const selectedChores = Array.from(selectedIndices).map(index => suggestions[index]);
      
      for (const chore of selectedChores) {
        await choreService.addChore({
          familyId: family.id,
          title: chore.title,
          description: chore.description,
          assignedTo: null,
          status: 'pending',
          points: chore.points,
          createdBy: userUid,
          dueDate: Timestamp.fromDate(new Date(new Date().setHours(0,0,0,0))),
          isRecurring: chore.recurrence !== 'none',
          recurrence: chore.recurrence,
          recurrenceInterval: chore.recurrenceInterval
        });
      }
      
      onClose();
    } catch (err) {
      console.error("Error adding chores:", err);
      setError("Failed to add chores. Please try again.");
      setSaving(false);
    }
  };

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
            <h2 className="text-2xl font-display text-zinc-900 dark:text-white">Suggest Chores</h2>
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
              <p className="font-serif italic text-lg">Thinking of suggestions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400 mb-6 font-serif italic">Here are some chores you might want to add to your family's routine:</p>
              {suggestions.map((suggestion, index) => {
                const isSelected = selectedIndices.has(index);
                const isEditing = editingIndex === index;

                if (isEditing && editForm) {
                  return (
                    <div key={index} className="p-6 modern-box-sm border-2 border-emerald-500 bg-emerald-50/10 dark:bg-emerald-900/10 space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Chore Title</label>
                        <input 
                          type="text"
                          value={editForm.title}
                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full p-3 modern-input bg-white dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Description</label>
                        <textarea 
                          value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full p-3 modern-input bg-white dark:bg-slate-800 dark:text-white min-h-[80px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Points</label>
                          <input 
                            type="number"
                            value={editForm.points}
                            onChange={e => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })}
                            className="w-full p-3 modern-input bg-white dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Recurrence</label>
                          <select 
                            value={editForm.recurrence}
                            onChange={e => setEditForm({ ...editForm, recurrence: e.target.value as any })}
                            className="w-full p-3 modern-input bg-white dark:bg-slate-800 dark:text-white"
                          >
                            <option value="none">None</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => setEditingIndex(null)}
                          className="flex-1 py-2 bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-zinc-400 modern-btn text-sm font-bold"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSaveEdit}
                          className="flex-1 py-2 bg-emerald-600 text-white modern-btn text-sm font-bold"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={index}
                    onClick={() => toggleSelection(index)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleSelection(index)}
                    className={`p-4 modern-box-sm border-2 transition-all cursor-pointer flex items-start gap-4 focus:ring-2 focus:ring-emerald-500 outline-none ${isSelected ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-zinc-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/50'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-slate-700'}`}>
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg truncate">{suggestion.title}</h3>
                        <button 
                          onClick={(e) => handleEdit(index, e)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-all"
                          title="Edit suggestion"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{suggestion.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                          {suggestion.points} pts
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                          {suggestion.recurrence !== 'none' ? `Every ${suggestion.recurrenceInterval} ${suggestion.recurrence === 'daily' ? 'days' : suggestion.recurrence === 'weekly' ? 'weeks' : 'months'}` : 'One-time'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {!loading && !error && (
          <div className="p-6 border-t border-zinc-100 dark:border-slate-800 bg-zinc-50 dark:bg-slate-900/50 shrink-0 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-white dark:bg-slate-800 text-zinc-600 dark:text-zinc-400 modern-btn font-medium hover:bg-zinc-100 dark:hover:bg-slate-700 transition-all border border-zinc-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddSelected}
              disabled={selectedIndices.size === 0 || saving}
              className="flex-[2] py-4 bg-emerald-600 text-white modern-btn font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Adding...
                </>
              ) : (
                `Add ${selectedIndices.size} Selected`
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
