// Express and socket servers
const express = require('express');
const app = express();
const http = require('http');
const socketServer = require("socket.io");
const httpServer = http.createServer(app);
const io = socketServer(httpServer, {
  cors: {
    origin: "http://localhost:8080",
  },
});

// Server settings
const SETTINGS = require('./local/constants.js'); 
const PORT = process.env.PORT || 3003;
const TICK = SETTINGS.SIM.tick; // in milliseconds
let connections = new Map();

// Aquarium Simulation 
const Simulation = require('./local/simulation.js');
let simulation = new Simulation();

require('events').EventEmitter.defaultMaxListeners = 20;

// --------------------------------------------------------
app.set('port', PORT);

// define a route - what happens when people visit /
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/html/index.html');
});

app.get('/0', function(req, res) {
  res.sendFile(__dirname + '/public/html/0.html');
});

app.get('/1', function(req, res) {
  res.sendFile(__dirname + '/public/html/1.html');
});

app.get('/interface', function(req, res) {
  res.sendFile(__dirname + '/public/html/interface.html');
});

// tell our app where to serve our static files
app.use(express.static('public'));

// Aquarium view socket
io.of('/aquarium').on('connection', (socket) => {
  console.log(socket.id + ' aquarium view connected');
  connections.set(socket.id, 'aquarium');
  socket.emit('init', SETTINGS);
  socket.on('add-snack', () => { // disable for show
    simulation.addSnack(true);
  });
  socket.on('disperse-topic', (originPosition, topic) => {
    simulation.disperseTopic(originPosition, topic);
  });
  socket.on('disconnect', () => {
    console.log(socket.id + ' aquarium view disconnected');
    connections.delete(socket.id);
  });
});

io.of('/interface').on('connection', (socket) => {
  console.log(socket.id + ' interface view connected');
  connections.set(socket.id, 'interface');

  socket.emit('init', SETTINGS);

  socket.on('add-snack', () => {
    simulation.addSnack(true);
  });

  socket.on('disperse-topic', (originPosition, topic) => {
    console.log("disperse topic: " + topic);
    simulation.disperseTopic(socket.id, topic);
  });
  socket.on('disconnect', () => {
    console.log(socket.id + ' interface view disconnected');
    connections.delete(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log('listening on :' + PORT);
});

// Update loop
setInterval(() => {
  simulation.update();
  io.of('/aquarium').emit('updateGameState', simulation.state); 
}, TICK);
