import React, { useState, useEffect, useRef } from 'react';
import { Save, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Plus, Minus, Waves, Pause, Play, Trash2, SkipForward } from 'lucide-react';
import { updateItem } from '../storage';
import styles from './Recorder.module.css';

const formatTime = (ms) => {
    if (!ms) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}:${pad(millis)}`;
};

export default function Recorder({ project, onBack }) {
    // State initialization from project prop (only on mount)
    const [entries, setEntries] = useState(project.entries || []);
    const [isPlaying, setIsPlaying] = useState(project.status === 'recording');
    const [currentSection, setCurrentSection] = useState(project.currentSection || 1);
    const [startTime, setStartTime] = useState(project.startTime || null);

    // Virtual "Current Index" for history navigation
    const [viewIndex, setViewIndex] = useState(entries.length);

    // Timekeeper
    const [elapsed, setElapsed] = useState(project.totalDuration || 0);

    // Modals
    const [showStartModal, setShowStartModal] = useState(project.status === 'idle');
    const [showPauseConfirm, setShowPauseConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    const baseDuration = useRef(project.totalDuration || 0);
    const sessionStart = useRef(project.startTime || null);

    // Timer Interval
    useEffect(() => {
        let interval;
        if (isPlaying) {
            if (!sessionStart.current) sessionStart.current = Date.now();
            interval = setInterval(() => {
                const now = Date.now();
                setElapsed(baseDuration.current + (now - sessionStart.current));
            }, 50);
        } else {
            sessionStart.current = null;
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    // --- Persistence Helper ---
    // Helper to ensure we always write current state, not stale props
    const persistState = (overrides = {}) => {
        const newState = {
            ...project, // Base props
            entries: entries, // Current entries
            currentSection: currentSection, // Current section
            totalDuration: elapsed, // Current time
            status: isPlaying ? 'recording' : 'paused',
            startTime: startTime,
            updatedAt: Date.now(),
            ...overrides // Allow specific overrides
        };
        updateItem(newState);
    };

    // Handlers
    const handleStart = () => {
        setIsPlaying(true);
        const now = Date.now();
        setStartTime(now);
        sessionStart.current = now;
        setShowStartModal(false);

        // Immediate persistence
        updateItem({
            ...project,
            entries,
            currentSection,
            totalDuration: elapsed,
            status: 'recording',
            startTime: now,
            updatedAt: now
        });
    };

    const handlePauseRequest = () => {
        if (isPlaying) {
            setShowPauseConfirm(true);
        } else {
            // Resume
            setIsPlaying(true);
            const now = Date.now();
            sessionStart.current = now;
            setStartTime(now);

            updateItem({
                ...project,
                entries,
                currentSection,
                totalDuration: elapsed,
                status: 'recording',
                startTime: now,
                updatedAt: now
            });
        }
    };

    const confirmPause = () => {
        setIsPlaying(false);
        const sessionDuration = Date.now() - sessionStart.current;
        baseDuration.current += sessionDuration;
        const newTotal = baseDuration.current;
        setElapsed(newTotal);

        updateItem({
            ...project,
            entries,
            currentSection,
            status: 'paused',
            totalDuration: newTotal,
            startTime: null,
            updatedAt: Date.now()
        });
        setShowPauseConfirm(false);
    };

    const handleSave = () => {
        // Calculate final duration
        const finalDuration = isPlaying
            ? baseDuration.current + (Date.now() - sessionStart.current)
            : elapsed;

        updateItem({
            ...project,
            entries: entries,
            currentSection: currentSection,
            status: 'paused',
            totalDuration: finalDuration,
            startTime: null,
            updatedAt: Date.now()
        });
        onBack();
    };

    const handleInput = (val) => {
        const isNew = viewIndex === entries.length;
        let newEntries;

        // Capture current time properly
        const currentDuration = isPlaying
            ? baseDuration.current + (Date.now() - sessionStart.current)
            : elapsed;

        if (isNew) {
            const newEntry = {
                id: crypto.randomUUID(),
                value: val,
                timestamp: currentDuration,
                section: currentSection,
                note: ''
            };
            newEntries = [...entries, newEntry];
            setEntries(newEntries);
            setViewIndex(newEntries.length);
        } else {
            const targetEntry = entries[viewIndex];
            const isLast = viewIndex === entries.length - 1;
            let newTimestamp = targetEntry.timestamp;
            if (isPlaying && isLast) {
                newTimestamp = currentDuration;
            }
            const updatedEntry = { ...targetEntry, value: val, timestamp: newTimestamp };
            newEntries = [...entries];
            newEntries[viewIndex] = updatedEntry;
            setEntries(newEntries);
        }

        // Persist with correct state
        updateItem({
            ...project,
            entries: newEntries,
            totalDuration: currentDuration,
            currentSection,
            status: isPlaying ? 'recording' : 'paused',
            startTime: isPlaying ? startTime : null, // keep start time if recording
            updatedAt: Date.now()
        });
    };

    const handleNoteChange = (text) => {
        if (viewIndex >= entries.length) return;
        const newEntries = [...entries];
        newEntries[viewIndex] = { ...newEntries[viewIndex], note: text };
        setEntries(newEntries);

        // Persist
        updateItem({
            ...project,
            entries: newEntries,
            currentSection,
            totalDuration: elapsed,
            status: isPlaying ? 'recording' : 'paused',
            updatedAt: Date.now()
        });
    };

    const handleNextSection = () => {
        const next = currentSection + 1;
        setCurrentSection(next);

        // Persist
        updateItem({
            ...project,
            entries,
            currentSection: next,
            totalDuration: elapsed,
            status: isPlaying ? 'recording' : 'paused',
            updatedAt: Date.now()
        });
    };

    const confirmDelete = () => setShowDeleteConfirm(true);

    const performDelete = () => {
        const newEntries = entries.filter((_, i) => i !== viewIndex);
        setEntries(newEntries);
        if (viewIndex >= newEntries.length) setViewIndex(Math.max(0, newEntries.length));

        updateItem({
            ...project,
            entries: newEntries,
            currentSection,
            totalDuration: elapsed,
            status: isPlaying ? 'recording' : 'paused',
            updatedAt: Date.now()
        });
        setShowDeleteConfirm(false);
    };

    // Navigation
    const goPrev = () => setViewIndex(i => Math.max(0, i - 1));
    const goNext = () => setViewIndex(i => Math.min(entries.length, i + 1));

    const currentEntry = entries[viewIndex];
    const isTip = viewIndex === entries.length;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.topBar}>
                <button className={styles.navBtn} onClick={onBack}>
                    <ChevronLeft /> Back
                </button>
                <div className={styles.timerDisplay}>
                    {formatTime(elapsed)}
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.saveBtn} onClick={() => setShowSaveConfirm(true)}>
                        <Save size={20} />
                    </button>
                </div>
            </header>

            {/* Main Inputs */}
            <div className={styles.mainArea}>
                <div className={styles.controlsColumn}>
                    <button
                        className={`${styles.bigBtn} ${currentEntry?.value === 'plus' ? styles.selected : ''}`}
                        onClick={() => handleInput('plus')}
                    >
                        <Plus size={64} />
                    </button>
                    <button
                        className={`${styles.bigBtn} ${currentEntry?.value === 'minus' ? styles.selected : ''}`}
                        onClick={() => handleInput('minus')}
                    >
                        <Minus size={64} />
                    </button>
                    <button
                        className={`${styles.bigBtn} ${currentEntry?.value === 'wave' ? styles.selected : ''}`}
                        onClick={() => handleInput('wave')}
                    >
                        <Waves size={64} />
                    </button>
                </div>

                {/* Note & Delete */}
                <div className={styles.noteContainer}>
                    {!isTip && (
                        <div style={{ display: 'flex', width: '100%', alignItems: 'flex-end' }}>
                            <textarea
                                className={styles.noteInput}
                                placeholder="Edit note..."
                                value={currentEntry.note || ''}
                                onChange={(e) => handleNoteChange(e.target.value)}
                            />
                            <button className={styles.deleteEntryBtn} onClick={confirmDelete}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                    )}
                    {isTip && <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>Select an action to record</div>}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className={styles.bottomBar}>
                <button className={styles.navBtn} onClick={goPrev} disabled={viewIndex === 0}>
                    <ArrowLeft size={32} />
                </button>

                <div className={styles.centerControls}>
                    <div className={styles.sectionDisplay}>
                        <span className={styles.sectionLabel}>Section {currentSection}</span>
                        <button className={styles.nextSectionBtn} onClick={handleNextSection}>
                            Next <SkipForward size={14} />
                        </button>
                    </div>

                    <div className={styles.pauseContainer}>
                        <button
                            className={`${styles.pauseBtn} ${!isPlaying ? styles.paused : ''}`}
                            onClick={handlePauseRequest}
                        >
                            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                        {isTip ? `New (#${entries.length + 1})` : `${viewIndex + 1} / ${entries.length}`}
                    </span>
                    <button className={styles.navBtn} onClick={goNext} disabled={isTip}>
                        <ArrowRight size={32} />
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showStartModal && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h2>Start Take?</h2>
                        <div className={styles.modalActions}>
                            <button className="btn" onClick={onBack}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleStart}>Start Now</button>
                        </div>
                    </div>
                </div>
            )}

            {showPauseConfirm && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h2>Pause Timer?</h2>
                        <div className={styles.modalActions}>
                            <button className="btn" onClick={() => setShowPauseConfirm(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmPause}>Pause</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h2>Delete Entry?</h2>
                        <div className={styles.modalActions}>
                            <button className="btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="btn" style={{ background: 'var(--danger-color)' }} onClick={performDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
            {showSaveConfirm && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h3>Save & Exit?</h3>
                        <div className={styles.modalActions}>
                            <button className="btn" onClick={() => setShowSaveConfirm(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
