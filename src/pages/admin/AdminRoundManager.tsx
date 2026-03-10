import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Target, Link as LinkIcon, Save, Edit3, X, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const AdminRoundManager: React.FC = () => {
    const { rounds, updateRound } = useAppStore();
    const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id || '');

    const [isEditingLink, setIsEditingLink] = useState(false);
    const [datasetLink, setDatasetLink] = useState('');

    const [isEditingContent, setIsEditingContent] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editCaseBrief, setEditCaseBrief] = useState('');
    const [editObjective, setEditObjective] = useState('');

    const activeRound = rounds.find(r => r.id === selectedRoundId);

    const handleSelectRound = (id: string) => {
        setSelectedRoundId(id);
        setIsEditingLink(false);
        setIsEditingContent(false);
    };

    const handleEditLinkClick = () => {
        if (activeRound) { setDatasetLink(activeRound.datasetLink || ''); setIsEditingLink(true); }
    };
    const handleSaveLink = () => {
        if (activeRound) { updateRound(activeRound.id, { datasetLink }); setIsEditingLink(false); }
    };

    const handleEditContentClick = () => {
        if (activeRound) {
            setEditTitle(activeRound.title);
            setEditCaseBrief(activeRound.caseBrief);
            setEditObjective(activeRound.objective);
            setIsEditingContent(true);
        }
    };
    const handleSaveContent = () => {
        if (activeRound) {
            updateRound(activeRound.id, { title: editTitle, caseBrief: editCaseBrief, objective: editObjective });
            setIsEditingContent(false);
        }
    };

    const toggleRoundStatus = () => {
        if (activeRound) {
            updateRound(activeRound.id, { status: activeRound.status === 'closed' ? 'open' : 'closed' });
        }
    };

    if (!activeRound) return null;
    const isClosed = activeRound.status === 'closed';

    const inputClass = "w-full px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-[10px] text-sm font-sans text-slate-900 bg-white outline-none transition-colors duration-150 leading-relaxed focus:border-slate-900";
    const labelClass = "text-[0.72rem] font-bold text-slate-500 uppercase tracking-wider block mb-1.5";

    return (
        <motion.div
            className="max-w-[900px] mx-auto flex flex-col gap-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            {/* Page Header */}
            <div className="border-b border-border pb-5">
                <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center">
                        <Target size={18} className="text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Round Management</h1>
                </div>
                <p className="text-muted-foreground text-sm ml-12">
                    Control access, dataset links, and content for each investigation round.
                </p>
            </div>

            <div className="flex gap-6 items-start">

                {/* Sidebar */}
                <div className="w-[220px] shrink-0 flex flex-col gap-2">
                    <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Round</p>
                    {rounds.map(round => {
                        const isSelected = selectedRoundId === round.id;
                        return (
                            <button
                                key={round.id}
                                onClick={() => handleSelectRound(round.id)}
                                className={cn(
                                    'w-full text-left px-4 py-3 rounded-[10px] text-sm cursor-pointer transition-all duration-150 flex items-center justify-between',
                                    isSelected
                                        ? 'border-[1.5px] border-blue-600 bg-blue-50 text-blue-700 font-bold'
                                        : 'border border-border bg-white text-slate-700 font-medium hover:bg-slate-50'
                                )}
                            >
                                <span className="truncate flex-1">{round.title}</span>
                                {round.status === 'closed' && <Lock size={12} className="text-slate-400 shrink-0 ml-2" />}
                            </button>
                        );
                    })}
                </div>

                {/* Main */}
                <div className="flex-1 flex flex-col gap-4">

                    {/* Status Toggle Header */}
                    <div className="bg-slate-800 border border-slate-700 rounded-[14px] px-6 py-5 flex items-center justify-between">
                        <div>
                            <p className="text-[0.68rem] text-slate-300 uppercase tracking-widest font-semibold mb-1">Active Round</p>
                            <h2 className="text-lg font-extrabold text-white">{activeRound.title}</h2>
                        </div>
                        <button
                            onClick={toggleRoundStatus}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-[10px] border-none text-[0.82rem] font-bold text-white cursor-pointer transition-colors duration-150',
                                isClosed ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                            )}
                        >
                            {isClosed ? <Lock size={14} /> : <Unlock size={14} />}
                            {isClosed ? 'Case Closed' : 'Case Open'}
                        </button>
                    </div>

                    {/* Round Content Editor */}
                    <div className="bg-white border border-border rounded-[14px] overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border bg-slate-50 flex items-center justify-between">
                            <p className="text-[0.85rem] font-bold text-slate-900">Round Content</p>
                            {!isEditingContent ? (
                                <button onClick={handleEditContentClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-600 text-[0.78rem] font-semibold cursor-pointer hover:bg-slate-50">
                                    <Edit3 size={13} /> Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditingContent(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-500 text-[0.78rem] font-semibold cursor-pointer">
                                        <X size={13} /> Cancel
                                    </button>
                                    <button onClick={handleSaveContent} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 border-none rounded-lg text-white text-[0.78rem] font-semibold cursor-pointer">
                                        <Save size={13} /> Save
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-5 flex flex-col gap-4">
                            {isEditingContent ? (
                                <>
                                    <div>
                                        <label className={labelClass}>Title</label>
                                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Objective</label>
                                        <input value={editObjective} onChange={e => setEditObjective(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Case Brief</label>
                                        <textarea value={editCaseBrief} onChange={e => setEditCaseBrief(e.target.value)}
                                            className={cn(inputClass, 'min-h-[100px] resize-y')} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className={labelClass}>Title</p>
                                        <p className="text-[0.9rem] text-slate-900 font-semibold">{activeRound.title}</p>
                                    </div>
                                    <div>
                                        <p className={labelClass}>Objective</p>
                                        <p className="text-sm text-slate-700">{activeRound.objective}</p>
                                    </div>
                                    <div>
                                        <p className={labelClass}>Case Brief</p>
                                        <p className="text-sm text-slate-700 leading-relaxed">{activeRound.caseBrief}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Dataset Link */}
                    <div className="bg-white border border-border rounded-[14px] overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LinkIcon size={15} className="text-violet-600" />
                                <p className="text-[0.85rem] font-bold text-slate-900">Dataset Link</p>
                            </div>
                            {!isEditingLink && (
                                <button onClick={handleEditLinkClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-600 text-[0.78rem] font-semibold cursor-pointer hover:bg-slate-50">
                                    <Edit3 size={13} /> Edit
                                </button>
                            )}
                        </div>

                        <div className="p-5">
                            {isEditingLink ? (
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <label className={labelClass}>Download URL</label>
                                        <input
                                            value={datasetLink}
                                            onChange={e => setDatasetLink(e.target.value)}
                                            placeholder="https://example.com/dataset.csv"
                                            className={cn(inputClass, 'font-mono text-[0.8rem]')}
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setIsEditingLink(false)} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-500 text-[0.82rem] font-semibold cursor-pointer">
                                            <X size={13} /> Cancel
                                        </button>
                                        <button onClick={handleSaveLink} className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 border-none rounded-lg text-white text-[0.82rem] font-semibold cursor-pointer hover:bg-violet-700">
                                            <Save size={13} /> Save Link
                                        </button>
                                    </div>
                                </div>
                            ) : activeRound.datasetLink ? (
                                <a
                                    href={activeRound.datasetLink}
                                    target="_blank" rel="noopener noreferrer"
                                    className="block text-[0.82rem] font-mono text-violet-600 bg-violet-50 border border-violet-200 rounded-[10px] px-4 py-3 break-all no-underline hover:bg-violet-100 transition-colors"
                                >
                                    {activeRound.datasetLink}
                                </a>
                            ) : (
                                <div className="text-center p-6 text-amber-700 bg-amber-50 border border-dashed border-amber-200 rounded-[10px] text-[0.85rem] font-semibold">
                                    No dataset link configured yet
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </motion.div>
    );
};
