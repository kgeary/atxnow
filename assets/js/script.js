//==============================================================================
// CONSTANTS
//==============================================================================
const MAX_TM_RESSPONSE_SIZE = 200; // Max results ticketmaster will send at a time
const MAX_DISPLAY_RESULTS = 10; // How Many Results to display at once.
const MAX_DISTANCE_LOCAL = 20;  // MAX Distance in Miles to be considered local
const ZOOM_ARTIST = 3;
const ZOOM_LOCAL = 11;
const ZOOM_DEFAULT = 12;
//==============================================================================
// HTML Elements
//==============================================================================
// Containers
const artistInfoEl = document.getElementById("artistInfo");
const heroBlockEl = document.getElementById("heroBlock");

// Artist Search
const btnSearchEl = document.getElementById("btnSearch");
const inputArtistEl = document.getElementById("inputArtist");
const labelStatusEl = document.getElementById("labelStatus");

// Artist Info
const artistTableEl = document.getElementById("artistTable");
const artistNameEl = document.getElementById("artistName");
const logoEl = document.getElementById("artistLogo");
const thumbEl = document.getElementById("artistThumb");

// Events List
const eventListEl = document.getElementById("eventList");
const eventHeadEl = document.getElementById("eventHead");

// Pagination
const pageDivEl = document.getElementById("pageDiv");
const pageNextEl = document.getElementById("pageNext");
const pagePrevEl = document.getElementById("pagePrev");
const pageLastEl = document.getElementById("pageLast");
const pageInputEl = document.getElementById("pageInput");
const pageGoEl = document.getElementById("pageGo");

// Discography
const discListEl = document.getElementById("discList");
const discHeadEl = document.getElementById("discHead");

// Top Tracks
const topVideoEl = document.getElementById("topVideo");
const topBoxEl = document.getElementById("topBox");
const topHeadEl = document.getElementById("topHead");
const topTrackNameEl = document.getElementById("topTrackName");
const topNextEl = document.getElementById("topNext");
const topPrevEl = document.getElementById("topPrev");

// Map
const mapEl = document.getElementById("map");
const mapHeadEl = document.getElementById("mapHead");
const mapBoxEl = document.getElementById("mapBox");
const mq_key = "VRD3y4E9VSKqK3emqpyfILrJCl7sqvg1";
const tm_key = "MMUvMBsaKW7ZPlfuMivbouAC3cXCU8QF";
//=====================================================================
// Dynamically create a table of Artist Information
// List all the fields in the html that should be included
// description - Table heading cell text
// field - Name of the field from artist object
//=====================================================================
const artistTableParams = [
    { description: "Name", field: "name" },
    { description: "From", field: "origin" },
    { description: "Genre", field: "genre" },
    { description: "Mood", field: "mood" },
    { description: "Style", field: "style" },
    { description: "Formed", field: "formed" },
    { description: "Website", field: "website", isLink: true },
    // { description: "Biography", field: "bio"}, // Bio causes some styling issues due to the length
];

//=====================================================================
// User Settings
//=====================================================================
let user = {
    location: undefined,
    artist: undefined,
    map: undefined,
    zoom: ZOOM_DEFAULT,
    page: 1,
    lastSearch: "",
    events: [],
    maxPageTm: 1,
    caption: "",
    trackIndex: 0,
}

//==============================================================================
// Event Listeners
//==============================================================================

//=====================================================================
// Search Button Click Handler
//=====================================================================
btnSearchEl.addEventListener("click", function () {
    // Clear out old listings, elements
    clearMap();
    mapHeadEl.textContent = "";
    eventListEl.innerHTML = "";
    eventHeadEl.textContent = "";
    discListEl.innerHTML = "";
    discHeadEl.textContent = "";
    topVideoEl.innerHTML = "";
    topTrackNameEl.textContent = "";
    topHeadEl.textContent = "";
    thumbEl.setAttribute("src", "");
    thumbEl.setAttribute("alt", "Artist Image");
    artistInfoEl.setAttribute("style", "display: none;");
    pageDivEl.setAttribute("style", "display: none;");
    mapBoxEl.setAttribute("style", "display: none;");
    topBoxEl.setAttribute("style", "display: none;");
    user.trackIndex = 0;
    user.events = [];

    // Handle the user input
    let strArtist = inputArtistEl.value.trim();
    if (strArtist === "") {
        getAreaEvents();
    } else {
        getArtistData(strArtist, displayArtist);
    }

    // Set the Loading Status
    labelStatusEl.classList.remove("is-danger");
    labelStatusEl.textContent = "Loading...";


    // Initialize Paging
    user.page = 1;
});

//=====================================================================
// Artist Search Input KeyPress Event (Watch for enter)
// - redirect to the click handler
//=====================================================================
inputArtistEl.addEventListener("keypress", function (event) {
    // If the Keypressed was 13 (Enter) then trigger a Button Search Click Event
    if (event.which === 13) {
        btnSearchEl.click();
    }
});

//=====================================================================
// Next Button Click
// Increment the page number and try to load it
//=====================================================================
pageNextEl.addEventListener("click", function (event) {
    event.preventDefault();
    user.page++;
    loadPage();
});

//=====================================================================
// Previous Button Click
// Decrement the page number and try to load it
//=====================================================================
pagePrevEl.addEventListener("click", function (event) {
    event.preventDefault();
    user.page--;
    loadPage();
});

//=====================================================================
// Last Button Click
// Go to the last page number and try to load it
//=====================================================================
pageLastEl.addEventListener("click", function (event) {
    event.preventDefault();
    user.page = parseInt(event.target.textContent);
    loadPage();
});

// pageGo click event handler
pageGoEl.addEventListener("click", function (event) {
    let input = parseInt(pageInputEl.value);
    if (Number.isNaN(input)) {
        pageInputEl.value = user.page;
        return;
    }
    user.page = input;
    pageInputEl.value = "";
    loadPage();
});

// pageInput keyPress event handler
pageInputEl.addEventListener("keypress", function (event) {
    if (event.which === 13) {
        pageGoEl.click();
    }
});

// Next Button Click Track
// Increment the page number and try to load it
//=====================================================================
topNextEl.addEventListener("click", function (event) {
    event.preventDefault();
    user.trackIndex++;
    if (user.trackIndex >= user.artist.tracks.length) {
        user.trackIndex = 0;
    }
    displayTracks(user.artist.tracks);
});
//=====================================================================
// Previous Button Click Track
// Decrement the page number and try to load it
//=====================================================================
topPrevEl.addEventListener("click", function (event) {
    event.preventDefault();
    user.trackIndex--;
    if (user.trackIndex < 0) {
        user.trackIndex = user.artist.tracks.length - 1;
    }
    displayTracks(user.artist.tracks);
});

//==============================================================================
// Helper Functions
//==============================================================================

//=====================================================================
// Scroll Down on Click Function
//=====================================================================
function scrollWin() {
    window.scrollTo(0, 735);
}

//=====================================================================
// Load and Display the current page of results based on:
//  - user event list
//  - user page
//=====================================================================
function loadPage() {
    // Check for a valid page number 
    // don't reload the page if we don't have one
    if (user.page < 1) {
        user.page = 1;
        pageInputEl.value = user.page;
    } else if ((user.page - 1) * MAX_DISPLAY_RESULTS >= user.events.length) {
        user.page = Math.ceil(user.events.length / MAX_DISPLAY_RESULTS);
        pageInputEl.value = user.page;
    }

    // Clear out then re-display the Event Page
    eventListEl.innerHTML = "";
    displayEvents(false);

    // Send the user back to the top of the event list
    location.href = "#eventHead";
}

//=====================================================================
// Get a printable result string for displayEvents 
// returns: Results description string. Ex: "Results 11-20 of 2503"
//=====================================================================
function getResultStr() {
    let page = user.page;
    let first = ((page - 1) * MAX_DISPLAY_RESULTS) + 1;
    let last = Math.min(user.events.length, page * MAX_DISPLAY_RESULTS);
    let noun = user.lastSearch;
    let total = user.events.length;
    let result;

    // Build a result string header based on total # of items and current page
    if (total === 0) {
        result = `No events found for ${noun}`;
    } else if (total === 1) {
        result = `${noun}: ${total} result`;
    } else if (total < MAX_DISPLAY_RESULTS) {
        result = `${noun}: ${total} results`;
    } else {
        result = `${noun}: ${first}-${last} of ${total}`;
    }
    return result;
}

//=====================================================================
// Call the API to get the current location
// returns a promise to set user.location
//=====================================================================
function getLocationPromise() {
    const locationUrl = "https://json.geoiplookup.io/";

    if (user.location) return Promise.resolve(user.location); // cache the user location

    return axios.get(locationUrl)
        .then(function (response) {
            user.location = parseLocation(response);
            return user.location;
        });
}

//=====================================================================
// Get a Promise to retrieve the Events for an Artist
//  artist = artist object
//  pageIndex (zero-based)
//=====================================================================
function getArtistEventsPromise(artist, pageIndex = 0) {
    let latlng = "latlong=" + user.location.lat + "," + user.location.lon;
    let keyword = "&keyword=" + artist.name;
    let startDate = "&startDateTime=" + moment().format("YYYY-MM-DDT00:00:00[Z]");
    let sort = "&sort=distance,asc";
    let size = "&size=" + MAX_TM_RESSPONSE_SIZE;
    let page = "&page=" + pageIndex;
    let classification = "&classificationName=Music";
    let country = "&countryCode=US";
    let artistUrl = "https://app.ticketmaster.com/discovery/v2/events?" +
        latlng + keyword + startDate + sort + size + page + country + classification +
        "&apikey=" + getKey(tm_key);
    return axios.get(artistUrl);
}

//=====================================================================
// Get a Promise to retrieve the Events for a Location
//  pageIndex (zero-based)
//=====================================================================
function getLocalEventsPromise(pageIndex = 0) {
    const radiusMiles = MAX_DISTANCE_LOCAL;
    let latlng = "latlong=" + user.location.lat + "," + user.location.lon;
    let startDate = "&startDateTime=" + moment().format("YYYY-MM-DDT00:00:00[Z]");
    let radius = "&radius=" + radiusMiles + "&unit=miles";
    let sort = "&sort=date,asc";
    let size = "&size=" + MAX_TM_RESSPONSE_SIZE;
    let page = "&page=" + pageIndex;
    let classification = "&classificationName=Music";
    let country = "&countryCode=US";
    let locationUrl = "https://app.ticketmaster.com/discovery/v2/events?" +
        latlng + startDate + radius + sort + size + page + country + classification +
        "&apikey=" + getKey(tm_key);
    return axios.get(locationUrl);
}

//=====================================================================
// Call the API to get concert Data in the area
// 1. Get the user location from IP
// 2. Get the Events upcoming for that location.
//=====================================================================
function getAreaEvents(initial = false) {
    // if (initial) location.href = "#heroBlock";
    // 1. API REQUEST - Look up the User Location based off IP Address
    // 2. API REQUEST - Find Metro Areas based off Location Data
    // 3. API REQUESTS - Request Event Info from Each Metro Area
    getLocationPromise()
        .then(function (locationData) {
            // Get Events for our location here!!!
            return getLocalEventsPromise();
        })
        .then(function (response) {
            // Parse first events page
            //console.log("LOCAL CURRENT EVENTS", response);
            user.events = parseEvents(response);
            user.lastSearch = user.location.city;
            user.zoom = ZOOM_LOCAL;
            user.caption = "Local Area Events";

            // Request remaining pages
            let promises = [];
            for (let index = 1; index < user.maxPageTm; index++) {
                promises.push(getLocalEventsPromise(index));
            }
            return Promise.all(promises);
        })
        .then(function (values) {
            // Parse remaining event pages
            values.forEach(function (response) {
                //console.log("PromiseAll", response);
                user.events.push(...parseEvents(response));
            });
            // Display results to user
            labelStatusEl.textContent = " "; // Update the status label
            displayEvents();
            if (initial) {
                location.href = "#heroBlock";
            } else {
                location.href = "#eventHead";
            }
            console.log("ALL EVENTS RECEIVED", user.events.length);
        })
        .catch(function (error) {
            //======================================================
            // ERROR ENCOUNTERED
            //======================================================
            console.log("Error Getting Data!!!!");
            console.log(error.message);
            labelStatusEl.textContent = "Error Getting Initial Data";
            labelStatusEl.classList.add('is-danger');
        });
}

//=====================================================================
// Call the APIs to get the artist Data from Audio DB and Ticketmaster
//=====================================================================
function getArtistData(strArtist) {
    // Fix the input data. 
    // 1. Remove leading and trailing spaces
    // 2. Replace spaces with + for use in query string
    strArtist = escape(strArtist.trim().replace(" ", "+"));

    // Create the API Urls
    const base = "https://www.theaudiodb.com/api/v1/json/1";
    const artistUrl = base + "/search.php?s=" + strArtist;
    const discographyUrl = base + "/discography.php?s=" + strArtist;
    const topUrl = base + "/track-top10.php?s=" + strArtist;

    // Use Promise.all to run all get requests in parallel
    // 1. Get the Artist Info 
    // 2. Get the Artist Discography
    Promise.all([
        axios.get(artistUrl),
        axios.get(discographyUrl),
        axios.get(topUrl),
    ])
        .then(function (responses) {
            // ONCE All Requests have been successfully resolved...   
            // Unpack the individual response values from the responses array 
            let [artistResponse, discResponse, topResponse] = responses;
            console.log("All Audio DB API Calls Good!");

            //=========================================
            // If API Was successful but no artists found
            //   throw an error to be caught below
            //=========================================
            if (!artistResponse.data.artists) {
                throw new Error("No Artists Found in Audio DB!");
            }

            // Parse the data we need into objects;
            user.artist = parseArtist(artistResponse.data.artists[0]);
            user.lastSearch = user.artist.name;
            user.artist.albums = parseAlbums(discResponse.data.album);
            user.artist.tracks = parseTracks(topResponse.data.track);
            // Call Ticketmaster API to get the artist events
            return getArtistEventsPromise(user.artist);
        })
        .then(function (response) {
            // Parse and Display The Events
            console.log("Artist Events", response);
            user.events = parseEvents(response);
            user.caption = "Concerts for " + user.artist.name;

            // page 0 received. Request remaining pages index [1..maxPageTm)
            let promises = [];
            for (let index = 1; index < user.maxPageTm; index++) {
                promises.push(getArtistEventsPromise(user.artist, index));
            }
            return Promise.all(promises); // return an array of promises for each page remaining
        })
        .then(function (responses) {
            // go through each response in the array
            // Add additional event results to the user.events array
            responses.forEach(function (response) {
                // Using ES6 spread notation to pass new event array to array.push()
                let newEvents = parseEvents(response);
                user.events.push(...newEvents);
            });

            // Display Results and Scroll to Event results start
            displayArtist(user.artist);
            inputArtistEl.value = "";
            heroBlockEl.classList.remove("is-large");
            location.href = "#eventHead";
            // console.log("ALL EVENTS RECEIVED");
        })
        .catch(function (error) {
            //=====================================================
            // Only Executed if an error occurred
            // If any of the API Calls fail we end up here
            //=====================================================
            console.log("Error Received");
            console.log(error);
            labelStatusEl.classList.add("is-danger");
            labelStatusEl.textContent = error.message ||
                "An error occurred. please try again";
        });
}

//=====================================================================
// Clear an existing map from the screen
//=====================================================================
function clearMap() {
    if (user.map) {
        user.map.off();
        user.map.remove();
        user.map = null;
        mapBoxEl.setAttribute("style", "display: block;");
    }
}

//=====================================================================
// Map the Current Location and Set Markers
// center = center location for the map using {lat, lon} properties
// markers = event array to draw markers for
//=====================================================================
function drawMap(center, markers) {
    clearMap();
    mapHeadEl.textContent = user.caption || "This is a map";
    mapBoxEl.setAttribute("style", "display: block;");

    // Map the user location
    user.map = L.mapquest.map('map', {
        center: [parseFloat(center.lat), parseFloat(center.lon)],
        layers: L.mapquest.tileLayer('map'),
        zoom: user.zoom
    });

    // Add a orange marker for the center/user location
    var userMarker = L.icon({
        iconUrl: 'https://assets.mapquestapi.com/icon/v2/marker-orange-sm.png',
        iconRetinaUrl: 'https://assets.mapquestapi.com/icon/v2/marker-orange-sm@2x.png',
        iconSize: [28, 35],
        iconAnchor: [14, 35],
        popupAnchor: [1, -35],
    });
    L.marker(L.latLng(parseFloat(center.lat), parseFloat(center.lon)),
        {
            title: "Your current location",
            icon: userMarker,
        })
        .bindPopup("Current Location")
        .addTo(user.map);

    // Add each marker in the array to the map
    var clusters = L.markerClusterGroup();
    if (markers) {
        markers.forEach(function (marker) {
            var latlng = L.latLng(parseFloat(marker.lat), parseFloat(marker.lon));
            var options = {
                title: marker.name || "No Title Provided",
            }
            var mark = L.marker(latlng, options);
            mark.bindPopup(getPopup(marker));
            clusters.addLayer(mark);
        });
        user.map.addLayer(clusters);
    }
}

//=====================================================================
// Create the HTML for a map marker pop-up
//=====================================================================
function getPopup(evt) {
    var popup = "";
    if (evt.uri) {
        popup += '<a href="' + evt.uri + '" target="_blank">' + evt.name + '</a><br>';
    } else {
        popup += evt.name + "<br>";
    }
    popup += "@ " + evt.venue + "<br>";
    popup += '<img src="' + evt.image + '" width="100px">';
    return popup;
}

//=====================================================================
// Update the visibility of paging elements
//=====================================================================
function updatePaging() {
    let events = user.events;
    let isDisplayed = (events && events.length > MAX_DISPLAY_RESULTS);
    let displayValue = isDisplayed ? "flex" : "none";
    pageDivEl.setAttribute("style", "display: " + displayValue + ";");

    if (isDisplayed) {
        // Set the Visibility of Next/Prev based on event list size and page
        let isNextEnabled = (user.page * MAX_DISPLAY_RESULTS < events.length);
        let isPrevEnabled = (user.page != 1);
        // Set the Next Button
        if (isNextEnabled) {
            pageNextEl.removeAttribute("disabled", "");
            pageNextEl.setAttribute("enabled", "");
        } else {
            pageNextEl.setAttribute("disabled", "");
            pageNextEl.removeAttribute("enabled", "");
        }
        // Set the Previous Button
        if (isPrevEnabled) {
            pagePrevEl.removeAttribute("disabled", "");
            pagePrevEl.setAttribute("enabled", "");
        } else {
            pagePrevEl.setAttribute("disabled", "");
            pagePrevEl.removeAttribute("enabled", "");
        }
        pageInputEl.value = user.page;
        pageLastEl.textContent = Math.ceil(events.length / MAX_DISPLAY_RESULTS);
    }
};

//=====================================================
// Parse the Location Data from API
// returns a location object { city, zip, lat, lon }
//=====================================================
function parseLocation(response) {
    var locationData = {
        name: response.data.city,
        city: response.data.city,
        zip: response.data.postal_code,
        lat: parseFloat(response.data.latitude),
        lon: parseFloat(response.data.longitude),
    };
    return locationData;
}

//=====================================================
// Parse TicketMaster events into our own event object
// returns: an Array of events objects
//=====================================================
function parseEvents(response) {
    let respEvents = [];
    if (!response || !response.data || !response.data._embedded) return respEvents;

    // Get the ticketmaster event array. If it doesn't exist return no events
    let events = response.data._embedded.events;

    // Save the total events and max # of pages
    user.maxPageTm = parseInt(response.data.page.totalPages);

    if (!events) return respEvents;
    //console.log("EVT", response);
    events.forEach(function (evt) {
        //console.log("TicketMaster Event Details", evt);
        let venue = evt._embedded.venues[0];
        let imageUrl = "";
        if (evt.images && evt.images[0].url) {
            imageUrl = evt.images[0].url;
        }
        //console.log("venue", venue);
        respEvents.push({
            id: evt.id,
            name: evt.name,
            image: imageUrl,
            uri: evt.url,
            startDate: evt.dates.start.localDate,
            startTime: evt.dates.start.localTime,
            venue: venue.name,
            venueUri: venue.url,
            city: venue.city.name,
            state: venue.state.stateCode,
            lat: parseFloat(venue.location.latitude),
            lon: parseFloat(venue.location.longitude),
            distance: parseFloat(venue.distance),
        });
    });
    return respEvents;
}

//=====================================================
// PARSE ARTIST - Parse Audio DB for all the fields we 
//   care about
// returns: an artist object
//=====================================================
function parseArtist(artistData) {
    return artist = {
        id: artistData.idArtist,
        mbid: artistData.strMusicBrainzID,
        bio: artistData.strBiographyEN,
        formed: artistData.intFormedYear,
        genre: artistData.strGenre,
        logo: artistData.strArtistLogo,
        mood: artistData.strMood,
        name: artistData.strArtist,
        origin: artistData.strCountry,
        style: artistData.strStyle,
        thumbnail: artistData.strArtistThumb,
        website: artistData.strWebsite,
    };
}

//=====================================================
// PARSE ALBUMS with data from Audio DB
//   Create an empty array and push a new album object
//   for each iteration
// returns: Array of album objects
//=====================================================
function parseAlbums(responseAlbums) {
    let albums = []; // Create an Empty Albums Array

    // For Each Album in the result list...
    //   1. parse the response data into a new album object
    //   2. push the new album object on to the back of the albums array
    if (responseAlbums) {
        responseAlbums.forEach(function (album) {
            albums.push({
                name: album.strAlbum,
                year: album.intYearReleased,
            });
        });
    }
    return albums;
}

//======================================================
// PARSE TOP TRACKS from Audio DB data
// returns: Array of track objects
//======================================================
function parseTracks(topTracks) {
    //console.log("TRACKS", topTracks);
    let tracks = [];

    // For Each Track in the result list...
    //   1. parse the response data into a new track object
    //   2. push the new track object on to the back of the tracks array
    if (topTracks) {
        topTracks.forEach(function (track) {
            tracks.push({
                name: track.strTrack,
                artist: track.strArtist,
                album: track.strAlbum,
                video: track.strMusicVid,
            });
        });
    }
    return tracks;
}

//=====================================================================
// Update the HTML to display event info
// Display a single page of events on the page
//=====================================================================
function displayEvents(redrawMap = true, displayNewDayHeading = true) {
    let events = user.events;
    let limit = MAX_DISPLAY_RESULTS;

    // Set the Event Section Heading
    eventHeadEl.textContent = getResultStr();
    // Clear the current Event List from HTML
    eventListEl.innerHTML = "";
    // Keep track of iteration in order to process at most 'limit' results
    let index = 0;
    // Keep track of date for detecting new day heading
    let lastOutputTime = "";
    // Get the index of the first result in the list
    let pageStart = (user.page - 1) * MAX_DISPLAY_RESULTS;
    // Get a copy of the current page of events
    let pageEvents = events.slice(pageStart, pageStart + limit);

    // For Each Event in the Current Page Array:
    //   Create and display HTML Elements for the current event
    pageEvents.forEach(function (event) {
        if (index++ >= limit) return;   // Check to see if we are at the limit

        let div = createEl("div", "box"); // Create an event container div
        let eventTitle = createEl("h4", "title"); // Create a heading for Event Name
        div.appendChild(eventTitle);

        // Create a Link to Event Details.
        let headLink = createLink(event.name, "title is-4 event-link", event.uri);
        eventTitle.appendChild(headLink);

        // if event is close by... Create a Local Event Span
        if (event.distance < MAX_DISTANCE_LOCAL) {
            headLink.classList.add("has-text-weight-bold");
            let span = createEl("span", "local-event", "LOCAL");
            eventTitle.appendChild(span);
        }

        // Create a p for City, State, Start Date/Time, Distance to Event
        let inputMoment = moment(event.startDate + event.startTime, "YYYY-MM-DDHH:mm:ss");
        let outputTime = inputMoment.format('ddd, MMM Do @ h:mm a');
        let pCity = document.createElement("p");
        pCity.innerHTML = outputTime + "<br>" +
            event.city + ", " + event.state + "<br>" +
            "Distance to Event: " + event.distance.toFixed(1) + "mi";
        div.appendChild(pCity);

        // Create a Venue Link or Span if no link available
        let venueLink = createLink(event.venue, "venue-link", event.venueUri);
        div.appendChild(venueLink);

        // if displayNewDayHeading is enabled...
        // Add a header div when we encounter a new day in the listings
        if (displayNewDayHeading && lastOutputTime !== event.startDate) {
            let dayMarkerContainer = createEl("div", "dayMarker");
            eventListEl.appendChild(dayMarkerContainer);
            let dayHeading = createEl("h1", "title is-4", moment(event.startDate, "YYYY-MM-DD").format("dddd, MMMM Do YYYY"));
            dayMarkerContainer.appendChild(dayHeading);
        }

        // Store the date for the next iteration of our new day heading check
        lastOutputTime = event.startDate;

        // Append the event to the Event List
        eventListEl.appendChild(div);
    });

    // Update the paging to reflect the new event list
    updatePaging();
    if (redrawMap) drawMap(user.location, user.events);
}

//=====================================================================
// Create an HTML Link with the desired attributes.
// If no link is provided a span is created
// returns: an html element (a)
//=====================================================================
function createLink(text, cls, href) {
    // Set the class, href, and target for a newly created link element
    let tag = "a";
    if (!href) {
        tag = "span";
    }
    let el = document.createElement(tag);
    el.textContent = text;
    el.setAttribute("class", cls);
    if (href) {
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
    }
    return el;
}

//=====================================================================
// Create an HTML Element with the desired attributes
// returns: an html element
//=====================================================================
function createEl(tag, cls, text = undefined) {
    let el = document.createElement(tag);
    // if text is provided set the text
    if (text) el.textContent = text;
    // if classes provided set the class
    if (cls) el.setAttribute("class", cls);

    return el;
}

//=====================================================================
// Update the HTML to display the artist info
// returns: none
//=====================================================================
function displayArtist(artist) {
    //console.log("Displaying Artist");
    // Set the map zoom to ARTIST
    user.zoom = ZOOM_ARTIST;

    // Clear Out the old table
    artistTableEl.innerHTML = "";
    // Set the Artist Name
    artistNameEl.textContent = artist.name;
    // Set the thumbnail Image for the artist
    thumbEl.setAttribute("src", artist.thumbnail);
    thumbEl.setAttribute("alt", artist.name);

    // Display the artist details table
    displayArtistTable(artist);
    // Display artist concerts
    displayEvents(true, false);
    // Display the album discography list
    displayAlbums(artist.albums);
    // Display the top tracks
    displayTracks(artist.tracks);

    // Make sure the results window is showing
    artistInfoEl.setAttribute("style", "display: initial;");
    // Clear the loading status
    labelStatusEl.textContent = " ";
}

//=====================================================================
// Update the HTML to display details for the artist table
// returns: none
//=====================================================================
function displayArtistTable(artist) {
    // Configure Each parameter in the table
    artistTableParams.forEach(function (param) {
        if (!artist[param.field]) return;
        let row = document.createElement("tr");
        let col1 = document.createElement("th");
        col1.textContent = param.description;
        let col2 = document.createElement("td");
        if (param.isLink) {
            let anchor = document.createElement("a");
            anchor.setAttribute("href", "http://" + artist[param.field]);
            anchor.setAttribute("target", "_blank");
            anchor.textContent = artist[param.field];
            col2.appendChild(anchor);
        } else {
            col2.textContent = artist[param.field];
        }
        row.appendChild(col1);
        row.appendChild(col2);
        artistTableEl.appendChild(row);
    });

    // Append the Logo as the last row of the table
    let imgRow = document.createElement("tr");
    let imgCol = document.createElement("td");
    imgCol.setAttribute("colspan", "2");
    imgRow.appendChild(imgCol);
    artistTableEl.appendChild(imgRow);
}

//====================================================================
// Add the Album list to the HTML
// returns: none
//====================================================================
function displayAlbums(albums) {
    discHeadEl.textContent = "Last " + albums.length + " Albums";
    discListEl.innerHTML = ""; // Clear out the old list
    albums.forEach(function (album) {
        let li = document.createElement("li");
        li.textContent = album.name + " (" + album.year + ")";
        li.setAttribute("class", "tile is-child box");
        discListEl.appendChild(li);
    });
}

//====================================================================
// Add the top tracks list to the HTML
// returns: none
//====================================================================
function displayTracks(tracks) {

    topBoxEl.setAttribute("style", "display: block;");

    if (tracks.length < 1) {
        topHeadEl.textContent = "Top Tracks Not Available";
        topPrevEl.setAttribute("style", "display: none;");
        topNextEl.setAttribute("style", "display: none;");
        return;
    } else if (tracks.length > 1) {
        topPrevEl.setAttribute("style", "display: initial;");
        topNextEl.setAttribute("style", "display: intitial;");
    }
    topHeadEl.textContent = "Top " + tracks.length + " tracks";
    var track = tracks[user.trackIndex];

    // Youtube Link
    if (track.video) {
        topVideoEl.innerHTML = getYouTube(track.video);
    } else {
        topVideoEl.textContent = "Video Not Available";
    }

    //console.log(topVideoEl.innerHTML);
    topTrackNameEl.textContent = track.name;

}

//====================================================================
// Return the iframe html for a youtube video
// returns: HTML for a youtube iframe in string form
//====================================================================
function getYouTube(src) {
    if (!src) {
        return '';
    } else if (!src.includes("youtube.com/embed/")) {
        src = src.replace("www.youtube.com/watch?v=", "www.youtube.com/embed/");
    }
    return '<iframe src="' + src + '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
}

// making it a little harder for key scrapers
function getKey(str) {
    return str.split("").reverse().join("");
}

/**************************************/
/* MAIN - Code that runs at startup   */
/**************************************/
// Get Concert Data for the current location
L.mapquest.key = getKey(mq_key);

// Get Concert Data for the current location
getAreaEvents(true);
