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

  // Get data bound to the marker
  var d = marker.options.placeInfo;

  if (L.DomUtil.hasClass(marker._icon, 'markerActive')) {
    // Deselect current icon
    L.DomUtil.removeClass(marker._icon, 'markerActive');
    resetSidebar();
  } else {
    // Reset sidebar before updating with new marker's information
    resetSidebar();

    location.hash = d.slug;

    // Dim map's title
    $('header').addClass('black-50');
    $('#placeInfo').removeClass('dn');

    // Clear out active markers from all markers
    $('.markerActive').removeClass('markerActive');

    // Make clicked marker the new active marker
    L.DomUtil.addClass(marker._icon, 'markerActive');

    // Populate place information into the sidebar
      $('#placeInfo').animate({opacity: 0.5}, 300).promise().done(function() {
      $('#placeInfo h2').html(d.Name);
      $('#description').html(d.Description);
      $('#streetview h3').html(d.Streetview);

      // Reset gallery and caption
      $('#gallery').html('');
      $('#caption').remove();

      var currentIndex = 0; // Keep track of the current image index

      // Load up to 5 images
      for (var i = 1; i <= 5; i++) {
        var idx = 'Image' + i;

        if (d[idx]) {

          var source = "<em class='normal'>" + d[idx + 'Source'] + '</em>';

          if (source && d[idx + 'SourceLink']) {
            source = "<a href='" + d[idx + 'SourceLink'] + "' target='_blank'>" + source + "</a>";
          }

          var img = $('<img/>', {
            src: d[idx],
            alt: d.Name,
            class: 'dim br1',
            'data-lightbox': 'gallery',
            'data-title': (d[idx + 'Caption'] + ' ' + source) || '',
            'data-alt': d.Name,
          });

          $('#gallery').append(img);

          if (i === 1) {
            $('#gallery').after(
              $('<p/>', {
                id: 'caption',
                class: 'f6 black-50 mt1',
                html: d[idx + 'Caption'] + ' ' + source
              })
            );
          }

        } else {
          break;
        }
      }

// Check if there are any images in the gallery
if ($('#gallery img').length > 0) {
  // Append navigation arrows
  $('#gallery').after('<span class="material-icons arrow arrow-left white-90">navigate_before</span>');
  $('#gallery').after('<span class="material-icons arrow arrow-right white-90">navigate_next</span>');

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

      $('#placeInfo').animate({ opacity: 1 }, 300);
        
      // Scroll sidebar to focus on the place's title
      $('#sidebar').animate({
        scrollTop: $('header').height() + 20
      }, 800);
    })
  }
}

function resetSidebar() {
  // Reset sidebar content
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
}


/*
 * Main function that generates Leaflet markers from read CSV data
 */
var addMarkers = function(data) {

  var activeMarker;
  var hashName = decodeURIComponent( location.hash.substr(1) );

  for (var i in data) {
    var d = data[i];

    // Create a slug for URL hash, and add to marker data
    d['slug'] = slugify(d.Name);

    // Add an empty group if doesn't yet exist
    if (!groups[d.Group]) { groups[d.Group] = []; }

    // Create a new place marker
    var m = L.marker(
      [d.Latitude, d.Longitude],
      {
        icon: L.icon({
  		iconUrl: d.Icon,
 	 	iconSize: [25, 41], // Default marker size
  		iconAnchor: [12.5, 41], // Middle bottom point of icon represents point center
  		className: 'br1',
	}),
        // Pass place data
        placeInfo: d
      },
    ).on('click', function(e) {
      map.flyTo(this._latlng);
      updateSidebar(this);
    });

    // Add this new place marker to an appropriate group
    groups[d.Group].push(m);

    if (d.slug === hashName) { activeMarker = m; }
  }

// Transform each array of markers into layerGroup
for (var g in groups) {
  groups[g] = L.layerGroup(groups[g]);

  // By default, show all markers
  groups[g].addTo(map);
}

// Create an empty object to store layer controls
var layerControls = {};

// Create the layers control
for (var groupName in groups) {
    if (groups.hasOwnProperty(groupName)) {
        // Create a new layer control for each group
        layerControls[groupName] = L.control.layers({}, { [groupName]: groups[groupName] }, { collapsed: false });
    }
}

// Add the layers control to the map
for (var groupName in layerControls) {
    if (layerControls.hasOwnProperty(groupName)) {
        layerControls[groupName].addTo(map);
    }
}

// Get the sidebar container
var sidebar = document.getElementById('sidebar');

// Create the layers control for the sidebar
var sidebarLayers = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control leaflet-sidebar-layers');

// Add the layer checkboxes
for (var groupName in layerControls) {
    if (layerControls.hasOwnProperty(groupName)) {
        var layerControl = layerControls[groupName];
        var container = L.DomUtil.create('div', '', sidebarLayers);
        container.appendChild(layerControl.getContainer());
    }
}

// Add the layers control to the sidebar
sidebar.appendChild(sidebarLayers);

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

// }

/*
 * Main function to initialize the map, add baselayer, and add markers
 */
var initMap = function() {

map = L.map('map', {
  center: mapCenter,
  zoom: mapZoom,
  tap: false, // to avoid issues in Safari, disable tap
  zoomControl: false,
});

// Add zoom control to the bottom-right corner
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Define basemaps
var darkBasemap = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  minZoom: 0,
  maxZoom: 20
});

var lightBasemap = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
  minZoom: 0,
  maxZoom: 20,
  attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Add both basemaps to the map
darkBasemap.addTo(map); // Default basemap

// Create an object to hold basemap options
var basemaps = {
  "Dark Basemap": darkBasemap,
  "Light Basemap": lightBasemap
};

// Add layer control to switch between basemaps
L.control.layers(basemaps).addTo(map);

  loadData(dataLocation);

  // Add data & GitHub links
  map.attributionControl.setPrefix('<a href="http://github.com/handsondataviz/leaflet-point-map-sidebar" target="_blank">Code</a> by <a href="https://handsondataviz.org/" target="_blank">HandsOnDataViz</a> | <a href="http://leafletjs.com">Leaflet</a>');

  // Add custom `home` control
  // addHomeButton();

  // $('#closeButton').on('click', resetView);
}

// When DOM is loaded, initialize the map
$('document').ready(initMap);
