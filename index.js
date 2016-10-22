var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Room = require('./room.js');
var uuid = require('node-uuid'), _ = require('underscore')._;
;


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
var roomID = 0;

app.get('/', function (req, res) {
    res.sendFile('index.html', {root: 'public'});
});


io.sockets.on("connection", function (socket) {
    var uid = socket.handshake.session.userid;
    console.log("uuid:" + uid + " connected");

    if (uid != null) {
        socket.emit("update-user-status", people[uid]);
        if (people[uid].name != null) {
            socket.emit("update", "欢迎回到游戏，" + people[uid].name);
        }
    } else {
        uid = uuid.v4();
        people[uid] = {"name": null, "owns": null, "inroom": null, "seatNum": null};
    }
    if (people[uid].inroom != null) {
        console.log(people[uid])
        socket.room = 'room' + people[uid].inroom
        socket.join(socket.room)
        console.log(socket.room)
        io.to(socket.room).emit("update-room-status", rooms[people[uid].inroom]);
        socket.emit("init-game");
        socket.emit("update-user-status", people[uid]);

    }
    socket.on("joinserver", function (name) {
        socket.handshake.session.userid = uid;
        var exists = false;
        var ownerRoomID = inRoomID = null;
        console.log("user " + name + "joined");
        people[uid].name = name;
        socket.emit("update-user-status", people[uid]);
        console.log(people[uid])

        // _.find(people, function (key, value) {
        //   if (key.name.toLowerCase() === name.toLowerCase())
        //     return exists = true;
        // });
        // if (exists) {//provide unique username:
        //   var randomNumber = Math.floor(Math.random() * 1001)
        //   do {
        //     proposedName = name + randomNumber;
        //     _.find(people, function (key, value) {
        //       if (key.name.toLowerCase() === proposedName.toLowerCase())
        //         return exists = true;
        //     });
        //   } while (!exists);
        //   socket.emit("exists", { msg: "The username already exists, please pick another one.", proposedName: proposedName });
        // } else {
        //   people[socket.id] = { "name": name, "owns": ownerRoomID, "inroom": inRoomID, "device": device };
        //   socket.emit("update", "You have connected to the server.");
        //   io.sockets.emit("update", people[socket.id].name + " is online.")
        //   sizePeople = _.size(people);
        //   sizeRooms = _.size(rooms);
        //   io.sockets.emit("update-people", { people: people, count: sizePeople });
        //   socket.emit("roomList", { rooms: rooms, count: sizeRooms });
        //   socket.emit("joined"); //extra emit for GeoLocation
        //   sockets.push(socket);
        // }
    });

    socket.on("getOnlinePeople", function (fn) {
        fn({people: people});
    });

    socket.on("countryUpdate", function (data) { //we know which country the user is from
        country = data.country.toLowerCase();
        people[socket.id].country = country;
        io.sockets.emit("update-people", {people: people, count: sizePeople});
    });

    socket.on("typing", function (data) {
        if (typeof people[socket.id] !== "undefined")
            io.sockets.in(socket.room).emit("isTyping", {isTyping: data, person: people[socket.id].name});
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
                socket.emit("whisper", {name: "You"}, whisperMsg);
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
    socket.on("createRoom", function (characters) {
        characters = _.shuffle(characters);
        if (people[uid].inroom != null) {
            socket.emit("update", "You are in a room. Please leave it first to create your own.");
        } else if (!people[uid].owns) {
            var id = roomID + 1;
            roomID = id;
            var room = new Room("room" + id, id, uid);
            rooms[id] = room;
            sizeRooms = _.size(rooms);
            io.sockets.emit("roomList", {rooms: rooms, count: sizeRooms});
            //add room to socket, and auto join the creator of the room
            socket.room = room.name;
            socket.join(socket.room);
            people[uid].owns = id;
            people[uid].inroom = id;
            room.addPerson(people[uid]);
            var chars = {};

            for (i = 0; i < characters.length; i++) {
                chars[i + 1] = {"c_name": characters[i], "c_status": "awaiting", "c_uid": null};
            }
            room.setCharacters(chars);

            io.to(socket.room).emit("update-room-status", rooms[id]);
            socket.emit("update-user-status", people[uid]);
            socket.emit("sendRoomID", {id: id});
            // chatHistory[socket.room] = [];
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
        fn({result: match});
    });

    socket.on("removeRoom", function (id) {
        var room = rooms[id];
        if (socket.id === room.owner) {
            purge(socket, "removeRoom");
        } else {
            socket.emit("update", "Only the owner can remove a room.");
        }
    });
    socket.on("startGame", function () {
        var user = people[uid];
        var room = rooms[user.inroom];
        var roomChar = room.characters;
        var initCharInfo = {
            "isIdentityConfirmed": false,
            "isGuard": false,
            //没被杀用0表示，第一夜被杀用1表示，第二夜被杀用2表示（第几也被杀就用当此的夜数表示）
            "isKill": 0,
            "isSave": false,
            "isPosin": 0,
            "isDead": false,
            "isVoted": 0,
            "antidote": false,
            "poison": false
        };
        _.each(roomChar, function (char) {
            _.extend(char, initCharInfo);
        });

        console.log(room);
        io.sockets.in(socket.room).emit("update-room-status", room);
        io.sockets.in(socket.room).emit("init-game");
    });
    socket.on("confirmIdentity", function (seatNum) {
        console.log(seatNum)
        var user = people[uid];
        var room = rooms[user.inroom];
        room.characters[seatNum].isIdentityConfirmed = true;

        console.log(room);
        io.sockets.in(socket.room).emit("update-room-status", room);

    });


    socket.on("sit", function (seatNumber) {
        var user = people[uid];
        var room = rooms[user.inroom];
        if (user.seatNum != null) {
            room.characters[user.seatNum].c_status = "awaiting";
            room.characters[user.seatNum].c_uid = null;

        }
        room.characters[seatNumber].c_status = user.name;
        room.characters[seatNumber].c_uid = uid;
        user.seatNum = seatNumber;
        console.log(room);
        io.sockets.in(socket.room).emit("update-room-status", room);
        socket.emit("update-user-status", people[uid]);
    });

    socket.on("startFirstNight", function (seatNumber) {
        var user = people[uid];
        var room = rooms[user.inroom];
        room.dayNo++
        room.stepFlow = _.intersection(["guard", "wolf", "predictor", "witch"], _.uniq(_.map(room.characters, function (c, key) {
            return c.c_name
        }))).slice(0)
        console.log(room);
        io.sockets.in(socket.room).emit("update-room-status", room);
        var audios = "night" + "_start";
        io.sockets.in(socket.room).emit("execute-step", {step: "night", audioList: audios});
        room.step = room.stepFlow[0]
        setTimeout(function () {
            io.sockets.in(socket.room).emit("execute-step", {
                step: room.stepFlow[0],
                audioList: room.stepFlow[0] + "_start"
            });
        }, 5000);

    });
    socket.on("action", function (actionData) {
        var user = people[uid];
        var room = rooms[user.inroom];
        console.log("action", actionData)
        var goNextStep = false;
        var thisAction = actionData.action;
        if (thisAction == "guard") {
            room.lastGuard = actionData.detail
            goNextStep = !goNextStep
        }
        else if (thisAction == "killChoice") {
            var targetNum = actionData.detail
            var killerIdx = _.findIndex(room.killChoices, {
                wolf: parseInt(user.seatNum)
            });
            if (killerIdx != -1) {
                room.killChoices.splice(killerIdx, 1)
            }
            room.killChoices.push({wolf: parseInt(user.seatNum), target: parseInt(targetNum)})

        } else if (thisAction == "wolf") {
            room.lastKill = actionData.detail
            goNextStep = !goNextStep
        }
        else if (thisAction == "predictor") {
            goNextStep = !goNextStep
        }
        else if (thisAction == "witchSave") {
            room.lastSave = room.lastKill
        }
        else if (thisAction == "witchPoison") {
            room.lastPoison = actionData.detail
        }
        else if (thisAction == "witch") {
            goNextStep = !goNextStep
        }
        if (goNextStep) {
            console.log(room.stepFlow)
            var thisStepIdx = _.indexOf(room.stepFlow, thisAction)
            console.log(thisStepIdx)
            console.log(room.stepFlow[thisStepIdx])
            if (thisStepIdx < room.stepFlow.length - 1) {
                room.step = room.stepFlow[thisStepIdx + 1]
                var audios = room.stepFlow[thisStepIdx] + "_stop " + room.stepFlow[thisStepIdx + 1] + "_start"
                console.log(audios)
                io.sockets.in(socket.room).emit("execute-step", {
                    step: room.stepFlow[thisStepIdx + 1],
                    audioList: audios
                });
            }
            else {
                room.deathPool.splice(0, room.deathPool.length)
                var deathAudio = '';
                if (room.lastPoison != 0) {
                    room.deathPool.push(room.lastPoison)
                }
                if ((room.lastKill == (room.lastSave || room.lastGuard)) && room.lastSave != room.lastGuard && room.deathPool.length == 0 || room.lastKill == 0) {
                    deathAudio = 'pingan'
                } else {
                    room.deathPool.push(room.lastKill)
                    room.deathPool.sort()

                    _.each(room.deathPool, function (death) {
                        deathAudio += (death + " hao ")
                    })
                    deathAudio += "which_isdead"
                }
                var audios = room.stepFlow[thisStepIdx] + "_stop " + "tianliang "
                if (room.dayNo == 1) {
                    audios += "police_vote"
                } else audios += "tonight " + deathAudio
                console.log(audios)
                io.sockets.in(socket.room).emit("execute-step", {step: "day", audioList: audios});
            }
        }
        io.sockets.in(socket.room).emit("update-room-status", room);
        console.log(room)
    });
    socket.on("specialAction", function (actionData) {
        var user = people[uid];
        var room = rooms[user.inroom];
        console.log("specialAction", actionData)
        var goNextStep = false;
        var thisAction = actionData.action;
        var audios = ""
        if (thisAction == "voteOut") {
            delete room.characters[actionData.detail]
            room.outPool.push({
                userNum:actionData.detail,
                reason:"vote",
                note:room.dayNo
            })
            io.sockets.in(socket.room).emit("afterVote");
        }
        else if (thisAction == "suicide") {
            delete room.characters[actionData.detail]
            room.outPool.push({
                userNum:actionData.detail,
                reason:"suicide",
                note:room.dayNo
            })
            audios+=(death + " hao" + " suicide")
            if (room.dayNo==1){
                audios+="tonight "
                _.each(room.deathPool, function (death) {
                    deathAudio += (death + " hao ")
                })
                audios += "which_isdead"
            }
            io.sockets.in(socket.room).emit("afterSuicide",{
                audioList: audios
            });
        }
        else if (thisAction == "killChoice") {
            var targetNum = actionData.detail
            var killerIdx = _.findIndex(room.killChoices, {
                wolf: parseInt(user.seatNum)
            });
            if (killerIdx != -1) {
                room.killChoices.splice(killerIdx, 1)
            }
            room.killChoices.push({wolf: parseInt(user.seatNum), target: parseInt(targetNum)})

        } else if (thisAction == "wolf") {
            room.lastKill = actionData.detail
            goNextStep = !goNextStep
        }
        else if (thisAction == "predictor") {
            goNextStep = !goNextStep
        }
        else if (thisAction == "witchSave") {
            room.lastSave = room.lastKill
        }
        else if (thisAction == "witchPoison") {
            room.lastPoison = actionData.detail
        }
        else if (thisAction == "witch") {
            goNextStep = !goNextStep
        }
        if (goNextStep) {
            console.log(room.stepFlow)
            var thisStepIdx = _.indexOf(room.stepFlow, thisAction)
            console.log(thisStepIdx)
            console.log(room.stepFlow[thisStepIdx])
            if (thisStepIdx < room.stepFlow.length - 1) {
                room.step = room.stepFlow[thisStepIdx + 1]
                var audios = room.stepFlow[thisStepIdx] + "_stop " + room.stepFlow[thisStepIdx + 1] + "_start"
                console.log(audios)
                io.sockets.in(socket.room).emit("execute-step", {
                    step: room.stepFlow[thisStepIdx + 1],
                    audioList: audios
                });
            }
            else {
                room.deathPool.splice(0, room.deathPool.length)
                var deathAudio = '';
                if (room.lastPoison != 0) {
                    room.deathPool.push(room.lastPoison)
                }
                if ((room.lastKill == (room.lastSave || room.lastGuard)) && room.lastSave != room.lastGuard && room.deathPool.length == 0 || room.lastKill == 0) {
                    deathAudio = 'pingan'
                } else {
                    room.deathPool.push(room.lastKill)
                    room.deathPool.sort()

                    _.each(room.deathPool, function (death) {
                        deathAudio += (death + " hao ")
                    })
                    deathAudio += "which_isdead"
                }
                var audios = room.stepFlow[thisStepIdx] + "_stop " + "tianliang "
                if (room.dayNo == 1) {
                    audios += "police_vote"
                } else audios += "tonight " + deathAudio
                console.log(audios)
                io.sockets.in(socket.room).emit("execute-step", {step: "day", audioList: audios});
            }
        }
        io.sockets.in(socket.room).emit("update-room-status", room);
        console.log(room)
    });

    socket.on("joinRoom", function (id) {
        if (typeof people[uid] !== "undefined") {
            var room = rooms[id];
            console.log(room);
            if (uid === room.owner) {
                socket.emit("update", "You are the owner of this room and you have already been joined.");
            }
            else if (!_.has(rooms, id)) {
                socket.emit("update", "房间已过期或号码有误，请重试");
            }
            else if (_.size(rooms.characters) <= rooms.person.length) {
                socket.emit("update", "房间已满");
            }
            else {
                if (_.contains((room.people), uid)) {
                    socket.emit("update", "You have already joined this room.");
                } else {
                    if (people[uid].inroom !== null) {
                        socket.emit("update", "You are already in a room (" + rooms[people[uid].inroom].name + "), please leave it first to join another room.");
                    } else {
                        people[uid].inroom = id;
                        socket.room = room.name;
                        socket.join(socket.room);
                        user = people[uid];
                        room.addPerson(user);

                        io.sockets.in(socket.room).emit("update", user.name + " has connected to " + room.name + " room.");
                        socket.emit("update", "Welcome to " + room.name + ".");
                        io.to(socket.room).emit("update-room-status", rooms[id]);
                        socket.emit("update-user-status", people[uid]);
                        socket.emit("sendRoomID", {id: id});
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