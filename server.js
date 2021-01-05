/**********************************************/
/*      Setup the static file server         */

/*Including static file webserver and http server libs*/
var nstatic = require('node-static');

var http = require('http');

/*If running on Heroku*/
var port = process.env.PORT;
var directory = __dirname + '/public'

/*If on local machine*/
if(typeof port == 'undefined' || !port){
    directory = './public';
    port = 8080;
}

/* Setup a static webserver to deliver files from machine*/
var file = new nstatic.Server(directory);

/*Setup a http server to get files from machine*/
var app = http.createServer( 
            function(request, response){
                request.addListener('end',
                    function(){
                        file.serve(request, response);
                    }
                ).resume();
            }
        ).listen(port);

console.log('The server is Running');


/**********************************************/
/*      Setup the websocket server         */

/* A registy of socket ids and player info */
var players = [];

//var io = require('socket.io',)(app);
var io = require('socket.io')(app,{transports: ['websocket']});
io.on('connection', function(socket){

    log('Client connection by '+socket.id);

    function log(){
        var array = ['***Server Log Messages: '];
        for( var i = 0; i<arguments.length; i++){
            array.push(arguments[i]);
            console.log(arguments[i]);
        }
        socket.emit('log',array);
        socket.broadcast.emit('log',array);
    }

    /*join_room command */
    /*payload: 
        {   
            'room': room to join,
            'username': username of person joining
        }
      join_room_response:
        {
            'result': success,
            'room': room joined,
            'username': username that joined,
            'socket_id': the socket id of the player,
            'membership': no. of people in the room
        }
        or
        {
            'result': fail,
            'message': failure message
        }
    */

    socket.on('join_room', function(payload){
        log('\'join_room\' command' + JSON.stringify(payload));
        
        if((typeof payload === undefined )|| !payload){
            var error_message = 'join_room had no payload, aborted';
            log(error_message);
            socket.emit('join_room_response',{result: 'fail', message: error_message});
            return;
        }

        var room = payload.room;
        if((typeof room === undefined )|| !room){
            var error_message = 'join_room had no room, aborted';
            log(error_message);
            socket.emit('join_room_response',{result: 'fail', message: error_message});
            return;
        }

        var username = payload.username;
        if((typeof username === undefined )|| !username){
            var error_message = 'join_room had no username, aborted';
            log(error_message);
            socket.emit('join_room_response',{result: 'fail', message: error_message});
            return;
        }
        
        /*Store information of new player */
        players[socket.id] = {};
        players[socket.id].username = username;
        players[socket.id].room = room;

        /*User joins the room*/
        /*socket.join(room,function(){
            console.log("Socket now in rooms", socket.rooms);
        });*/
        socket.join(room);

        var roomObject = io.sockets.adapter.rooms.get(room);
       
        /*Broadcast join message*/
        var numClients = roomObject.size;
        var success_data = {
                            result: 'success',
                            room: room,
                            username: username,
                            socket_id: socket.id,
                            membership: numClients
                            };

        io.in(room).emit('join_room_response',success_data);

        for(const [_, socket_in_room] of io.of("/").in(room).sockets){
            var success_data = {
                                result: 'success',
                                room: room,
                                username: players[socket_in_room.id].username,
                                socket_id: socket_in_room.id,
                                membership: numClients
                                };
            socket.emit('join_room_response',success_data);
        }

        log('join_room success');

        if(room !== 'lobby'){
            send_game_update(socket,room,'initial_update')
        }
    });


    socket.on('disconnect', function(){
        log('Client disconnected '+ JSON.stringify(players[socket.id]));

        if('undefined'!== typeof players[socket.id] && players[socket.id]){
            var username = players[socket.id].username;
            var room = players[socket.id].room;
            var payload ={
                            username: username,
                            socket_id: socket.id
                        };
            delete players[socket.id];
            io.in(room).emit('player_disconnected',payload);
        }
        
    });


    /*send_message command */
    /*payload: 
        {   
            'room': room to join,
            'username': username of person sending message,
            'message': the message to send
        }
      send_message_response:
        {
            'result': success,
            'username': username that spoke,
            'message': the message to send
        }
        or
        {
            'result': fail,
            'message': failure message
        }
    */
    socket.on('send_message', function(payload){
        log('server received a command','send_message',payload);
        if((typeof payload === undefined )|| !payload){
            var error_message = 'send_message had no payload, aborted';
            log(error_message);
            socket.emit('send_message_response',{result: 'fail', message: error_message});
            return;
        }

        var room = payload.room;
        if((typeof room === undefined )|| !room){
            var error_message = 'send_message had no room, aborted';
            log(error_message);
            socket.emit('send_message_response',{result: 'fail', message: error_message});
            return;
        }

        var username = payload.username;
        if((typeof username === undefined )|| !username){
            var error_message = 'send_message had no username, aborted';
            log(error_message);
            socket.emit('send_message_response',{result: 'fail', message: error_message});
            return;
        }
        
        var message = payload.message;
        if((typeof message === undefined )|| !message){
            var error_message = 'send_message had no message, aborted';
            log(error_message);
            socket.emit('send_message_response',{result: 'fail', message: error_message});
            return;
        }

        var success_data =  {
                            result: 'success',
                            room: room,
                            username: username,
                            message: message
                        };
        io.sockets.in(room).emit('send_message_response',success_data);
        log('Message sent to room ' + room +' by '+username);
    });


    /*invite command */
    /*payload: 
        {   
            'requested_user': socket id of person to be invited
        }
      invite_response:
        {
            'result': success,
            'socket_id': the socket id of the person,
        }
        or
        {
            'result': fail,
            'message': failure message
        }

        invited:
        {
            'result': success,
            'socket_id': the socket id of the person,
        }
        or
        {
            'result': fail,
            'message': failure message
        }
    */
    socket.on('invite', function(payload){
        log('invite with '+JSON.stringify(payload));

        if((typeof payload === undefined )|| !payload){
            var error_message = 'invite had no payload, aborted';
            log(error_message);
            socket.emit('invite_response',{result: 'fail', message: error_message});
            return;
        }

        var username = players[socket.id].username;
        if((typeof username === undefined )|| !username){
            var error_message = 'invite had no username, aborted';
            log(error_message);
            socket.emit('invite_response',{result: 'fail', message: error_message});
            return;
        }
        
        var requested_user = payload.requested_user;
        if((typeof requested_user === undefined )|| !requested_user){
            var error_message = 'invite had no requested_user, aborted';
            log(error_message);
            socket.emit('invite_response',{result: 'fail', message: error_message});
            return;
        }

        var room = players[socket.id].room;
        var roomObject = io.sockets.adapter.rooms.get(room);
        var flag = 0;
        for(const [_, socket_in_room] of io.of("/").in(room).sockets){
            if(socket_in_room.id == requested_user){
                flag = 1;
                break;
            }
        }
        if(!flag){
            var error_message = 'invited user not in the room, aborted';
            log(error_message);
            socket.emit('invite_response',{result: 'fail', message: error_message});
            return;
        }

        /*Respond to inviter*/
        var success_data =  {
                                result: 'success',
                                socket_id: requested_user
                            };
        socket.emit('invite_response',success_data);

        /*Invite the invitee */
        var success_data =  {
                                result: 'success',
                                socket_id: socket.id
                            };
        socket.to(requested_user).emit('invited',success_data);

        log('invite successful')
    });


    /*uninvite command */
    /*payload: 
        {   
            'requested_user': socket id of person to be uninvited
        }
    uninvite_response:
        {
            'result': success,
            'socket_id': the socket id of the person,
        }
        or
        {
            'result': fail,
            'message': failure message
        }

        uninvited:
        {
            'result': success,
            'socket_id': the socket id of the person uninviting,
        }
        or
        {
            'result': fail,
            'message': failure message
        }
    */
    socket.on('uninvite', function(payload){
        log('uninvite with '+JSON.stringify(payload));

        if((typeof payload === undefined )|| !payload){
            var error_message = 'uninvite had no payload, aborted';
            log(error_message);
            socket.emit('uninvite_response',{result: 'fail', message: error_message});
            return;
        }

        var username = players[socket.id].username;
        if((typeof username === undefined )|| !username){
            var error_message = 'uninvite had no username, aborted';
            log(error_message);
            socket.emit('uninvite_response',{result: 'fail', message: error_message});
            return;
        }
        
        var requested_user = payload.requested_user;
        if((typeof requested_user === undefined )|| !requested_user){
            var error_message = 'uninvite had no requested_user, aborted';
            log(error_message);
            socket.emit('uninvite_response',{result: 'fail', message: error_message});
            return;
        }

        var room = players[socket.id].room;
        var roomObject = io.sockets.adapter.rooms.get(room);
        var flag = 0;
        for(const [_, socket_in_room] of io.of("/").in(room).sockets){
            if(socket_in_room.id == requested_user){
                flag = 1;
                break;
            }
        }
        if(!flag){
            var error_message = 'uninvited user not in the room, aborted';
            log(error_message);
            socket.emit('uninvite_response',{result: 'fail', message: error_message});
            return;
        }

        /*Respond to uninviter*/
        var success_data =  {
                                result: 'success',
                                socket_id: requested_user
                            };
        socket.emit('uninvite_response',success_data);

        /*Tell the uninvitee */
        var success_data =  {
                                result: 'success',
                                socket_id: socket.id
                            };
        socket.to(requested_user).emit('uninvited',success_data);

        log('uninvite successful')
    });


    /*game_start command */
    /*payload: 
        {   
            'requested_user': socket id of person to play with
        }
      game_start_response:
        {
            'result': success,
            'socket_id': the socket id of the person,
            'game_id':id of the game ssesion
        }
        or
        {
            'result': fail,
            'message': failure message
        } 
    */
    socket.on('game_start', function(payload){
        log('game_start with '+JSON.stringify(payload));

        if((typeof payload === undefined )|| !payload){
            var error_message = 'game_start had no payload, aborted';
            log(error_message);
            socket.emit('game_start_response',{result: 'fail', message: error_message});
            return;
        }

        var username = players[socket.id].username;
        if((typeof username === undefined )|| !username){
            var error_message = 'game_start had no username, aborted';
            log(error_message);
            socket.emit('game_start_response',{result: 'fail', message: error_message});
            return;
        }
        
        var requested_user = payload.requested_user;
        if((typeof requested_user === undefined )|| !requested_user){
            var error_message = 'game_start had no requested_user, aborted';
            log(error_message);
            socket.emit('game_start_response',{result: 'fail', message: error_message});
            return;
        }

        var room = players[socket.id].room;
        var roomObject = io.sockets.adapter.rooms.get(room);
        var flag = 0;
        for(const [_, socket_in_room] of io.of("/").in(room).sockets){
            if(socket_in_room.id == requested_user){
                flag = 1;
                break;
            }
        }
        if(!flag){
            var error_message = 'game_start user not in the room, aborted';
            log(error_message);
            socket.emit('game_start_response',{result: 'fail', message: error_message});
            return;
        }

        /*Respond to player1*/

        var game_id = Math.floor((1+Math.random())*0x10000).toString(16).substring(1);
        var success_data =  {
                                result: 'success',
                                socket_id: requested_user,
                                game_id: game_id
                            };
        socket.emit('game_start_response',success_data);

        /*Respond to player2 */
        var success_data =  {
                                result: 'success',
                                socket_id: socket.id,
                                game_id: game_id
                            };
        socket.to(requested_user).emit('game_start_response',success_data);

        log('game_start successful')
    });


    /*play_token command */
    /*payload: 
        {   
            'row': 0-7,
            'col': 0,7,
            'color': white or black
        }
      play_token_response:
        {
            'result': success,
        }
        or
        {
            'result': fail,
            'message': failure message
        } 
    */
    socket.on('play_token', function(payload){
        log('play_token with '+JSON.stringify(payload));

        if((typeof payload === undefined )|| !payload){
            var error_message = 'play_token had no payload, aborted';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        var player = players[socket.id];
        if((typeof player === undefined )|| !player){
            var error_message = 'player not recognized, try again';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        var username = players[socket.id].username;
        if((typeof username === undefined )|| !username){
            var error_message = 'play_token had no username, aborted';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        var game_id = players[socket.id].room;
        if((typeof game_id === undefined )|| !game_id){
            var error_message = 'game_id not recognized, try again';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        var row = payload.row;
        if((typeof row === undefined )|| row < 0 || row > 7){
            var error_message = 'row not recognized, aborted';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        var col = payload.col;
        if((typeof col === undefined )|| col < 0 || col > 7){
            var error_message = 'col not recognized, aborted';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        var color = payload.color;
        if((typeof color === undefined )|| !color || (color != 'white' && color != 'black')){
            var error_message = 'color  not recognized, aborted';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        var game = games[game_id];
        if((typeof game === undefined )|| !game){
            var error_message = 'game  not recognized, aborted';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        if(color !== game.whose_turn){
            var error_message = 'play_token out of turn, aborted';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }

        if(((game.whose_turn === 'white') && (game.player_white.socket !=socket.id )) ||
            ((game.whose_turn === 'black') && (game.player_black.socket !=socket.id ))
        ){
            var error_message = 'play_token wrong player played turn, aborted';
            log(error_message);
            socket.emit('play_token_response',{result: 'fail', message: error_message});
            return;
        }


        var success_data = {
                            result: 'success'
                            };
        socket.emit('play_token_response',success_data);

        /*Make the move*/
        if(color == 'white'){
            game.board[row][col] = 'w';
            flip_board('w',row,col,game.board);
            game.whose_turn = 'black';
            game.legal_moves = calculate_valid_moves('b',game.board);
        }
        else if(color == 'black'){
            game.board[row][col] = 'b';
            flip_board('b',row,col,game.board);
            game.whose_turn = 'white';
            game.legal_moves = calculate_valid_moves('w',game.board);
        }
        var d = new Date();
        game.last_move_time = d.getTime();

        send_game_update(socket,game_id,'played a token');
    });
});


/***********************************************/
/*         Code related to game state          */
var games = [];

function create_new_game(){
    var new_game = {};
    new_game.player_white = {};
    new_game.player_black = {};
    new_game.player_white.socket = '';
    new_game.player_white.username = '';
    new_game.player_black.socket = '';
    new_game.player_black.username = '';

    var d = new Date();
    new_game.last_move_time = d.getTime();

    new_game.whose_turn = 'black';
    
    new_game.board = [
                        [' ',' ',' ',' ',' ',' ',' ',' '],
                        [' ',' ',' ',' ',' ',' ',' ',' '],
                        [' ',' ',' ',' ',' ',' ',' ',' '],
                        [' ',' ',' ','w','b',' ',' ',' '],
                        [' ',' ',' ','b','w',' ',' ',' '],
                        [' ',' ',' ',' ',' ',' ',' ',' '],
                        [' ',' ',' ',' ',' ',' ',' ',' '],
                        [' ',' ',' ',' ',' ',' ',' ',' ']
                    ];
    new_game.legal_moves = calculate_valid_moves('b',new_game.board);

    return new_game;
}


/*Check if there is a who in the line starting
  at r,c or further by adding dr,dc
*/
function check_line_match(who, dr, dc, r, c, board){
    if(board[r][c] === who ){
        return true;
    }
    if(board[r][c] === ' ' ){
        return false;
    }
    if((r+dr < 0) || (r+dr > 7) ){
        return false;
    }
    if((c+dc < 0) || (c+dc > 7) ){
        return false;
    }
    return check_line_match(who, dr, dc, r+dr, c+dc, board);
}


/*Check if r,c contains opp. of 'who' o board and
   if the line indicated by adding dr to r and
   dc to c ends in 'who' color
*/

function valid_move(who, dr, dc, r, c, board){
    var other;
    if(who === 'b'){
        other = 'w';
    }
    else if(who === 'w'){
        other = 'b';
    }
    else{
        log("A color problem: "+ who);
        return false;
    }

    if((r+dr < 0) || (r+dr > 7) ){
        return false;
    }
    if((c+dc < 0) || (c+dc > 7) ){
        return false;
    }
    if(board[r+dr][c+dc] != other){
        return false;
    }
    if((r+dr+dr < 0) || (r+dr+dr > 7) ){
        return false;
    }
    if((c+dc+dc < 0) || (c+dc+dc > 7) ){
        return false;
    }
    return check_line_match(who,dr,dc,r+dr+dr,c+dc+dc,board);

}

function calculate_valid_moves(who, board){
    var valid  = [
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' ']
                ];
    
    for(var row = 0; row < 8; row++){
        for(var column = 0; column < 8; column++){
            if(board[row][column] === ' '){
                nw = valid_move(who,-1,-1,row,column,board);
                nn = valid_move(who,-1, 0,row,column,board);
                ne = valid_move(who,-1, 1,row,column,board);
                ww = valid_move(who, 0,-1,row,column,board);
                ee = valid_move(who, 0, 1,row,column,board);
                sw = valid_move(who, 1,-1,row,column,board);
                ss = valid_move(who, 1, 0,row,column,board);
                se = valid_move(who, 1, 1,row,column,board);

                if(nw || nn || ne || ww || ee || sw || ss || se){
                    valid[row][column] = who;
                }
            }
        }
    }
    return valid;
}


function flip_line(who,dr,dc,r,c,board){
    if((r+dr < 0) || (r+dr > 7) ){
        return false;
    }
    if((c+dc < 0) || (c+dc > 7) ){
        return false;
    }

    if(board[r+dr][c+dc] === ' '){
        return false;
    }
    if(board[r+dr][c+dc] === who){
        return true;
    }
    else{
        if (flip_line(who,dr,dc,r+dr,c+dc,board)){
            board[r+dr][c+dc] = who;
            return true;
        }
        else{
            return false;
        }
    }   
}


function flip_board(who,row,column,board){
    flip_line(who,-1,-1,row,column,board);
    flip_line(who,-1, 0,row,column,board);
    flip_line(who,-1, 1,row,column,board);
    flip_line(who, 0,-1,row,column,board);
    flip_line(who, 0, 1,row,column,board);
    flip_line(who, 1,-1,row,column,board);
    flip_line(who, 1, 0,row,column,board);
    flip_line(who, 1, 1,row,column,board);
}


function send_game_update(socket, game_id, message){
    
    /*Check to see if game already exists*/
    if(('undefined' === typeof games[game_id]) || !games[game_id]){
        console.log('No game exists. Creating '+game_id+' for '+socket.id);
        games[game_id] = create_new_game();
    }

    /*Make sure only 2 people in game room*/
    /*
    var roomObject;
    var numClients;
    do{
        roomObject = io.sockets.adapter.rooms.get(game_id);
        numClients = roomObject.size;
        if(numClients > 2){
            console.log('Too many clients in room: '+game_id+' #: '+numClients);
            if(games[game_id].player_white.socket == roomObject){}
        }
    }while((numClients-1) > 2);
    ******Incomplete********
    */
    /*Assign a socket color*/
    /*If not assigned a color*/

    if((games[game_id].player_white.socket != socket.id) && (games[game_id].player_black.socket != socket.id)){
        console.log("Player isn't assigned a color: "+socket.id);

        if((games[game_id].player_black.socket != '') && (games[game_id].player_white.socket != '')){
            games[game_id].player_white.socket = '';
            games[game_id].player_white.username = '';  
            games[game_id].player_black.socket = '';
            games[game_id].player_black.username = ''; 
        }
    }

    if(games[game_id].player_white.socket == ''){
        if(games[game_id].player_black.socket != socket.id){
            games[game_id].player_white.socket = socket.id;
            games[game_id].player_white.username = players[socket.id].username;
        }
    }
    if(games[game_id].player_black.socket == ''){
        if(games[game_id].player_white.socket != socket.id){
            games[game_id].player_black.socket = socket.id;
            games[game_id].player_black.username = players[socket.id].username;
        }
    }
    //console.log(games[game_id])

    /*Send game update*/
    var success_data = {
                        result: 'success',
                        game: games[game_id],
                        message: message,
                        game_id: game_id
                    };
    io.in(game_id).emit('game_update',success_data);

    /* Check if Game is Over*/
    var row,column;
    var count = 0;
    var black = 0;
    var white = 0;

    for(row = 0;row < 8; row++){
        for(column = 0; column < 8; column++){
            if(games[game_id].legal_moves[row][column] != ' '){
                count++;
            }
            if(games[game_id].board[row][column] === 'b'){
                black++;
            }
            if(games[game_id].board[row][column] === 'w'){
                white++;
            }
        }
    }
    if(count == 0){
        /*Send GameOver*/
        var winner = 'tie game';
        if(black > white){
            winner = 'black'; 
        }
        if(white > black){
            winner = 'white';
        }
        var success_data = {
                            result: 'success',
                            game: games[game_id],
                            game_id: game_id,
                            who_won: winner
                            };
        io.in(game_id).emit('game_over',success_data);

        /*Delete old games after 1 hour*/
        setTimeout(function(id){
            return function(){
                delete games[id];
            }
        }(game_id), 60*60*1000);
    }
}