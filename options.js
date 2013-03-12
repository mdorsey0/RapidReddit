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

function save() {

    // Save options to storage
    chrome.storage.sync.get(null, function(o) {

        // Set each form field value in object
        for (var i in o) {
            o[i] = $('#' + i).val();
        }

        // Save object to storage
        chrome.storage.sync.set(o, function() {

            // Close this options tab
            chrome.tabs.getCurrent(function(tab) {
                chrome.tabs.remove(tab.id);
            });
        });
    });
}

$(document).ready(function() {

    // Handle navigation click
    $('.menu a').click(navigate);

    // Hide any sections that aren't selected
    $('.mainview > *:not(.selected)').css('display', 'none');

    // Handle save button click
    $('#save').click(save);

    // Load options from storage into form
    chrome.storage.sync.get(null, function(o) {
        for (var i in o) {
            $('#' + i).val(o[i]);
        }
    });

    // Trigger a click on the first navigation element
    $('#settings-nav').trigger('click');
});
