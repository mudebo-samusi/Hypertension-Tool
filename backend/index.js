const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // Prevents CORS issues
app.use(express.json()); // Allows JSON request bodies

// Sample API route
app.get('/api/message', (req, res) => {
    res.json({ message: "Hello from the backend!" });
});

// Start the server on port 5000
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
