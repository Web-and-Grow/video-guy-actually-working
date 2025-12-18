import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Recorder from './components/Recorder';
import Summary from './components/Summary';
import { getProjects } from './storage';

function App() {
  const [view, setView] = useState('HOME'); // HOME, SUMMARY, RECORDER
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  const loadProjects = () => {
    setProjects(getProjects());
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleSelectProject = (project, targetView = 'SUMMARY') => {
    setActiveProject(project);
    setView(targetView);
  };

  const handleBackToHome = () => {
    loadProjects(); // Refresh data
    setView('HOME');
    setActiveProject(null);
  };

  const handleBackToSummary = () => {
    loadProjects(); // Refresh in case of save
    // Need to find the updated project in the list
    const updated = getProjects().find(p => p.id === activeProject.id);
    if (updated) setActiveProject(updated);
    setView('SUMMARY');
  };

  if (view === 'RECORDER' && activeProject) {
    return (
      <Recorder
        project={activeProject}
        onBack={handleBackToHome}
      />
    );
  }

  if (view === 'SUMMARY' && activeProject) {
    return (
      <Summary
        project={activeProject}
        onBack={handleBackToHome}
        onResume={() => setView('RECORDER')}
      />
    );
  }

  return (
    <Home
      projects={projects}
      onSelectProject={handleSelectProject}
      onRefresh={loadProjects}
    />
  );
}

export default App;
