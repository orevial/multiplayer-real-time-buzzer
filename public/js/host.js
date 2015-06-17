$(function () {
    var socket = io();

    const gameId = localStorage.getItem("gameId");
    const hostId = localStorage.getItem("hostId");

    /* TODO Add a way to recreate a new party if needed (with a button)
        ... because otherwise local storage we
    */
    if(gameId && hostId) {
        console.log("Party can be recovered from local storage !")

        // Connect party to socket.io
        socket.emit('message', {action: 'hostExistingGame', data: { gameId: gameId, hostId: hostId }});

        // Start party from existing settings
        startParty(gameId, hostId);
    } else {
        socket.emit('message', {action: 'createGame'});
    }

    $('#resetBuzzers').click(function () {
        socket.emit('message', {action: 'resetBuzzers'});
    });

    $(document).on("click", "#buzzedPlayers .decrease_player_score", function (e) {
        console.log("Should decrease player score");
        var socketId = $(this).parent().siblings(".playerIndex").attr("socketId");

        console.log("Player socketId: " + socketId);
        socket.emit('message', {action: 'decrease_player_score', data: socketId});
    });

    $(document).on("click", "#buzzedPlayers .increase_player_score", function (e) {
        console.log("Should increase player score");
        var socketId = $(this).parent().siblings(".playerIndex").attr("socketId");

        console.log("Player socketId: " + socketId);
        socket.emit('message', {action: 'increase_player_score', data: socketId});
    });

    socket.on('message', function (msg) {
        console.log("Receiving msg : " + msg);
        console.log("action: " + msg.action);
        switch (msg.action) {
            case 'gameCreated':
                console.log("Game created with id " + msg.data.id);
                localStorage.setItem("gameId", msg.data.id)
                localStorage.setItem("hostId", msg.data.hostId)
                startParty(gameId, hostId);
                break;
            case 'connect':
                console.log("Asking for user connection...");
                break;
            case 'playerOk':
                $('#player_name').text(msg.data.name);
                $('#content').addClass("connected");
                break;
            case 'connectedPlayers':
                displayConnectedPlayers(msg.data);
                break;
            case 'buzzedPlayers':
                displayBuzzedPlayers(msg.data, true);
                break;
            case 'resetBuzzer':
                $('#buzzer_button').removeClass("buzzed");
                break;
            default:
                console.log("[DEFAULT] Unknown action type: " + msg.action);
                console.log(msg);
                break;
        }
    });

    function startParty(gameId, hostId) {
        $('#buzzerPartyId').text(gameId);
    }
});