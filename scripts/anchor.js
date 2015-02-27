// Avast! WebRep extension
// Inserts Avast WebRep data to google search results, etc.
// Runs in page context
//
//
// News sites are not rated
//
//


(function($){
if(window.AvastWRC && window.AvastWRC.DOM) return false;

// ignore rich text editors in iframes....
//log("Ignore if true" , document.getElementsByTagName("body").contentEditable)
if(document.getElementsByTagName("body").contentEditable) return false;

var TIME_DELAY = 3000;
var SHOW_DELAY = 600;

var LOGO_ICON = 'logo_avastsmall.png';

var TICON_STRING0 = 'se_icn_grey.png';
var TICON_STRING11 = 'se_icn_green.png';
var TICON_STRING12 = 'se_icn_green.png';
var TICON_STRING13 = 'se_icn_green.png';
var TICON_STRING21 = 'se_icn_orange.png';
var TICON_STRING22 = 'se_icn_orange.png';
var TICON_STRING23 = 'se_icn_orange.png';
var TICON_STRING31 = 'se_icn_red.png';
var TICON_STRING32 = 'se_icn_red.png';
var TICON_STRING33 = 'se_icn_red.png';

var BICON_STRING0 = 'grey-0.png';
var BICON_STRING11 = 'green-1.png';
var BICON_STRING12 = 'green-2.png';
var BICON_STRING13 = 'green-3.png';
var BICON_STRING21 = 'yellow-1.png';
var BICON_STRING22 = 'yellow-2.png';
var BICON_STRING23 = 'yellow-3.png';
var BICON_STRING31 = 'red-1.png';
var BICON_STRING32 = 'red-2.png';
var BICON_STRING33 = 'red-3.png';

var RATING0 = chrome.i18n.getMessage("noRating");
var RATING1 = chrome.i18n.getMessage("ratingTextPositive");
var RATING2 = chrome.i18n.getMessage("ratingTextAverage");
var RATING3 = chrome.i18n.getMessage("ratingTextBad");
var WEIGHT0 = chrome.i18n.getMessage("noWeight");
var WEIGHT1 = chrome.i18n.getMessage("weight1");
var WEIGHT2 = chrome.i18n.getMessage("weight2");
var WEIGHT3 = chrome.i18n.getMessage("weight3");

var getImagePath = function(img) {
    return chrome.extension.getURL("common/skin/img/") + img;
}
var ICON = ['se_icn_norating.png','se_icn_thumbup.png','se_icn_thumbneutral.png', 'se_icn_thumbdown.png'];
var COLOR = ['#a5abb2','#47cc83','#fbb153','#f76470'];

var CSSID = "wrc-css";
var WRCHOVERDIVID = "wrchoverdiv";

var WRCHOVERDIVCONTENT = "<div id='wrccontainer' style='background: " + COLOR[0] + " url(" + getImagePath(ICON[0]) + ")'>"+
							"<div id='wrcratingtext'>"+RATING0+"</div>"+
							//"<div id='wrcratingavast'>by the avast <br /> community</div>"+
                            "<div class='wrclogo'></div>"+
						"</div>";

var WRCHOVERDIV = "<div id='"+WRCHOVERDIVID+"'>"+
					WRCHOVERDIVCONTENT +
				"</div>";

//TODO - Move this into a css file?
var POPUP_CSS = "" +
		".wrc_icon{margin:0;padding:0;padding:2px 0 0 10px !important; position: absolute; width:16px !important; height:16px !important;line-height:16px !important;}" + "\n" +
		"#"+WRCHOVERDIVID+"{position:absolute; margin: 0 0 0 20px; display:none; font-family: Segoe UI, Arial Unicode MS, Arial, Sans-Serif; font-size: 14px; z-index:9999999;}" + "\n" +
		"#"+WRCHOVERDIVID+"{cursor:default;}" + "\n" +
		"#"+WRCHOVERDIVID+" #wrccontainer{width:130px; height:140px; border-radius: 6px; background-position: center 35% !important; background-repeat: no-repeat !important; box-shadow: 0 0 0 5px #fff; }" + "\n"+
		"#"+WRCHOVERDIVID+" #wrcratingtext{color:#FFF; text-align:center; padding: 95px 5px 0 5px; font-size:15px; font-family: 'Source Sans Pro', sans-serif;}" + "\n"
        //+ "#"+WRCHOVERDIVID+" #wrcratingavast{ color:#FFF; text-align:center; padding:0; font-size:12px; font-family: 'Source Sans Pro', sans-serif;}" + "\n"                +"#"+WRCHOVERDIVID+" .wrclogo{background:url(" + getImagePath(LOGO_ICON) + ");padding:0;margin:0;position:absolute;top:5px !important;right:5px !important;width:24px !important;height:24px !important;}" + "\n"
        +"#"+WRCHOVERDIVID+" .wrclogo{background:url(" + getImagePath(LOGO_ICON) + ");padding:0;margin:0;position:absolute;top:5px !important;right:5px !important;width:24px !important;height:24px !important;}" + "\n"
        ;

var timer = null;
var showTimer = null;
var port = null;
var lastDomains = null;
var domainsTimer = null;
//var domains = null;

var css = document.getElementById(CSSID);

if($('#avast_os_ext_custom_font').length == 0) {
  $('head')
    .append("<link id='avast_os_ext_custom_font' href='https://fonts.googleapis.com/css?family=Source+Sans+Pro' rel='stylesheet' type='text/css'>")
    .append("<link href='https://fonts.googleapis.com/css?family=Lato:400,900' rel='stylesheet' type='text/css'>");
  }


if(css == null){

	var imgURL = chrome.extension.getURL("common/skin/img/");
    // prepare CSS chunk for WRC icons
	styleTxt =  styleOpts.replace(new RegExp("WRCN", "g"), "wrcx").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING0) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc0").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING0) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc11").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING11) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc12").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING12) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc13").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING13) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc21").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING21) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc22").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING22) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc23").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING23) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc31").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING31) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc32").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING32) + "\n" +
    styleOpts.replace(new RegExp("WRCN", "g"), "wrc33").replace(new RegExp("IMAGE", "g"), imgURL + TICON_STRING33) + "\n" +
    POPUP_CSS.replace(new RegExp("IMAGEURL","g"), imgURL);

    //log(styleOpts, styleTxt);
    // Place the rendered CSS into the dom;
	var head = document.getElementsByTagName("head")[0];
	css = document.createElement("style");
    css.id = CSSID;
    css.type = "text/css";
    css.innerHTML = styleTxt;
    head.appendChild(css);


}





if(!AvastWRC) var AvastWRC = {};
$.extend(AvastWRC, {
    CONFIG : CONFIG,
    DOM : {
        initialize : function(){

            this.openPort();
            this.bindEvents();

            if (AvastWRC.CONFIG.ENABLE_SERP_POPUP) {
                this.Popup.initialize();
            }
        },
        port : null,
        openPort : function(){

            // should be extended by browser specific features.

        },
        /** Listen to dom changes and validate new results */
        bindEvents : function() {
            var self = this;
            $(document).ready(function(){
                self.runningRequest = true;
                setTimeout(function(){
                    self.loadRatings();
                },100);
            });
            document.addEventListener("DOMNodeInserted", {
                handleEvent: function(ev) {
                    // there is a request already running...stop right here.
                    if(self.runningRequest) return;

                    var $target = $(ev.target),
                        id = $target.attr("id"),
                        elmclass = $target.attr("class");

                    // trigger request for DOM changes, but ignore for wrccontainer
                    if($target && ev.target.nodeType === 1 &&
                        id !== "wrccontainer" && id !== "wrchoverdiv" && elmclass.indexOf('wrc_icon') < 0 )
                    {
                        clearTimeout(self.timer);
                        self.runningRequest = true;
                        self.timer = window.setTimeout(function() {
                            self.loadRatings();
                        }, 500);
                    }
                }
            }, false);
        },
        /** Load ratings for current page */
        loadRatings : function(){
            var anchors = this.mapAnchors($(document));
            this.sendRequest(anchors, function(rankings) {
                AvastWRC.DOM.mapResults(anchors, rankings);
                this.runningRequest = false;
            }.bind(this));
        },
        /** Retrieve ratings */
        sendRequest : function() {

            // This function is extended by browser specific function

        },

        /**
         * Harvest all anchors, filter them for evaluation
         */
        mapAnchors : function(context){
            var self = this;
            var ud = self.Utils.getDomainFromUrl(document.URL);
            // reset anchor map
            var anchors = [];
            $("a", context).each(function(){
                var $a = $(this),
                    href = $a.attr("href"),
                    aclass = $a.attr("class"),
                    u, d;
                if(href !== "" && href !== undefined && aclass.indexOf('avast') < 0) {
                    u = self.Utils.retrieveTargetUrl(href);
                    d = self.Utils.getDomainFromUrl(u);
                    if(d !== null) {
                        if(d != ud) {
                            anchors.push({
                                url : u,
                                $a : $a
                            });
                        }
                    }
                }
            });
            return anchors;
        },
        /**
         * Bind results to all harvested anchors
         */
        mapResults : function (anchors, rankings) {
            for(var i = 0, j = anchors.length; i < j; i++) {
                var anchor = anchors[i];
                var url = anchor.url;
                var rank = rankings[url];
                if(anchor.$a.attr('wrc_done') === undefined && rank) {
                    var rt = ""+rank.rating+"3";
                    if(rt == "00" || rt == "01" || rt == "02" || rt == "03") rt = "0";
                    var cls = "wrc"+rt;
                    anchor.$a.attr('wrc_done','true').after("&nbsp;<span class='wrc_icon "+cls+"' rating='"+JSON.stringify(rank)+"'></span>");
                }
            }
        },
        /***************************************************************************
         *
         *  Handle popup dialog
         *
         **************************************************************************/
        Popup : {
            initialize: function(){
                if($('#wrchoverdiv').length > 0) return;

                this.$popup = $(WRCHOVERDIV)
    			$("body").append(this.$popup);

                 var self = this;

                // add popup messages for ratings
        		$(".wrc_icon").live('mouseover',function(e) {
                    clearTimeout(self.hideTimer)
        			self.showTimer = setTimeout(function(){ self.show(e);}, SHOW_DELAY);
        		});
        		$(".wrc_icon").live('mouseout',function(e) {
        			self.hideTimer = setTimeout(function(e){ self.hide(false)},TIME_DELAY);
        			if(self.showTimer) clearTimeout(self.showTimer);
        		});

                // Disable popup timeout when hoverin over it.
            	$(this.$popup).bind('mouseover',function(e) {
            		if(self.hideTimer) clearTimeout(self.hideTimer);
            		self.hideTimer = null;
            	});
            	$(this.$popup).bind('mouseout',function(e) {
            		self.hideTimer = setTimeout(function(e){ self.hide(false)},TIME_DELAY);
            	});

            },
            showTimer : null,
            hideTimer : null,
            /** hide popup window */
            hide : function() {
    	        if(this.hideTimer) clearTimeout(this.hideTimer);
            	this.hideTimer = null;

                this.$popup.html('');//fadeOut("fast");
            },
            /** show popup window */
            show : function(e){
                // hide previously opened popups
                this.hide(true);

                // reset contents
                this.$popup.html(WRCHOVERDIVCONTENT);


                var $a = $(e.target);
            	var aHref = $a.prev().attr('href');

                // parse ratings
            	var rat = JSON.parse($a.attr('rating'));
                if(rat) {
            	    var rtg = rat.rating;
            	    var wght = rat.weight;
            		var rt = ""+rtg+wght+"";
            		if(rt == "00") rt = "0";
            		var cls = "wrcb"+rt;
            		$("#wrcratingtext", this.$popup).html(AvastWRC.DOM.Utils.getRatingText(rtg));
                    $('#wrccontainer').css(
                    {
                        background: COLOR[rtg] + ' url(' + getImagePath(ICON[rtg]) + ')'
                    });
            	}


                // place it to icon and fadeIn()
            	var x = $a.offset().left + 17;
            	var y = $a.offset().top;

            	this.$popup.css({
            		'left':x,
            		'top':y
            	}).show(); //fadein();

            }

        },
        /** Common functions */
        Utils : {
            getRatingText : function (rating){
            	switch(rating){
            		case 0: return RATING0;
            		case 1: return RATING1;
            		case 2: return RATING2;
            		case 3: return RATING3;
            		default: return RATING0;
            	}
            },

            getWeightText : function (weight){
            	switch(weight){
            		case 0: return WEIGHT0;
            		case 1: return WEIGHT1;
            		case 2: return WEIGHT2;
            		case 3: return WEIGHT3;
            		default: return WEIGHT0;
            	}
            },

            /**
             * Retrieve domain from given URL.
             */
            getDomainFromUrl : function (url) {
            	 var matches = url.match(new RegExp("^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(www.)?([a-z0-9\-\.]+[a-z]{2,6})(:[0-9]+)?(.*)?$"));
                 if((matches) && (matches.length>4))
                 {
                     // var protocol = matches[1];
                     // var credentials = matches[2];
                     // var www = matches[3];
                     var domain = matches[4];
                     // var wport = matches[5];
                     return domain;
                 }
                 return null;
            },

            /**
             * Attampt to retrive target url if URL is redirector URL. Otherwise return the URL itself.
             */
            retrieveTargetUrl : function (url) {
                var target = this.getTargetFromRedirectorUrl(url);
                return (target != null) ? (target.indexOf('http') != 0 ? "http://" : '') + target : url;
            },

            /**
             * Recognizes target urls inside arbitrary redirector urls (also handles base64 encoded urls)
             */
            getTargetFromRedirectorUrl : function (url){
            	var args = this.getUrlVars(url);

            	for(var p in args) {
                    if(args.hasOwnProperty(p)) {
            	        //This regexp extracts domain from URL encoded address of type http
            	        try {
            		        //Matches URLs starting with http(s)://domain.com http(s)://www.domain.com www.domain.com
            		        //optionally followed by path and GET parameters
            		        //If successfull then matches[4] holds the domain name with the www. part stripped

            		        var re = /((https?\:\/\/(www\.)?|www\.)(([\w|\-]+\.)+(\w+)))([\/#\?].*)?/;
            		        var decoded = decodeURIComponent(args[p]);
            		        var matches = decoded.match(re);
            		        if(matches) {
            		        	return matches[2]+matches[4];
            		        }

            		        var b64decoded = atob(decoded);
            		        matches = b64decoded.match(re);
            		        if(matches) {
            		        	return matches[2]+matches[4];
            		        }
            	        }
            	        catch(e)
            	        {
            		        //alert("Exception: "+JSON.stringify(e));
            	        }
                    }
                }
                return null;
            },

            getUrlVars : function (url){
                //Creates an associative array of GET URL parameters
                var vars = {};

                var parts = url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
                     vars[key] = value;
                });
                return vars;
            }

        } // DOM.Utils
    }
});

/*******************************************************************************
 *
 *  Chrome specific functions
 *
 ******************************************************************************/

$.extend(AvastWRC.DOM, {
    responseCallback : null,
    sendRequest : function(anchors, callback) {
        this.responseCallback = callback;
        var urls = [];
        for (var i = 0, l = anchors.length; i < l; i++) {
            urls.push(anchors[i].url);
        }
        var msg = JSON.stringify(urls);
        this.port.postMessage({
            domains: msg
        });
    },
    openPort : function() {
        if(this.port == null) {
        	this.port = chrome.extension.connect({name: "wrc"+(new Date()).valueOf()});
        	this.port.onMessage.addListener(function(msg) {
                if (typeof this.responseCallback === 'function' ) {
                    this.responseCallback(msg.rankings);
                }
            }.bind(this));
        }
    }

});



// Start anchor monitoring
AvastWRC.DOM.initialize();
$.extend(window.AvastWRC, AvastWRC);

})(jQuery);