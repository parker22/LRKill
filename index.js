var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Room = require('./room.js');
var uuid = require('node-uuid'), _ = require('underscore')._;;


var session = require("express-session")({
  secret: "my-secret",
  resave: true,
  saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");

// Use express-session middleware for express
app.use(session);
app.use(express.static('public'));
// Use shared session middleware for socket.io
// setting autoSave:true
io.use(sharedsession(session, {
  autoSave: true
}));

var people = {};
var rooms = {};
var sockets = [];


app.get('/', function (req, res) {
  res.sendFile('index.html', { root: 'public' });
});


io.sockets.on("connection", function (socket) {
  console.log(socket.handshake.session.username);
  socket.on("joinserver", function (name, device) {
    socket.handshake.session.username = name;
    var exists = false;
    var ownerRoomID = inRoomID = null;
    console.log("user " + name + "joined");
    _.find(people, function (key, value) {
      if (key.name.toLowerCase() === name.toLowerCase())
        return exists = true;
    });
    if (exists) {//provide unique username:
      var randomNumber = Math.floor(Math.random() * 1001)
      do {
        proposedName = name + randomNumber;
        _.find(people, function (key, value) {
          if (key.name.toLowerCase() === proposedName.toLowerCase())
            return exists = true;
        });
      } while (!exists);
      socket.emit("exists", { msg: "The username already exists, please pick another one.", proposedName: proposedName });
    } else {
      people[socket.id] = { "name": name, "owns": ownerRoomID, "inroom": inRoomID, "device": device };
      socket.emit("update", "You have connected to the server.");
      io.sockets.emit("update", people[socket.id].name + " is online.")
      sizePeople = _.size(people);
      sizeRooms = _.size(rooms);
      io.sockets.emit("update-people", { people: people, count: sizePeople });
      socket.emit("roomList", { rooms: rooms, count: sizeRooms });
      socket.emit("joined"); //extra emit for GeoLocation
      sockets.push(socket);
    }
  });

  socket.on("getOnlinePeople", function (fn) {
    fn({ people: people });
  });

  socket.on("countryUpdate", function (data) { //we know which country the user is from
    country = data.country.toLowerCase();
    people[socket.id].country = country;
    io.sockets.emit("update-people", { people: people, count: sizePeople });
  });

  socket.on("typing", function (data) {
    if (typeof people[socket.id] !== "undefined")
      io.sockets.in(socket.room).emit("isTyping", { isTyping: data, person: people[socket.id].name });
  });

  socket.on("send", function (msTime, msg) {
    //process.exit(1);
    var re = /^[w]:.*:/;
    var whisper = re.test(msg);
    var whisperStr = msg.split(":");
    var found = false;
    if (whisper) {
      var whisperTo = whisperStr[1];
      var keys = Object.keys(people);
      if (keys.length != 0) {
        for (var i = 0; i < keys.length; i++) {
          if (people[keys[i]].name === whisperTo) {
            var whisperId = keys[i];
            found = true;
            if (socket.id === whisperId) { //can't whisper to ourselves
              socket.emit("update", "You can't whisper to yourself.");
            }
            break;
          }
        }
      }
      if (found && socket.id !== whisperId) {
        var whisperTo = whisperStr[1];
        var whisperMsg = whisperStr[2];
        socket.emit("whisper", { name: "You" }, whisperMsg);
        io.sockets.socket(whisperId).emit("whisper", msTime, people[socket.id], whisperMsg);
      } else {
        socket.emit("update", "Can't find " + whisperTo);
      }
    } else {
      if (io.sockets.manager.roomClients[socket.id]['/' + socket.room] !== undefined) {
        io.sockets.in(socket.room).emit("chat", msTime, people[socket.id], msg);
        socket.emit("isTyping", false);
        if (_.size(chatHistory[socket.room]) > 10) {
          chatHistory[socket.room].splice(0, 1);
        } else {
          chatHistory[socket.room].push(people[socket.id].name + ": " + msg);
        }
      } else {
        socket.emit("update", "Please connect to a room.");
      }
    }
  });

  // socket.on("disconnect", function () {
  //   if (typeof people[socket.id] !== "undefined") { //this handles the refresh of the name screen
  //     purge(socket, "disconnect");
  //   }
  // });

  //Room functions
  socket.on("createRoom", function (name) {
    if (people[socket.id].inroom) {
      socket.emit("update", "You are in a room. Please leave it first to create your own.");
    } else if (!people[socket.id].owns) {
      var id = uuid.v4();
      var room = new Room(name, id, socket.id);
      rooms[id] = room;
      sizeRooms = _.size(rooms);
      io.sockets.emit("roomList", { rooms: rooms, count: sizeRooms });
      //add room to socket, and auto join the creator of the room
      socket.room = name;
      socket.join(socket.room);
      people[socket.id].owns = id;
      people[socket.id].inroom = id;
      room.addPerson(socket.id);
      socket.emit("update", "Welcome to " + room.name + ".");
      socket.emit("sendRoomID", { id: id });
      chatHistory[socket.room] = [];
    } else {
      socket.emit("update", "You have already created a room.");
    }
  });

  socket.on("check", function (name, fn) {
    var match = false;
    _.find(rooms, function (key, value) {
      if (key.name === name)
        return match = true;
    });
    fn({ result: match });
  });

  socket.on("removeRoom", function (id) {
    var room = rooms[id];
    if (socket.id === room.owner) {
      purge(socket, "removeRoom");
    } else {
      socket.emit("update", "Only the owner can remove a room.");
    }
  });

  socket.on("joinRoom", function (id) {
    if (typeof people[socket.id] !== "undefined") {
      var room = rooms[id];
      if (socket.id === room.owner) {
        socket.emit("update", "You are the owner of this room and you have already been joined.");
      } else {
        if (_.contains((room.people), socket.id)) {
          socket.emit("update", "You have already joined this room.");
        } else {
          if (people[socket.id].inroom !== null) {
            socket.emit("update", "You are already in a room (" + rooms[people[socket.id].inroom].name + "), please leave it first to join another room.");
          } else {
            room.addPerson(socket.id);
            people[socket.id].inroom = id;
            socket.room = room.name;
            socket.join(socket.room);
            user = people[socket.id];
            io.sockets.in(socket.room).emit("update", user.name + " has connected to " + room.name + " room.");
            socket.emit("update", "Welcome to " + room.name + ".");
            socket.emit("sendRoomID", { id: id });
            var keys = _.keys(chatHistory);
            if (_.contains(keys, socket.room)) {
              socket.emit("history", chatHistory[socket.room]);
            }
          }
        }
      }
    } else {
      socket.emit("update", "Please enter a valid name first.");
    }
  });

  socket.on("leaveRoom", function (id) {
    var room = rooms[id];
    if (room)
      purge(socket, "leaveRoom");
  });
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});