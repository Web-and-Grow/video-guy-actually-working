import React from 'react';
import { ArrowLeft, Play, Plus, Minus, Waves } from 'lucide-react';
import styles from './Summary.module.css';

export default function Summary({ project, onBack, onResume }) {
    const pages = Object.keys(project.data)
        .map(Number)
        .sort((a, b) => a - b);

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
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>
                <h1 className={styles.title}>{project.name}</h1>
            </header>

            <div className={styles.content}>
                <div className={styles.list}>
                    <div className={styles.listHeader}>
                        <span>Take</span>
                        <span>Value</span>
                    </div>

                    {pages.length === 0 ? (
                        <div className={styles.empty}>No data recorded yet.</div>
                    ) : (
                        pages.map(page => {
                            const entry = project.data[page];
                            // Parse entry for backward compatibility
                            const value = typeof entry === 'string' ? entry : entry.value;
                            const note = typeof entry === 'string' ? '' : entry.note;

                            return (
                                <div key={page} className={styles.rowWrapper}>
                                    <div className={styles.row}>
                                        <div className={styles.pageInfo}>
                                            <span className={styles.pageNum}>#{page}</span>
                                            {note && <span className={styles.noteIndicator}>*</span>}
                                        </div>
                                        <span className={styles.value}>
                                            {renderIcon(value)}
                                            <span className={styles.valueText}>{value}</span>
                                        </span>
                                    </div>
                                    {note && <div className={styles.noteRow}>{note}</div>}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className={styles.fabContainer}>
                <button className={`${styles.fab} btn-primary`} onClick={onResume}>
                    <Play size={24} fill="currentColor" />
                </button>
            </div>
        </div>
    );
}
