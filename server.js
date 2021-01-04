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
var io = require('socket.io')(app);

io.on('connection', function(socket){

    function log(){
        var array = ['***Server Log Messages: '];
        for( var i = 0; i<arguments.length; i++){
            array.push(arguments[i]);
            console.log(arguments[i]);
        }
        socket.emit('log',array);
        socket.broadcast.emit('log',array);
    }
    
    log('A website connected to the server');

    socket.on('disconnect', function(socket){
        log('A website disconnected from the server');
    });

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
            'membership': no. of people in the room
        }
        or
        {
            'result': fail,
            'message': failure message
        }
    */

    socket.on('join_room', function(payload){
        log('server received a command','join_room',payload);
        if((typeof payload === undefined )|| !payload){
            var error_message = 'join_room had no room, aborted';
            log(error_message);
            socket.emit('join_room_response',{result: 'fail', message: error_message});
            return;
        }

        var room = payload.room;
        if((typeof room === undefined )|| !payload){
            var error_message = 'join_room had no payload, aborted';
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
        
        socket.join(room,function(){
            console.log("Socket now in rooms", socket.rooms);
        });
        

        var roomObject = io.sockets.adapter.rooms.get(room);
        //console.log(roomObject);
        if((typeof roomObject === undefined )|| !roomObject){
            var error_message = 'join_room had no roomObject, aborted';
            log(error_message);
            socket.emit('join_room_response',{result: 'fail', message: error_message});
            return;
        }

        var numClients = roomObject.size;
        var success_data = {
                            'result': 'success',
                            'room': room,
                            'username': username,
                            'membership': numClients
                            };
        io.sockets.in(room).emit('join_room_response',success_data);
        log('Room: ' + room + ' was just joined by '+ username);
    });
});