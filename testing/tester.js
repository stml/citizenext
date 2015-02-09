var ip;
var browsing_site = 'http://tumblr.com';
var my_location;
var browsing_location;
var nav_location;
var mapbox_token = "pk.eyJ1Ijoic3RtbCIsImEiOiJDQ1FDcFNVIn0.C7ThVrFnQ7a7COlJe8tARw";
var mapbox_project_sat_streets = 'stml.l62p34g6';

$( document ).ready(function() {
	$('#browsing_site').html(browsing_site);
	getMyLocation();
	getBrowsingLocation(browsing_site);
	if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(getNavPosition);
    	} else {
        $('#nav_location').innerHTML = "(Geolocation is not supported by this browser)";
    	}
	});

function getNavPosition(position) {
	nav_location = position;
    $('#nav_location').html((Math.round(nav_location.coords.latitude * 10000) / 10000)+','+ (Math.round(nav_location.coords.longitude * 10000) / 10000));
    $('#nav_map').html('<img src="http://api.tiles.mapbox.com/v4/'+mapbox_project_sat_streets+'/'+nav_location.coords.longitude+','+nav_location.coords.latitude+',12/500x100.png32?access_token='+mapbox_token+'" />');
    $.getJSON('http://nominatim.openstreetmap.org/reverse?format=json&lat='+nav_location.coords.latitude+'&lon='+nav_location.coords.longitude, function (result, textStatus, jqXHR) {
    	$('#nav_address').html(result.display_name+' <img src="flags/flat/16/'+result.address.country_code.toUpperCase()+'.png" />');
    	});
	}

	
// This function takes an IP or a hostname.
function getMyLocation() {
	$.getJSON('http://freegeoip.net/json/?callback=?', function (result, textStatus, jqXHR) {
		//console.log("callback running");
        //console.log(textStatus);
        //console.log(jqXHR);
        my_location = result;
        //console.log(my_location);
        $('#my_ip').html(my_location.ip);
      	$('#my_location').html(my_location.city+', '+my_location.region_name+', '+my_location.country_name+' <img src="flags/flat/16/'+my_location.country_code+'.png" />');
      	$('#my_map').html('<img src="http://api.tiles.mapbox.com/v4/'+mapbox_project_sat_streets+'/'+my_location.longitude+','+my_location.latitude+',12/500x100.png32?access_token='+mapbox_token+'" />');
      	});	
	}
	
function getBrowsingLocation(iphostname) {
	$.getJSON('http://freegeoip.net/json/'+iphostname+'?callback=?', function (result, textStatus, jqXHR) {
		browsing_location = result;
		console.log(browsing_location);
	    $('#browsing_ip').html(browsing_location.ip);
      	$('#browsing_location').html(browsing_location.city+', '+browsing_location.region_name+', '+browsing_location.country_name+' <img src="flags/flat/16/'+browsing_location.country_code+'.png" />');	
      	$('#browsing_map').html('<img src="http://api.tiles.mapbox.com/v4/'+mapbox_project_sat_streets+'/'+browsing_location.longitude+','+browsing_location.latitude+',12/500x100.png32?access_token='+mapbox_token+'" />');
		});
	}