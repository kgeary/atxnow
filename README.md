# ATX Now
## Title
ATX Now

## Link
[ATX Now @ github](https://kgeary.github.io/atxnow/)

## Description
A guide to events happening in the Austin Area and with your favorite artists. Provides
local concert listings or allows the user to search for a specific artist to see info and concert listings.

## User Story
As a person who likes live music, I want to see my options for live music in the area I will be, so that I can go to live music in town.
As a person who likes music, I want to see information about my favorite artists and when they are coming to town.
As a person who wants to go to a concert, I want to buy tickets to shows.

## Wirefame
Startup   
<img src="assets/images/20200106_130145.jpg" width="300px">  
Location Search  
<img src="assets/images/20200106_130152.jpg" width="300px">  
Artist Search  
<img src="assets/images/20200106_130148.jpg" width="300px">  

## APIs to be used
### Server Side APIs
1. TheAudioDB - Get information on specifc artists (name, genre, discography, top tracks)
2. Ticketmaster - Get information on events, ticket listings
3. geoIpLookup - Get the user's current location based off IP address

### Third Party APIs
1. axios - ajax requests
2. leaflet - for displaying maps

## Task Breakdown
Josh
1. Artist View page layout
    a. info
    b. bio
2. Location View Page layout

Kevin
1. Investigate using leaflet JS library for maps
2. Investigate searching by Zipcode in Ticketmaster and Leaflet

Z
1. investigate using ticketmaster API instead of SongKick for concert listings.
2. Events div styling and layout.