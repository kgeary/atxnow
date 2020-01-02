//=====================================================================
// Find HTML Elements
//=====================================================================
// Containers
const artistInfoEl = document.getElementById("artistInfo");
// Artist Search
const btnSearchEl = document.getElementById("btnSearch");
const inputArtistEl = document.getElementById("inputArtist");
const labelStatusEl = document.getElementById("labelStatus");
// Artist Info
const logoEl = document.getElementById("artistLogo");
const thumbEl = document.getElementById("artistThumb");
const nameEl = document.getElementById("artistName");
const formedEl = document.getElementById("artistYear");
const genreEl = document.getElementById("artistGenre");
const moodEl = document.getElementById("artistMood");
// Discography
const listDiscEl = document.getElementById("listDisc");
const headDiscEl = document.getElementById("headDisc");

//=====================================================================
// All the fields in the html that should be updated
// el - the element to update
// type - src -or- txt.  src for image elements and txt to set content
// field - the name of the field within the artist object
//=====================================================================
const artistParams = [
    { el: logoEl, type: "src", field: "logo" },
    { el: thumbEl, type: "src", field: "thumbnail" },
    { el: nameEl, type: "text", field: "name" },
    { el: genreEl, type: "text", field: "genre" },
    { el: moodEl, type: "text", field: "mood" },
];

//=====================================================================
// Event Listeners
//=====================================================================
//=====================================================================
// Search Button Click Handler
//=====================================================================
btnSearchEl.addEventListener("click", function () {
    // Get the User Input
    let artist = inputArtistEl.value;
    // Request the data from the API
    getArtistData(artist, displayArtists);
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
// Artist Input KeyPress Event (Watch for enter)
//=====================================================================
inputArtistEl.addEventListener("keypress", function (event) {
    // If the Keypressed was 13 (Enter) then trigger a Button Search Click Event
    if (event.which === 13) {
        btnSearchEl.click();
    }
});

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

    // Use Promise.all to run all get requests in parallel 
    // 1. Get the Artist Info 
    // 2. Get the Artist Discography
    Promise.all([
        axios.get(artistUrl),
        axios.get(discographyUrl)
    ])
        .then(function (responses) {
            // ONCE All Requests have been successfully resolved...   
            // Unpack the individual reponse values from the responses array 
            let [artistResponse, discResponse] = responses;

            //=====================================================
            // DEBUGGING - Print the Response Objects
            //=====================================================
            console.log("=== All API Calls Good! ===");
            console.log(artistResponse);
            console.log(discResponse);

            //=====================================================
            // If artist was not found throw an error for catch
            //=====================================================
            if (!artistResponse.data.artists) {
                throw new Error("No Artists Found!");
            }

            //=====================================================
            // PARSE ARTIST
            //   Create an object with all the fields we care about
            //=====================================================
            let artistData = artistResponse.data.artists[0];
            let artist = {
                id: artistData.idArtist,
                musicBrainzId: artistData.strMusicBrainzID,
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

            //=====================================================
            // PARSE ALBUMS
            //   Create an empty array and push a new album 
            //   object for each iteration
            //=====================================================
            let albums = []; // Create an Empty Albums Array
            let responseAlbums = discResponse.data.album; // Create a variable to hold the album response list

            // For Each Album in the result list...
            //   1. parse the response data into a new album object
            //   2. push the new album object on to the back of the albums array
            responseAlbums.forEach(function (album) {
                albums.push({
                    name: album.strAlbum,
                    year: album.intYearReleased,
                });
            });

            // DEBUG
            console.table(artist);
            console.table(albums);

            // Create an albums parameter within the artist object
            artist.albums = albums;

            // Return the Artist Object to the user provided success handler
            success(artist);
        })
        .catch(function (error) {
            //=====================================================
            // Handle all Errors here
            // IF any of the API Calls fail we end up here
            // Call the user defined fail function if it exists
            //=====================================================
            console.log("<<< ERROR >>>");
            if (error) {
                console.log("Error Received");
                console.log(error);
                labelStatusEl.classList.add("is-danger");
                if (error.message) {
                    labelStatusEl.textContent = error.message;    
                } else {
                    labelStatusEl.textContent = "An error occurred. please try again"; 
                }
            }

            // If it exists, call the user specified fail callback
            if (fail) {
                console.log("Passing error to user fail function");
                fail(error);
            } else {
                //console.log("No Fail Function defined. Throwing...");
                //throw error;
            }

        });
}

//=====================================================================
// Update the HTML to display the artist info
//=====================================================================
function displayArtists(artist) {
    console.log("Displaying Artist");

    // Configure Each parameter in the list
    artistParams.forEach(function (param) {
        if (param.type === "src") {
            param.el.setAttribute("src", artist[param.field]);
        } else if (param.type === "text") {
            param.el.textContent = artist[param.field];
        } else {
            throw new Error("Unknown Param Type " + param.type)
        }
    });

    // Set the src for image fields
    logoEl.setAttribute("src", artist.logo);
    thumbEl.setAttribute("src", artist.thumbnail);

    // Set the textContent for string fields
    nameEl.textContent = artist.name;
    formedEl.textContent = artist.formed;
    genreEl.textContent = artist.genre;
    moodEl.textContent = artist.mood;

    // Update the album discography list
    updateDiscography(artist.albums);

    // Make sure the results window is showing
    artistInfoEl.setAttribute("style", "display: initial;");
    // Clear the loading status
    labelStatusEl.textContent = "";
}

//====================================================================
// Add the discography to the HTML
//====================================================================
function updateDiscography(albums) {
    headDiscEl.textContent = "Displaying last " + albums.length + " Albums";
    listDiscEl.innerHTML = ""; // Clear out the old list
    albums.forEach(function (album) {
        let li = document.createElement("li");
        li.textContent = album.name + " (" + album.year + ")";
        li.setAttribute("class", "tile is-child");
        listDiscEl.appendChild(li);
    });
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

// ===================================================================
// MAIN
// ===================================================================


