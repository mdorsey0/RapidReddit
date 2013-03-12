// Reload this page if our options change
chrome.storage.onChanged.addListener(function() {
    window.location.reload(true);
});

function getPosts(after, isChained) {

    // Stop here if this isn't a chained call and we're already getting posts
    if (!isChained && $('body').hasClass('getting-posts')) {
        return;
    }

    // Stop here if we already have enough posts
    if ($('#unclicked-posts .post').length >= options.postCount) {
        $('body').removeClass('getting-posts');
        return;
    }

    // A request is now in progress
    $('body').addClass('getting-posts');

    // Request posts from reddit
    $.ajax('http://www.reddit.com/r/' + options.subreddit + '/top.json', {
        cache: false,
        data: {
            sort: 'top',
            t: options.timeRange,
            limit: 100,
            after: after
        },
        error: function(jqXHR, status, error) {

            // Log what happened
            switch (status) {
                case 'abort':       console.error('Request to retrieve posts aborted');
                case 'parsererror': console.error('Unable to parse response from reddit');
                case 'timeout':     console.error('Request to retrieve posts timed out');
                case 'error':       console.error('Received error (%s) while requesting posts', error);
            }

            // Schedule a retry
            console.info('Retrying in 30 seconds...');
            return setTimeout(getPosts.bind(this, after, true), 30000);
        },
        dataType: 'json',
        success: processPosts
    });
}

function processPosts(listing) {
    console.log('processPosts(%O)', listing);

    // Update each post
    for (var i = 0; i < listing.data.children.length; i++) {
        updatePost(listing.data.children[i].data);
    }

    // Schedule the next request to get more posts
    setTimeout(getPosts.bind(this, listing.data.after, true), 2000);
}

function updatePost(post) {

    // If this post already exists, update it
    if (document.getElementById(post.id)) {
        $('#' + post.id + ' .ups').text(post.ups);
        $('#' + post.id + ' .score').text(post.score);
        $('#' + post.id + ' .downs').text(post.downs);
        $('#' + post.id + ' time').text($.timeago(post.created_utc * 1000));
        $('#' + post.id + ' .comments').text(post.num_comments + ' comments');
        return;
    }

    // Get the list of similar URLs
    var urls = getSimilarUrls(post.url);

    // Define a callback for processing visits
    var processVisits = function(results) {

        // Stop the recursion here if we've seen this URL
        if (results.length) {
            return;
        }

        // If we have more to try, do that now...
        if (urls.length) {
            return chrome.history.getVisits({url: urls.shift()}, processVisits);
        }

        // Otherwise, we haven't seen this URL before, so draw the post
        drawPost(post);
    };

    // Query history for visits to the first URL
    chrome.history.getVisits({url: urls.shift()}, processVisits);
}

function getSimilarUrls(htmlEncodedUrl) {

    // URLs in post structure can have HTML entities in them (e.g. '&amp;' vs. '&')
    var url = $('<div/>').html(htmlEncodedUrl).text();

    // Parse the URL using the DOM
    var parser = document.createElement('a');
    parser.href = url;

    // Look at domain to determine similiar URLs
    switch (parser.hostname) {

        case 'youtube.com':
            return [
                url,
                parser.protocol + '//www.' + parser.host + parser.pathname + parser.search + parser.hash
            ];

        case 'youtu.be':
            var id = parser.pathname.split('/'),
                params = (parser.search || '').length ? ('&' + parser.search.substr(1)) : '';

            return [
                url,
                parser.protocol + '//www.youtube.com/watch?v=' + id[1] + '&feature=youtu.be' + params + parser.hash
            ];
    }

    return [url];
}

function drawPost(post) {
    var list = document.getElementById('unclicked-posts'), el;

    // Find the right place to create this post, ordered by score
    $('#' + list.id + ' .post').each(function() {
        if (!el && post.score > $('#' + this.id + ' .score').text()) {
            el = list.insertBefore(document.createElement('li'), this);
        }
    });

    // Or just insert it at the end of the list
    el = el || list.appendChild(document.createElement('li'));

    // Set the ID
    el.id = post.id;
    el.className = 'post';

    // Draw the content of the post
    el.innerHTML = getPostHtml(post);

    // Listen for post clicks
    $('#' + el.id + ' .link').click(post.id, function(e) {

        // Moved to clicked-posts list
        $('#clicked-posts').prepend($('#' + e.data));

        // Get more posts!
        getPosts();
    });
}

function getPostHtml(post) {
    var date = new Date(post.created_utc * 1000);

    return [
        '<div class="votes">',
            '<div class="ups">',
                post.ups,
            '</div>',
            '<div class="score">',
                post.score,
            '</div>',
            '<div class="downs">',
                post.downs,
            '</div>',
        '</div>',
        '<div class="details' + (post.thumbnail.indexOf('http') == 0 ? ' has-thumbnail" style="background-image: url(' + post.thumbnail + ')"' : '"') + '>',
            '<p class="title">',
                '<a class="link" href="' + post.url + '" target="_blank">',
                    post.title,
                '</a>',
                '<span class="domain">',
                    ' (',
                    '<a href="http://www.reddit.com/domain/' + post.domain + '/" target="_blank">',
                        post.domain,
                    '</a>',
                    ')',
                '</span>',
            '</p>',
            '<p class="tagline">',
                post.over_18 ? '<acronym class="nsfw" title="Adult content: Not Safe For Work">NSFW</acronym>' : '',
                ' submitted ',
                '<time title="' + date.toString()  + '" datetime="' + date.toISOString() + '">',
                    $.timeago(date.getTime()),
                '</time>',
                ' by ',
                '<a class="author" href="http://www.reddit.com/user/' + post.author + '" target="_blank">',
                    post.author,
                '</a>',
                ' to ',
                '<a class="subreddit" href="http://www.reddit.com/r/' + post.subreddit + '/" target="_blank">',
                    post.subreddit,
                '</a>',
                ' with ',
                '<a class="comments" href="http://www.reddit.com' + post.permalink + '" target="_blank">',
                    post.num_comments + ' comments',
                '</a>',
            '</p>',
        '</div>'
    ].join('');
}

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

var options;
$(document).ready(function() {

    // Add recent toggle functionality
    $('#recent').mousedown(function() {
        $('body').toggleClass('show-clicked');
    });

    // Load options from storage
    chrome.storage.sync.get(null, function(o) {
        options = o;

        // Get our first set of posts now
        getPosts();
    });
});
