$(function () {
    var socket = io();

    // TODO Handle deconnection

    const playerName = localStorage.getItem("playerName");
    console.log("Playing with player " + playerName + "...");

    $('#player_connection_form').submit(function (e) {
        e.preventDefault();

        var player_name = $("#userNameInput").val();
        socket.emit('message', {action: "connect", data: player_name});

        return false;
    });

    $('#buzzer_button').click(function (e) {
        socket.emit('message', {action: 'buzz'});

        $('#buzzer_button').addClass("buzzed");

        return false;
    });

    socket.on('message', function (msg) {
        console.log("Receiving msg : " + msg);
        console.log("action: " + msg.action);
        switch (msg.action) {
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
                displayBuzzedPlayers(msg.data);
                break;
            case 'resetBuzzer':
                $('#buzzer_button').removeClass("buzzed");
                break;
            default:
                console.log("[DEFAULT] Message received:");
                console.log(msg);
                break;
        }
    });
});

