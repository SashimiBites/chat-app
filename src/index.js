const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocationMessage } = require("./utils/messages");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.port || 3000;

const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
    console.log(socket.conn.remoteAddress);
    console.log("new connection");

    socket.on("join", ({ username, room }, callback) => {
        const { error, user } = addUser({
            id: socket.id,
            username,
            room
        });

        if(error) {
            return callback(error);
        }

        socket.join(user.room);

        socket.emit("message", generateMessage("Welcome!"));
        socket.broadcast.to(room).emit("message", generateMessage(`${user.username} has joined!`));
        io.to(user.room).emit("roomData", {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    socket.on("sendMessage", (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if(filter.isProfane(message)) {
            return callback("Profanity is not allowed!");
        }

        io.to(user.room).emit("message", generateMessage(message, user.username));
        callback();
    });

    socket.on("sendLocation", (location, callback) => {
        const user = getUser(socket.id);
        let currentLocation = `https://google.com/maps?q=${location.latitude},${location.longitude}`;
        io.to(user.room).emit("locationMessage", generateLocationMessage(user.username, currentLocation));
        callback();
    });

    socket.on("disconnect", () => {
        const user = removeUser(socket.id);

        if(user) {
            io.to(user.room).emit("message", generateMessage(`${user.username} has left!`));
            io.to(user.room).emit("roomData", {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(port, () => {
    console.log("Listening on port: " + port);
});