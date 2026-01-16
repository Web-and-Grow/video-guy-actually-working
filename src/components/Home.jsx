import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, ChevronRight, FileText, Download, Check, Edit2, Trash2, Folder, FolderPlus, FilePlus, ChevronLeft, ArrowUpRight, MoreVertical } from 'lucide-react';
import { getItems, createItem, updateItem, deleteItem, moveItem, exportData } from '../storage';
import { downloadFolderAsZip } from '../exportUtils';

import styles from './Home.module.css';

export default function Home({ onSelectProject }) {
    // Data State
    const [items, setItems] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);

    // Basic States
    const [isCreating, setIsCreating] = useState(false); // 'folder' | 'take' | false
    const [createStep, setCreateStep] = useState('type'); // 'type' | 'name'
    const [createType, setCreateType] = useState(null); // 'FOLDER' | 'TAKE'
    const [newItemName, setNewItemName] = useState('');

    // Selection & Long Press States
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [contextMenu, setContextMenu] = useState(null); // { x, y, item }

    // Modals
    const [renameModal, setRenameModal] = useState({ isOpen: false, item: null, name: '' });
    const [moveModal, setMoveModal] = useState({ isOpen: false, item: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, count: 0, isBatch: false, id: null });

    // Long Press Refs
    const longPressTimer = useRef(null);
    const isLongPress = useRef(false);

    const refreshItems = () => {
        setItems(getItems());
    };

    useEffect(() => {
        refreshItems();
    }, []);

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Filtered Items for View
    const displayedItems = useMemo(() => {
        return items.filter(item => item.parentId === currentFolderId)
            .sort((a, b) => {
                // Folders first
                if (a.type === 'FOLDER' && b.type !== 'FOLDER') return -1;
                if (a.type !== 'FOLDER' && b.type === 'FOLDER') return 1;
                return b.updatedAt - a.updatedAt;
            });
    }, [items, currentFolderId]);

    const currentFolder = items.find(i => i.id === currentFolderId);

    // Breadcrumb / Up Navigation
    const handleUp = () => {
        if (!currentFolder) return;
        setCurrentFolderId(currentFolder.parentId);
    };

    // --- Handlers ---

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        const newItem = createItem(newItemName, createType, currentFolderId);
        refreshItems();
        setNewItemName('');
        setIsCreating(false);
        setCreateStep('type');
        setCreateType(null);

        if (newItem.type === 'TAKE') {
            onSelectProject(newItem, 'RECORDER');
        } else {
            // Enter folder immediately
            setCurrentFolderId(newItem.id);
        }
    };

    const handleItemClick = (item) => {
        if (selectionMode) {
            const newSelected = new Set(selectedIds);
            if (newSelected.has(item.id)) newSelected.delete(item.id);
            else newSelected.add(item.id);
            setSelectedIds(newSelected);
            if (newSelected.size === 0) setSelectionMode(false);
        } else if (!isLongPress.current && !contextMenu) {
            if (item.type === 'FOLDER') {
                setCurrentFolderId(item.id);
            } else {
                onSelectProject(item, 'SUMMARY'); // Default to Summary/Preview
            }
        }
    };

    const handleTouchStart = (e, item) => {
        if (selectionMode) return;
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            if (navigator.vibrate) navigator.vibrate(50);
            const touch = e.touches[0];
            setContextMenu({ x: touch.clientX, y: touch.clientY, item });
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    // Actions
    const startSelection = () => {
        setSelectionMode(true);
        setSelectedIds(new Set([contextMenu.item.id]));
        setContextMenu(null);
    };

    const initiateRename = () => {
        setRenameModal({ isOpen: true, item: contextMenu.item, name: contextMenu.item.name });
        setContextMenu(null);
    };

    const initiateMove = () => {
        setMoveModal({ isOpen: true, item: contextMenu.item });
        setContextMenu(null);
    };

    const initiateDelete = () => {
        setDeleteConfirm({ isOpen: true, count: 1, isBatch: false, id: contextMenu.item.id });
        setContextMenu(null);
    };

    const initiateBatchDelete = () => {
        setDeleteConfirm({ isOpen: true, count: selectedIds.size, isBatch: true, id: null });
    };

    const performRename = (e) => {
        e.preventDefault();
        updateItem({ ...renameModal.item, name: renameModal.name });
        refreshItems();
        setRenameModal({ isOpen: false, item: null, name: '' });
    };

    const performMove = (targetFolderId) => {
        moveItem(moveModal.item.id, targetFolderId);
        refreshItems();
        setMoveModal({ isOpen: false, item: null });
    };

    const performDelete = () => {
        if (deleteConfirm.isBatch) {
            selectedIds.forEach(id => deleteItem(id));
            setSelectionMode(false);
            setSelectedIds(new Set());
        } else {
            deleteItem(deleteConfirm.id);
        }
        refreshItems();
        setDeleteConfirm({ isOpen: false, count: 0, isBatch: false, id: null });
    };

    // Folder listing for Move Modal
    const validMoveTargets = useMemo(() => {
        if (!moveModal.item) return [];
        // Available folders: All folders EXCEPT self and any children of self (to avoid loops)
        // For simple shallow loop prevention: exclude self.
        return [{ id: null, name: 'Root' }, ...items.filter(i => i.type === 'FOLDER' && i.id !== moveModal.item.id)];
    }, [items, moveModal.item]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <h1>{selectionMode ? `${selectedIds.size} Selected` : (currentFolder ? currentFolder.name : 'My Projects')}</h1>
                    {!selectionMode && (
                        <button className={styles.iconBtn} onClick={exportData} title="Backup Data">
                            <Download size={24} />
                        </button>
                    )}
                    {selectionMode && (
                        <button className={styles.textBtn} onClick={() => {
                            setSelectionMode(false);
                            setSelectedIds(new Set());
                        }}>Cancel</button>
                    )}
                </div>
                {/* Breadcrumb-ish up navigation */}
                {currentFolder && !selectionMode && (
                    <div className={styles.pathNav}>
                        <button className={styles.pathBtn} onClick={handleUp}>
                            <ChevronLeft size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> Back
                        </button>
                    </div>
                )}
            </header>

            <div className={styles.projectList}>
                {displayedItems.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>Empty folder. Tap + to add content.</p>
                    </div>
                )}

                {displayedItems.map(item => (
                    <div
                        key={item.id}
                        className={`${styles.card} glass-panel ${styles[item.type.toLowerCase()]} ${selectionMode ? styles.selectionMode : ''}`}
                        onClick={() => handleItemClick(item)}
                        onTouchStart={(e) => handleTouchStart(e, item)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        {selectionMode && (
                            <div className={`${styles.checkbox} ${selectedIds.has(item.id) ? styles.checked : ''}`}>
                                {selectedIds.has(item.id) && <Check size={16} />}
                            </div>
                        )}
                        <div className={`${styles.cardIcon} ${styles[item.type.toLowerCase()]}`}>
                            {item.type === 'FOLDER' ? <Folder size={24} /> : <FileText size={24} />}
                        </div>
                        <div className={styles.cardContent}>
                            <h3>{item.name}</h3>
                            <p>
                                {item.type === 'FOLDER'
                                    ? 'Folder'
                                    : `${item.entries ? item.entries.length : 0} items`}
                                • {new Date(item.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                        {!selectionMode && (
                            <button
                                className={styles.contextMenuBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setContextMenu({ x: e.clientX, y: e.clientY, item });
                                }}
                            >
                                <MoreVertical size={20} />
                            </button>
                        )}
                        {!selectionMode && <ChevronRight color="var(--text-secondary)" />}
                    </div>
                ))}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div className={styles.contextMenuOverlay} onClick={() => setContextMenu(null)} />
                    <div className={styles.contextMenu} style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 180) }}>
                        <button className={styles.contextMenuItem} onClick={startSelection}>
                            <Check size={18} /> Select
                        </button>
                        {['FOLDER', 'folder'].includes(contextMenu.item.type) && (
                            <button className={styles.contextMenuItem} onClick={() => {
                                downloadFolderAsZip(contextMenu.item);
                                setContextMenu(null);
                            }}>
                                <Download size={18} /> Download
                            </button>
                        )}
                        <button className={styles.contextMenuItem} onClick={initiateRename}>
                            <Edit2 size={18} /> Rename
                        </button>
                        <button className={styles.contextMenuItem} onClick={initiateMove}>
                            <ArrowUpRight size={18} /> Move
                        </button>
                        <button className={`${styles.contextMenuItem} ${styles.delete}`} onClick={initiateDelete}>
                            <Trash2 size={18} /> Delete
                        </button>
                    </div>
                </>
            )}

            {/* Batch Actions Bar */}
            {selectionMode && (
                <div className={styles.batchBar}>
                    <button className={`${styles.textBtn} ${styles.danger}`} disabled={selectedIds.size === 0} onClick={initiateBatchDelete}>
                        Delete ({selectedIds.size})
                    </button>
                </div>
            )}

            {/* FAB */}
            {!selectionMode && (
                <button className="fab" onClick={() => setIsCreating(true)}>
                    <Plus />
                </button>
            )}

            {/* Creation Modal */}
            {isCreating && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        {createStep === 'type' ? (
                            <>
                                <h2>Create New...</h2>
                                <div className={styles.createOptions}>
                                    <button type="button" className={styles.createOptionBtn} onClick={() => {
                                        console.log('Selected FOLDER');
                                        setCreateType('FOLDER');
                                        setCreateStep('name');
                                    }}>
                                        <Folder size={32} />
                                        <span>Folder</span>
                                    </button>
                                    <button type="button" className={styles.createOptionBtn} onClick={() => {
                                        console.log('Selected TAKE');
                                        setCreateType('TAKE');
                                        setCreateStep('name');
                                    }}>
                                        <FileText size={32} />
                                        <span>Take</span>
                                    </button>
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" className="btn" onClick={() => { setIsCreating(false); setCreateStep('type'); }}>Cancel</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>New {createType === 'FOLDER' ? 'Folder' : 'Take'}</h2>
                                <form onSubmit={handleCreate}>
                                    <input autoFocus type="text" placeholder="Name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className={styles.input} />
                                    <div className={styles.modalActions}>
                                        <button type="button" className="btn" onClick={() => { setIsCreating(false); setCreateStep('type'); setNewItemName(''); }}>Cancel</button>
                                        <button type="submit" className="btn btn-primary">Create</button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Move Modal */}
            {moveModal.isOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h2>Move "{moveModal.item?.name}" to...</h2>
                        <div className={styles.moveList}>
                            {validMoveTargets.map(folder => (
                                <div
                                    key={folder.id || 'root'}
                                    className={`${styles.moveItem} ${folder.id === moveModal.item?.parentId ? styles.current : ''}`}
                                    onClick={() => performMove(folder.id)}
                                >
                                    <Folder size={18} /> {folder.name}
                                </div>
                            ))}
                        </div>
                        <div className={styles.modalActions}>
                            <button type="button" className="btn" onClick={() => setMoveModal({ isOpen: false, item: null })}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename & Delete Modals */}
            {renameModal.isOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h2>Rename</h2>
                        <form onSubmit={performRename}>
                            <input autoFocus type="text" value={renameModal.name} onChange={(e) => setRenameModal(prev => ({ ...prev, name: e.target.value }))} className={styles.input} />
                            <div className={styles.modalActions}>
                                <button type="button" className="btn" onClick={() => setRenameModal({ isOpen: false, item: null, name: '' })}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfirm.isOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass-panel`}>
                        <h2>Delete {deleteConfirm.isBatch ? `${deleteConfirm.count} Items?` : 'Item?'}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>This cannot be undone.</p>
                        <div className={styles.modalActions}>
                            <button type="button" className="btn" onClick={() => setDeleteConfirm({ isOpen: false, count: 0, isBatch: false, id: null })}>Cancel</button>
                            <button type="button" className="btn" style={{ background: 'var(--danger-color)', color: 'white' }} onClick={performDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
