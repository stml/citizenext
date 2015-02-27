/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2013 Avast Corp.
 *
 *  @author: Lucian Corlaciu
 *
 *  Injected specifics - Google Chrome
 *
 ******************************************************************************/

(function() {

  if (typeof AvastWRC == 'undefined') { AvastWRC = {}; }

  //avoid multiple injections
  if(AvastWRC.bs === undefined){
    var ial = null; //AvastWRC.ial instance - browser agnostic
    AvastWRC.bs = {
      init: function() {
        ial = AvastWRC.ial.init(this);
        chrome.extension.onMessage.addListener(
          function(request, sender, sendResponse) {
//            console.log('message ' + request.message);
            ial.messageHub(request.message, request.data);
          });
      },
      messageHandler: function(functionName, data) {
        data = data || {};
        data.message = functionName;
        chrome.extension.sendMessage(data);
      },
      initEnvironment: function(data) {

      },
      getLocalImageURL: function(file) {
        return chrome.extension.getURL('common/skin/img/'+ file);
      },
      getLocalResourceURL: function(file) {
        return chrome.extension.getURL(file);
      },
      triggerSettingsPage: function() {
        this.messageHandler('openSettings', {}); // open new tab from the background page
      },
    };

    AvastWRC.bs.init();

    AvastWRC.ial.registerEvents(function(ee){
      ee.on('message.initEnvironment', AvastWRC.bs.initEnvironment);
    });
  }

}).call(this);

$.noConflict(true);
