// Set default options if necessary
chrome.storage.sync.get({
    timeRange: 'day',
    show: 'front',
    subreddit: 'all',
    postCount: 25
}, function(o) {
    chrome.storage.sync.set(o);
});

// Listen for browser action click
chrome.browserAction.onClicked.addListener(function() {
    chrome.tabs.create({url: 'rr.html'});
});

// Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-39205973-1']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';

    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();

