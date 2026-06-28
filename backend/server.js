require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

io.on('connection', (socket) => {
  socket.on('join_trip', (tripId) => {
    socket.join(tripId);
  });

  socket.on('edit_itinerary', (data) => {
    // Broadcast changes to others in the same trip room
    socket.to(data.tripId).emit('itinerary_updated', data.itinerary);
  });

  socket.on('user_active', (data) => {
    socket.to(data.tripId).emit('collaborator_active', data.username || 'A collaborator');
  });
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('TripCraft AI backend is running');
});

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const itineraryRoutes = require('./routes/itineraryRoutes');
app.use('/api/itinerary', itineraryRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));