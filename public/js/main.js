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

var chat_room = getURLParameters('game_id');
if(typeof chat_room == 'undefined' || !chat_room){
    chat_room = 'lobby';
}


/*Connect to the socket server*/
var socket =  io.connect();

/*When server sends log*/
socket.on('log', function(array){
    console.log.apply(console,array);
});

/*When server sends message response*/
socket.on('send_message_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    document.getElementById('messages').insertAdjacentHTML('afterbegin', '<p><b>'+ payload.username +' says:</b> '+payload.message+'</p>');

});

/*When server responds that someone joined room*/
socket.on('join_room_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }

    /*If we joined the room, ignore it*/
    if(payload.socket_id == socket.id){
        return;
    }
    /*Add new row when new user joined*/
    var dom_elements = $('.socket_' + payload.socket_id);

    /*New user*/
    if(dom_elements.length == 0){
        var nodeA = $('<div></div>');
        nodeA.addClass('socket_' + payload.socket_id);

        var nodeB = $('<div style=\'text-align: right;\'></div>');
        nodeB.addClass('socket_' + payload.socket_id);

        var nodeC = $('<div style=\'text-align: left;\'></div>');
        nodeC.addClass('socket_' + payload.socket_id);

        nodeA.addClass('w-100');

        nodeB.addClass('col-9 text-right');
        nodeB.append('<h4>'+payload.username+'</h4>');

        nodeC.addClass('col-3 text-left');
        var buttonC = makeInviteButton();
        nodeC.append(buttonC);

        nodeA.hide();
        nodeB.hide();
        nodeC.hide();

        $('#players').append(nodeA, nodeB, nodeC);
        nodeA.slideDown(1000);
        nodeB.slideDown(1000);
        nodeC.slideDown(1000);
    }
    else{
        var buttonC = makeInviteButton();
        $('.socket_'+payload.socket_id+' button').replaceWith(buttonC);
        dom_elements,slideDown(1000);
    }

    /*Manage new user join message*/
    var newHTML = '<p>'+payload.username+' just joined the room</p>';
    var newNode = $(newHTML);
    newNode.hide();
    $('#messages').append(newNode);
    newNode.slideDown(1000);

});


/*When server responds that someone left a room*/
socket.on('player_disconnected',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }

    /*If we joined the room, ignore it*/
    if(payload.socket_id == socket.id){
        return;
    }

    /*Remove the row when user leaves*/
    var dom_elements = $('.socket_' + payload.socket_id);

    /*If user exists*/
    if(dom_elements.length != 0){
        dom_elements.slideUp(1000);
    }

    /*Manage user left message*/
    var newHTML = '<p>'+payload.username+' has left the room</p>';
    var newNode = $(newHTML);
    newNode.hide();
    $('#messages').append(newNode);
    newNode.slideDown(1000);

});



function send_message(){
    var payload = {};
    payload.room = chat_room;
    payload.username = username;
    payload.message = document.getElementById('send_message_holder').value;

    console.log('*** Client Log Message: \'send_message\' payload: '+ JSON.stringify(payload));
    socket.emit('send_message',payload);
}

function makeInviteButton(){
    var newHTML = '<button type=\'button\' class=\'btn btn-primary\'>Invite</button>';
    var newNode = $(newHTML);
    return newNode;
}

document.addEventListener("DOMContentLoaded",function(event){
    var payload = {};
    payload.room = chat_room;
    payload.username = username;

    console.log('*** Client Log Message: \'join room\' payload: '+ JSON.stringify(payload));
    socket.emit('join_room',payload);
});
