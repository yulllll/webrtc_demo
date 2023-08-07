const express = require("express");
const Server = require("http").Server;
const app = express();
const socketIO = require("socket.io");

const server = Server(app);
const io = socketIO(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  socket.on("create or join", (roomId) => {
    const { rooms } = io.sockets.adapter;
    const roomSize = rooms.get(roomId)?.size || 0;
    const userNumber = roomSize + 1;

    switch (userNumber) {
      case 1:
        socket.join(roomId);
        socket.emit("created");
        break;
      case 2:
        socket.join(roomId);
        socket.emit("joined");
        break;
      default:
        socket.emit("full");
    }
  });


  socket.on("ready", (room) => {
    io.to(room).emit("ready");
  });

  socket.on("offer", (evt) => {
    io.to(evt.room).emit("offer", evt.sdp);
  });

  socket.on("answer", (evt) => {
    io.to(evt.room).emit("answer", evt.sdp);
  });

  socket.on("candidate", (evt) => {
    io.to(evt.room).emit("candidate", evt.candidate);
  });
});

server.listen(9000, () => {
  console.log("ws started on http://localhost:9000");
});
