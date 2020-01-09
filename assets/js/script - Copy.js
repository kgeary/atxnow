//==============================================================================
// CONSTANTS
//==============================================================================
const MAX_TM_RESSPONSE_SIZE = 200; // Max results ticketmaster will send at a time
const MAX_DISPLAY_RESULTS = 10; // How Many Results to display at once.
const MAX_DISTANCE_LOCAL = 20;  // MAX Distance in Miles to be considered local

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
const topListEl = document.getElementById("topList");
const topHeadEl = document.getElementById("topHead");

//=====================================================================
// Dynamically create a table of Artist Information
// List all the fields in the html that should be included
// description - Table heading cell text
// field - Name of the field in artist object
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
    events: undefined,
}

//==============================================================================
// Event Listeners
//==============================================================================

//=====================================================================
// Search Button Click Handler
//=====================================================================
btnSearchEl.addEventListener("click", function () {
    // Clear out old listings, elements
    eventListEl.innerHTML = "";
    eventHeadEl.textContent = "";
    discListEl.innerHTML = "";
    topListEl.innerHTML = "";
    artistInfoEl.setAttribute("style", "display: none;");
    pageDivEl.setAttribute("style", "display: none;");

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

// pageGo click event handler
pageGoEl.addEventListener("click", function (event) {
    pageInputEl.value = parseInt(pageInputEl.value);
    user.page = pageInputEl.value;
    pageInputEl.value = "";
    loadPage();
});

// pageInput keyPress event handler
pageInputEl.addEventListener("keypress", function (event) {
    if (event.which === 13) {
        pageGoEl.click();
    }
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
        return;
    } else if ((user.page - 1) * MAX_DISPLAY_RESULTS >= user.events.length) {
        user.page = Math.ceil(user.events.length / MAX_DISPLAY_RESULTS);
        pageInputEl.value = user.page;
        return;
    }

    // Clear out then re-display the Event Page
    eventListEl.innerHTML = "";
    displayEvents();

    // Send the user back to the top of the event list
    location.href = "#topEvent";
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
        result = `No Results for ${noun}`;
    } else if (total === 1) {
        result = `${noun}: ${total} result`;
    } else if (total < MAX_DISPLAY_RESULTS) {
        result = `${noun}: ${total} results`;
    } else {
        result = `${noun}: Results ${first} - ${last} of ${total}`;
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
            user.lastSearch = user.location.city;
            return user.location;
        });
}

//=====================================================================
// Get a Promise to retrieve the Events for an Artist
//  artist = artist object
//=====================================================================
function getArtistEventsPromise(artist) {
    let keyword = "keyword=" + artist.name;
    let startDate = "&startDateTime=" + moment().format("YYYY-MM-DDT00:00:00Z");
    let sort = "&sort=date,asc";
    let size = "&size=" + MAX_TM_RESSPONSE_SIZE;
    let classification = "&classificationName=Music";
    let country = "&countryCode=US";
    let artistUrl = "https://app.ticketmaster.com/discovery/v2/events?" +
        keyword + startDate + sort + size + country + classification +
        "&apikey=FQ8UCXc3CAuobviMuflPZ7WKasBMvUMM";
    return axios.get(artistUrl);
}

//=====================================================================
// Get a Promise to retrieve the Events for a Location
//  loc = location object
//=====================================================================
function getLocalEventsPromise(loc) {
    const radiusMiles = MAX_DISTANCE_LOCAL;
    let latlng = "latlong=" + loc.lat + "," + loc.lon;
    let startDate = "&startDateTime=" + moment().format("YYYY-MM-DDT00:00:00Z");
    let radius = "&radius=" + radiusMiles + "&unit=miles";
    let sort = "&sort=date,asc";
    let size = "&size=" + MAX_TM_RESSPONSE_SIZE;
    let classification = "&classificationName=Music";
    let country = "&countryCode=US";
    let locationUrl = "https://app.ticketmaster.com/discovery/v2/events?" +
        latlng + startDate + radius + sort + size + country + classification +
        "&apikey=FQ8UCXc3CAuobviMuflPZ7WKasBMvUMM";
    console.log("Location Events URL", locationUrl);
    return axios.get(locationUrl);
}

//=====================================================================
// Call the API to get concert Data in the area
// 1. Get the user location from IP
// 2. Get the Events upcoming for that location.
//=====================================================================
function getAreaEvents() {
    // 1. API REQUEST - Look up the User Location based off IP Address
    // 2. API REQUEST - Find Metro Areas based off Location Data
    // 3. API REQUESTS - Request Event Info from Each Metro Area
    getLocationPromise()
        .then(function (locationData) {
            // Get Events for our location here!!!
            return getLocalEventsPromise(locationData);
        })
        .then(function (response) {
            // Parse and Display The Events
            console.log("LOCAL CURRENT EVENTS", response);
            let events = parseEvents(response);
            return events;
        }).then(function (events) {
            labelStatusEl.textContent = ""; // Update the status label
            user.events = events; // Cache the area events
            displayEvents(); // Display the Events on the Page
        })
        .catch(function (error) {
            //======================================================
            // ERROR ENCOUNTERED
            //======================================================
            console.log("Error Getting Data!!!!");
            console.log(error);
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

            //=====================================================
            // DEBUGGING - Print the Response Objects
            //=====================================================
            console.log("All Audio DB API Calls Good!");

            //=====================================================
            // API Was successful but no artists found
            // throw an error to be caught below
            //=====================================================
            if (!artistResponse.data.artists) {
                throw new Error("No Artists Found in Audio DB!");
            }

            // Parse the data we need into objects;
            user.artist = parseArtist(artistResponse.data.artists[0]);
            user.lastSearch = user.artist.name;
            user.artist.albums = parseAlbums(discResponse.data.album);
            user.artist.tracks = parseTracks(topResponse.data.track);
            return getArtistEventsPromise(user.artist);
        })
        .then(function (response) {
            // Parse and Display The Events
            console.log("Artist Events", response);
            user.events = parseEvents(response);
            displayArtist(user.artist);
            inputArtistEl.value = "";
            // Scroll to results
            scrollWin()
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
// Map the Current Location and Set Markers
// loc = location object with lat and lon properties
// markers = location object with lat and lon properties
// zoom = Zoom Factor (6=Country, )
//=====================================================================
function mapData(loc, markers, zoom = user.zoom) {
    if (user.map) {
        user.map.off();
        user.map.remove();
    }

    // Map the user location
    user.map = L.mapquest.map('map', {
        center: [parseFloat(loc.lat), parseFloat(loc.lon)],
        layers: L.mapquest.tileLayer('map'),
        zoom: zoom
    });

    // Add each marker in the array to the map
    if (markers) {
        markers.forEach(function (marker) {
            var latlng = L.latLng(parseFloat(marker.lat), parseFloat(marker.lon));
            L.marker(latlng, {
                title: marker.name || "No Title Yet",
            }).addTo(user.map);
        });
    }
}

//=====================================================================
// Map the User Location and Set a Marker
//=====================================================================
function mapUser() {
    user.location.name = "Your Approximate Location";
    mapData(user.location, [user.location], 16);
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
        let isPrevEnabled = (user.page !== 1);
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
    let events = response.data._embedded.events;
    if (!events) return respEvents;

    // console.log("EVT", response);
    events.forEach(function (evt) {
        //console.log("TicketMaster Event Details", evt);
        let venue = evt._embedded.venues[0];
        //console.log("venue", venue);
        respEvents.push({
            id: evt.id,
            name: evt.name,
            type: evt.type,
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
function displayEvents(displayNewDayHeading = true) {
    let events = user.events;
    let heading = getResultStr();
    let limit = MAX_DISPLAY_RESULTS;

    // Set the Event Section Heading
    eventHeadEl.textContent = heading;
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
        let h1 = createEl("h4", "title"); // Create a h1 for Event Name
        div.appendChild(h1);

        // Create a Link to Event Details.
        let headLink = createLink(event.name, "title event-link", event.uri);
        h1.appendChild(headLink);

        // if event is close by... Create a Local Event Span
        if (event.distance < MAX_DISTANCE_LOCAL) {
            headLink.classList.add("has-text-weight-bold");
            let span = createEl("span", "local-event", "LOCAL");
            h1.appendChild(span);
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
            let dayHeading = createEl("h1", "tite", moment(event.startDate, "YYYY-MM-DD").format("dddd, MMMM Do YYYY"));
            dayMarkerContainer.appendChild(dayHeading);
        }

        // Store the date for the next iteration of our new day heading check
        lastOutputTime = event.startDate;

        // Append the event to the Event List
        eventListEl.appendChild(div);
    });

    // Update the paging to reflect the new event list
    updatePaging();
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

    // Clear Out the old table
    artistTableEl.innerHTML = "";
    // Set the Artist Name
    artistNameEl.textContent = artist.name;
    // Set the thumbnail Image for the artist
    thumbEl.setAttribute("src", artist.thumbnail);
    thumbEl.setAttribute("alt", artist.name);

    // Display the artist details table
    displayArtistTable(artist);
    // Display concerts
    displayEvents();
    // Display the album discography list
    displayAlbums(artist.albums);
    // Display the top tracks
    displayTracks(artist.tracks);

    // Make sure the results window is showing
    artistInfoEl.setAttribute("style", "display: initial;");
    // Clear the loading status
    labelStatusEl.textContent = "";
}

//=====================================================================
// Update the HTML to display details for the artist table
// returns: none
//=====================================================================
function displayArtistTable(artist) {
    // Configure Each parameter in the table
    artistTableParams.forEach(function (param) {
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
    topListEl.innerHTML = "";

    if (tracks.length < 1) {
        topHeadEl.textContent = "Top Tracks Not Available";
        return;
    }

    topHeadEl.textContent = "Top " + tracks.length + " tracks";
    tracks.forEach(function (track) {
        let li = document.createElement("li");
        // Name
        let pName = document.createElement("h3");
        pName.textContent = track.name;
        // Album
        let pAlbum = document.createElement("h5");
        pAlbum.textContent = track.album;
        // Youtube Link
        let video = document.createElement("div");
        video.innerHTML = getYouTube(track.video);

        li.appendChild(pName);
        li.appendChild(pAlbum);
        li.appendChild(video);
        li.setAttribute("class", "tile is-child");
        topListEl.appendChild(li);
    });
}

//====================================================================
// Return the iframe html for a youtube video
// returns: HTML for a youtube iframe in string form
//====================================================================
function getYouTube(src) {
    if (!src) {
        return '';
    } else if (!src.includes("youtube.com/embed/")) {
        src = src.replace("www.youtube.com/", "www.youtube.com/embed/");
    }
    return '<iframe src="' + src + '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
}

// ===================================================================
// AJAX Error Handler
//   This will be called instead of our success handler if any of the
//   api requests fail.
//   1. Update the status label to indicate we have an error 
// ===================================================================
function onError(error) {
    console.log("An Error Occurred");
    labelStatusEl.textContent = "An Error Occurred - " + error.message;
    labelStatusEl.classList.add("is-danger");
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
getAreaEvents();