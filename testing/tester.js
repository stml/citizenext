var ip;
var currentlybrowsing;

$( document ).ready(function() {
	currentlybrowsing = 'http://google.com';
	$('#currentlybrowsing').html(currentlybrowsing);
	getIP();
	});
	
function getIP() {
	$.getJSON("http://api.ipify.org?format=jsonp&callback=?", function(json) {
        ip = json.ip;
      	$('#currentip').html(ip);
      	});
	}