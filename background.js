// Set default options if necessary
chrome.storage.sync.get({
    timeRange: 'week',
    subreddit: 'all',
    postCount: 25
}, function(o) {
    chrome.storage.sync.set(o);
});

// Listen for browser action click
chrome.browserAction.onClicked.addListener(function() {
    chrome.tabs.create({url: 'rr.html'});
});
