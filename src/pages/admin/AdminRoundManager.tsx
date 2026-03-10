import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';


import { Target, Link as LinkIcon, Save, Edit3, X, Lock, Unlock } from 'lucide-react';

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

    const fieldStyle: React.CSSProperties = {
        width: '100%', padding: '0.625rem 0.875rem',
        border: '1.5px solid #e2e8f0', borderRadius: '10px',
        fontSize: '0.875rem', fontFamily: 'var(--font-sans)',
        color: '#0f172a', background: '#fff', outline: 'none',
        transition: 'border-color 0.15s',
        lineHeight: 1.5,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.72rem', fontWeight: 700, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem',
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            {/* Page Header */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Target size={18} color="#2563eb" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Round Management</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '3rem' }}>
                    Control access, dataset links, and content for each investigation round.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

                {/* Sidebar */}
                <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>
                        Select Round
                    </p>
                    {rounds.map(round => {
                        const isSelected = selectedRoundId === round.id;
                        return (
                            <button
                                key={round.id}
                                onClick={() => handleSelectRound(round.id)}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '0.75rem 1rem',
                                    borderRadius: '10px', border: isSelected ? '1.5px solid #2563eb' : '1px solid var(--border)',
                                    background: isSelected ? '#eff6ff' : '#fff',
                                    color: isSelected ? '#1d4ed8' : '#334155',
                                    fontWeight: isSelected ? 700 : 500, fontSize: '0.875rem', cursor: 'pointer',
                                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}
                                onMouseOver={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-base)'; }}
                                onMouseOut={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                    {round.title}
                                </span>
                                {round.status === 'closed' && <Lock size={12} color="#94a3b8" style={{ flexShrink: 0, marginLeft: '0.5rem' }} />}
                            </button>
                        );
                    })}
                </div>

                {/* Main */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Status Toggle Header */}
                    <div style={{
                        background: '#0f172a', borderRadius: '14px', padding: '1.25rem 1.5rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div>
                            <p style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.2rem' }}>
                                Active Round
                            </p>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{activeRound.title}</h2>
                        </div>
                        <button
                            onClick={toggleRoundStatus}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1rem', borderRadius: '10px',
                                background: isClosed ? '#dc2626' : '#16a34a',
                                border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'background 0.15s',
                            }}
                        >
                            {isClosed ? <Lock size={14} /> : <Unlock size={14} />}
                            {isClosed ? 'Case Closed' : 'Case Open'}
                        </button>
                    </div>

                    {/* Round Content Editor */}
                    <div style={{
                        background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Round Content</p>
                            {!isEditingContent ? (
                                <button onClick={handleEditContentClick} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.35rem 0.75rem',
                                    background: '#fff', border: '1px solid var(--border-strong)', borderRadius: '8px',
                                    color: '#475569', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                }}>
                                    <Edit3 size={13} /> Edit
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => setIsEditingContent(false)} style={{
                                        padding: '0.35rem 0.75rem', background: '#fff', border: '1px solid var(--border-strong)',
                                        borderRadius: '8px', color: '#64748b', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    }}>
                                        <X size={13} /> Cancel
                                    </button>
                                    <button onClick={handleSaveContent} style={{
                                        padding: '0.35rem 0.875rem', background: '#0f172a', border: 'none',
                                        borderRadius: '8px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    }}>
                                        <Save size={13} /> Save
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {isEditingContent ? (
                                <>
                                    <div>
                                        <label style={labelStyle}>Title</label>
                                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={fieldStyle}
                                            onFocus={e => (e.target.style.borderColor = '#0f172a')}
                                            onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Objective</label>
                                        <input value={editObjective} onChange={e => setEditObjective(e.target.value)} style={fieldStyle}
                                            onFocus={e => (e.target.style.borderColor = '#0f172a')}
                                            onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Case Brief</label>
                                        <textarea value={editCaseBrief} onChange={e => setEditCaseBrief(e.target.value)}
                                            style={{ ...fieldStyle, minHeight: '100px', resize: 'vertical' }}
                                            onFocus={e => (e.target.style.borderColor = '#0f172a')}
                                            onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p style={labelStyle}>Title</p>
                                        <p style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{activeRound.title}</p>
                                    </div>
                                    <div>
                                        <p style={labelStyle}>Objective</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-body)' }}>{activeRound.objective}</p>
                                    </div>
                                    <div>
                                        <p style={labelStyle}>Case Brief</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.65 }}>{activeRound.caseBrief}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Dataset Link */}
                    <div style={{
                        background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <LinkIcon size={15} color="#7c3aed" />
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Dataset Link</p>
                            </div>
                            {!isEditingLink && (
                                <button onClick={handleEditLinkClick} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.35rem 0.75rem',
                                    background: '#fff', border: '1px solid var(--border-strong)', borderRadius: '8px',
                                    color: '#475569', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                }}>
                                    <Edit3 size={13} /> Edit
                                </button>
                            )}
                        </div>

                        <div style={{ padding: '1.25rem' }}>
                            {isEditingLink ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <label style={labelStyle}>Download URL</label>
                                        <input
                                            value={datasetLink}
                                            onChange={e => setDatasetLink(e.target.value)}
                                            placeholder="https://example.com/dataset.csv"
                                            style={{ ...fieldStyle, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                                            onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                                            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => setIsEditingLink(false)} style={{
                                            padding: '0.4rem 0.875rem', background: '#fff', border: '1px solid var(--border-strong)',
                                            borderRadius: '8px', color: '#64748b', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                                        }}>
                                            <X size={13} /> Cancel
                                        </button>
                                        <button onClick={handleSaveLink} style={{
                                            padding: '0.4rem 1rem', background: '#7c3aed', border: 'none',
                                            borderRadius: '8px', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                                        }}>
                                            <Save size={13} /> Save Link
                                        </button>
                                    </div>
                                </div>
                            ) : activeRound.datasetLink ? (
                                <a
                                    href={activeRound.datasetLink}
                                    target="_blank" rel="noopener noreferrer"
                                    style={{
                                        display: 'block', fontSize: '0.82rem', fontFamily: 'var(--font-mono)',
                                        color: '#7c3aed', background: '#faf5ff', border: '1px solid #e9d5ff',
                                        borderRadius: '10px', padding: '0.75rem 1rem',
                                        wordBreak: 'break-all', textDecoration: 'none',
                                    }}
                                >
                                    {activeRound.datasetLink}
                                </a>
                            ) : (
                                <div style={{
                                    textAlign: 'center', padding: '1.5rem', color: '#b45309',
                                    background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: '10px',
                                    fontSize: '0.85rem', fontWeight: 600,
                                }}>
                                    No dataset link configured yet
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
