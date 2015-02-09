var ip;
var currentlybrowsing;
var mylocation;

$( document ).ready(function() {
	currentlybrowsing = 'http://google.com';
	$('#currentlybrowsing').html(currentlybrowsing);
	getIP();
	});
	
function getIP() {
	$.getJSON("http://api.ipify.org?format=jsonp&callback=?", function(json) {
        ip = json.ip;
      	$('#currentip').html(ip);
   		getLocation(ip);
      	});
	}
	
// This function takes an IP or a hostname.
function getLocation(iphostname) {
	$.getJSON('http://freegeoip.net/json/?callback=?', function (result, textStatus, jqXHR) {
		//console.log("callback running");
        //console.log(textStatus);
        //console.log(jqXHR);
        mylocation = result;
        //console.log(mylocation);
      	$('#currentlocation').html(mylocation.city+', '+mylocation.region_name+', '+mylocation.country_name+' <img src="../flags/flat/24/'+mylocation.country_code+'.png" />');
      	});	
	}