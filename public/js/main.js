/*Functions for general use*/

/*This function return the value of whichParam*/
function getURLParameters(whichParam)
{
    var pageURL = window.location.search.substring(1);
    var pageURLVariables = pageURL.split('&');
    for (var i=0; i < pageURLVariables.length; i++)
    {
        var paramName = pageURLVariables[i].split('=');
        if(paramName[0] == whichParam)
            return paramName[1];
    }
}

var username = getURLParameters('username');
if(typeof username == 'undefined' || !username){
    username = "Anonymous_" + Math.floor(Math.random() * 100 + 1);
}
//document.getElementById('messages').insertAdjacentHTML('afterbegin', '<h4>'+ username +'</h4>');
var chat_room = 'One_Room';


/*Connect to the socket server*/

var socket =  io.connect();

socket.on('log', function(array){
    console.log.apply(console,array);
});

socket.on('join_room_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    document.getElementById('messages').insertAdjacentHTML('afterbegin', '<p>New User joined the room: '+ payload.username +'</p>');

});

document.addEventListener("DOMContentLoaded",function(event){
    var payload = {};
    payload.room = chat_room;
    payload.username = username;

    console.log('*** Client Log Message: \'join room\' payload: '+ JSON.stringify(payload));
    socket.emit('join_room',payload);
});
