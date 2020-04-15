$(function () {
    var socket = io();

    let gameId = localStorage.getItem("host_gameId");
    let hostId = localStorage.getItem("host_hostId");

    /* TODO Add a way to recreate a new party if needed (with a button)
        ... because otherwise local storage we
    */
    if (gameId && hostId) {
        console.log("Party can be recovered from local storage !")

        // Connect party to socket.io
        // TODO Refactor using issuerId instead...
        socket.emit('message', {
            issuer: 'host',
            type: 'beforeGame',
            action: 'hostExistingGame',
            data: {gameId: gameId, hostId: hostId}
        });

        // Start party from existing settings
        startParty(gameId, hostId);
    } else {
        socket.emit('message', {issuer: 'host', type: 'beforeGame', action: 'createGame'});
    }

    $('#resetBuzzers').click(function () {
        socket.emit('message', {issuer: 'host', issuerId: hostId, type: 'inGame', action: 'resetBuzzers'});
    });

    $(document).on("click", "#buzzedPlayers .decreasePlayerScore", function (e) {
        console.log("Should decrease player score");
        var socketId = $(this).parent().siblings(".playerIndex").attr("socketId");

        console.log("Player socketId: " + socketId);
        socket.emit('message', {
            issuer: 'host',
            issuerId: hostId,
            type: 'inGame',
            action: 'decreasePlayerScore',
            data: socketId
        });
    });

    $(document).on("click", "#buzzedPlayers .increasePlayerScore", function (e) {
        console.log("Should increase player score");
        var socketId = $(this).parent().siblings(".playerIndex").attr("socketId");

        console.log("Player socketId: " + socketId);
        socket.emit('message', {
            issuer: 'host',
            issuerId: hostId,
            type: 'inGame',
            action: 'increasePlayerScore',
            data: socketId
        });
    });

    socket.on('message', function (msg) {
        // console.log("Receiving msg : " + msg);
        // console.log("action: " + msg.action);
        switch (msg.action) {
            case 'hostingGame':
                console.log("Game created with id " + msg.data.id);
                localStorage.setItem("host_gameId", msg.data.id)
                localStorage.setItem("host_hostId", msg.data.hostId)
                gameId = msg.data.id;
                hostId = msg.data.hostId;
                startParty(gameId, hostId);
                break;
            case 'error_gameDoesNotExists':
                console.log("KO: Game does not exist, creating a new one...");
                socket.emit('message', {issuer: 'host', type: 'beforeGame', action: 'createGame'});
                break;
            case 'connect':
                console.log("Asking for user connection...");
                break;
            case 'playerOk':
                $('#playerName').text(msg.data.name);
                $('#content').addClass("connected");
                break;
            case 'connectedPlayers':
                displayConnectedPlayers(msg.data);
                break;
            case 'buzzedPlayers':
                displayBuzzedPlayers(msg.data, true);
                break;
            case 'resetBuzzer':
                $('#buzzerButton').removeClass("buzzed");
                break;
            default:
                console.log("[DEFAULT] Unknown action type: " + msg.action);
                console.log(msg);
                break;
        }
    });

    function startParty(gameId) {
        $('.buzzerPartyId').text(gameId);
        const partyUrl = window.location.origin + "/join/" + gameId;
        $('#buzzerPartyUrl').text(partyUrl);
        $('#buzzerPartyUrl').attr("href", partyUrl);
        hideLoader();
        $('.gameContent').show();
    }
});