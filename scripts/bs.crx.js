/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2014 Avast Corp.
 *
 *  Background Browser Specific - general lib
 *
 ******************************************************************************/

(function(_) {

  _.extend(AvastWRC.bs, // Browser specific
  {

    /**
     * Get Plugin version as defined in manifest file
     *
     * @return {Number}        Browser Plugin version (corresponds with the build version)
     */
    getVersion : function(){
      return chrome.app.getDetails().version;
    },

    /**
     * Get currently active tab reference
     * @param  {Function} callback Callback function with tab object as argument
     * @return {void}
     */
    getActiveTab: function(callback){
      chrome.tabs.getSelected(null, callback);
    },

    /**
     * Load File and return its contents - overrides loadFile from AvastWRC.js
     * It can handle remote files from http, https, ftp (assuming we are getting the full url), or local files where file is relative path to extention root
     * @param  {String}   file     Full url of the file or local path relative to extention root
     * @param  {Function} callback Callback function with file content string as firt param
     * @param  {Bool}     nocache  If set to true, cached content is going to be ignored
     * @return {Object}            Xmlhttp request object
     */
    loadFile : function(file, callback, nocache){
      var req = new XMLHttpRequest(),
          path = (file.indexOf("http") == 0 || file.indexOf("ftp") == 0) ? file : chrome.extension.getURL(file);

      // Check if we can use cached value
      if (!nocache && this._loadedFiles[path]) {
        // dispatch callback function
        callback(this._loadedFiles[path]);
        // stop right here
        return false;
      }
      // The file was either not cache or we are not supposed to use it - load it
      req.open("GET", file, true);
      req.onreadystatechange = function() {
        if (req.readyState == 4 && req.status == 200) {
          // store it in cache
          AvastWRC._loadedFiles[path] = req.responseText;
          // dispatch callback function
          callback(req.responseText);
        }
      };
      req.send(null);
      return req;
    },

    /**
     * Retrieve attribute from Chrome request headers
     * @param  {array}  requestHeaders  request headers array
     * @param  {string} headerName      name of the header to retrieve
     * @return {string}                header value
     */
    retrieveRequestHeaderValue : function(requestHeaders, headerName) {
      if (requestHeaders) {
        for (var i = 0; i < requestHeaders.length; ++i) {
          if (requestHeaders[i].name === headerName) {
            return requestHeaders[i].value;
          }
        }
      }
      return null;
    },

    /**
     * Get localization string for key
     * @param  {String} key  Key for the language string
     * @param  {String} args [optional] arguments to insert in the resource
     * @return {String}      Translated value
     */
    getLocalizedString: function(key, args) {
      var msg = chrome.i18n.getMessage(key);
      return args ? AvastWRC.Utils.aosFormat(msg, args) : msg;
    },
    /**
     * Redirets a specific tab to an specific url
     */
    tabRedirect: function(tab, new_url) {
      chrome.tabs.update(tab.id, {url: new_url});
    },
    /**
     * Get Tab identifier. Implemented in browser specific way.
     * @param {Object} tab object to get the id for
     */
    getTabId: function(tab) {
      return tab.id;
    },
    getTabUrl : function(tab){
      return tab.url;
    },
    /**
     * Closes a specific tab
     */
    closeTab: function(tab) {
      chrome.tabs.remove(tab.id);
    },
    /**
     * Sends a message to a specific tab
     */
    messageTab: function(tab, data) {
      AvastWRC.Utils.throttle(
        function(){
          chrome.tabs.sendMessage(tab.id, data);
        }, 1000)();
    },

    getLocalImageURL: function(file) {
      return chrome.extension.getURL('common/skin/img/'+ file);
    },

    getLocalResourceURL: function(file) {
      return chrome.extension.getURL(file);
    },

    /**
     * Performs an action on the current selected tab
     * @param  {Function} action
     * @return {void}
     */
    accessTab: function(action) {
      chrome.tabs.getSelected(null, action);
    },

    /* Open page in a new tab (to force open in tab instead of window - Safari specific).
     * @param {String} target url
     */
    openInNewTab: function(url, callback) {
      chrome.tabs.create({ url: url, active: true }, callback);
    },
    /**
     * Copy text provided into clipboard.
     * @param {String} text to copy to clipboard
     */
    copyToClipboard : function (text) {
      var body = document.getElementsByTagName('body');
      if (body.length > 0) {
        body = body[0];
        var copyFrom = document.createElement('textarea');
        copyFrom.value = text;
        body.appendChild(copyFrom);
        copyFrom.select();
        document.execCommand('copy', true);
        copyFrom.parentNode.removeChild(copyFrom);
      }
    },
    /**
     * Load templates, css and inject libraries, scripts into the page
     * @param  {Object} opt       Options with value :
     * @option {String} tpl_file Template path relative to extension
     * @option {String} css_file CSS path relative to extension
     * @option {Array} libs      Array of JS library fil pathes required (relative to extension)
     * @option {String} script   Path of the script that is going to intialized at the end
     * @option {Object} data     Data object that is going to be passed to the page
     * @option {String} varname  [optional] Name of the variable where the passed data is going to be stored (default = avast_data)
     * @return {void}
     */
    inject : function(opt){

      var options = _.extend({
        data : {},
        varname : "avast_data"
      }, opt);
      var tabId = options.tab.id;

      function injectLib(libs) {
        if (libs.length > 0 ) {
          chrome.tabs.executeScript(tabId, {file: libs[0] , allFrames: false}, function(results) {
            libs.shift()
            injectLib(libs);
          });
        } else {
          chrome.tabs.executeScript(tabId, {code: options.varname +" = '"+ JSON.stringify(options.data) +"';"},
            function() {
              chrome.tabs.executeScript(tabId, {file: options.script}, options.callback);
            }
          );
        }
      }

      var libs = options.libs.slice();

      this.tabExists(tabId, function() {
        if (options.tpl) {
          AvastWRC.bs.loadFile(options.tpl, function(tpl) {
            options.data.tpl = escape(tpl);
            if(options.css) {
              chrome.tabs.insertCSS(tabId, {file: options.css },
                function() {
                  injectLib(libs);
                });
            } else {
              injectLib(libs)
            }
          });
        } else if (!options.tpl && options.css) {
          chrome.tabs.insertCSS(tabId, {file: options.css },
            function() {
              injectLib(libs);
            });
        }else {
          injectLib(libs);
        }
      });
    },
    /**
     * Check if URL is not in the ignore list
     *
     * @param  {String}   url       Url including protocol (http,https, ftp)
     * @return {Bool}       true - allow url, false - ignored
     */
    checkUrl : function (url) {
      if(url == "") return false;
      for(var i=0, j=AvastWRC.DEFAULTS.IGNORE_TABS.length; i<j; i++) {
        if(url.indexOf(AvastWRC.DEFAULTS.IGNORE_TABS[i]) > -1 ) return false;
      }
      return true;
    },

    /**
     * Execute script in a tab
     *
     * @param  {Number}   id       Tab ID
     * @param  {Object}   options  Options to be passed to the executed script
     * @param  {Function} callback Callback function
     * @return {void}
     * NOTUSED
     */
    executeScript : function(id, options, callback) {
      this.tabExists(id, function(){
        chrome.tabs.executeScript(id, options, callback);
      });
    },
    /**
     * Check if the tab is still opened
     *
     * @param  {Number}   tabId    Tab ID
     * @param  {Function} callback Function to executed if tab exists
     * @return {void}
     */
    tabExists : function (tabId, callback) {
      // assume that this method was called through .call() to maintain context
      var self = this;
      chrome.windows.getAll({populate: true}, function(windows) {
        var exists = false;
        loop:
          for(var w=0; w < windows.length; w++) {
            for(var t=0; t < windows[w].tabs.length; t++){
              if(windows[w].tabs[t].id === tabId) {
                exists = true;
                break loop;
              }
            }
          }
          // TODO - condition for tabs with blank URL
          if(exists && callback) {
            // maintain context for the callback
            callback.call(self);
          }
      });
    }

  });

}).call(this, _);