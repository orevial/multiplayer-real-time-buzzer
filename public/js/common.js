function displayConnectedPlayers(players) {
    const table = $("#connectedPlayers");
    table.empty();

    table.append($('<thead>')
        .append($('<tr>')
            .append($('<td>').text("N°"))
            .append($('<td>').text("Name"))
            .append($('<td>').text("Score"))
        )
    );
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        let position = (i <= 2 && player.score > 0) ? '<span class="fas fa-trophy position-' + (i + 1) + '"></span>' : (i + 1);
        table.append($('<tr>')
            .append($('<td>').html(position))
            .append($('<td>').text(player.name))
            .append($('<td>').text(player.score))
        );
    }
}

function displayBuzzedPlayers(players, isAdmin) {
    const table = $("#buzzedPlayers");
    table.empty();

    if (isAdmin) {
        table.append($('<thead>')
            .append($('<tr>')
                .append($('<td>').text("N°"))
                .append($('<td>').text("Name"))
                .append($('<td>').text("Delay"))
                .append($('<td>'))
                .append($('<td>'))
            )
        );
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            table.append($('<tr>')
                .append($('<td>').text(i + 1).addClass("playerIndex").attr("socketId", player.socketId))
                .append($('<td>').text(player.name))
                .append($('<td>').text(player.buzzedDelay))
                .append($('<td>').html('<button type="button" class="btn btn-info decreasePlayerScore"><span class="fas fa-minus"></span></button>'))
                .append($('<td>').html('<button type="button" class="btn btn-info increasePlayerScore"><span class="fas fa-plus"></span></button>'))
            );
        }
    } else {
        table.append($('<thead>')
            .append($('<tr>')
                .append($('<td>').text("N°"))
                .append($('<td>').text("Name"))
                .append($('<td>').text("Delay"))
            )
        );
        for (i = 0; i < players.length; i++) {
            const player = players[i];
            table.append($('<tr>')
                .append($('<td>').text(i + 1))
                .append($('<td>').text(player.name))
                .append($('<td>').text(player.buzzedDelay))
            );
        }
    }
}

function showLoader() {
    $('#gameLoader').hide();
}

function hideLoader() {
    $('#gameLoader').hide();
}