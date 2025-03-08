const { app } = require("./app");
const { Server } = require("socket.io");
const http = require("http");

const PORT = process.env.PORT || 5000;

// Create an HTTP server using Express app
const server = http.createServer(app);

// Setup WebSocket server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (change this in production)
  },
});

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("A user connected: ", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected: ", socket.id);
  });
});

// Make `io` accessible in routes
app.set("io", io);

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
