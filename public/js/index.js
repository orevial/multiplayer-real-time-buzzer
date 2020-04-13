$(function () {
    $('#hostButton').click(function(e) {
        console.log("HOST button clicked...");
        window.location.href = "/host"
    });

    $('#joinButton').click(function() {
        console.log("JOIN button clicked...");
        $('#joinPartyForm').toggleClass("show")
    });

    $('#secondJoinButton').click(function(e) {
        e.preventDefault();
        console.log("Second JOIN button clicked...");

        const partyCode = $("#partyCodeInput").val();
        const playerName = $("#playerNameInput").val();

        console.log("Party code : " + partyCode + " - player name : " + playerName);
        localStorage.setItem("player_playerName", playerName);
        window.location.href = "/join/" + partyCode;

        return false;
    });
});