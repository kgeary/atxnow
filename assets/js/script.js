//==============================================================================
// Global Variables
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
    { description: "Biography", field: "bio"},
];

//==============================================================================
// Event Listeners
//==============================================================================

//=====================================================================
// Search Button Click Handler
//=====================================================================
btnSearchEl.addEventListener("click", function () {
    // Get the User location based on IP address from API
    getLocationData(function(loc){
        console.table(loc);
        // TODO - Do something with the location data
    });

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
// Call the API to get the user location
//=====================================================================
function getLocationData(success, fail) {    
    const locationUrl = "https://json.geoiplookup.io/";

    axios.get(locationUrl)
        .then(function(response) {
            console.log("LOC RESP");
            console.log(response);
            var locationData = {
                city: response.data.city,
                zip: response.data.postal_code,
                lat: response.data.latitude,
                lon: response.data.longitude,
            };
            success(locationData);
        })
        .catch(function(error) {
            console.log("Error Getting Location");
            console.log(error);
            if (fail) fail("Unable to determine location");
        });
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
            // Unpack the individual reponse values from the responses array 
            let [artistResponse, discResponse, topResponse] = responses;

            //=====================================================
            // DEBUGGING - Print the Response Objects
            //=====================================================
            console.log("=== All API Calls Good! ===");
            console.log(artistResponse);
            console.log(discResponse);
            console.log(topResponse);

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
    
            // Return the Artist Object to the user provided success handler
            success(artist);
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
// PARSE ARTIST
//   Create an object with all the fields we care about
//=====================================================
function parseArtist(artistData) {
    return artist = {
        id: artistData.idArtist,
        //musicBrainzId: artistData.strMusicBrainzID,
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
// Update the HTML to display the artist info
//=====================================================================
function displayArtist(artist) {
    console.log("Displaying Artist");

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
    let img = document.createElement("img");
    img.setAttribute("src", artist.logo);
    img.setAttribute("alt", artist.name + " logo");
    imgCol.appendChild(img);
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
        li.setAttribute("class", "tile is-child");
        discListEl.appendChild(li);
    });
}

//====================================================================
// Add the tracks to the HTML
//====================================================================
function displayTracks(tracks) {
    topListEl.innerHTML = "";

    if (tracks.length === 0) {
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
// Return the html for a youtube
//
//====================================================================
function getYouTube(src) {
    if (!src.includes("youtube.com/embed/")) {
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

////////////////////////////////////
// MAIN - Code that runs at startup
////////////////////////////////////

