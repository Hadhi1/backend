// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const handlerRoutes = require('./routes/handler');

require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', handlerRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
