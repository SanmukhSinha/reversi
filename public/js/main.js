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
document.getElementById('messages').insertAdjacentHTML('afterbegin', '<h4>'+ username +'</h4>');