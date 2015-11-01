/* global define */
define([
    'jquery'
    , 'ramda'
    , 'pointfree'
    , 'Maybe'
    , 'player'
    , 'bacon'
    , 'io'
    , 'http'
], function ($, R, P, Maybe, Player, bacon, io, http) {
    'use strict';

    // Allow .toIO to be called on functions
    io.extendFn();

    // HELPERS ///////////////////////////////////////////////////////////////////////////
    var API_KEY = 'Please fill in your API key or this will not work';
    var compose = P.compose;
    var mjoin = P.mjoin;
    var map = P.map;
    var log = function (x) {
        console.log(x);
        return x;
    };
    var fork = R.curry(function (f, future) {
        return future.fork(log, f);
    });

    var setHtml = R.curry(function (sel, x) {
        return $(sel).html(x);
    });

    // PURE //////////////////////////////////////////////////////////////////////////////
    var listen = R.curry(function (eventType, domElement) {
        return bacon.fromEvent(domElement, eventType);
    });

    // getDom :: String -> IO(Dom)
    // the actual Haskell syntax is getDom :: String -> IO Dom
    // takes a String and returns an IO wrapping Dom element
    // since we have jQuery, we can convert it into an IO by simply doing .toIO on $ (jQuery function)
    // so getDom('#anExampleDiv') returns an IO which wraps your div but has not executed yet (lazy)
    var getDom = $.toIO();

    // keyPressStream :: Dom -> EventStream(DomEvent)
    // the actual Haskell syntax is keyPressStream :: Dom -> EventStream DomEvent
    // a function that takes an element as an argument and returns an EventStream that listens for keyup events
    var keyPressStream = listen('keyup');

    // targetValue :: Object (DomEvent) -> String
    // takes an Object and does object.target.value and returns that
    var targetValue = R.compose(R.get('value'), R.get('target'));

    // valueStream :: EventStream(domEvent) -> EventStream(String)
    // takes an EventStream wrapping domEvent and transforms it into an EventStream wrapping Strings using
    // the targetValue function to do this
    var valueStream = R.compose(map(targetValue), keyPressStream);

    // youTubeURLMaker :: String (search) -> String (URL)
    // takes a search term and returns a URL
    var youTubeURLMaker = function (searchTerm) {
        return 'https://www.googleapis.com/youtube/v3/search?' +
            $.param({
                part: 'snippet',
                q: searchTerm,
                key: API_KEY,
                alt: 'json'
            });
    };

    // urlStream :: EventStream(Search value String) -> EventStream(YouTube URL String)
    // Takes a EventStream wrapping what you typed in and turns it into a EventStream wrapping youtube query
    var urlStream = R.compose(map(youTubeURLMaker), valueStream);

    // searchResultStream :: EventStream(YouTube URL String) -> EventStream(Future(result Object)))
    // takes the EventStream wrapping youtube query and makes the query sometime in the future (not done yet its lazy)
    var searchResultStream = R.compose(map(http.getJSON), urlStream);

    // getTitleAndVideoId :: Object -> Object with title and video id
    // get the title and video id from the object and return it
    var getTitleAndVideoId = function (result) {
        return {
            videoId: result.id.videoId,
            title: result.snippet.title
        };
    };

    // getTitlesAndVideoIds :: Object -> List(object containing only title and video id)
    // compose the above functionality by first getting items which is a list and then doing map(getTitleAndVideoId)
    // to promote the simple function to work on a functor context
    var getTitlesAndVideoIds = R.compose(map(getTitleAndVideoId), R.get('items'));

    // prepare titles and set videoId to be the id of the title and for rendering
    // prepareTitlesAndVideoIds :: Object -> String
    // Prepare HTML String from an object
    var prepareTitlesAndVideoIds = function (titleAndVideoId) {
        var title = titleAndVideoId.title;
        var videoId = titleAndVideoId.videoId;
        return '<li><a id="' + videoId + '">' + title + '</a></li>';
    };

    // getAndPrepareTitleAndVideoId :: List(object containing only title and video id) -> List(String HTML)
    var getAndPrepareTitleAndVideoId = R.compose(map(prepareTitlesAndVideoIds), getTitlesAndVideoIds);

    // getTitlesAndVideoIdsStream :: EventStream(Future(result Object))) -> EventStream(Future(List(HTML as string)))
    // searchResultStream is a EventStream(Future(result Object))), so we map to unwrap EventStream and map to unwrap
    // Future to get at the result object then we run getAndPrepareTitleAndVideoId which takes the object and gives us
    // a list of HTML strings and since we use map, we get the wrapping so we get back
    // EventStream(Future(List(HTML as string)))
    var getTitlesAndVideoIdsStream = R.compose(map(map(getAndPrepareTitleAndVideoId)), searchResultStream);

    // getHTMLAndFormat :: List(String HTML) -> String HTML
    // Takes an Array Functor and unwraps it by joining all the elements wrapped by the array functor
    var getHTMLAndFormat = R.join('');

    // prepareResultStream :: EventStream(Future(List(HTML as string))) -> EventStream(Future(HTML as String)))
    // past all the unwrapping of Functors, we are really taking the List of HTML strings and concatenating it to
    // a single string containing all the HTML
    var prepareResultStream = R.compose(map(map(getHTMLAndFormat)), getTitlesAndVideoIdsStream);

    // actually does the rendering
    // renderResultStream :: EventStream(Future(HTML as String))) -> EventStream(Future(whatever jQuery gives me)))
    // setHTML writes to the DOM, past all the wrapping, that is ultimately what we are trying to do
    var renderResultStream = R.compose(map(map(setHtml('#results'))), prepareResultStream);

    // ioThenEventStream :: String -> IO(EventStream(Future()))
    // creates the IO(EventStream(Future(.... functor nesting
    var ioThenEventStream = R.compose(map(renderResultStream), getDom)('#search');
    //////////////////////The above code shows me all the search results////////////////////////////////////////////////

    //Now when those are clicked, let's listen and embed that video
    // clickStream :: domSelector -> EventStream(domEvents)
    var clickStream = listen('click');

    // makeSureTargetWasA :: String -> Maybe(String)
    // this prevents rendering of videos if you click on non-a tags
    var makeSureTargetWasA = function (target) {
        // TODO: I should really be using Right and Left not Maybe
        return target.tagName == 'A' ? Maybe(target) : Maybe(null);
    };

    // getTargetThenId :: Object -> Maybe(String id)
    // I have a nested Maybe (since I do it twice) so I use mjoin to flatten it since Maybe is a monad
    var getTargetThenId = R.compose(mjoin, Maybe, map(R.get('id')), makeSureTargetWasA, R.get('target'));

    // clickTargetThenIdStream :: EventStream(domEvent) -> EventStream(Maybe(String id))
    var clickTargetThenIdStream = R.compose(map(getTargetThenId), clickStream);

    // makeYouTubeEmbedLink :: String -> String HTML
    var makeYouTubeEmbedLink = function (id) {
        return '<object width="640" height="360" data="https://www.youtube.com/embed/' + id + '"/>';
    };

    // htmlStream :: EventStream(Maybe(String id)) -> EventStream(Maybe(String html))
    var htmlStream = R.compose(map(map(makeYouTubeEmbedLink)), clickTargetThenIdStream);

    var putInDomStream = R.compose(map(map(setHtml('#player'))), htmlStream);

    // ioThenEventStreamForClicks :: domElement -> IO(EventStream(Maybe(String id)))
    var ioThenEventStreamForClicks = R.compose(map(putInDomStream), getDom)(document);

    // IMPURE ////////////////////////////////////////////////////////////////////////////
    // Execute the lazy computations we have been building up
    ioThenEventStream.runIO().onValue(function (future) {
        future.fork(R.identity, R.identity);
    });

    ioThenEventStreamForClicks.runIO().onValue(R.identity);

});
