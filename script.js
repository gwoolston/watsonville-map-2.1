var data = {};
var groups = {};
var map;

/*
 * Given a string `str`, replaces whitespaces with dashes,
 * and removes nonalphanumeric characters. Used in URL hash.
 */
var slugify = function(str) {
  return str.replace(/[^\w ]+/g,'').replace(/ +/g,'-');
}

/*
 * Main function to initialize the map, add baselayer, and add markers
 */
// Main function to initialize the map, add baselayer, and add markers

// Define basemap
var basemap = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
});

var initMap = function() {
  map = L.map('map', {
    center: mapCenter,
    zoom: mapZoom,
    tap: false, // to avoid issues in Safari, disable tap
    zoomControl: false,
  });

  // Add zoom control to the bottom-right corner
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Add basemap to the map
  basemap.addTo(map); // Default basemap

    // Initialize layer control with empty overlays
    var layerControl = L.control.layers();
  
    // Add data & GitHub links
    map.attributionControl.setPrefix('<a href="http://github.com/handsondataviz/leaflet-point-map-sidebar" target="_blank">Code</a> by <a href="https://handsondataviz.org/" target="_blank">HandsOnDataViz</a> | <a href="http://leafletjs.com">Leaflet</a>');
    
    loadData(dataLocation);

  }


/*
 * Resets map view to originally defined `mapCenter` and `mapZoom` in settings.js
 */
var resetView = function() {
  map.flyTo( mapCenter, mapZoom );
  resetSidebar();
}

/*
 * Resets sidebar, clearing out place info and leaving title+footer only
 */
var resetSidebar = function() {
    // Make the map title original color
    $('header').removeClass('black-50');

    // Clear placeInfo containers
    $('#placeInfo').addClass('dn');
    $('#placeInfo h2, #placeInfo h3').html('');
    $('#placeInfo div').html('');
    $('#googleMaps').addClass('dn').removeClass('dt');

    // Reset hash
    location.hash = '';
}

/*
 * Given a `marker` with data bound to it, update text and images in sidebar
 */
var updateSidebar = function(marker) {
  if (marker) {
    // Get data bound to the marker
    var d = marker.options.placeInfo;

    // Reset sidebar before updating with new marker's information
    resetSidebar();

    location.hash = d.slug;

    // Dim map's title
    $('header').addClass('black-50');
    $('#placeInfo').removeClass('dn');

    // Make into text disappear
    $('#content').hide();

    // Clear out active markers from all markers
    $('.markerActive').removeClass('markerActive');

    // Make clicked marker the new active marker
    L.DomUtil.addClass(marker._icon, 'markerActive');

    // Populate place information into the sidebar
    $('#placeInfo').animate({opacity: 0.5}, 300).promise().done(function() {
      $('#placeInfo h2').html(d.Name);
      $('#description').html(d.Description);

      // Update audio player with audio file URL
      if (d.Audio) {
        $('#audioPlayer').attr('src', d.Audio);
        $('#audioPlayer').show(); // Show the audio player if audio exists

        // Create a caption for the audio
        if (d['Audio Caption']) {
          $('#audioCaption').remove();
          $('#audioPlayer').after(
            $('<p/>', {
              id: 'audioCaption',
              class: 'f6 black-50 mt1',
              html: d['Audio Caption']
            })
          );
        }
      } else {
        $('#audioPlayer').hide(); // Hide the audio player if no audio exists
        $('#audioCaption').remove(); // Remove the audio caption if it exists
      }

      // Reset gallery and caption
      $('#gallery').html('');
      $('#caption').remove();

      var currentIndex = 0; // Keep track of the current image index

      // Function to populate the gallery with images
      function populateGallery(data) {
        // Load up to 5 images
        for (var i = 1; i <= 5; i++) {
          var idx = 'Image' + i;

          if (data[idx]) {

            var source = "<em class='normal'>" + data[idx + 'Source'] + '</em>';

            if (source && data[idx + 'SourceLink']) {
              source = "<a href='" + data[idx + 'SourceLink'] + "' target='_blank'>" + source + "</a>";
            }

            var img = $('<img/>', {
              src: data[idx],
              alt: data.Name,
              class: 'dim br1',
              'data-lightbox': 'gallery',
              'data-title': (data[idx + 'Caption'] + ' ' + source) || '',
              'data-alt': data.Name,
            });

            $('#gallery').append(img);

            if (i === 1) {
              $('#gallery').after(
                $('<p/>', {
                  id: 'caption',
                  class: 'f6 black-50 mt1',
                  html: data[idx + 'Caption'] + ' ' + source
                })
              );
            }

          } else {
            break;
          }
        }
      }

      // Call the populateGallery function with your data object (assuming it's named 'd')
      populateGallery(d);

      // Check if there are any images in the gallery
      var numberOfImages = $('#gallery img').length;
      if (numberOfImages > 0) {
        // Append navigation arrows only if there are multiple images
        if (numberOfImages > 1) {
          $('#gallery').append('<span class="material-icons arrow arrow-left black-90">navigate_before</span>');
          $('#gallery').append('<span class="material-icons arrow arrow-right black-90">navigate_next</span>');
        }

        // Hide all images except the first one
        $('#gallery img').not(':first').hide();

        // Event handler for left arrow
        $('.arrow-left').click(function() {
          showImage(currentIndex - 1);
        });

        // Event handler for right arrow
        $('.arrow-right').click(function() {
          showImage(currentIndex + 1);
        });
      }

      // Function to show image at a specific index
      function showImage(index) {
        var $images = $('#gallery img');
        var numImages = $images.length;

        // Wrap around if index is out of bounds
        index = (index + numImages) % numImages;

        // Hide all images except the one at the given index
        $images.hide().eq(index).show();

        // Update caption
        var caption = $images.eq(index).data('title') || '';
        $('#caption').html(caption);

        currentIndex = index;
      }

      // Load additional image
      var additionalImageUrl = d.test; // Assuming "test" is the column name for the additional image URL

      if (additionalImageUrl) {
        // Create an <img> element and set its src attribute to the additional image URL
        var additionalImage = $('<img>', {
          src: additionalImageUrl,
          alt: 'Additional Image'
        });

        // Append the additional image to the additional image container
        $('#additionalImageContainer').html(additionalImage).show();
      } else {
        // If no additional image URL is provided, hide the additional image container
        $('#additionalImageContainer').hide();
      }

      $('#placeInfo').animate({ opacity: 1 }, 300);

      // Scroll sidebar to focus on the place's title
      $('#sidebar').animate({
        scrollTop: $('header').height() + 20
      }, 800);
    });
  }
};

function resetSidebar() {
  // Clear other sidebar content except for the content within <p id="content">
  $('#placeInfo').addClass('dn');
  $('header').removeClass('black-50');
  $('#placeInfo h2').html('');
  $('#description').html('');
  $('#streetview h3').html('');
  $('#gallery').html('');
  $('#caption').remove();

  // Check if navigation arrows are present and remove them
  if ($('.arrow').length > 0) {
    $('.arrow').remove();
  }

  // Reset additional image container
  $('#additionalImageContainer').html('').hide();
}

/*
 * Main function that generates Leaflet markers from read CSV data
 */

var addMarkers = function(data) {
  var activeMarker;
  var hashName = decodeURIComponent(location.hash.substr(1));

  for (var i in data) {
    var d = data[i];
    d['slug'] = slugify(d.Name);

    if (!groups[d.Group]) { groups[d.Group] = []; }

    var m = L.marker(
      [d.Latitude, d.Longitude],
      {
        icon: L.icon({
          iconUrl: d.Icon,
          iconSize: [35, 35],
          iconAnchor: [12.5, 41],
          className: 'br1',
        }),
        placeInfo: d
      }
    );

// Check if there is a GeoJSON overlay link
if (d['GeoJSON Overlay']) {
  // Fetch the GeoJSON data from the provided link
  fetch(d['GeoJSON Overlay'])
    .then(function(response) {
      return response.json();
    })
    .then(function(geojsonData) {
      // Create a GeoJSON layer with the retrieved data
      var geojsonLayer = L.geoJSON(geojsonData, {
        style: function(feature) {
          return {
            color: 'green', // Stroke color
            weight: 2, // Stroke width
            fillOpacity: 0.5 // Fill opacity
            // Add more styling properties as needed
          };
        }
      });

      // Log feature properties when clicked
      geojsonLayer.on('click', function(event) {
        console.log('Clicked feature properties:', event.layer.feature.properties);

        // Create a simulated marker object with the feature's properties
        var simulatedMarker = {
          options: {
            placeInfo: event.layer.feature.properties
          }
        };

        // Call the updateSidebar function with the simulated marker
        updateSidebar(simulatedMarker);
      });

      // Add the GeoJSON layer to the desired layer group
      geojsonLayer.addTo(groups['🟩 Gathering Site']);
    })
    .catch(function(error) {
      console.error('Error fetching GeoJSON data:', error);
    });
}

// Add event listener for "race-riot-points" group
    if (d.Hover === "y") {
      m.on('mouseover', function(e) {
        this.bindTooltip(this.options.placeInfo.Name).openTooltip();
      });
    } else { // For other groups, retain the default click behavior
      m.on('click', function(e) {
        map.flyTo(this._latlng);
        updateSidebar(this);
      });
    }

    groups[d.Group].push(m);

    if (d.slug === hashName) { activeMarker = m; }
  }

// Transform each array of markers into layerGroup
for (var g in groups) {
  groups[g] = L.layerGroup(groups[g]);

  // By default, show all markers
  groups[g].addTo(map);
}

// Add layer control to switch between overlay layers
var layerControl = L.control.layers(null, groups, {collapsed: false}).addTo(map);
layerControl.setPosition('topright');

// If name in hash, activate it
if (activeMarker) { activeMarker.fire('click') }

}

/*
 * Loads and parses data from a CSV (either local, or published
 * from Google Sheets) using PapaParse
 */
var loadData = function(loc) {

  Papa.parse(loc, {
    header: true,
    download: true,
    complete: function(results) {
      addMarkers(results.data);
    }
  });

}

// When DOM is loaded, initialize the map
$('document').ready(initMap);
