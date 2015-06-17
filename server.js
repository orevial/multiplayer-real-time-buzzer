/**
 * Created by sreejeshpillai on 09/05/15.
 */
var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/host', function (req, res) {
    res.sendFile(__dirname + '/host.html');
});

app.get('/join', function (req, res) {
    res.sendFile(__dirname + '/participant.html');
});

io.on('connection', function (socket) {

    broadcastConnectedPlayers();
    broadcastBuzzedPlayers();

    socket.on('message', function (msg) {
        const socketId = this.id;
        switch (msg.action) {
            case 'createGame':
                const game = createNewGame(socketId);
                socket.emit("message", {action: 'gameCreated', data: game});
                break;
            case 'hostExistingGame':
                // TODO Implement this !
                console.log("User with id " + msg.data.hostId + " wants to host game id " + msg.data.gameId);
                break;
            case 'connect':
                // TODO Make sure no other player has the same name !

                const player = new Player(socketId, msg.data);
                console.log('User joining the party : ' + player.name + ' (' + player.id + ')');
                addConnectedPlayer(player)
                socket.emit("message", {action: 'playerOk', data: player});

                broadcastConnectedPlayers();
                break;
            case 'buzz':
                var player_added = addBuzzedPlayer(socketId);
                if (player_added) {
                    broadcastBuzzedPlayers();
                }
                break;
            case 'resetBuzzers':
                resetBuzzedPlayers();
                broadcastUnbuzzOrder();
                broadcastBuzzedPlayers();
                break;
            case 'increase_player_score':
                increasePlayerScore(msg.data)
                broadcastConnectedPlayers();
                break;
            case 'decrease_player_score':
                decreasePlayerScore(msg.data)
                broadcastConnectedPlayers();
                break;
            default:
                console.log("Default: nothing for now...");
                break;
        }
    });
    socket.on('disconnect', function () {
        const socketId = this.id;
        console.log('User disconnected : ' + socketId);
        removeConnectedPlayer(socketId);
        // TODO Also remove buzzed player
        broadcastBuzzedPlayers();
    })
});

http.listen(3000, function () {
    console.log('server listening on port 3000...');
});

// -----------------------------------------------------------
// Game stuff here...
// -----------------------------------------------------------

// TODO Clean games somehow someday
var games = []

function createNewGame(hostSocketId) {
    let gameId;
    do {
        console.log("Generating new game id...");
        gameId = generateGameId();
    } while (games.find(game => game.id === gameId));

    console.log("Creating game with id : " + gameId);
    const newGame = new Game(gameId, hostSocketId);
    games.push(newGame);

    console.log(newGame);

    return newGame;
}

function Game(id, hostSocketId) {
    this.id = id;
    this.hostId = generateRandomUUID();
    this.hostSocketId = hostSocketId
}

function generateGameId() {
    return Math.floor(Math.random() * 1000000);
}

// -----------------------------------------------------------
// Players stuff below
// -----------------------------------------------------------
var connectedPlayers = [];
var buzzedPlayers = [];

function Player(socketId, name) {
    this.id = generateRandomUUID();
    this.socketId = socketId;
    this.name = name;
    this.buzzedTime = "";
    this.buzzedDelay = "";
    this.index = connectedPlayers.length;
    this.score = 0;
}

function addConnectedPlayer(player) {
    connectedPlayers.push(player);
}

function removeConnectedPlayer(socketId) {
    connectedPlayers = connectedPlayers.filter(function (player) {
        return player.socketId !== socketId;
    });
}

function addBuzzedPlayer(socketId) {
    if (!buzzedPlayers.find(pl => pl.socketId === socketId)) {
        const player = connectedPlayers.find(pl => pl.socketId === socketId)

        // Player is the first to buzz
        if (buzzedPlayers.length === 0) {
            player.buzzedTime = Date.now();
        } else {
            player.buzzedDelay = calculateBuzzDelay();
        }
        buzzedPlayers.push(player);
        return true;
    }
    return false;
}

function calculateBuzzDelay() {
    const firstBuzzTime = buzzedPlayers[0].buzzedTime;
    const duration = Date.now() - firstBuzzTime;
    const sec = Math.trunc(duration / 1000);
    const millis = duration - sec * 1000;
    return "+" + sec + "s " + millis;
}

function resetBuzzedPlayers() {
    connectedPlayers.forEach(function (player) {
        player.buzzedDelay = ""
    });
    buzzedPlayers = [];
}

function increasePlayerScore(playerSocketId) {
    buzzedPlayers
        .filter(function (player) {
            return player.socketId === playerSocketId;
        })
        .forEach(player => player.score += 1);
}

function decreasePlayerScore(playerSocketId) {
    buzzedPlayers
        .filter(function (player) {
            return player.socketId === playerSocketId;
        })
        .forEach(player => {
            player.score -= 1
        });
}

function broadcastConnectedPlayers() {
    const players = connectedPlayers.sort((a, b) => b.score - a.score);
    io.emit("message", {action: 'connectedPlayers', data: players});
}

function broadcastBuzzedPlayers() {
    io.emit("message", {action: 'buzzedPlayers', data: buzzedPlayers});
}

function broadcastUnbuzzOrder() {
    io.emit("message", {
        action: 'resetBuzzer'
    });
}

function generateRandomUUID() {
    let u = Date.now().toString(16) + Math.random().toString(16) + '0'.repeat(16);
    return [u.substr(0, 8), u.substr(8, 4), '4000-8' + u.substr(13, 3), u.substr(16, 12)].join('-');
}