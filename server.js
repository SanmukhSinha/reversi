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

var io = require('socket.io')(app);

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
            //console.log(socket_in_room.id);
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
        //io.in(room).emit('player_disconnected',payload);
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

        success_data =  {
                            result: 'success',
                            room: room,
                            username: username,
                            message: message
                        };
        io.sockets.in(room).emit('send_message_response',success_data);
        log('Message sent to room ' + room +' by '+username);
    });
});