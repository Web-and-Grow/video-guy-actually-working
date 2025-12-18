import React, { useState } from 'react';
import { Plus, ChevronRight, FileText, Download } from 'lucide-react';
import { createNewProject, exportData } from '../storage';

import styles from './Home.module.css';

export default function Home({ projects, onSelectProject, onRefresh }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        const project = createNewProject(newProjectName);
        onRefresh(); // Reload projects
        setNewProjectName('');
        setIsCreating(false);
        onSelectProject(project, 'RECORDER'); // Go straight to recorder
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <h1>My Projects</h1>
                    <button className={styles.iconBtn} onClick={exportData} title="Backup Data">
                        <Download size={24} />
                    </button>
                </div>
            </header>

            <div className={styles.projectList}>
                {projects.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>No datasets yet. Tap + to start.</p>
                    </div>
                )}

                {projects.map(project => (
                    <div
                        key={project.id}
                        className={`${styles.card} glass-panel`}
                        onClick={() => onSelectProject(project, 'SUMMARY')}
                    >
                        <div className={styles.cardIcon}>
                            <FileText size={24} color="var(--primary-color)" />
                        </div>
                        <div className={styles.cardContent}>
                            <h3>{project.name}</h3>
                            <p>{Object.keys(project.data).length} records • {new Date(project.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <ChevronRight color="var(--text-secondary)" />
                    </div>
                ))}
            </div>

            <button className="fab" onClick={() => setIsCreating(true)}>
                <Plus />
            </button>

            {isCreating && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h2>New Project</h2>
                        <form onSubmit={handleCreate}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Project Name"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className={styles.input}
                            />
                            <div className={styles.modalActions}>
                                <button type="button" className="btn" onClick={() => setIsCreating(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
