import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Plus, Minus, Waves } from 'lucide-react';
import { updateProject } from '../storage';
import styles from './Recorder.module.css';

export default function Recorder({ project, onBack }) {
    const [sessionData, setSessionData] = useState({ ...project.data });
    const [currentPage, setCurrentPage] = useState(project.lastPage || 1);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    // Check current value
    // Helper to safely get value and note from potentially legacy data
    const getData = (page) => {
        const entry = sessionData[page];
        if (!entry) return { value: null, note: '' };
        if (typeof entry === 'string') return { value: entry, note: '' }; // Legacy
        return entry; // Object
    };

    const { value: currentValue, note: currentNote } = getData(currentPage);

    const handleSelection = (value) => {
        const updatedData = {
            ...sessionData,
            [currentPage]: { value, note: currentNote }
        };
        setSessionData(updatedData);

        // Auto-advance
        setTimeout(() => {
            setCurrentPage(prev => prev + 1);
        }, 150);
    };

    const handleNoteChange = (e) => {
        const newNote = e.target.value;
        const updatedData = {
            ...sessionData,
            [currentPage]: { value: currentValue, note: newNote }
        };
        setSessionData(updatedData);
    };

    const handleSave = () => {
        // Explicit save action
        const updatedProject = {
            ...project,
            data: sessionData,
            lastPage: currentPage
        };
        updateProject(updatedProject);
        onBack(); // Go back to home/list
    };

    const confirmSave = () => {
        setShowSaveConfirm(true);
    };

    return (
        <div className={styles.container}>
            <header className={styles.topBar}>
                <button className={styles.navBtn} onClick={onBack}>
                    <ChevronLeft /> Back
                </button>
                <button className={styles.saveBtn} onClick={confirmSave}>
                    <Save size={20} style={{ marginRight: 4 }} />
                    Save
                </button>
            </header>

            <div className={styles.mainArea}>
                <div className={styles.pageDisplay}>
                    <span className={styles.pageLabel}>Take</span>
                    <span className={styles.pageNumber}>{currentPage}</span>
                </div>

                <div className={styles.controlsRow}>
                    <button
                        className={`${styles.bigBtn} ${currentValue === 'plus' ? styles.selected : ''}`}
                        onClick={() => handleSelection('plus')}
                    >
                        <Plus size={40} />
                    </button>

                    <button
                        className={`${styles.bigBtn} ${currentValue === 'minus' ? styles.selected : ''}`}
                        onClick={() => handleSelection('minus')}
                    >
                        <Minus size={40} />
                    </button>

                    <button
                        className={`${styles.bigBtn} ${currentValue === 'wave' ? styles.selected : ''}`}
                        onClick={() => handleSelection('wave')}
                    >
                        <Waves size={40} />
                    </button>
                </div>

                <div className={styles.noteContainer}>
                    <textarea
                        className={styles.noteInput}
                        placeholder="Add a note..."
                        value={currentNote}
                        onChange={handleNoteChange}
                    />
                </div>
            </div>

            <div className={styles.bottomBar}>
                <button
                    className={styles.pagiBtn}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                >
                    <ArrowLeft size={24} />
                    Prev
                </button>
                <span className={styles.pagiLabel}>
                    {currentPage}
                </span>
                <button
                    className={styles.pagiBtn}
                    onClick={() => setCurrentPage(p => p + 1)}
                >
                    Next
                    <ArrowRight size={24} />
                </button>
            </div>

            {showSaveConfirm && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h3>Save Project?</h3>
                        <p>Are you sure you want to save the data?</p>
                        <div className={styles.modalActions}>
                            <button className="btn" onClick={() => setShowSaveConfirm(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Yes, Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
