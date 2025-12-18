
const STORAGE_KEY = 'offline-tracker-projects';

export const getProjects = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveProjects = (projects) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

// Fallback ID generator for non-secure contexts
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const createNewProject = (name) => {
    const projects = getProjects();
    const newProject = {
        id: generateId(),
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: {}, // { 1: 'plus', 2: 'minus' ... }
        lastPage: 1
    };
    projects.unshift(newProject);
    saveProjects(projects);
    return newProject;
};

export const updateProject = (updatedProject) => {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === updatedProject.id);
    if (index !== -1) {
        projects[index] = { ...updatedProject, updatedAt: Date.now() };
        saveProjects(projects);
    }
};

export const deleteProject = (id) => {
    const projects = getProjects();
    const filtered = projects.filter(p => p.id !== id);
    saveProjects(filtered);
};

export const exportData = () => {
    const projects = getProjects();
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
};
