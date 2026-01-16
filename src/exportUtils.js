import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { getItems } from './storage';

// Helper to format time for PDF
const formatTime = (ms) => {
    if (ms === null || ms === undefined) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}.${pad(millis)}`;
};

/**
 * Generates a PDF Blob for a specific Take (project).
 */
export const generateTakePDF = (take) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text(take.name || "Untitled Take", 20, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(take.createdAt).toLocaleDateString()}`, 20, 30);
    doc.text(`Duration: ${formatTime(take.totalDuration)}`, 20, 35);

    let y = 50;

    // Group entries by section
    const sections = (take.entries || []).reduce((acc, entry) => {
        const sec = entry.section || 1;
        if (!acc[sec]) acc[sec] = [];
        acc[sec].push(entry);
        return acc;
    }, {});

    const sectionKeys = Object.keys(sections).map(Number).sort((a, b) => a - b);

    if (sectionKeys.length === 0) {
        doc.text("No data recorded.", 20, y);
    } else {
        sectionKeys.forEach(secNum => {
            // Check for page break
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            // Section Header
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`Section ${secNum}`, 20, y);
            y += 10;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(12);

            sections[secNum].forEach(entry => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }

                const timeStr = formatTime(entry.timestamp);
                // Value row
                doc.text(`[${timeStr}] ${entry.value.toUpperCase()}`, 25, y);
                y += 6;

                // Note
                if (entry.note) {
                    doc.setFontSize(10);
                    doc.setTextColor(100);
                    const splitNote = doc.splitTextToSize(`Note: ${entry.note}`, 160);
                    doc.text(splitNote, 30, y);
                    y += (splitNote.length * 5) + 4;
                    doc.setTextColor(0);
                    doc.setFontSize(12);
                } else {
                    y += 2; // spacer
                }
            });
            y += 5; // Section spacer
        });
    }

    return doc.output('blob');
};

/**
 * Recursively adds folder contents to a Zip folder.
 */
const addFolderToZip = (folderId, items, zipFolder) => {
    // Find children
    const children = items.filter(i => i.parentId === folderId);

    children.forEach(child => {
        if (child.type === 'FOLDER') {
            const nestedFolder = zipFolder.folder(child.name);
            addFolderToZip(child.id, items, nestedFolder);
        } else {
            // It's a Take
            const pdfBlob = generateTakePDF(child);
            zipFolder.file(`${child.name}.pdf`, pdfBlob);
        }
    });
};

/**
 * Main export function for a folder.
 */
export const downloadFolderAsZip = async (folder) => {
    const items = getItems();
    const zip = new JSZip();

    const rootFolder = zip.folder(folder.name);
    addFolderToZip(folder.id, items, rootFolder);

    const content = await zip.generateAsync({ type: "blob" });

    // Trigger download
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folder.name}.zip`;
    a.click();
    URL.revokeObjectURL(url);
};
