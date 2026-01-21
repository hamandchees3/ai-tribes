// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAW7sP2CJ_DlQ6XTzkcfhtjv9Co1NM0YDs",
    authDomain: "ai-tribes.firebaseapp.com",
    databaseURL: "https://ai-tribes-default-rtdb.firebaseio.com",
    projectId: "ai-tribes",
    storageBucket: "ai-tribes.firebasestorage.app",
    messagingSenderId: "982114850953",
    appId: "1:982114850953:web:b88e3cd68f698c5c830e58"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const pinsRef = db.ref('pins');

// DOM elements
const newGroupInput = document.getElementById('new-group');
const createBtn = document.getElementById('create-btn');
const linkRow = document.getElementById('link-row');
const groupLinkInput = document.getElementById('group-link');
const copyBtn = document.getElementById('copy-btn');
const copyStatus = document.getElementById('copy-status');
const groupsList = document.getElementById('groups-list');

// Get base URL for survey links
const baseUrl = window.location.href.replace('index.html', '').replace(/\/$/, '');

// Generate survey link for a group
function getSurveyLink(groupName) {
    return `${baseUrl}/survey.html?group=${encodeURIComponent(groupName)}`;
}

// Sanitize group name (lowercase, replace spaces with hyphens)
function sanitizeGroupName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Create group button click
createBtn.addEventListener('click', () => {
    const rawName = newGroupInput.value.trim();
    if (!rawName) return;

    const groupName = sanitizeGroupName(rawName);
    if (!groupName) {
        copyStatus.textContent = 'Please enter a valid group name';
        copyStatus.style.color = '#dc3545';
        return;
    }

    const link = getSurveyLink(groupName);
    groupLinkInput.value = link;
    linkRow.style.display = 'flex';
    copyStatus.textContent = '';
});

// Also trigger on Enter key
newGroupInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createBtn.click();
    }
});

// Copy button click
copyBtn.addEventListener('click', async () => {
    const link = groupLinkInput.value;
    try {
        await navigator.clipboard.writeText(link);
        copyStatus.textContent = 'Link copied to clipboard!';
        copyStatus.style.color = '#28a745';
    } catch (err) {
        // Fallback for older browsers
        groupLinkInput.select();
        document.execCommand('copy');
        copyStatus.textContent = 'Link copied to clipboard!';
        copyStatus.style.color = '#28a745';
    }

    setTimeout(() => {
        copyStatus.textContent = '';
    }, 3000);
});

// Check if an entry is a group (has nested user objects) vs a direct user pin
function isGroup(value) {
    if (typeof value !== 'object' || value === null) return false;
    // Direct user pins have x, y properties at top level
    // Groups have nested objects with x, y inside
    if ('x' in value && 'y' in value) return false;
    // Check if it has at least one nested object with x, y
    return Object.values(value).some(v =>
        typeof v === 'object' && v !== null && 'x' in v && 'y' in v
    );
}

// Store current groups data for CSV export
let currentGroupsData = {};

// Download group data as CSV
function downloadCSV(groupName) {
    const groupData = currentGroupsData[groupName];
    if (!groupData) return;

    // CSV header
    let csv = 'name,x,y\n';

    // Add each pin as a row
    Object.entries(groupData).forEach(([key, pin]) => {
        const name = pin.displayName || key;
        // Escape quotes in names
        const escapedName = name.replace(/"/g, '""');
        csv += `"${escapedName}",${pin.x},${pin.y}\n`;
    });

    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${groupName}-responses.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Delete a group permanently
function deleteGroup(groupName) {
    if (!confirm(`Are you sure you want to permanently delete the group "${groupName}" and all its data?`)) {
        return;
    }

    pinsRef.child(groupName).remove()
        .then(() => {
            console.log(`Group ${groupName} deleted`);
        })
        .catch((error) => {
            alert('Error deleting group: ' + error.message);
        });
}

// Load and display existing groups
pinsRef.on('value', (snapshot) => {
    const data = snapshot.val();

    if (!data) {
        groupsList.innerHTML = '<p class="no-groups">No groups yet. Create one above!</p>';
        currentGroupsData = {};
        return;
    }

    // Filter to only actual groups (not direct user entries from old data)
    const groupEntries = Object.entries(data).filter(([name, value]) => isGroup(value));

    // Store for CSV export
    currentGroupsData = Object.fromEntries(groupEntries);

    const groups = groupEntries
        .map(([name, pins]) => ({
            name,
            count: Object.keys(pins).length
        }))
        .sort((a, b) => b.count - a.count);

    if (groups.length === 0) {
        groupsList.innerHTML = '<p class="no-groups">No groups yet. Create one above!</p>';
        return;
    }

    groupsList.innerHTML = groups.map(group => `
        <div class="group-item">
            <a href="${getSurveyLink(group.name)}" class="group-link">
                <span class="group-name">${group.name}</span>
                <span class="group-count">${group.count} ${group.count === 1 ? 'pin' : 'pins'}</span>
            </a>
            <div class="group-actions">
                <button class="action-btn download-btn" onclick="downloadCSV('${group.name}')" title="Download CSV">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
                <button class="action-btn delete-btn" onclick="deleteGroup('${group.name}')" title="Delete group">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
});
