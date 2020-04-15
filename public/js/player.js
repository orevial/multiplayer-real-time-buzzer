$(function () {
    var socket = io();

    /*
    * Main use cases for a user reaching the join page:
    *  - If reaching on /join/:partyId
    *       => Should ask for player name only
    *  - If reaching on /join/:partyId with both gameId and player name
    *       => Should connect to party
    */

    // TODO Handle deconnection properly, keeping score and everything ...

    const pathParts = window.location.pathname.split("/");
    const gameId = pathParts[pathParts.length - 1];
    let playerId = localStorage.getItem("player_playerId");
    let playerName = localStorage.getItem("player_playerName");
    let gameStarted = false;

    console.log("Game id : " + gameId);
    console.log("Playing with player " + playerName + "...");

    console.log("Checking whether game exists...");
    verifyGame(gameId);

    $(document).keydown(function (e) {
        if (gameStarted && (e.key === 'b' || e.key === 'B')) {
            pressBuzzer();
        }
    });

    $('#playerConnectionForm').submit(function (e) {
        e.preventDefault();

        const playerName = $("#userNameInput").val();
        joinGame(gameId, playerName);

        return false;
    });

    $('#buzzerButton').click(function () {
        pressBuzzer();
        return false;
    });

    $('#editPlayerNameIcon').click(function () {
        $('#editPlayerNameForm input').val($('#playerName').text())
        togglePlayerNameDisplay();
        togglePlayerNameEditionForm();
    });

    $('#editPlayerNameForm button').click(function () {
        const newPlayerName = $('#editPlayerNameForm input').val();

        socket.emit('message', {
            issuer: 'player',
            issuerId: playerId,
            type: 'inGame',
            action: 'changePlayerName',
            data: newPlayerName
        });

        localStorage.setItem("player_playerName", newPlayerName);
        $('#playerName').text(newPlayerName);

        togglePlayerNameDisplay();
        togglePlayerNameEditionForm();
    });

    socket.on('message', function (msg) {
        switch (msg.action) {
            case 'connect':
                console.log("Asking for user connection...");
                break;
            case 'gameExists':
                console.log("OK: Game exists");
                hideLoader();
                if (playerName) {
                    console.log("==> Should now join the game !")
                    localStorage.setItem("player_playerName", playerName);
                    joinGame(gameId, playerName);
                } else {
                    showPlayerForm();
                }
                break;
            case 'error_gameDoesNotExists':
                console.log("KO: Game does not exist");
                alert("Specified game does not exist, please check the party code !")
                window.location.href = "/";
                break;
            case 'hostDisconnected':
                console.log("Alert: party host disconnected !")
                alert("Party host disconnected ! " +
                    "You can wait here for host to reconnect");
                showLoader();
                break;
            // TODO Handle host reconnection properly
            case 'gameJoined':
                localStorage.setItem("player_playerId", msg.data.id);
                localStorage.setItem("player_playerName", msg.data.name);
                playerId = msg.data.id;
                $('#playerName').text(msg.data.name);
                hidePlayerForm();
                showGame();
                break;
            case 'connectedPlayers':
                displayConnectedPlayers(msg.data);
                break;
            case 'buzzedPlayers':
                displayBuzzedPlayers(msg.data);
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

    function togglePlayerNameDisplay() {
        $('#playerNameDisplay').toggle();
    }

    function togglePlayerNameEditionForm() {
        $('#editPlayerNameForm').toggle();
    }


    function hidePlayerForm() {
        $('#playerConnectionContainer').hide();
    }

    function showPlayerForm() {
        $('#playerConnectionContainer').show();
    }

    function showGame() {
        gameStarted = true;
        $('#buzzerContainer').show();
        $('#gameContainer').show();
    }

    function verifyGame(gameId) {
        socket.emit('message', {issuer: 'player', type: 'beforeGame', action: 'verifyGame', data: {gameId: gameId}});
    }

    function joinGame(gameId, playerName) {
        socket.emit('message', {
            issuer: 'player',
            type: 'beforeGame',
            action: 'joinGame',
            data: {gameId: gameId, playerName: playerName}
        });
    }

    function pressBuzzer() {
        socket.emit('message', {issuer: 'player', issuerId: playerId, type: 'inGame', action: 'buzz'});
        $('#buzzerButton').addClass("buzzed");
    }
});