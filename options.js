function navigate(ev) {
    ev.preventDefault();
    var selected = 'selected';

    $('.mainview > *').removeClass(selected);
    $('.menu li').removeClass(selected);
    setTimeout(function() {
        $('.mainview > *:not(.selected)').css('display', 'none');
    }, 100);

    $(ev.currentTarget).parent().addClass(selected);
    var currentView = $($(ev.currentTarget).attr('href'));
    currentView.css('display', 'block');
    setTimeout(function() {
        currentView.addClass(selected);
    }, 0);

    setTimeout(function() {
        $('body')[0].scrollTop = 0;
    }, 200);
}

function load(options) {

    // Set each form field's value
    for (var key in options) {
        if (key === 'show') {
            $('input:radio[name=' + key + '][value=' + options[key] + ']').trigger('click');
        } else {
            $('#' + key).val(options[key]);
        }
    }

    // Trigger a click on the first navigation element
    $('#settings-nav').trigger('click');

    // Focus the first form element
    $('#timeRange').focus();
}

function save() {

    // Save options to storage
    chrome.storage.sync.get(null, function(options) {

        // Set each form field value in object
        for (var key in options) {
            if (key === 'show') {
                options[key] = $('input[name=show]:checked').val();
            } else {
                options[key] = $('#' + key).val();
            }
        }

        // Save object to storage, then close
        chrome.storage.sync.set(options, close);
    });
}

// Close this options tab
function close() {
    chrome.tabs.getCurrent(function(tab) {
        chrome.tabs.remove(tab.id);
    });
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

$(document).ready(function() {

    // Handle navigation click
    $('.menu a').click(navigate);

    // Hide any sections that aren't selected
    $('.mainview > *:not(.selected)').css('display', 'none');

    // Handle save, cancel button clicks
    $('#save').click(save);
    $('#cancel').click(close);

    // Handle subreddit filter radio change
    $('input[name=show]').change(function(e) {

        // Enable/disable subreddit text field
        if (e.target.value === 'front') {
            $('#subreddit').attr('disabled', 'disabled');
        } else {
            $('#subreddit').removeAttr('disabled').focus();
        }
    });

    // Handle options load
    chrome.storage.sync.get(null, load);
});

