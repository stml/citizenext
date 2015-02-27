// Called when the user clicks on the browser action.

chrome.browserAction.onClicked.addListener(function(tab) {
	opensidebar();
	});
	
function opensidebar() {
	chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
		function(tabs){
			  alert(tabs[0].url);
				}
			);
	}