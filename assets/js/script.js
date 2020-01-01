function getArtistData(artist, success, fail) {
    artist = artist.replace(" ", "+");

    const artistUrl = "https://www.theaudiodb.com/api/v1/json/1/search.php?s=" + artist;
    const discographyUrl = "https://www.theaudiodb.com/api/v1/json/1/discography.php?s=" + artist;

    Promise.all([
        axios.get(artistUrl),
        axios.get(discographyUrl)
    ]).then(function(values) {
        let [artistResponse, discographyResponse] = values;
        console.log("=== SUCCESS ===");
        console.log(artistResponse);
        console.log(discographyResponse);
        //========================
        // Make sure the artist was found
        //========================
        if (!artistResponse.data.artists) {
            throw new Error("no artists found");
        }

        //========================
        // PARSE ARTIST
        //========================
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

        //========================
        // PARSE ALBUMS
        //========================
        let albums = [];
        let respAlbums = discographyResponse.data.album;
        for (let i = 0; i < respAlbums.length; i++) {
            let album = respAlbums[i];
            // Create an array of album objects (name, year)
            albums.push({
                name: album.strAlbum,
                year: album.intYearReleased,
            });
        }
        // artist.albums = albums;

        console.table(artist);
        console.table(albums);

        artist.albums = albums;

        success(artist);
    })
    .catch(function (error) {
        // handle error
        console.log("<<< ERROR >>>");
        console.log(error.message);
        console.log(error);
        fail(error);
    })
    .finally(function () {
        // always executed
    });
}

function displayArtists(artist) {
    console.log("Displaying Artist");

    let logo = document.getElementById("artistLogo");
    logo.setAttribute("src", artist.logo);

    let thumb = document.getElementById("artistThumb");
    thumb.setAttribute("src", artist.thumbnail);

    document.getElementById("artistName").textContent = artist.name;
    document.getElementById("artistYear").textContent = artist.formed;
    document.getElementById("artistGenre").textContent = artist.genre;
    document.getElementById("artistMood").textContent = artist.mood;

}

function onError(error) {
    console.log("An Error Occurred");
}

// MAIN
let artist = "Grateful Dead";
getArtistData(artist, displayArtists, onError);

let btnSearchEl = document.getElementById("btnSearch");
let inputArtistEl = document.getElementById("inputArtist");

btnSearchEl.addEventListener("click", function(){
    let artist = inputArtistEl.value;
    getArtistData(artist, displayArtists);
});


