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

function send_message(){
    var payload = {};
    payload.room = chat_room;
    payload.username = username;
    payload.message = document.getElementById('send_message_holder').value;

    console.log('*** Client Log Message: \'send_message\' payload: '+ JSON.stringify(payload));
    socket.emit('send_message',payload);
    $('#send_message_holder').val('');
}

/*When server sends message response*/
socket.on('send_message_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newHTML = '<p><b>'+ payload.username +' says:</b> '+payload.message+'</p>';
    var newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.slideDown(500);
});


/*Send an invite message to server*/
function invite(who){
    var payload = {};
    payload.requested_user = who;

    console.log('***Client Log Message \'invite\' payload: '+JSON.stringify(payload));
    socket.emit('invite',payload);
}

/*When server sends invite response*/
socket.on('invite_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makeInvitedButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);

});

/*Someone invited us*/
socket.on('invited',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makePlayButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);

});


/*Send an uninvite message to server*/
function uninvite(who){
    var payload = {};
    payload.requested_user = who;

    console.log('***Client Log Message \'uninvite\' payload: '+JSON.stringify(payload));
    socket.emit('uninvite',payload);
}

/*When server sends uninvite response*/
socket.on('uninvite_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makeInviteButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);

});

/*Someone uninvited us*/
socket.on('uninvited',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makeInviteButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);

});


/*Send a game_start message to server*/
function game_start(who){
    var payload = {};
    payload.requested_user = who;

    console.log('***Client Log Message \'game_start\' payload: '+JSON.stringify(payload));
    socket.emit('game_start',payload);
}

/*When engaged to play*/
socket.on('game_start_response',function(payload){
    if(payload.result == 'fail'){
        alert(payload.message);
        return;
    }
    var newNode = makeEngagedButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);

    /*Jump to a new page*/
    window.location.href = 'game.html?username='+username+'&game_id='+payload.game_id;
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
        var buttonC = makeInviteButton(payload.socket_id);
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
        uninvite(payload.socket_id);
        var buttonC = makeInviteButton(payload.socket_id);
        $('.socket_'+payload.socket_id+' button').replaceWith(buttonC);
        dom_elements,slideDown(1000);
    }

    /*Manage new user join message*/
    var newHTML = '<p>'+payload.username+' just joined the room</p>';
    var newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
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
    $('#messages').prepend(newNode);
    newNode.slideDown(1000);

});

function makeInviteButton(socket_id){
    var newHTML = '<button style=\'font-weight: bold;\' type=\'button\' class=\'btn btn-primary\'>Invite</button>';
    var newNode = $(newHTML);
    newNode.click(function(){
        invite(socket_id);
    });
    return newNode;
}

function makeInvitedButton(socket_id){
    var newHTML = '<button style=\'font-weight: bold;\' type=\'button\' class=\'btn btn-outline-primary\'>Invited</button>';
    var newNode = $(newHTML);
    newNode.click(function(){
        uninvite(socket_id);
    });
    return newNode;
}

function makePlayButton(socket_id){
    var newHTML = '<button style=\'font-weight: bold;\' type=\'button\' class=\'btn btn-warning\'>Play</button>';
    var newNode = $(newHTML);
    newNode.click(function(){
        game_start(socket_id);
    });
    return newNode;
}

function makeEngagedButton(){
    var newHTML = '<button style=\'font-weight: bold;\' type=\'button\' class=\'btn btn-danger\'>Engaged</button>';
    var newNode = $(newHTML);
    return newNode;
}

$(function(){
    var payload = {};
    payload.room = chat_room;
    payload.username = username;

    console.log('*** Client Log Message: \'join_room\' payload: '+ JSON.stringify(payload));
    socket.emit('join_room',payload);

    $('#quit').append('<a href="lobby.html?username='+username+'" class="btn btn-danger btn-default active" role="button" aria-pressed="true">Quit</a>');

});


var old_board = [
                    ['?','?','?','?','?','?','?','?'],
                    ['?','?','?','?','?','?','?','?'],
                    ['?','?','?','?','?','?','?','?'],
                    ['?','?','?','?','?','?','?','?'],
                    ['?','?','?','?','?','?','?','?'],
                    ['?','?','?','?','?','?','?','?'],
                    ['?','?','?','?','?','?','?','?'],
                    ['?','?','?','?','?','?','?','?']
                ];
var my_color = ' ';

socket.on('game_update',function(payload){

    //var my_color = ' ';
    console.log('*** Client Log Message: \'game_update\' payload: '+ JSON.stringify(payload));
    /*Check for a good board update*/
    if(payload.result == 'fail'){
        console.log(payload.message);
        window.location.href = 'lobby.html?username='+username;
        return;
    }

    /*Check for a good board in payload*/
    var board = payload.game.board;
    if(typeof board == 'undefined'|| !board){
        console.log('Internal error: Bad board from server');
        return;
    }

    /*Update my color*/
    console.log('See: '+ socket.id);
    if(socket.id == payload.game.player_white.socket){
        my_color = 'white';
    }
    else if(socket.id == payload.game.player_black.socket){
        my_color = 'black';
    }
    else{
        window.location.href = 'lobby.html?username='+username;
        return;
    }

    //$('#my_color').html('<h3 id="my_color">I am '+my_color+'</h3>');
    $('#my_color').html('I am '+my_color);
    $('#my_color').append('<h4>It is '+payload.game.whose_turn+'\'s turn</h4>');
    /*Change Board*/
    var blacksum = 0;
    var whitesum = 0;
    var row,col;

    for(row = 0; row<8; row++){
        for(col = 0; col<8; col++){
            if(board[row][col] == 'b'){
                blacksum++;
            }
            if(board[row][col] == 'w'){
                whitesum++;
            }

            /*If tile changed*/
            if(old_board[row][col] != board[row][col]){
                if(old_board[row][col] == '?' && board[row][col] == ' '){
                    $('#'+row+'_'+col).html('<img src="assets/images/empty.png"/>');
                }
                else if(old_board[row][col] == '?' && board[row][col] == 'w'){
                    $('#'+row+'_'+col).html('<img src="assets/images/white.png" width="50" height="50"/>');
                }
                else if(old_board[row][col] == '?' && board[row][col] == 'b'){
                    $('#'+row+'_'+col).html('<img src="assets/images/black.png" width="50" height="50"/>');
                }
                else if(old_board[row][col] == ' ' && board[row][col] == 'w'){
                    $('#'+row+'_'+col).html('<img src="assets/images/white.png" width="50" height="50"/>');
                }
                else if(old_board[row][col] == ' ' && board[row][col] == 'b'){
                    $('#'+row+'_'+col).html('<img src="assets/images/black.png" width="50" height="50"/>');
                }
                else if(old_board[row][col] == 'w' && board[row][col] == ' '){
                    $('#'+row+'_'+col).html('<img src="assets/images/empty.png"/>');
                }
                else if(old_board[row][col] == 'b' && board[row][col] == ' '){
                    $('#'+row+'_'+col).html('<img src="assets/images/empty.png"/>');
                }
                else if(old_board[row][col] == 'b' && board[row][col] == 'w'){
                    $('#'+row+'_'+col).html('<img src="assets/images/white.png" width="50" height="50"/>');
                }
                else if(old_board[row][col] == 'w' && board[row][col] == 'b'){
                    $('#'+row+'_'+col).html('<img src="assets/images/black.png" width="50" height="50"/>');
                }
                else{
                    $('#'+row+'_'+col).html('error');
                }
            }
        
            /* Setup click functions */
            $('#'+row+'_'+col).off('click');
            $('#'+row+'_'+col).removeClass('hovered_over');

            if(payload.game.whose_turn === my_color){
                if(payload.game.legal_moves[row][col] === my_color.substr(0,1)){
                    $('#'+row+'_'+col).addClass('hovered_over');
                    $('#'+row+'_'+col).click(function(r,c){
                        return function(){
                            var payload = {};
                            payload.row = r;
                            payload.col = c;
                            payload.color = my_color;
                            console.log('***Client Log Message:\'play_token\' payload: '+JSON.stringify(payload));
                            socket.emit('play_token',payload);
                        };
                    }(row,col));
                }
            }
        }
    }
    $('#blacksum').html(blacksum);
    $('#whitesum').html(whitesum);

    old_board = board;
});


socket.on('play_token_response',function(payload){

    console.log('*** Client Log Message: \'play_token_response\' payload: '+ JSON.stringify(payload));
    /*Check for a good play_token_response*/
    if(payload.result == 'fail'){
        console.log(payload.message);
        alert(payload.message);
        return;
    }
});


socket.on('game_over',function(payload){

    console.log('*** Client Log Message: \'game_over\' payload: '+ JSON.stringify(payload));
    /*Check for a good game_over*/
    if(payload.result == 'fail'){
        console.log(payload.message); 
        return;
    }

    /*Jump to new page*/
    $('#game_over').html('<h1>Game Over</h1><h2>'+payload.who_won+' won!</h2>');
    $('#game_over').append('<a href="lobby.html?username='+username+'" class="btn btn-success btn-lg active" role="button" aria-pressed="true">Return to lobby</a>');
});
