import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Shield, User as UserIcon, Edit2, Check } from 'lucide-react';
import { familyService } from '../services';
import { Family, UserProfile } from '../types';
import { cn, getUserColor } from '../utils';

interface ManageFamilyModalProps {
  family: Family;
  members: UserProfile[];
  onClose: () => void;
  currentUserId: string;
}

export const ManageFamilyModal = ({ family, members, onClose, currentUserId }: ManageFamilyModalProps) => {
  const [name, setName] = useState(family.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState('');

  const currentUserMember = members.find(m => m.uid === currentUserId);
  const isOrganizer = currentUserMember?.role === 'organizer';
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await familyService.updateFamily(family.id, { name });
      onClose();
    } catch (err) {
      setError('Failed to update family name');
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await familyService.removeMember(memberToRemove.uid);
      setMemberToRemove(null);
    } catch (err) {
      console.error("Failed to remove member", err);
      setError("Failed to remove member");
      setMemberToRemove(null);
    }
  };

  const handleUpdateMemberName = async (userId: string) => {
    if (!editingMemberName.trim()) {
      setEditingMemberId(null);
      return;
    }
    try {
      await familyService.updateMember(userId, { displayName: editingMemberName });
      setEditingMemberId(null);
    } catch (err) {
      console.error("Failed to update member name", err);
      setError("Failed to update member name");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative modern-box w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 outline-none"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-slate-800">
          <h2 className="text-2xl font-display text-zinc-900 dark:text-white">Manage Family</h2>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-slate-800 rounded-full transition-all"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          <form onSubmit={handleUpdate} className="mb-8">
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-400 uppercase tracking-widest mb-2">Family Name</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!isOrganizer}
                className="flex-1 p-3 modern-input focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              {isOrganizer && (
                <button 
                  type="submit"
                  disabled={loading || name === family.name || !name.trim()}
                  className="px-6 py-3 bg-zinc-900 dark:bg-violet-600 text-white modern-btn font-medium hover:bg-zinc-800 dark:hover:bg-violet-700 disabled:opacity-50 transition-all whitespace-nowrap"
                  title="Save Changes"
                >
                  Save
                </button>
              )}
            </div>
          </form>

          {isOrganizer && (
            <div className="mb-8">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-400 uppercase tracking-widest mb-2">Invite Code</label>
              <div className="flex items-center gap-2 p-3 modern-box-sm border border-zinc-100 dark:border-slate-800 bg-zinc-50 dark:bg-slate-800/50">
                <code className="flex-1 font-mono text-lg text-violet-600 dark:text-violet-400 font-bold tracking-wider text-center select-all">
                  {family.inviteCode}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(family.inviteCode);
                    // Optional: add a toast or visual feedback here
                  }}
                  className="p-2 text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                Share this code with family members so they can join.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-400 uppercase tracking-widest">Members</label>
            </div>
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.uid} className="flex items-center justify-between p-4 modern-box-sm border border-zinc-100 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <img src={member.photoURL || ''} alt={member.displayName} className={cn("w-10 h-10 rounded-full border-2", getUserColor(member.uid).split(' ')[2])} />
                    <div>
                      {editingMemberId === member.uid ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            autoFocus
                            value={editingMemberName}
                            onChange={e => setEditingMemberName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleUpdateMemberName(member.uid);
                              if (e.key === 'Escape') setEditingMemberId(null);
                            }}
                            className="px-2 py-1 text-sm bg-transparent border border-zinc-300 dark:border-slate-600 rounded focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:text-white"
                          />
                          <button 
                            onClick={() => handleUpdateMemberName(member.uid)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                            title="Confirm"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => setEditingMemberId(null)}
                            className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-700 rounded"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <p className="font-medium text-zinc-900 dark:text-white">{member.displayName}</p>
                          {isOrganizer && (
                            <button 
                              onClick={() => {
                                setEditingMemberId(member.uid);
                                setEditingMemberName(member.displayName);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-slate-700 rounded transition-all"
                              title="Edit Member Name"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        {member.role === 'organizer' ? <Shield size={12} className="text-emerald-500" /> : <UserIcon size={12} className="text-blue-500" />}
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">{member.role}</p>
                      </div>
                    </div>
                  </div>
                  {isOrganizer && member.uid !== currentUserId && (
                    <button 
                      onClick={() => setMemberToRemove(member)}
                      className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                      title="Remove Member"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {memberToRemove && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setMemberToRemove(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative modern-box w-full max-w-sm p-6 text-center bg-white dark:bg-slate-900"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-display text-zinc-900 dark:text-white mb-2">Remove Member?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                Are you sure you want to remove <strong>{memberToRemove.displayName}</strong> from the family? They will lose access to all chores and family data.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setMemberToRemove(null)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 modern-btn font-medium hover:bg-zinc-200 dark:hover:bg-slate-700 transition-all"
                  title="Cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRemoveMember}
                  className="flex-1 py-3 bg-red-600 text-white modern-btn font-medium hover:bg-red-700 transition-all"
                  title="Confirm Removal"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
