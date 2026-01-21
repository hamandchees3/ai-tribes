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

// Load and display existing groups
pinsRef.on('value', (snapshot) => {
    const data = snapshot.val();

    if (!data) {
        groupsList.innerHTML = '<p class="no-groups">No groups yet. Create one above!</p>';
        return;
    }

    const groups = Object.entries(data).map(([name, pins]) => ({
        name,
        count: Object.keys(pins).length
    })).sort((a, b) => b.count - a.count); // Sort by participant count

    groupsList.innerHTML = groups.map(group => `
        <a href="${getSurveyLink(group.name)}" class="group-item">
            <span class="group-name">${group.name}</span>
            <span class="group-count">${group.count} ${group.count === 1 ? 'pin' : 'pins'}</span>
        </a>
    `).join('');
});
