const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const usersFilePath = path.join(__dirname, 'data', 'users.json');

// Load users from JSON file
const loadUsers = () => {
    if (fs.existsSync(usersFilePath)) {
        const data = fs.readFileSync(usersFilePath);
        return JSON.parse(data);
    }
    return [];
};

// Get users
app.get('/api/users', (req, res) => {
    const users = loadUsers();
    res.json(users);
});

// Save users to JSON file
const saveUsers = (users) => {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Save users
app.post('/api/users', async (req, res) => {
    console.log('Received user data:', req.body); // Log the incoming data
    const users = loadUsers();
    const newUser = req.body;

    // Check if the user already exists
    const existingUserIndex = users.findIndex(u => u.id === newUser.id);
    if (existingUserIndex !== -1) {
        // Update existing user
        users[existingUserIndex] = { ...users[existingUserIndex], ...newUser };
    } else {
        // Add new user
        users.push(newUser);
    }

    try {
        saveUsers(users);
        res.status(200).json({ message: 'User data saved successfully' });
    } catch (error) {
        console.error('Error saving users:', error);
        res.status(500).json({ message: 'Error saving user data' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();
    const user = users.find(u => u.username === username);

    if (user && await bcrypt.compare(password, user.password)) {
        return res.status(200).json(user);
    }
    res.status(401).json({ message: 'Invalid username or password!' });
});

// Serve index.html at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});