import React from 'react';
import { ArrowLeft, Play, Plus, Minus, Waves, Printer } from 'lucide-react';
import styles from './Summary.module.css';

const formatTime = (ms) => {
    if (ms === null || ms === undefined) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}.${pad(millis)}`;
};

export default function Summary({ project, onBack, onResume }) {
    // Group entries by section
    const sections = (project.entries || []).reduce((acc, entry) => {
        const sec = entry.section || 1;
        if (!acc[sec]) acc[sec] = [];
        acc[sec].push(entry);
        return acc;
    }, {});

    const sectionKeys = Object.keys(sections).map(Number).sort((a, b) => a - b);

    const handlePrint = () => {
        window.print();
    };

    const renderIcon = (type) => {
        switch (type) {
            case 'plus': return <Plus size={20} className={styles.iconPlus} />;
            case 'minus': return <Minus size={20} className={styles.iconMinus} />;
            case 'wave': return <Waves size={20} className={styles.iconWave} />;
            default: return null;
        }
    };

    return (
        <div className={styles.container}>
            <header className={`${styles.header} no-print`}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={onBack}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className={styles.title}>{project.name}</h1>
                </div>
                <button className={styles.iconBtn} onClick={handlePrint} title="Save as PDF">
                    <Printer size={24} />
                </button>
            </header>

            <div className={styles.content}>
                <div className={styles.list}>
                    <div className={styles.listHeader}>
                        <span>Time</span>
                        <span>Value</span>
                    </div>

                    {(project.entries || []).length === 0 ? (
                        <div className={styles.empty}>No data recorded yet.</div>
                    ) : (
                        sectionKeys.map(secNum => (
                            <React.Fragment key={secNum}>
                                <div className={styles.sectionHeader}>
                                    Section {secNum}
                                </div>
                                {sections[secNum].map((entry, idx) => (
                                    <div key={entry.id || idx} className={styles.rowWrapper}>
                                        <div className={styles.row}>
                                            <span className={styles.timestamp}>{formatTime(entry.timestamp)}</span>
                                            <span className={styles.value}>
                                                {renderIcon(entry.value)}
                                                <span className={styles.valueText}>{entry.value}</span>
                                            </span>
                                        </div>
                                        {entry.note && <div className={styles.noteRow}>{entry.note}</div>}
                                    </div>
                                ))}
                            </React.Fragment>
                        ))
                    )}
                </div>
            </div>

            <div className={`${styles.fabContainer} no-print`}>
                <button className={`${styles.fab} btn-primary`} onClick={onResume}>
                    <Play size={24} fill="currentColor" />
                </button>
            </div>
        </div>
    );
}
