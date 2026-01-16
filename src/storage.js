
const STORAGE_KEY = 'offline-tracker-projects';

// --- Migration ---
const migrateData = (data) => {
    if (!Array.array(data)) return [];
    // Check if it's already V2 (check for 'type' property)
    if (data.length > 0 && data[0].type) return data;

    console.log("Migrating to V2 Data Structure...");
    return data.map(project => {
        // Convert old 'data' object {1: 'plus', ...} to entries array
        const entries = Object.keys(project.data || {}).map(key => {
            const val = project.data[key];
            const isObj = typeof val === 'object';
            return {
                id: generateId(),
                value: isObj ? val.value : val,
                note: isObj ? val.note : '',
                timestamp: Date.now(), // approximation for legacy
                section: 1
            };
        });

        return {
            id: project.id,
            parentId: null, // Root
            type: 'TAKE',
            name: project.name,
            createdAt: project.createdAt || Date.now(),
            updatedAt: project.updatedAt || Date.now(),
            entries: entries,
            status: 'idle',
            startTime: null,
            totalDuration: 0,
            currentSection: 1
        };
    });
};

export const getItems = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    let data = raw ? JSON.parse(raw) : [];

    // Auto-migrate on read if needed
    if (data.length > 0 && !data[0].type) {
        data = migrateData(data);
        saveItems(data);
    }
    return data;
};

export const saveItems = (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

// Fallback ID generator
export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const createItem = (name, type, parentId = null) => {
    const items = getItems();
    const newItem = {
        id: generateId(),
        parentId,
        type, // 'FOLDER' or 'TAKE'
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Take specific defaults
        entries: [],
        status: 'idle',
        startTime: null,
        totalDuration: 0,
        currentSection: 1
    };
    items.unshift(newItem);
    saveItems(items);
    return newItem;
};

export const updateItem = (updatedItem) => {
    const items = getItems();
    const index = items.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
        items[index] = { ...updatedItem, updatedAt: Date.now() };
        saveItems(items);
    }
};

export const moveItem = (itemId, newParentId) => {
    const items = getItems();
    const index = items.findIndex(i => i.id === itemId);
    if (index !== -1) {
        items[index].parentId = newParentId;
        items[index].updatedAt = Date.now();
        saveItems(items);
    }
};

export const deleteItem = (id) => {
    let items = getItems();
    // specific deletion logic: if folder, delete children recursively? 
    // For now, let's just delete the item and orphan children (or delete them too)
    // Safer to delete children:
    const idsToDelete = new Set([id]);

    // Find children recursively
    let changed = true;
    while (changed) {
        changed = false;
        items.forEach(item => {
            if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
                idsToDelete.add(item.id);
                changed = true;
            }
        });
    }

    items = items.filter(i => !idsToDelete.has(i.id));
    saveItems(items);
};

export const exportData = () => {
    const items = getItems();
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

// Legacy compatibility shim for App.jsx until fully refactored
export const getProjects = getItems;
export const createNewProject = (name) => createItem(name, 'TAKE', null);
export const deleteProject = deleteItem;
export const updateProject = updateItem;
