/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *******************************************************************************
 *
 *  Background Browser Specific - Core Chrome Extensions functionality
 *
 ******************************************************************************/

(function(_) {

  var bal = null; //AvastWRC.bal instance - browser agnostic

  var hostInTab = [];
  var scriptInTab = [];

  /**
   * User has change from tab to tab or updated an url in the tab
   *
   * @param  {String} url    Site url loaded into the tab
   * @param  {Object} tab    Tab object reference
   * @param  {String} change Status of the tab (loading or undefined)
   * @return {void}
   */
  function urlInfoChange(url, tab, change, tabUpdated) {
    if(AvastWRC.CONFIG.ENABLE_WEBREP_CONTROL){
      var urlDetails = [url];

      if (tab.id) {
        urlDetails = {
          url : url,
          referer : AvastWRC.TabReqCache.get(tab.id, 'referer'),
          tabNum : tab.id,
          windowNum : tab.windowId,
          reqServices: bal.reqUrlInfoServices,
          tabUpdated: tabUpdated
        };
      }
      // perform urlinfo
      AvastWRC.get(urlDetails, function(res) {

        AvastWRC.bal.emitEvent('urlInfo.response', url, res[0], tab, tabUpdated);

      });
    }
  }


  /**
   * User updates URL  in the browser (clicking a link, etc.) Question: why is it also triggered for unloaded tabs
   *
   * @param  {Number} tabId      Tab Identification
   * @param  {Object} changeInfo state of loading {status : "loading | complete", url: "http://..."}  - url property appears only with status == "loading"
   * @param  {Object} tab        Tab properties
   * @return {void}
   */
  function onTabUpdated(tabId, changeInfo, tab) {
    // ignore unsuported tab urls like chrome://, about: and chrome.google.com/webstore - these are banned by google.
    if(!tab || !AvastWRC.bs.checkUrl(tab.url)) return;

    var host = bal.getHostFromUrl(tab.url);

    if(changeInfo.status === 'loading') {
      urlInfoChange(tab.url, tab, changeInfo.status, true);

      if (host) {
        delete scriptInTab[tab.id];
      }
    } else if(changeInfo.status === 'complete') {
      if (hostInTab[tabId] === undefined) {
        urlInfoChange(tab.url, tab, changeInfo.status, true);
      }
      AvastWRC.bal.emitEvent('page.complete', tabId, tab, tab.url);
    }
    if (host) {
      hostInTab[tabId] = host;
    }
  }

  /**
   * User changes tab focus
   *
   * @param  {Object} tab        Tab object
   * @param  {Object} changeInfo [description]
   * @return {void}
   */
  function onSelectionChanged(tabId, changeInfo) {
    chrome.tabs.get(tabId, function(tab) {
      // ignore unsuported tab urls like chrome://, about: and chrome.google.com/webstore - these are banned by google.
      if(!tab || !AvastWRC.bs.checkUrl(tab.url)) return;

      urlInfoChange(tab.url, tab, changeInfo.status, false);
    });
  }

  /**
   * Handles the onSendHeaders event to retrieve data (referer URL) from the request headers.
   * Stores retrieved data into AvastWRC.TabReqCache.
   * @param {Object} details event details
   */
  function onSendHeaders(details) {
    if (details.type === 'main_frame') {
      var referer = AvastWRC.bs.retrieveRequestHeaderValue(details.requestHeaders, 'Referer');
      AvastWRC.TabReqCache.set(details.tabId, 'referer', referer);
    }
  }

  /**
   * Forwards all the messages to the browser agnostic core
   */
  function messageHub(request, sender, reply) {
    bal.commonMessageHub(request.message, request, sender.tab);
  }

  /**
   * Injects all the needed scripts to a tab and sends a message
   */
  function accessContent(tab, data) {
    if(scriptInTab[tab.id] === undefined) {
      scriptInTab[tab.id] = true;
      var options = {
          tab : tab,
          callback: function(){ AvastWRC.bs.messageTab(tab, data); }
      };
      _.extend(options, AvastWRC.bal.getInjectLibs());
      AvastWRC.bs.inject(options);
    }
    else {
      AvastWRC.bs.messageTab(tab, data);
    }
  }


  /*****************************************************************************
   * bs - override the common browser function with ext. specific
   ****************************************************************************/
  _.extend(AvastWRC.bs,
  {
    accessContent: accessContent,

    /**
     * Get host of the tab.
     */
    getHostInTab: function(tabId) {
      return hostInTab[tabId];
    },

    /**
     * Set host of the tab.
     */
   setHostInTab: function(tabId, host) {
      hostInTab[tabId] = host;
    }

  });

  /*****************************************************************************
   * bs.aos - browser specific AOS functionality
   ****************************************************************************/
  AvastWRC.bs.core = AvastWRC.bs.core || {};
  _.extend(AvastWRC.bs.core, // Browser specific
  {
    /**
     * Function called on BAL initialization to initialize the module.
     */
    init: function (balInst) {
      bal = balInst;

      chrome.tabs.onUpdated.addListener( onTabUpdated );

      chrome.tabs.onSelectionChanged.addListener( onSelectionChanged );

      chrome.tabs.onRemoved.addListener( AvastWRC.onTabRemoved );

      chrome.extension.onMessage.addListener( messageHub );

      chrome.webRequest.onSendHeaders.addListener(
        onSendHeaders,
        {urls: ['http://*/*', 'https://*/*']},
        ['requestHeaders']
      );
    },
    /**
     * Called after initialization to kick some functionality on start.
     */
    // afterInit: function () {
    //   AvastWRC.bal.checkPreviousVersion(AvastWRC.CONFIG.CALLERID);
    // },

    /* Register SafePrice Event handlers */
    registerModuleListeners: function(ee) {

    }


  }); // AvastWRC.bs.aos

  AvastWRC.bal.registerModule(AvastWRC.bs.core);

}).call(this, _);

/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *  Background Browser Specific - AOS specific
 *
 ******************************************************************************/

(function(_) {

  var bal = null; //AvastWRC.bal instance - browser agnostic

  /**** SERP processing chache impl. in onConnect func. ****/
  var URL_CACHE_TTL = 10*60*1000; // 10mins to expire the cached SERP urls
  var URL_CACHE_REFRESH = 30*1000; // 30secs to check and clean the cache
  var urlRankingCache = {};
  var urlRankingCacheLastCheck = 0;

  /**
   * Update toolbar button
   *
   * @param  {Object} urlinfo Instance of UrlInfo class
   * @param  {Object} tab     Tab object properties
   * @return {void}
   */
  function updateButton(url, urlinfo, tab) {
    var ratingText = urlinfo.getRatingString();
    var weightText = urlinfo.getWeightString();
    var iconString = urlinfo.getIcon();

    // is the tab still opened?
    AvastWRC.bs.tabExists.call(this, tab.id, function(){
      chrome.browserAction.setIcon({ path : 'common/skin/img/' + iconString, tabId:tab.id});
      var title = "Avast - " + AvastWRC.bs.getLocalizedString(ratingText) + " " + AvastWRC.bs.getLocalizedString(weightText);
      chrome.browserAction.setTitle({title: title, tabId: tab.id});
    });
  }

  /**
   * Injected scripts listener
   *
   * @param  {Object} port    Definition of the incomming message
   * @return {void}
   */
  function onConnect(port) {
    if(port.name.indexOf('wrc') > -1 && AvastWRC.CONFIG.ENABLE_WEBREP_CONTROL) {
      // Handle multi requests >> this should be just a function reference - throttled
      port.onMessage.addListener(function(msg) {
        var domains = JSON.parse(msg.domains),
            requestUrls = [],
            response = {},
            now = (new Date()).valueOf(),
            expire = now - URL_CACHE_TTL;
        // no external links specified
        if(domains.length <= 0) { return; }

        // create an url for UrlInfo get
        for(var i=0, l = domains.length; i < l; i++) {
          var d = domains[i];
          var c = urlRankingCache[d];
          if(c) {
            if (c.lastHit > expire) {
              response[d] = c;
              c.lastHit = now;
            } else {
              // cache record expired
              delete urlRankingCache[d];
              c = null;
            }
          }
          if (!c) {
            requestUrls.push({url : d});
          }
        }

        // get results from backend
        if (requestUrls.length > 0) {
          AvastWRC.get(requestUrls, function(urlinfo){
            // create a response object from rated urls
            for(var i=0, j=urlinfo.length; i<j; i++){
              var r = {
                icon : urlinfo[i].getIcon(),
                rating : urlinfo[i].getRatingCategory(),
                weight : urlinfo[i].getWeightCategory(),
                flags : urlinfo[i].getFlags(),
                lastHit : now
              };
              response[urlinfo[i].url] = r;
              urlRankingCache[urlinfo[i].url] = r;
            }
            // report results back to the tab script
            port.postMessage({rankings: response});
          }, true);
        } else {
          port.postMessage({rankings: response});
        }

        // drop all expired cache records
        if (urlRankingCacheLastCheck < now - this.URL_CACHE_REFRESH) {
          urlRankingCacheLastCheck = now;
          var toDrop = [], cnt=0;
          for (var key in urlRankingCache) {
            var r = urlRankingCache[key];
            cnt++;
            if (r.lastHit <= expire) {
              toDrop.push(key);
            }
          }
          for (var i=0, l=toDrop.length; i < l; i++) {
            delete urlRankingCache[toDrop[i]];
          }
        }
      });
    }
  }

  /**
   * Check if the site has further rules that can applied (MultiRequest) and inject appropriate script
   * @param  {Object} tab Chrome tab reference object
   * @return {void}
   */
  function applyRules (tabId, url) {
    // get the rule for this tab
    var rule = AvastWRC.Rules.get(url);
    // no rule?? stop here
    if(!rule) return;

    // prepare params
    var styleOpts = "var styleOpts = '" + rule.style + "'; var CONFIG = " + JSON.stringify(AvastWRC.CONFIG) +";";
    // inject scripts >> TODO: can't we inject and execute just 1 script >> might be faster
    AvastWRC.bs.tabExists(tabId, function() {
      chrome.tabs.executeScript(tabId, {file: "common/libs/jquery-1.5.2.js",allFrames: false}, function() {
        chrome.tabs.executeScript(tabId, {code: styleOpts,allFrames: false}, function() {
          chrome.tabs.executeScript(tabId, {file: "scripts/anchor.js",allFrames: false}, _.noop);
        });
      });
    });
  }

  /**
   * Event handler to run and inject SERP colouring rules.
   * @param {Object} details    triggered event details
   * @return {void}
   */
  function onNavigationCommitted(details) {
    if(details.frameId === 0 && AvastWRC.CONFIG.ENABLE_WEBREP_CONTROL && AvastWRC.CONFIG.ENABLE_SERP)   {
      applyRules(details.tabId, details.url);
    }
  }


  /**
   * Sidebar data generator
   */
  function openSidebar(tab) {
    var host = AvastWRC.bs.getHostInTab(tab.id) || bal.getHostFromUrl(tab.url);
    AvastWRC.bs.setHostInTab(tab.id, host);

    var data = {
      message : 'populate',
      data: {
        dnt    : bal.DNT.compute(tab.id, host),
        webrep : bal.WebRep.compute(host)
      },
    };
    AvastWRC.bs.accessContent(tab, data);
  }
  /**
   * Extension button handler
   */
  function actionClicked() {
    AvastWRC.bs.accessTab( openSidebar );
  }

  /**
   * On Before Request handler - used by DNT feature
   * Synchronous - Blocking !!!
   */
  function checkDNT(request) {
    if(request.type !== 'main_frame' &&
      bal.DNT.isTracking(
        request.url,
        AvastWRC.bs.getHostInTab(request.tabId),
        request.tabId))
    {
      if (request.type == 'sub_frame') {
        return { redirectUrl: 'about:blank' };
      }
      else if (request.type == 'image') {
        return {
          redirectUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII='
        };
      }
      else {
        var mock =AvastWRC.Utils.resolveLocalMock(request.url);
        if (mock) {
          return {
            redirectUrl : chrome.extension.getURL("common/mocks/" + mock)
          };
        } else {
          return {cancel: true};
        }
      }
    }
    else {
      return {cancel: false};
    }
  }

  /*****************************************************************************
   * bs.aos - browser specific AOS functionality
   ****************************************************************************/
  AvastWRC.bs.aos = AvastWRC.bs.aos || {};
  _.extend(AvastWRC.bs.aos, // Browser specific
  {
    /**
     * Function called on BAL initialization to initialize the module.
     */
    init: function (balInst) {
      bal = balInst;

      chrome.webNavigation.onCommitted.addListener( onNavigationCommitted );

      chrome.extension.onConnect.addListener( onConnect );

      chrome.browserAction.onClicked.addListener( actionClicked );

      bal.hookOnFeatureChange('dnt', function(enabled) {
        if (enabled) {
          chrome.webRequest.onBeforeRequest.addListener(checkDNT,
            {urls: ['http://*/*', 'https://*/*']}, ['blocking']);
        } else {
          chrome.webRequest.onBeforeRequest.removeListener(checkDNT);
          AvastWRC.bal.DNT.resetAllTabs();
        }
      }.bind(this));
    },
    /**
     * Called after initialization to kick some functionality on start.
     */
    afterInit: function () {
      AvastWRC.bal.checkPreviousVersion(AvastWRC.CONFIG.CALLERID);
    },

    /* Register SafePrice Event handlers */
    registerModuleListeners: function(ee) {
      ee.on('badgeInfoUpdated',
        AvastWRC.Utils.throttle(
          function(tab_id, host, getData) {
            var data = getData(tab_id, host); // {text: ..., color: ...}
            if(data) {
              chrome.browserAction.setBadgeBackgroundColor({tabId: tab_id, color: data.color });
              chrome.browserAction.setBadgeText({tabId: tab_id, text: data.text});
            }
          },
        100)
      );

      // update bowser action button
      ee.on('urlInfo.response', updateButton);
    }


  }); // AvastWRC.bs.aos

  AvastWRC.bal.registerModule(AvastWRC.bs.aos);

}).call(this, _);

/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *  Background Browser Specific - AOS specific - module for stadalone execution
 *
 ******************************************************************************/

(function(AvastWRC, chrome, _) {

  var CALLER_ID = 1014;
  var REQUIRED_URLINFO_SERVICES = 0x000F ; // AOS (WR, P, B, SC)

  var _bal = null;

  /**
   * Definiion of supported extensions the AOS connects with .
   * Provide following function:
   *   extMatch - function to match the extension based on extension Info object
   *   msgHandle - function to handle message from the linked extension
   */
  var EXT_EXTENSIONS = [
    { // handle SP ext.
      linked : false,
      id : null,
      extMatch : function (extInfo) {
        return /SafePrice/.test(extInfo.name);
      },
      msgHandle : function (request, sender, sendResponse) {
        if (request.msg === 'event') { // pass sent events to emitter
          AvastWRC.bal.emitEvent(request.event, request);
        }
      }
    }
  ];

  var _activatedExt = {};

  // function initSafePrice

  /**
   * Link matched extension on install or enable.
   */
  function findExtDesc (extInfo) {
    return _.find(EXT_EXTENSIONS, function(extd) {return extd.extMatch(extInfo);});
  }

  /**
   *
   * @param {Object} extDesc - can be either extDesc from EXT_EXTENSIONS or exteInfo from chrome management.
   */
  function initExt (extDesc, extInfo) {
    if (extInfo.id) {
      chrome.runtime.sendMessage(extInfo.id, {msg: 'init', sender_id: chrome.runtime.id },
        function(response) {
          extDesc.id = extInfo.id;
          extDesc.linked = true;
          _activatedExt[extInfo.id] = extDesc;
        }
      );
    }
  }

  function onStarted (extInfo) {
    var extDesc = findExtDesc(extInfo);
    if (extDesc) {
      initExt(extDesc, extInfo);
    }
  }

  function onFinished (extId) {
    var extDesc = _activatedExt[extId];
    if (extDesc) {
      extDesc.linked = false;
      extDesc.id = null;
      delete _activatedExt[extId];
    }
  }

  AvastWRC.bs.aos.sa = AvastWRC.bs.aos.sa || {};
   _.extend(AvastWRC.bs.aos.sa, // Browser specific
    {
      /**
       * Function called on BAL initialization to initialize the module.
       */
      init: function (balInst) {

        _bal = balInst;

        // find extensions to control
        // chrome.management.getAll(function(extInfos) {
        //   _(EXT_EXTENSIONS)
        //     .map(function(extDesc) {
        //       var extInfo = _.find(extInfos, extDesc.extMatch);
        //       return (extInfo && extInfo.enabled) ? [extDesc, extInfo] : null;
        //     })
        //     .compact()
        //     .each(function(d) {
        //       initExt(d[0], d[1]);
        //     });
        // });

        // chrome.management.onInstalled.addListener(onStarted);
        // chrome.management.onEnabled.addListener(onStarted);
        // chrome.management.onUninstalled.addListener(onFinished);
        // chrome.management.onDisabled.addListener(function(extInfo) { onFinished(extInfo.id); });

        // chrome.runtime.onMessageExternal.addListener(
        //   function(request, sender, sendResponse) {
        //     var extDesc = _activatedExt[sender.id];
        //     extDesc.msgHandle(request, sender, sendResponse);
        //   }
        // );

        // chrome.runtime.onSuspend.addListener(function () {
        //   _.forOwn(_activatedExt, function(extDesc, id) {
        //     chrome.runtime.sendMessage(id, {msg: 'close', sender_id: chrome.runtime.id });
        //   });
        // });
    },

  }); // AvastWRC.bs.aos.sa

  AvastWRC.bal.registerModule(AvastWRC.bs.aos.sa);


  AvastWRC.init( CALLER_ID ); // initialize the avastwrc modules
  // Start background page initilizing BAL core
  AvastWRC.bal.init('Chrome', AvastWRC.bs, localStorage, REQUIRED_URLINFO_SERVICES);

}).call(this, AvastWRC, chrome, _);
