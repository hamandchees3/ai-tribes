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

// Get group from URL parameter (e.g., ?group=founders)
const urlParams = new URLSearchParams(window.location.search);
const groupName = urlParams.get('group') || 'default';

// Initialize Firebase
let db = null;
let pinsRef = null;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    // Store pins under group-specific path
    pinsRef = db.ref(`pins/${groupName}`);
    showStatus(`Connected to group: ${groupName}`, 'success');
} catch (error) {
    showStatus('Firebase not configured. See console for setup instructions.', 'error');
    console.log(`
=== Firebase Setup Instructions ===
1. Go to https://console.firebase.google.com
2. Create a new project (or use existing)
3. Go to Project Settings > General
4. Scroll down and click "Add app" > Web
5. Copy the firebaseConfig object
6. Replace the config in app.js with your values
7. Go to Realtime Database > Create Database
8. Start in "test mode" for development
9. Your databaseURL will look like: https://YOUR_PROJECT-default-rtdb.firebaseio.com
    `);
}

// DOM elements
const chart = document.getElementById('chart');
const nameInput = document.getElementById('name');
const removeBtn = document.getElementById('remove-btn');
const groupBadge = document.getElementById('group-badge');

// Display group name
groupBadge.innerHTML = `Group: <span>${groupName}</span>`;

// Track current pins data for button visibility
let currentPinsData = null;

// Generate consistent color from name
function nameToColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
}

// Create a pin element
function createPin(name, x, y) {
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.dataset.name = name.toLowerCase();
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;

    const dot = document.createElement('div');
    dot.className = 'pin-dot';
    dot.style.backgroundColor = nameToColor(name);

    const label = document.createElement('div');
    label.className = 'pin-label';
    label.textContent = name;

    pin.appendChild(dot);
    pin.appendChild(label);

    return pin;
}

// Handle chart click
chart.addEventListener('click', (e) => {
    const name = nameInput.value.trim();

    if (!name) {
        showStatus('Please enter your name first', 'error');
        nameInput.focus();
        return;
    }

    if (!pinsRef) {
        showStatus('Database not connected', 'error');
        return;
    }

    // Calculate percentage coordinates
    const rect = chart.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Save to Firebase (case-insensitive key)
    const nameKey = name.toLowerCase();
    pinsRef.child(nameKey).set({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        displayName: name
    }).then(() => {
        showStatus(`Pin placed for ${name}`, 'success');
        updateRemoveButton();
    }).catch((error) => {
        showStatus('Error saving pin: ' + error.message, 'error');
    });
});

// Handle remove button click
removeBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name || !pinsRef) return;

    const nameKey = name.toLowerCase();
    pinsRef.child(nameKey).remove().then(() => {
        showStatus(`Pin removed for ${name}`, 'success');
        updateRemoveButton();
    }).catch((error) => {
        showStatus('Error removing pin: ' + error.message, 'error');
    });
});

// Update remove button visibility
function updateRemoveButton() {
    const name = nameInput.value.trim().toLowerCase();
    const hasPin = name && currentPinsData && currentPinsData[name];
    removeBtn.style.display = hasPin ? 'inline-block' : 'none';
}

// Update button when name input changes
nameInput.addEventListener('input', updateRemoveButton);

// Listen for real-time updates
if (pinsRef) {
    pinsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        renderPins(data);
    });
}

// Status message helper
function showStatus(message, type) {
    let status = document.querySelector('.status');
    if (!status) {
        status = document.createElement('div');
        status.className = 'status';
        document.querySelector('.container').appendChild(status);
    }
    status.textContent = message;
    status.className = `status ${type}`;

    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            status.style.opacity = '0';
            setTimeout(() => status.remove(), 300);
        }, 2000);
    }
}

// Render pins with display name
function renderPins(pinsData) {
    currentPinsData = pinsData;
    document.querySelectorAll('.pin').forEach(pin => pin.remove());

    if (pinsData) {
        Object.entries(pinsData).forEach(([key, data]) => {
            const name = data.displayName || key;
            const pin = createPin(name, data.x, data.y);
            chart.appendChild(pin);
        });
    }
    updateRemoveButton();
}
