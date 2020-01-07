//==============================================================================
// CONSTANTS
//==============================================================================
const MAX_METROS = 20;          // How many metro areas to include
const MAX_DISPLAY_RESULTS = 10; // How Many Results to display at once.
const MAX_QUERY_RESULTS = 50;   // How Many Results to request at once.
const DAYS_CURRENT = 7;         // How many days to show for current events
const DAYS_ARTIST = 365;        // How many days to show for artist events
const KM_TO_MI = 0.6213711922;  // KM to Miles conversion factor
const MAX_DISTANCE_LOCAL = 15;  // MAX Distance in Miles to be considered local

//==============================================================================
// HTML Elements
//==============================================================================
// Containers
const artistInfoEl = document.getElementById("artistInfo");

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
const pageListEl = document.getElementById("pageList");
const pageFirstEl = document.getElementById("pageFirst");
const page1El = document.getElementById("page1");
const page2El = document.getElementById("page2");
const page3El = document.getElementById("page3");
const page4El = document.getElementById("page4");

const pageTotalEl = document.getElementById("pageTotal");

const pageNextEl = document.getElementById("pageNext");
const pagePrevEl = document.getElementById("pagePrev");

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

const sk = "jNVqoANxyxv3dO3F"; // TODO - REMOVE

//=====================================================================
// User Settings
//=====================================================================
let user = {
    location: undefined,
    artist: undefined,
    sortFunc: sortDateDistance,
    page: 1,
    lastSearch: "",
    events: {
        artist: undefined,
        area: undefined,
    }
}

//==============================================================================
// Event Listeners
//==============================================================================
//=====================================================================
// Page Link Click Handler
//=====================================================================
pageListEl.addEventListener("click", function (event) {
    if (event.target.matches(".pagination-link")) {
        let link = event.target;
        user.page = link.getAttribute("data-page");
        loadPage();
    }
});

//=====================================================================
// Search Button Click Handler
//=====================================================================
btnSearchEl.addEventListener("click", function () {
    // Clear out old concert listings
    // Get and Escape the User Input for security
    // Request the artist data from the API
    // Set the Status Label class to include is-danger to give red text
    // Update the Status Label to indicate we are loading
    // Hide the old info
    // Clear the input
    eventListEl.innerHTML = "";
    eventHeadEl.textContent = "";
    discListEl.innerHTML = "";
    topListEl.innerHTML = "";
    let strArtist = inputArtistEl.value.trim();
    if (strArtist === "") {
        getAreaEvents();
    } else {
        getArtistData(strArtist, displayArtist);
    }
    labelStatusEl.classList.remove("is-danger");
    labelStatusEl.textContent = "Loading...";
    artistInfoEl.setAttribute("style", "display: none;");
    // Initialize Paging, Hide the paging until needed
    user.page = 1;
    pageDivEl.setAttribute("style", "display: none;");

});

//=====================================================================
// Artist Search Input KeyPress Event (Watch for enter)
//=====================================================================
inputArtistEl.addEventListener("keypress", function (event) {
    // If the Keypressed was 13 (Enter) then trigger a Button Search Click Event
    if (event.which === 13) {
        btnSearchEl.click();
    }
});

//=====================================================================
// Next Button Click
//=====================================================================
pageNextEl.addEventListener("click", function (event) {
    event.preventDefault();
    user.page++;
    loadPage();
});

//=====================================================================
// Previous Button Click
//=====================================================================
pagePrevEl.addEventListener("click", function (event) {
    event.preventDefault();
    user.page--;
    loadPage();
});

//==============================================================================
// Helper Functions
//==============================================================================
//=====================================================================
// Load the next page of results;
//=====================================================================
function loadPage() {
    // Check for a valid page number
    if (user.page < 1) {
        user.page = 1;
        return;
    } else if ((user.page - 1) * MAX_DISPLAY_RESULTS >= user.events.length) {
        user.page--;
        return;
    }

    // Valid Page - Display the New Event Page
    eventListEl.innerHTML = "";
    displayEvents(user.events, getResultStr());

    // Send the user back to the top of the event list
    location.href = "#topEvent";
}

//=====================================================================
// Get a printable result string (ex: Results 11-20 of 2503)
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
        result = `No Event Results for ${noun}`;
    } else if (total === 1) {
        result = `Results for ${noun}: ${total} event`;
    } else if (total < MAX_DISPLAY_RESULTS) {
        result = `Results for ${noun}: ${total} events`;
    } else {
        result = `Results for ${noun}: ${first} - ${last} of ${total} events`;
    }
    return result;
}

//=====================================================================
// Call the API to get the current location
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
// Get a Promise to retriev the Events for an Artist
//  artist = artist object
//  days = number of days to search. undefined = no max date
//  page = the results page to get retrieve
//=====================================================================
function getArtistEventsPromise(artist, days = DAYS_ARTIST, page = 1) {
    let artistUrl = "https://api.songkick.com/api/3.0/artists/mbid:";
    artistUrl += artist.mbid;
    artistUrl += "/calendar.json?" + getQuery(days, page, MAX_QUERY_RESULTS);
    console.log(artistUrl);
    return axios.get(artistUrl);
}

//=====================================================================
// Call the API to get concert Data in the area
// 1. Get the user location from IP
// 2. Get the Metro ID's for the current location
// 3. Get the Events upcoming at each of the Metro ID's.
// days = number of days out to get events.  leave undefined for no max
//=====================================================================
function getAreaEvents(days = DAYS_CURRENT) {
    // 1. API REQUEST - Look up the User Location based off IP Address
    // 2. API REQUEST - Find Metro Areas based off Location Data
    // 3. API REQUESTS - Request Event Info from Each Metro Area

    getLocationPromise()
        .then(function (locationData) {
            // Find Metro Areas based off the location
            return axios.get(buildMetroUrl(locationData));
        })
        .then(function (response) {
            // Parse Metro Areas
            //console.log("METRO", response);
            metro_areas = parseMetroAreas(response);
            return metro_areas;
        }).then(function (areas) {
            // Get an Array of Promises to Query Metro Areas
            // Wait for all promises to return
            let promises = buildEventPromiseArray(areas, days, user.page);
            return Promise.all(promises); // Return Status once all promises have completed.
        }).then(function (values) {
            // Get an Array of Events in All the Metro Areas
            let events = [];
            values.forEach(function (response) {
                // For Each Metro Area API Response
                //console.log("METRO", response);
                events.push(...parseEvents(response));
            });
            // Sort the Array using the current sort strategy
            events.sort(user.sortFunc);
            // Filter the array of duplicate events
            events = events.filter(function (value, index, arr) {
                return (index === arr.findIndex(i => i.id === value.id));
            });
            // Hide/Show Pagination as needed
            return events;
        }).then(function (events) {
            // Cache the area events
            user.events = events;
            labelStatusEl.textContent = "";
            // Display the Events on the Page
            displayEvents(events, getResultStr());
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
            console.log("=== All API Calls Good! ===");
            //console.log(artistResponse);
            //console.log(discResponse);
            //console.log(topResponse);

            //=====================================================
            // API Was successful but no artists found
            // throw an error to be caught below
            //=====================================================
            if (!artistResponse.data.artists) {
                throw new Error("No Artists Found!");
            }

            // Parse the data we need into objects;
            var artist = parseArtist(artistResponse.data.artists[0]); // Keep this var so it can be accessed in then
            user.lastSearch = artist.name;
            artist.albums = parseAlbums(discResponse.data.album);
            artist.tracks = parseTracks(topResponse.data.track);
            return getArtistEventsPromise(artist, DAYS_ARTIST, user.page);
        })
        .then(function (response) {
            // Parse and Display The Events
            //console.log("Artist Events", response);
            let events = parseEvents(response);
            events.sort(user.sortFunc);
            artist.events = events;
            artist.total = response.data.resultsPage.totalEntries;
            user.artist = artist;
            return artist;
        })
        .then(function (response) {
            // Display the Artist on the page
            displayArtist(response);
            // Clear the user input
            inputArtistEl.value = "";
        })
        .catch(function (error) {
            //=====================================================
            // Handle all Errors here
            // IF any of the API Calls fail we end up here
            // Call the user defined fail function if it exists
            //=====================================================
            console.log("!!! ERROR !!!");
            if (error) {
                console.log("Error Received");
                console.log(error);
                labelStatusEl.classList.add("is-danger");
                if (error.message) {
                    labelStatusEl.textContent = error.message;
                } else {
                    labelStatusEl.textContent = "An error occurred. please try again";
                }
            } else {
                console.log("Unknown Error");
                console.log(error);
            }
        });
}

//=====================================================================
// Update the visibility of paging elements
//=====================================================================
function updatePaging(events) {
    //console.log("length", events.length);
    //console.log("total", events.total);
    //console.log("currentPage", user.page);
    let isDisplayed = (events && events.length > MAX_DISPLAY_RESULTS);
    //console.log("Paging isDisplayed", isDisplayed);
    //console.log("# EVENTS", event.length);
    let displayValue = isDisplayed ? "flex;" : "none;";
    pageDivEl.setAttribute("style", "display: " + displayValue + ";");

    if (isDisplayed) {
        // Set the Visibility of Next and Prev Buttons based on Event List size and Current Page
        let isNextEnabled = (user.page * MAX_DISPLAY_RESULTS < events.length);
        let isPrevEnabled = (user.page !== 1);
        if (isNextEnabled) {
            pageNextEl.removeAttribute("disabled", "");
            pageNextEl.setAttribute("enabled", "");
        } else {
            pageNextEl.setAttribute("disabled", "");
            pageNextEl.removeAttribute("enabled", "");
        }

        if (isPrevEnabled) {
            pagePrevEl.removeAttribute("disabled", "");
            pagePrevEl.setAttribute("enabled", "");
        } else {
            pagePrevEl.setAttribute("disabled", "");
            pagePrevEl.removeAttribute("enabled", "");
        }

        // Set the 1st Page
        page1El.setAttribute("data-page", 1);
        page1El.textContent = 1;

        // Set the Last Page
        let lastPageId = Math.ceil(events.length / MAX_DISPLAY_RESULTS);
        pageTotalEl.setAttribute("data-page", lastPageId);
        pageTotalEl.textContent = lastPageId;

        // Set the Middle Pages
        let pages = [];
        let upage = parseInt(user.page);
        if (lastPageId === 1) pages = [1, undefined, undefined];
        else if (lastPageId === 2) pages = [1, 2, undefined];
        else if (lastPageId === 3) pages = [1, 2, 3];
        else if (upage === 1) pages = [1, 2, 3];
        else {
            if (upage < lastPageId) {
                pages = [upage - 1, upage, upage + 1];
            } else {
                pages = [upage - 2, upage - 1, upage];
            }
        }
        let pageObjects = [
            { el: page1El, idx: pages[0] },
            { el: page2El, idx: pages[1] },
            { el: page3El, idx: pages[2] },
            { el: page4El, idx: pages[3] },

        ];
        // Set the data-page attribute, text and classes for links
        pageObjects.forEach(function (pageObject) {
            if (pageObject.idx) {
                pageObject.el.textContent = pageObject.idx;
                pageObject.el.setAttribute("data-page", pageObject.idx);
                if (pageObject.idx === upage) {
                    pageObject.el.classList.add("is-current");
                } else {
                    pageObject.el.classList.remove("is-current");
                }
                pageObject.el.setAttribute("style", "display: initial;");
            } else {
                pageObject.el.setAttribute("style", "display: none;");
            }
        });
    }
}

//=====================================================================
// Returns Promises to query Metro Areas for Events
// areas = array of Metro Area Objects from soundkick
// days = number of days out to search. leave undefined for no max date
//=====================================================================
function buildEventPromiseArray(areas, days, page = 1) {
    let promises = [];

    // Create promises to get the Events for Each Metro Area
    // returns the promises array
    areas.forEach(function (area) {
        let url = "https://api.songkick.com/api/3.0/metro_areas/" + area.id +
            "/calendar.json?" + getQuery(days, page, MAX_QUERY_RESULTS);
        promises.push(axios.get(url));
    })
    return promises;
}

//=====================================================================
// Returns URL to get a list of Metro Areas based on location
//=====================================================================
function buildMetroUrl(location) {
    // Get Location Info
    let queryUrl = "https://api.songkick.com/api/3.0/search/locations.json?";
    let sk2 = "&apikey=" + sk;
    // Use Latitude and Longitude if available else use city name
    if (location.lat && location.lon) {
        queryUrl += "location=geo:" + location.lat + "," + location.lon + sk2;
    } else {
        queryUrl += "query=" + location.city.replace(" ", "+") + sk2;
    }
    return queryUrl;
}

//=====================================================
// Parse the Location Data
//=====================================================
function parseLocation(response) {
    var locationData = {
        city: response.data.city,
        zip: response.data.postal_code,
        lat: parseFloat(response.data.latitude),
        lon: parseFloat(response.data.longitude),
    };
    return locationData;
}

//=====================================================
// Parse the events for an Artist or Metro Area
//=====================================================
function parseEvents(response) {
    let respEvents = [];
    let events = response.data.resultsPage.results.event;
    if (!events) return respEvents;

    console.log("EVT", response);
    events.forEach(function (evt) {
        respEvents.push({
            id: evt.id,
            name: evt.displayName,
            type: evt.type,
            uri: evt.uri,
            startDate: evt.start.date,
            startTime: evt.start.time,
            venue: evt.venue.displayName,
            venueUri: evt.venue.uri,
            city: evt.location.city,
            lat: parseFloat(evt.location.lat),
            lon: parseFloat(evt.location.lng),
            total: evt.total,
            distance: distance(user.location.lat, user.location.lon,
                evt.location.lat, evt.location.lng)
        });
    });
    return respEvents;
}

//=====================================================
// Parse the API response into an array of Metro Areas
//=====================================================
function parseMetroAreas(response, limit = MAX_METROS) {
    let areas = [];
    let locations = response.data.resultsPage.results.location;
    if (!locations) return areas;

    let index = 0;
    locations.forEach(function (location) {
        if (index++ >= limit) return;
        areas.push({
            id: location.metroArea.id,
            lat: parseFloat(location.metroArea.lat),
            lon: parseFloat(location.metroArea.lng),
            metroName: location.metroArea.displayName,
            cityName: location.city.displayName
        });
        //console.log("METRO = ", location.metroArea.displayName, "-", location.city.displayName);
    });
    //console.table(areas);
    return areas;
}

//=====================================================
// PARSE ARTIST
//   Create an object with all the fields we care about
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
// PARSE ALBUMS
//   Create an empty array and push a new album 
//   object for each iteration
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
// PARSE TOP TRACKS
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
//=====================================================================
function displayEvents(events, heading, limit = MAX_DISPLAY_RESULTS) {
    const displayNewDayHeading = true;

    // Set the Event Section Heading
    eventHeadEl.textContent = heading;
    // Clear the current Event List from HTML
    eventListEl.innerHTML = "";
    // Keep track of iteration for limit
    let index = 0;
    // Keep track of date for date heading
    let lastOutputTime = "";
    let pageStart = (user.page - 1) * MAX_DISPLAY_RESULTS;
    let pageEvents = events.slice(pageStart, pageStart + limit);
    // For Each Event in the Array - Create Elements and add them to the page
    pageEvents.forEach(function (event) {
        if (index++ >= limit) return;

        let div = document.createElement("div");
        div.setAttribute("class", "box");
        // h1 - Event Name
        let h1 = document.createElement("h4");
        div.appendChild(h1);
        h1.classList.add("title");
        // a - Link to Event Details.
        let headLink = document.createElement("a");
        h1.appendChild(headLink);
        headLink.setAttribute("class", "event-link");
        headLink.setAttribute("href", event.uri);
        headLink.setAttribute("target", "_blank");
        headLink.textContent = event.name;
        // Local Check
        if (event.distance < MAX_DISTANCE_LOCAL) {
            headLink.classList.add("has-text-weight-bold");
            let span = document.createElement("span");
            h1.appendChild(span);
            span.textContent = " LOCAL!";
        }
        // h3 - Event Type
        let h3 = document.createElement("h6");
        div.appendChild(h3);
        h3.classList.add("subtitle");
        h3.textContent = event.type;
        // p1 - City
        let p1 = document.createElement("p");
        div.appendChild(p1);
        p1.textContent = event.city;
        // p2 - Start Date/Time Formatted
        let p2 = document.createElement("p");
        div.appendChild(p2);
        let inputMoment = moment(event.startDate + event.startTime, "YYYYMMDDHHmm");
        let outputTime = inputMoment.format('dddd MMMM Do @ h:mm a');
        p2.textContent = outputTime;
        // p3 - Distance to Event
        let p3 = document.createElement("p");
        div.appendChild(p3);
        p3.textContent = "Distance to Event: " + event.distance.toFixed(1) + "mi";
        // a - Venue
        let a = document.createElement("a");
        div.appendChild(a);
        a.setAttribute("class", "venue-link");
        a.setAttribute("href", event.venueUri);
        a.setAttribute("target", "_blank");
        a.textContent = event.venue;

        // if displayNewDayHeading is enabled...
        // Add a header div for each new day in the listings
        if (displayNewDayHeading && lastOutputTime !== event.startDate) {
            let dayMarker = document.createElement("div");
            eventListEl.appendChild(dayMarker);
            dayMarker.classList.add("dayMarker");
            let dayHeader = document.createElement("h1");
            dayMarker.appendChild(dayHeader);
            dayHeader.classList.add("title");
            dayHeader.textContent = moment(event.startDate, "YYYY-MM-DD").format("dddd MMMM Do");
        }
        lastOutputTime = event.startDate;

        eventListEl.appendChild(div);
    });
    updatePaging(events);
}

//=====================================================================
// Update the HTML to display the artist info
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
    // Cache the artist events
    user.events = artist.events;
    // Display concerts
    displayEvents(artist.events, getResultStr());
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
// Update the HTML to display the artist details table
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
//====================================================================
function getYouTube(src) {
    if (!src) {
        return '';
    } else if (!src.includes("youtube.com/embed/")) {
        src = src.replace("www.youtube.com/", "www.youtube.com/embed/");
    }
    return '<iframe src="' + src + '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
}

//====================================================================
// Return the full query string
//====================================================================
function getQuery(days, page, perPage) {
    return "apikey=" + sk + getDateQuery(days) + getPageQuery(page, perPage);
}

// ===================================================================
// Return the query for min_date and max_date
// days = days from today's date
// ===================================================================
function getDateQuery(days) {
    if (!days) return ""; // Return Empty String if Days not defined

    let m = moment().clone().add(days, "days");
    return "&min_date=" + moment().format("YYYY-MM-DD") +
        "&max_date=" + m.format("YYYY-MM-DD");
}

//=========================================================
// Return the query for paging
// 1. page = page number starting at 1
// 2. perPage = Results per Page
//=========================================================
function getPageQuery(page, perPage) {
    let str = "";
    if (page) { str += "&page=" + page; }
    if (perPage) { str += "&per_page=" + perPage; }
    return str;
}

//=========================================================
// Sort by Distance from Current Location
//=========================================================
function sortDistance(a, b) {
    return a.distance - b.distance;
}

//=========================================================
// Sort by Event Date
//=========================================================
function sortDate(a, b) {
    return a.startDate.localeCompare(b.startDate);
}

//=========================================================
// Sort by Event Date then Distance from Current Location
//=========================================================
function sortDateDistance(a, b) {
    let ret = sortDate(a, b);
    if (ret == 0) return sortDistance(a, b);
    return ret;
}

//=========================================================
// Sort by Distance then Date
//=========================================================
function sortDistanceDate(a, b) {
    let ret = sortDistance(a, b);
    if (ret == 0) return sortDate(a, b);
    return ret;
}

//=========================================================
// Calculate the distance between 2 Locations (lat,lon)
//=========================================================
function distance(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p)) / 2;

    return 12742 * Math.asin(Math.sqrt(a)) * KM_TO_MI; // 2 * R; R = 6371 km * KM_TO_MI = MI
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

/**************************************/
/* MAIN - Code that runs at startup   */
/**************************************/

// Get Concert Data for the current location
getAreaEvents();