// Game State
let currentUser = null;
let users = [];

// Load data from JSON file
async function loadData() {
    try {
        const response = await fetch('http://152.70.171.183:8080/api/users');
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        const data = await response.json();
        users = Array.isArray(data) ? data : [];
        const storedUserId = localStorage.getItem('currentUserId');
        if (storedUserId) {
            currentUser = users.find(user => user.id === storedUserId) || null;
        }
    } catch (error) {
        console.error('Error loading data:', error);
        users = [];
        currentUser = null;
    }
}

const saveUsers = (users) => {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error writing to users file:', error);
        throw error; // Rethrow the error to be caught in the route handler
    }
};

// Save data to JSON file
async function saveData() {
    try {
        if (!currentUser) return; // Only save if currentUser is set
        const response = await fetch('http://152.70.171.183:8080/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentUser),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to save data: ${errorData.message || response.statusText}`);
        }
        localStorage.setItem('currentUserId', currentUser.id);
    } catch (error) {
        console.error('Error saving data:', error);
        alert(`Failed to save data: ${error.message}`);
    }
}

async function register(username, password) {
    const newUser = {
        id: Date.now().toString(),
        username,
        password,
        score: 0, // Initialize score to 0
        gems: 0, // Initialize gems to 0
        level: 1, // Initialize level to 1
        multiplier: 1, // Initialize multiplier to 1
        friends: [] // Initialize friends as an empty array
    };

    const response = await fetch('http://152.70.171.183:8080/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser), // Send a single user object
    });

    if (response.ok) {
        currentUser = newUser; // Set current user
        alert('Registration successful!');
        showScreen('gameScreen');
    } else {
        const error = await response.json();
        alert(error.message); // Show error message
    }
}

function login(username, password) {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        currentUser = user;
        saveData(); // Save current user data
        return true;
        console.log('Login attempt:', { username, password });
        console.log('Users:', users);
    }
    return false;
}

async function updateUserData() {
    if (currentUser) {
        // Update user data as needed
        await saveData(); // Save updated user data to the server
    }
}

function logout() {
    currentUser = null;
    saveData();
}

// Game Logic
function updateScore() {
    if (!currentUser) return;
    const gainedOnions = (currentUser.onionValue || 1) * currentUser.multiplier * (currentUser.clickPower || 1);
    currentUser.score += gainedOnions;
    if (Math.random() < (currentUser.gemChance || 0.1)) {
        currentUser.gems += 1;
    }
    updateLevel();
    updateUI();
    saveData();
    showFloatingNumber(gainedOnions);
}

function updateLevel() {
    if (!currentUser) return;
    const newLevel = Math.floor(Math.log2(currentUser.score + 1)) + 1;
    if (newLevel > currentUser.level) {
        currentUser.level = newLevel;
        showLevelUpMessage(newLevel);
        
        // Calculate clicks to next level
        const clicksToNextLevel = Math.pow(2, currentUser.level) - currentUser.score;
        showClickCounterMessage(clicksToNextLevel.toFixed(2)); // Format to 2 decimal places
    }
}

function showClickCounterMessage(clicks) {
    const message = document.createElement('div');
    message.textContent = `Need ${formatNumber(clicks)} more clicks to reach the next level!`; // Use formatNumber for consistent formatting
    message.className = 'level-up-message';
    document.getElementById('gameScreen').appendChild(message);
    
    // Add fade-out animation
    setTimeout(() => message.remove(), 3000);
}

function formatNumber(num) {
    const prefixes = [
        { value: 1e48, symbol: 'Quattuordecillion' },
        { value: 1e45, symbol: 'Tredecillion' },
        { value: 1e42, symbol: 'Duodecillion' },
        { value: 1e39, symbol: 'Undecillion' },
        { value: 1e36, symbol: 'Decillion' },
        { value: 1e33, symbol: 'Nonillion' },
        { value: 1e30, symbol: 'Octillion' },
        { value: 1e27, symbol: 'Septillion' },
        { value: 1e24, symbol: 'Sextillion' },
        { value: 1e21, symbol: 'Quintillion' },
        { value: 1e18, symbol: 'Quadrillion' },
        { value: 1e15, symbol: 'Trillion' },
        { value: 1e12, symbol: 'Billion' },
        { value: 1e9, symbol: 'Million' },
        { value: 1e6, symbol: 'Thousand' },
        { value: 1e3, symbol: 'Hundred' },
        { value: 1, symbol: '' } // Unit
    ];

    for (const prefix of prefixes) {
        if (num >= prefix.value) {
            return (num / prefix.value).toFixed(1).replace(/\.0$/, '') + ' ' + prefix.symbol;
        }
    }
    return num.toString(); // Fallback for numbers less than 1
}

function updateUI() {
    if (!currentUser) return;
    document.getElementById('scoreDisplay').innerHTML = `Onions: ${formatNumber(currentUser.score)} <img src="onion.png" alt="Onion" class="currency-icon">`;
    document.getElementById('gemsDisplay').innerHTML = `Gems: ${formatNumber(currentUser.gems)} <img src="gem.png" alt="Gem" class="currency-icon">`;
    document.getElementById('levelTitle').textContent = `Level ${currentUser.level}`;
    document.getElementById('multiplierDisplay').textContent = `Swamp Power: x${formatNumber(currentUser.multiplier)}`;
    const clicksToNextLevel = Math.pow(2, currentUser.level) - currentUser.score;
    document.getElementById('clicksToNextLevel').textContent = `${formatNumber(clicksToNextLevel)} clicks to next level`;
    const progress = ((currentUser.score % Math.pow(2, currentUser.level)) / Math.pow(2, currentUser.level)) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function showFloatingNumber(number) {
    const floatingNumber = document.createElement('div');
    floatingNumber.textContent = `+${formatNumber(number)}`; // Use formatNumber for consistent formatting
    floatingNumber.className = 'floating-number';
    floatingNumber.style.left = `${Math.random() * 80 + 10}%`;
    floatingNumber.style.top = `${Math.random() * 80 + 10}%`;
    document.getElementById('gameScreen').appendChild(floatingNumber);
    setTimeout(() => floatingNumber.remove(), 1000);
}

function showLevelUpMessage(level) {
    const message = document.createElement('div');
    message.textContent = `Level Up! You're now level ${level}`;
    message.className = 'level-up-message';
    document.getElementById('gameScreen').appendChild(message);
    setTimeout(() => message.remove(), 3000);
}

// Upgrades
const upgradesData = [
    { id: 1, name: "Hand", baseCost: 250, multiplier: 1.2, costType: 'onion' },
    { id: 2, name: "Shovel", baseCost: 1000, multiplier: 1.3, costType: 'onion' },
    { id: 3, name: "Excavator", baseCost: 15000, multiplier: 1.4, costType: 'onion' },
    { id: 4, name: "Plasma Drill", baseCost: 50000, multiplier: 1.5, costType: 'onion' },
    { id: 5, name: "Laknicek's A.I", baseCost: 100000, multiplier: 2, costType: 'onion' },
    { id: 6, name: "Gem Boost", baseCost: 100, costType: 'gem', effect: () => { currentUser.multiplier *= 1.1; } },
];

const gemsShopData = [
    { id: 1, name: "Gem Magnet", cost: 10, effect: () => { currentUser.gemChance = (currentUser.gemChance || 0.1) + 0.05; } },
    { id: 2, name: "Golden Onion", cost: 25, effect: () => { currentUser.onionValue = (currentUser.onionValue || 1) + 1; } },
    { id: 3, name: "Swamp Expansion", cost: 50, effect: () => { currentUser.clickPower = (currentUser.clickPower || 1) + 1; } },
];

function renderGemsShop() {
    const gemsShopList = document.getElementById('gemsShopList');
    gemsShopList.innerHTML = '';
    gemsShopData.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.innerHTML = `
            <h3>${item.name}</h3>
            <p>Cost: ${item.cost} gems</p>
            <button onclick="purchaseGemsShopItem(${item.id})" class="btn" ${currentUser.gems >= item.cost ? '' : 'disabled'}>
                ${currentUser.gems >= item.cost ? 'Purchase' : 'Not enough gems'}
            </button>
        `;
        gemsShopList.appendChild(itemElement);
    });
}

function purchaseGemsShopItem(itemId) {
    if (!currentUser) return;
    const item = gemsShopData.find(i => i.id === itemId);
    if (currentUser.gems >= item.cost) {
        currentUser.gems -= item.cost;
        item.effect();
        updateUI();
        renderGemsShop();
        saveData();
    }
}

function getUpgradeCost(upgrade) {
    const purchaseCount = currentUser.upgrades?.[upgrade.id] || 0;
    return Math.round(upgrade.baseCost * Math.pow(1.1, purchaseCount));
}

function renderUpgrades() {
    const upgradesList = document.getElementById('upgradesList');
    upgradesList.innerHTML = '';
    upgradesData.forEach(upgrade => {
        const cost = getUpgradeCost(upgrade);
        const upgradeElement = document.createElement('div');
        upgradeElement.className = 'upgrade';
        upgradeElement.innerHTML = `
            <h3>${upgrade.name}</h3>
            <p>Cost: ${cost} ${upgrade.costType === 'gem' ? 'gems' : 'onions'}</p>
            ${upgrade.multiplier ? `<p>Multiplier: x${upgrade.multiplier}</p>` : ''}
            <button onclick="purchaseUpgrade(${upgrade.id})" class="btn" ${canAffordUpgrade(upgrade) ? '' : 'disabled'}>
                ${canAffordUpgrade(upgrade) ? 'Purchase' : `Not enough ${upgrade.costType === 'gem' ? 'gems' : 'onions'}`}
            </button>
        `;
        upgradesList.appendChild(upgradeElement);
    });
}

function canAffordUpgrade(upgrade) {
    if (!currentUser) return false;
    const cost = getUpgradeCost(upgrade);
    return upgrade.costType === 'gem' ? currentUser.gems >= cost : currentUser.score >= cost;
}

function purchaseUpgrade(upgradeId) {
    if (!currentUser) return;
    const upgrade = upgradesData.find(u => u.id === upgradeId);
    const cost = getUpgradeCost(upgrade);
    if (canAffordUpgrade(upgrade)) {
        if (upgrade.costType === 'gem') {
            currentUser.gems -= cost;
        } else {
            currentUser.score -= cost;
        }
        if (upgrade.multiplier) {
            currentUser.multiplier *= upgrade.multiplier;
        }
        if (upgrade.effect) {
            upgrade.effect();
        }
        currentUser.upgrades = currentUser.upgrades || {};
        currentUser.upgrades[upgradeId] = (currentUser.upgrades[upgradeId] || 0) + 9;
        updateUI();
        renderUpgrades();
        saveData();
    }
}

// Friends
function renderFriends() {
    const friendsList = document.getElementById('friendsList');
    friendsList.innerHTML = '';
    if (!currentUser || currentUser.friends.length === 0) { // Check if currentUser is null
        friendsList.innerHTML = '<p>You have no friends yet. Add some friends!</p>';
        return;
    }
    currentUser.friends.forEach(friendId => {
        const friend = users.find(u => u.id === friendId);
        if (friend) {
            const friendElement = document.createElement('div');
            friendElement.className = 'friend';
            friendElement.innerHTML = `
                <h3>${friend.username}</h3>
                <p>Level: ${friend.level}</p>
                <p>Onions: ${friend.score}</p>
            `;
            friendsList.appendChild(friendElement);
        }
    });
}

function addFriend() {
    const friendName = document.getElementById('friendName').value;
    if (friendName && currentUser) {
        const friend = users.find(u => u.username === friendName && u.id !== currentUser.id);
        if (friend && !currentUser.friends.includes(friend.id)) {
            currentUser.friends.push(friend.id);
            saveData();
            renderFriends();
        } else {
            alert('Friend not found or already added!');
        }
        document.getElementById('friendName').value = '';
    }
}

// Leaderboard
function renderLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    leaderboardBody.innerHTML = '';
    const sortedUsers = users.sort((a, b) => b.score - a.score);
    if (sortedUsers.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="4">No players on the leaderboard yet!</td></tr>';
        return;
    }
    sortedUsers.slice(0, 10).forEach((player, index) => {
        if (player && player.username && player.score !== undefined && player.level !== undefined) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.username}</td>
                <td>${player.score.toLocaleString()} <img src="onion.png" alt="Onion" class="currency-icon"></td>
                <td>${player.gems.toLocaleString()} <img src="gem.png" alt="Gem" class="currency-icon"></td>
                <td>${player.level}</td>
            `;
            leaderboardBody.appendChild(row);
        }
    });
}

// Authentication
async function handleAuth(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const isLogin = event.submitter.id === 'loginBtn';

    if (isLogin) {
        const response = await fetch('http://152.70.171.183:8080/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            currentUser = await response.json(); // Set current user
            alert('Login successful!');
            showScreen('gameScreen');
        } else {
            const error = await response.json();
            alert(error.message); // Show error message
            console.error('Login failed:', error);
        }
    } else {
        await register(username, password); // Call register function
    }
}
// Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    // Hide or show the game navigation based on the screen
    if (screenId === 'authScreen') {
        document.getElementById('gameNav').classList.add('hidden');
    } else {
        document.getElementById('gameNav').classList.remove('hidden');
    }
}

// Event Listeners
document.getElementById('clickBtn').addEventListener('click', updateScore);
document.getElementById('upgradesBtn').addEventListener('click', () => {
    showScreen('upgradesScreen');
    renderUpgrades();
});
document.getElementById('friendsBtn').addEventListener('click', () => {
    showScreen('friendsScreen');
    renderFriends();
});
document.getElementById('leaderboardBtn').addEventListener('click', () => {
    showScreen('leaderboardScreen');
    renderLeaderboard();
});
document.getElementById('backToGameBtn').addEventListener('click', () => {
    showScreen('gameScreen');
});
document.getElementById('logoutBtn').addEventListener('click', () => {
    logout();
    showScreen('authScreen');
    document.getElementById('gameNav').classList.add('hidden');
});
document.getElementById('addFriendBtn').addEventListener('click', addFriend);
document.getElementById('authForm').addEventListener('submit', handleAuth);
document.getElementById('gemsShopBtn').addEventListener('click', () => {
    showScreen('gemsShopScreen');
    renderGemsShop();
});
document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username.length < 4 || password.length < 5) {
        alert('Username must be at least 4 characters and password must be at least 5 characters.');
        return;
    }
    await register(username, password);
});

// Initialize
loadData().then(() => {
    if (currentUser) {
        showScreen('gameScreen');
        document.getElementById('gameNav').classList.remove('hidden');
        updateUI();
        renderUpgrades();
        renderGemsShop();
    } else {
        showScreen('authScreen');
    }
});

// Click animation
document.getElementById('clickBtn').addEventListener('click', () => {
    const shrekIcon = document.querySelector('.shrek-icon');
    shrekIcon.style.transform = 'scale(0.9)';
    setTimeout(() => {
        shrekIcon.style.transform = 'scale(1)';
    }, 100);
});

// User Management
async function register(username, password) {
    const newUser = {
        id: Date.now().toString(),
        username,
        password,
        score: 0,
        gems: 0,
        level: 1,
        multiplier: 1,
        friends: []
    };

    const response = await fetch('http://152.70.171.183:8080/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
    });

    if (response.ok) {
        currentUser = newUser; // Set current user
        alert('Registration successful!');
        showScreen('gameScreen');
    } else {
        const error = await response.json();
        alert(error.message); // Show error message
    }
}

// Event listener for the register button
document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username.length < 4 || password.length < 5) {
        alert('Username must be at least 4 characters and password must be at least 5 characters.');
        return;
    }
    await register(username, password);
});

