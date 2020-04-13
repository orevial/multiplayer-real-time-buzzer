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

app.get('/join/:gameId', function (req, res) {
    res.sendFile(__dirname + '/player.html');
});

app.use(function (req, res, next) {
    res.status(404).sendFile(__dirname + '/404.html');
});

io.on('connection', function (socket) {
    socket.on('message', function (msg) {
        let issuer = msg.issuer;

        if (issuer === 'host') {
            handleHostAction(socket, msg.type, msg.action, msg.data);
        } else if (issuer === 'player') {
            handlePlayerAction(socket, msg.type, msg.action, msg.data);
        } else {
            console.log("Unknow issuer " + issuer + ", will do nohing...");
            console.log(msg);
        }
    });
    socket.on('disconnect', function () {
        const socketId = this.id;
        console.log('User disconnected : ' + socketId);

        if (socketAndHostIds.has(socketId)) {
            const hostId = socketAndHostIds.get(socketId);
            const game = games.get(hostInGames.get(hostId))
            socketAndHostIds.delete(socketId);

            game.broadcastMessageToPlayers({action: 'hostDisconnected'});
        }
        if (socketAndPlayerIds.has(socketId)) {
            const playerId = socketAndPlayerIds.get(socketId);
            const game = games.get(playersInGames.get(playerId))

            socketAndPlayerIds.delete(socketId);
            game.removeConnectedPlayer(socketId);
            game.broadcastConnectedPlayers();
            game.broadcastBuzzedPlayers();
        }
    })
});

http.listen(3000, function () {
    console.log('server listening on port 3000...');
});

// -----------------------------------------------------------
// Game logic here...
// -----------------------------------------------------------
function handleHostAction(socket, type, action, data) {
    if (type === 'beforeGame') {
        // Initialization phase
        switch (action) {
            case 'createGame':
                const newGame = createNewGame(socket);
                console.log("Created new game with id " + newGame.id);
                setGameHost(socket, newGame);
                socket.emit("message", {action: 'hostingGame', data: newGame.getSimpleGame()});
                break;
            case 'hostExistingGame':
                const gameId = parseInt(data.gameId);
                if (gameExists(gameId)) {
                    console.log("User with id " + data.hostId + " wants to host game id " + data.gameId);
                    const game = games.get(gameId);
                    setGameHost(socket, game);
                    socket.emit("message", {action: 'hostingGame', data: game.getSimpleGame()});
                    game.broadcastConnectedPlayers();
                    game.broadcastBuzzedPlayers();
                } else {
                    socket.emit("message", {action: 'error_gameDoesNotExists'});
                }
                break;
            default:
                console.log("Default: nothing implemented for host action " + action + " yet...");
                break;
        }
    } else {
        // In-Game interactions
        const socketId = socket.id;
        const hostId = socketAndHostIds.get(socketId);
        const gameId = hostInGames.get(hostId);
        const game = games.get(gameId);

        switch (action) {
            case 'resetBuzzers':
                game.resetBuzzedPlayers();
                game.broadcastUnbuzzOrder();
                game.broadcastBuzzedPlayers();
                break;
            case 'increasePlayerScore':
                game.increasePlayerScore(data)
                game.broadcastConnectedPlayers();
                break;
            case 'decreasePlayerScore':
                game.decreasePlayerScore(data)
                game.broadcastConnectedPlayers();
                break;
            default:
                console.log("Default: nothing implemented for host action " + action + " yet...");
                break;
        }
    }

}

function setGameHost(hostSocket, game) {
    socketAndHostIds.set(hostSocket.id, game.hostId);
    hostInGames.set(game.hostId, game.id);
    game.hostSocket = hostSocket;
}

function handlePlayerAction(socket, type, action, data) {
    const socketId = socket.id;

    if (type === 'beforeGame') {
        // Initialization phase
        switch (action) {
            case 'verifyGame':
                if (gameExists(data.gameId)) {
                    socket.emit("message", {action: 'gameExists'});
                } else {
                    socket.emit("message", {action: 'error_gameDoesNotExists'});
                }
                break;
            // TODO Make sure no other player has the same name !
            case 'joinGame':
                // TODO Pass real index here...
                const player = new Player(socket, data.playerName, 0);
                const joinGameId = parseInt(data.gameId);

                if (gameExists(joinGameId)) {
                    console.log('User joining the party ' + joinGameId + ' : ' + player.name + ' (' + player.id + ')');

                    socketAndPlayerIds.set(socketId, player.id);
                    playersInGames.set(player.id, joinGameId);
                    const game = games.get(joinGameId);

                    game.addConnectedPlayer(player)
                    socket.emit("message", {action: 'gameJoined', data: player.getSimplePlayer()});

                    game.broadcastConnectedPlayers();
                    game.broadcastBuzzedPlayers();
                } else {
                    socket.emit("message", {action: 'error_gameDoesNotExists'});
                }
                break;
            default:
                console.log("Default: nothing implemented for player action " + action + " yet...");
                break;
        }
    } else {
        // In-Game interactions
        const playerId = socketAndPlayerIds.get(socketId);
        const gameId = playersInGames.get(playerId);
        const game = games.get(gameId);

        switch (action) {
            case 'buzz':
                const playerAdded = game.addBuzzedPlayer(socketId);
                if (playerAdded) {
                    game.broadcastBuzzedPlayers();
                }
                break;
            default:
                console.log("Default: nothing implemented for player action " + action + " yet...");
                break;
        }
    }

}

// -----------------------------------------------------------
// Game model and functions below...
// -----------------------------------------------------------

// TODO Clean games somehow someday
let games = new Map();
// A map of host id and corresponding gameId
let hostInGames = new Map();
// A map of host socketId and corresponding player id
let socketAndHostIds = new Map();
// A map of player id and corresponding gameId
let playersInGames = new Map();
// A map of player socketId and corresponding player id
let socketAndPlayerIds = new Map();

function createNewGame(hostSocket) {
    let gameId;
    do {
        gameId = generateGameId();
    } while (games.has(gameId));

    const newGame = new Game(gameId, hostSocket);
    games.set(gameId, newGame);

    console.log(newGame.getSimpleGame());

    return newGame;
}

function Game(id, hostSocket) {
    this.id = id;
    this.hostId = generateRandomUUID();
    this.hostSocket = hostSocket;
    this.creationDate = Date.now();
    this.connectedPlayers = [];
    this.buzzedPlayers = [];
    this.disconnectedPlayers = [];
}

Game.prototype = {
    getSimpleGame: function () {
        return {
            id: this.id,
            hostId: this.hostId
        }
    },

    addConnectedPlayer: function (player) {
        this.connectedPlayers.push(player);
    },

    removeConnectedPlayer: function (socketId) {
        const player = this.connectedPlayers.find(pl => pl.socketId === socketId);
        if (player) {
            this.connectedPlayers = this.connectedPlayers.filter(function (player) {
                return player.socketId !== socketId;
            });
            this.buzzedPlayers = this.buzzedPlayers.filter(function (player) {
                return player.socketId !== socketId;
            })
            this.disconnectedPlayers.push(player);
        } else {
            console.log("[ERROR] Trying to remove a playing that is not in this game...");
        }
    },

    addBuzzedPlayer: function (socketId) {
        if (!this.buzzedPlayers.find(pl => pl.socketId === socketId)) {
            const player = this.connectedPlayers.find(pl => pl.socketId === socketId)

            // Player is the first to buzz
            if (this.buzzedPlayers.length === 0) {
                player.buzzedTime = Date.now();
            } else {
                player.buzzedDelay = this.calculateBuzzDelay();
            }
            this.buzzedPlayers.push(player);
            return true;
        }
        return false;
    },

    calculateBuzzDelay: function () {
        const firstBuzzTime = this.buzzedPlayers[0].buzzedTime;
        const duration = Date.now() - firstBuzzTime;
        const sec = Math.trunc(duration / 1000);
        const millis = duration - sec * 1000;
        return "+" + sec + "s " + millis;
    },

    resetBuzzedPlayers: function () {
        this.connectedPlayers.forEach(function (player) {
            player.buzzedDelay = ""
        });
        this.buzzedPlayers = [];
    },

    increasePlayerScore: function (playerSocketId) {
        this.buzzedPlayers
            .filter(function (player) {
                return player.socketId === playerSocketId;
            })
            .forEach(player => player.score += 1);
    },

    decreasePlayerScore: function (playerSocketId) {
        this.buzzedPlayers
            .filter(function (player) {
                return player.socketId === playerSocketId;
            })
            .forEach(player => {
                player.score -= 1
            });
    },

    broadcastConnectedPlayers: function () {
        const players = this.connectedPlayers
            .sort((a, b) => b.score - a.score)
            .map(player => player.getSimplePlayer());
        this.broadcastMessage({
            action: 'connectedPlayers',
            data: players
        });
    },

    broadcastBuzzedPlayers: function () {
        const players = this.buzzedPlayers
            .map(player => player.getSimplePlayer())
        this.broadcastMessage({
                action: 'buzzedPlayers',
                data: players
            }
        );
    },

    broadcastUnbuzzOrder: function () {
        this.broadcastMessageToPlayers({
            action: 'resetBuzzer'
        });
    },

    broadcastMessage: function (messageContent) {
        this.hostSocket.emit("message", messageContent);
        this.broadcastMessageToPlayers(messageContent);
    },

    broadcastMessageToPlayers: function (messageContent) {
        this.connectedPlayers.forEach(player =>
            player.socket.emit("message", messageContent)
        );
    }
}

function generateGameId() {
    return Math.floor(Math.random() * 1000000);
}

function gameExists(gameId) {
    return games.has(parseInt(gameId));
}

// -----------------------------------------------------------
// Players model and functions below
// -----------------------------------------------------------

function Player(socket, name, index) {
    this.id = generateRandomUUID();
    this.socket = socket;
    this.socketId = socket.id;
    this.name = name;
    this.buzzedTime = "";
    this.buzzedDelay = "";
    this.index = index;
    this.score = 0;
}

Player.prototype = {
    getSimplePlayer: function () {
        return {
            id: this.id,
            socketId: this.socketId,
            name: this.name,
            buzzedTime: this.buzzedTime,
            buzzedDelay: this.buzzedDelay,
            index: this.index,
            score: this.score,
        }
    }
};


// -----------------------------------------------------------
// Utils functions below
// -----------------------------------------------------------

function generateRandomUUID() {
    let u = Date.now().toString(16) + Math.random().toString(16) + '0'.repeat(16);
    return [u.substr(0, 8), u.substr(8, 4), '4000-8' + u.substr(13, 3), u.substr(16, 12)].join('-');
}