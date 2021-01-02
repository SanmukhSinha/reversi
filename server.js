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