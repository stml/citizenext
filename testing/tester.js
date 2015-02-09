var ip;
var currentlybrowsing;
var my_location;
var browsing_location;

$( document ).ready(function() {
	currentlybrowsing = 'http://google.com';
	$('#currentlybrowsing').html(currentlybrowsing);
	getMyLocation();
	});
	
// This function takes an IP or a hostname.
function getMyLocation() {
	$.getJSON('http://freegeoip.net/json/?callback=?', function (result, textStatus, jqXHR) {
		//console.log("callback running");
        //console.log(textStatus);
        //console.log(jqXHR);
        my_location = result;
        //console.log(my_location);
        $('#currentip').html(my_location.ip);
      	$('#currentlocation').html(my_location.city+', '+my_location.region_name+', '+my_location.country_name+' <img src="../flags/flat/24/'+my_location.country_code+'.png" />');
      	});	
	}
	
function getBrowsingLocation(iphostname) {
	$.getJSON('http://freegeoip.net/json/?callback=?', function (result, textStatus, jqXHR) {
		});
	}