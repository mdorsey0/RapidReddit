// Reload this page if our options change
chrome.storage.onChanged.addListener(function() {
    window.location.reload(true);
});

$('head').append(
    $('<style/>', {
        id: 'barStyle',
        html: '#bars .bar {}'
    })
);


/*

// Generate a Bates distribution of 10 random variables.
var values = d3.range(1000).map(d3.random.bates(10));

var margin = {top: 0, right: 5, bottom: 0, left: 5},
    width = $(window).width() - margin.left - margin.right,
    height = 50 - margin.top  - margin.bottom;

var x = d3.scale.linear()
    .domain([0, 1])
    .range([0, width]);

// Generate a histogram using twenty uniformly-spaced bins.
var data = d3.layout.histogram()
    .bins(x.ticks(20))
    (values);

var y = d3.scale.linear()
    .domain([0, d3.max(data, function(d) { return d.y; })])
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var svg = d3.select("#bars").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g");
//    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

$(window).resize(function() {
    $('#bars svg').attr('width', $(window).width() + margin.left + margin.right);
});

var bar = svg.selectAll(".bar")
    .data(data)
  .enter().append("g")
    .attr("class", "bar")
    .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

bar.append("rect")
    .attr("x", 1)
    .attr("width", x(data[0].dx) - 1)
    .attr("height", function(d) { return height - y(d.y); });

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

*/



function getPosts(after, isChained) {

    // Stop here if this isn't a chained call and we're already getting posts
    if (!isChained && $('body').hasClass('getting-posts')) {
        return;
    }

    // Stop here if we already have enough posts
    if ($('#unclicked-posts .post').length >= options.postCount) {
        return $('body').removeClass('getting-posts');
    }

    // A request is now in progress
    $('body').addClass('getting-posts');

    // Build URL with optional subreddit filter
    var url = [
        'http://www.reddit.com',
        options.show === 'front' ? '' : '/r/' + options.subreddit,
        '/top.json'
    ].join('');

    // Request posts from reddit
    $.ajax(url, {
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

    // Temporarily disable bars
    if (false) {

    var bars = $('#bars .bar'), maxScore = 0;
    bars.each(function(index, el) {
        maxScore = Math.max(maxScore, $(el).attr('score'));
    });

    var width = 1 / bars.length * 100;// / 2;
    $('#barStyle').html('#bars .bar {width: ' + width + '%;}');// margin-left: ' + width + '%;}');

    bars.each(function(index, el) {
        $(el).height($(el).attr('score') / maxScore * 100 + '%');
    });

    }

    // Schedule the next request to get more posts
    setTimeout(getPosts.bind(this, listing.data.after, true), 2000);
}

function updatePost(post) {

    // If this post already exists, update it
    if (document.getElementById(post.id)) {

        // Update score, date, comments of this post
        $('#' + post.id + ' .ups').text(post.ups);
        $('#' + post.id + ' .score').text(post.score);
        $('#' + post.id + ' .downs').text(post.downs);
        $('#' + post.id + ' time').text($.timeago(post.created_utc * 1000));
        $('#' + post.id + ' .comments').text(post.num_comments + ' comments');

        // Temporarily disable bars
        return;

        // Get this post's bar from the visualization
        var bar = $('#b_' + post.id);

        // Update "score" attribute of bar
        bar.attr('score', post.score);

        // Update the age CSS class of clicked posts
        if (!bar.hasClass('new')) {
            bar.attr('class', 'bar ' + getAgeClass(post.created_utc));
        }

        // Stop here since we've already drawn this post
        return;
    }

    // Temporarily disable bars
    //drawBar(post.id, post.score);

    // Get the list of similar URLs
    getSimilarUrls(post.url, function(urls) {

        // Define a callback for processing visits
        var processVisits = function(results) {

            // Stop the recursion here if we've seen this URL
            if (results.length) {
                // Temporarily disable bars
                //$('#b_' + post.id).attr('class', 'bar ' + getAgeClass(post.created_utc));
                return;
            }

            // If we have more to try, do that now...
            if (urls.length) {
                return chrome.history.getVisits({url: urls.shift()}, processVisits);
            }

            // Otherwise, we haven't seen this URL before, so draw the post
            $('#b_' + post.id).addClass('new');
            drawPost(post);
        };

        // Query history for visits to the first URL
        chrome.history.getVisits({url: urls.shift()}, processVisits);
    });
}

// Convert to CSS class name
function getAgeClass(time) {
    return 'rgb' + (198 + Math.floor(57 * (new Date().getTime() / 1000 - time) / getRange()));
}

// Convert named time range to seconds
function getRange() {
    switch (options.timeRange) {
        case 'hour':
            return 60;
        case 'day':
            return 86400;
        case 'week':
            return 604800;
        case 'month':
            return 2.63e+6;
        case 'year':
            return 3.156e+7;
    }

    // 'all' == age of Reddit
    return new Date().getTime() / 1000 - 1117602000;
}

function getSimilarUrls(htmlEncodedUrl, callback) {

    // URLs in post structure can have HTML entities in them (e.g. '&amp;' vs. '&')
    var url = $('<div/>').html(htmlEncodedUrl).text();

    // Parse the URL using the DOM
    var parser = document.createElement('a');
    parser.href = url;

    // Look at domain to determine similiar URLs
    switch (parser.hostname) {

        // youtube.com -> www.youtube.com
        case 'youtube.com':
            return callback([
                url,
                parser.protocol + '//www.' + parser.host + parser.pathname + parser.search + parser.hash
            ]);

        // youtu.be -> www.youtube.com
        case 'youtu.be':
            var id = parser.pathname.split('/'),
                params = (parser.search || '').length ? ('&' + parser.search.substr(1)) : '';

            return callback([
                url,
                parser.protocol + '//www.youtube.com/watch?v=' + id[1] + '&feature=youtu.be' + params + parser.hash
            ]);

        // m.youtube.com -> www.youtube.com
        case 'm.youtube.com':
            return callback([
                url,
                parser.protocol + '//www.youtube.com' + parser.pathname + parser.search + '&app=desktop' + parser.hash
            ]);
    }

    // No similar URLs available
    callback([url]);
}

function drawBar(id, score) {

    // Define the markup for a new bar
    var bar = [
        '<div id="b_',
        id,
        '" class="bar" score="',
        score,
        '"></div>'
    ].join('');

    // Look for a good place to insert the bar
    $('#bars .bar').each(function(index, el) {
        if ($(el).attr('score') < score) {
           return $(el).before(bar) && false;
        }
    });

    // Or just append at the end
    if (!$('#b_' + id).length) {
        $('#bars').append(bar);
    }
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
    $('#' + el.id + ' .link').click(post, function(e) {

        // Update bar class
        // Temporarily disable bars
        //
        // see this link:  http://bl.ocks.org/mbostock/3885705
        //
        //$('#b_' + e.data.id).attr('class', 'bar ' + getAgeClass(e.data.created_utc));

        // Moved to clicked-posts list
        $('#clicked-posts').prepend($('#' + e.data.id));

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
        '<div class="details' + (post.thumbnail.indexOf('http') === 0 ? ' has-thumbnail" style="background-image: url(' + post.thumbnail + ')"' : '"') + '>',
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
