//==============================================================================
// CONSTANTS
//==============================================================================
const MAX_METROS = 20;          // How many metro areas to include
const MAX_DISPLAY_RESULTS = 25; // How Many Results to display at once.
const DAYS_CURRENT = 7;         // How many days to show for current events
const DAYS_ARTIST = 30;         // How many days to show for artist events
const KM_TO_MI = 0.6213711922;
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

// Discography
const discListEl = document.getElementById("discList");
const discHeadEl = document.getElementById("discHead");

// Top Tracks
const topListEl = document.getElementById("topList");
const topHeadEl = document.getElementById("topHead");

//=====================================================================
// Dynamically create a table of Artist Information
// All the fields in the html that should be updated
// el - the element to update
// type - src -or- txt.  src for image elements and txt to set content
// field - the name of the field within the artist object
//=====================================================================
const artistParams = [
    { description: "Name", field: "name" },
    { description: "From", field: "origin"},
    { description: "Genre", field: "genre" },
    { description: "Mood", field: "mood" },
    { description: "Style", field: "style"},
    { description: "Formed", field: "formed"},
    { description: "Website", field: "website", isLink:true},
    // { description: "Biography", field: "bio"},
];
const sk = "jNVqoANxyxv3dO3F";
let userLocation;
let sortFunc = sortDateDistance;

//==============================================================================
// Event Listeners
//==============================================================================

//=====================================================================
// Search Button Click Handler
//=====================================================================
btnSearchEl.addEventListener("click", function () {
    // Clear out old concert listings
    eventListEl.innerHTML = "";
    // Get and Escape the User Input for security
    let artist = escape(inputArtistEl.value);
    // Request the artist data from the API
    getArtistData(artist, displayArtist);
    // Set the Status Label class to include is-danger to give red text
    labelStatusEl.classList.remove("is-danger");
    // Update the Status Label to indicate we are loading
    labelStatusEl.textContent = "Loading...";
    // Hide the old info
    artistInfoEl.setAttribute("style", "display: none;");
    // Clear the input
    inputArtistEl.value = "";

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


//==============================================================================
// Helper Functions
//==============================================================================

//=====================================================================
// Get Artist Events
//  Call the API to get Artist Event Data for a given artist
//  artist = artist to get info for
//  days = number of days to search. undefined = no max date
//=====================================================================
function getArtistEvents(artist, days) {
    let artistUrl = "https://api.songkick.com/api/3.0/artists/mbid:";
    artistUrl += artist.mbid;
    artistUrl += "/calendar.json?apikey=" + sk + getMaxDateQuery(days);
    
    console.log(artistUrl);
    axios.get(artistUrl)
        .then(function(response) {
            console.log("ARTIST DATA HERE", response);
            let events = parseEvents(response);
            events.sort(sortFunc);
            displayEvents(events, "events coming up for " + artist.name);
        })

}

//=====================================================================
// Call the API to get concert Data in the area
// 1. Get the user location from IP
// 2. Get the Metro ID's for the current location
// 3. Get the Events upcoming at each of the Metro ID's.
// days = number of days out to get events.  leave undefined for no max
//=====================================================================
function getAreaEvents(days=DAYS_CURRENT) {    
    // 1. API REQUEST - Look up the User Location based off IP Address
    const locationUrl = "https://json.geoiplookup.io/";
    let metro_areas = [];

    axios.get(locationUrl)
        .then(function(response) {
            //console.log("LOCATION RESPONSE RECEIVED");
            //console.log(response);
            userLocation = parseLocation(response);
            // Store the l
            return userLocation;
        })
        .then (function (locationData) {
            // Find Metro Areas based off the location
            return axios.get(buildMetroUrl(locationData));  
        })
        .then(function(response) {
            // Parse Metro Areas
            //console.log("METRO AREAS RECEIVED!!!");
            //console.log(response);
            metro_areas = parseMetroAreas(response);
            return metro_areas;
        }).then(function(areas) {
            // Get an Array of Promises to Query Metro Areas
            // Wait for all promises to return
            let promises = buildEventsPromiseArray(areas, days);       
            return Promise.all(promises); // Return Status once all promises have completed.
        }).then(function (values) {
            // Get an Array of Events in All the Metro Areas
            let events = [];
            values.forEach(function(response) {
                // TODO Parse Metro Area Response Here
                //console.log("METRO", response);
                events.push(...parseEvents(response));
            });
            events.sort(sortFunc);
            return events;
        }).then(function(events) {
            displayEvents(events, "events in " + userLocation.city);
        })   
        .catch(function(error) {
            //======================================================
            // ERROR ENCOUNTERED
            //======================================================
            console.log("Error Getting Data!!!!");
            console.log(error);
        });
}

//=====================================================================
// Returns Promises to query Metro Areas for Events
// areas = array of Metro Area Objects from soundkick
// days = number of days out to search. leave undefined for no max date
//=====================================================================
function buildEventsPromiseArray(areas, days) {
    let promises = [];
    areas.forEach(function (area) {
        let url = "https://api.songkick.com/api/3.0/metro_areas/" + area.id + "/calendar.json?apikey=" + sk + getMaxDateQuery(days);
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
                
    if (location.lat && location.lon) {
        // Use Latitude and Longitude if available
        queryUrl += "location=geo:" + location.lat + "," + location.lon + "&apikey=" + sk;
    } else {
        // Use City Name
        queryUrl += "query=" + location.city.replace(" ", "+") + "&apikey=" + sk;
    }
    return queryUrl;        
}

//=====================================================================
// Call the APIs to get the artist Data
//=====================================================================
function getArtistData(artist, success, fail) {
    // Fix the input data. 
    // 1. Remove leading and trailing spaces
    // 2. Replace spaces with + for use in query string
    artist = artist.trim().replace(" ", "+");

    // Create the API Urls
    const base = "https://www.theaudiodb.com/api/v1/json/1";
    const artistUrl = base + "/search.php?s=" + artist;
    const discographyUrl = base + "/discography.php?s=" + artist;
    const topUrl = base + "/track-top10.php?s=" + artist;

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
            console.log(artistResponse);
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
            let artist = parseArtist(artistResponse.data.artists[0]);
            artist.albums = parseAlbums(discResponse.data.album);
            artist.tracks = parseTracks(topResponse.data.track);

            getArtistEvents(artist, DAYS_ARTIST);
    
            // Return the Artist Object to the user provided success handler
            if (success) success(artist);
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

            //======================================================
            // If it exists, call the user specified fail callback
            //======================================================
            if (fail) {
                console.log("Passing error to user fail function");
                fail(error);
            }
        });
}

//=====================================================
// Parse the events for an Artist or Metro Area
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

function parseEvents(response) {
    let respEvents = [];
    let events = response.data.resultsPage.results.event;
    if (!events) return respEvents;

    //console.log("EVT", response);
    events.forEach(function (evt) {
        respEvents.push({
            id:         evt.id,
            name:       evt.displayName,
            type:       evt.type,
            uri:        evt.uri,
            startDate:  evt.start.date,
            startTime:  evt.start.time, 
            venue:      evt.venue.displayName,
            venueUri:   evt.venue.uri,
            city:       evt.location.city,
            lat:        parseFloat(evt.location.lat),
            lon:        parseFloat(evt.location.lng),
            distance:   distance(userLocation.lat, userLocation.lon, 
                                    evt.location.lat, evt.location.lng)
        });
    });
    return respEvents;
}

//=====================================================
// Parse the API response into an array of Metro Areas
//=====================================================
function parseMetroAreas(response, limit=MAX_METROS) {
    let areas = [];
    let locations = response.data.resultsPage.results.location;
    if (!locations) return areas;
    
    let index = 0;
    locations.forEach(function(location) {
        if (index++ >= limit) return;
        areas.push({
            id:         location.metroArea.id,
            lat:        parseFloat(location.metroArea.lat),
            lon:        parseFloat(location.metroArea.lng),
            metroName:  location.metroArea.displayName,
            cityName:   location.city.displayName
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
function displayEvents(events, str, limit=MAX_DISPLAY_RESULTS) {
    let displayStr = (limit < events.length) ? limit + " of " : "";
    displayStr += events.length + " " + str;

    // Set the Event Section Heading
    eventHeadEl.textContent = displayStr;
    // Clear the current Event List from HTML
    eventListEl.innerHTML = "";
    let index = 0;
    // For Each Event in the Array - Create Elements and add them to the page
    events.forEach(function(event) {
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
        p3.textContent = "Distance to Event: " + (event.distance * KM_TO_MI).toFixed(1) + "mi";
        // a - Venue
        let a = document.createElement("a");
        div.appendChild(a);
        a.setAttribute("class", "venue-link");
        a.setAttribute("href", event.venueUri);
        a.setAttribute("target", "_blank");
        a.textContent = event.venue;

        eventListEl.appendChild(div); 
    });
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
    artistParams.forEach(function (param) {
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
    //let img = document.createElement("img");
    //img.setAttribute("src", artist.logo);
    //img.setAttribute("alt", artist.name + " logo");
    //imgCol.appendChild(img);
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

// ===================================================================
// Return the query for max_date
// days = days from today's date
// ===================================================================
function getMaxDateQuery(days) {
    if (!days) return ""; // Return Empty String if Days not defined

    let m = moment().clone().add(days, "days");
    return "&max_date=" + m.format("YYYY-MM-DD");
}

//=========================================================
// Return the query for paging
// 1. page = page number starting at 1
// 2. perPage = Results per Page
//=========================================================
function getPageQuery(page, perPage) {
    let str = "";
    if (page) {
        str += "&page=" + page;
    }
    if (perPage) {
        str += "&per_page=" + perPage;
    }
}

// Sort Functions if needed
function sortDistance(a,b) { return a.distance - b.distance; }

// Sort by Date then Distance
function sortDateDistance(a,b) { 
    let ret = sortDate(a,b); 
    if (ret == 0) return sortDistance(a,b);
    return ret;
}

// Sort by Date
function sortDate(a,b) {
    return a.startDate.localeCompare(b.startDate);
}


//=========================================================
// Calculate the distance between 2 points
//=========================================================
function distance(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p)/2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p))/2;
  
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
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

////////////////////////////////////
// MAIN - Code that runs at startup
////////////////////////////////////

// Get Concert Data for the current location
getAreaEvents();