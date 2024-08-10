
// initialized once by google apis
let panorama = null;

// Randomly picked location
let loc = null;

// null if we have not clicked a point on the map yet
let locGuessed = null;

// If we ended the round by submitting out guess
let submitted = false;

async function init() {
    const { StreetViewPanorama } = await google.maps.importLibrary("streetView")

    panorama = new StreetViewPanorama(document.getElementById("panorama"), {
        visible: false,
        motionTracking: false,
        motionTrackingControl: false,
        showRoadLabels: false,
        disableDefaultUI: true,
    });

    changeLocation();
};

init();

function sleep(ms) { 
    return new Promise((r) => setTimeout(r, ms));
}

// FIXME: this is dumb
// There should be a better way
async function generateRandomLoc() {
    //if (true) return {lat: 67.00050991712676, lng: 79.15437858657035};
    const service = new google.maps.StreetViewService();

    let latLng;

    let found = false;

    let randomLocation;
    while (!found) {
        randomLocation = {
            lat: Math.random() * 180 - 90,
            lng: Math.random() * 360 - 180,
        };
        console.debug(`randomLocation ${JSON.stringify(randomLocation)}`);

        const { data, status } = await new Promise((resolve) => {
            service.getPanorama({
                location: randomLocation,
                preference: google.maps.StreetViewPreference.BEST,
                radius: 50000,
                sources: [google.maps.StreetViewSource.OUTDOOR],
            }, (data, status) => {
                resolve({ data, status });
            });
        });

        switch (status) {
            case google.maps.StreetViewStatus.ZERO_RESULTS:
                console.debug("zero results");
                break;
            case google.maps.StreetViewStatus.UNKNOWN_ERROR:
                console.error("google api unknown error", status);
                break;
            case google.maps.StreetViewStatus.OK:
                ({ location: { latLng } } = data);
                console.debug(`found ${latLng}`);
                found = true;
                break;
            default:
                console.error(`unexpected status ${status}`);
        }

        await sleep(100);
    }

    return { lat: latLng.lat(), lng: latLng.lng() };
}

async function changeLocation() {
    loc = await generateRandomLoc();
    console.debug(`changed loc ${JSON.stringify(loc)}`);

    panorama.setPosition(loc);
    panorama.setVisible(true);
}

let pointFeature = null; 

let resultPointFeature = null; 

let resultLineFeature = null; 

const vectorSource = new ol.source.Vector({
  features: [],
});

const vectorLayer = new ol.layer.Vector({
  source: vectorSource,
});

const view = new ol.View({
    center: [0, 0],
    zoom: 1,
})

const map = new ol.Map({
    target: "map",
    layers: [
        new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            }),
        }),
        vectorLayer,
    ],
    view,
});

map.on('click', event => {
    // readonly map if not loaded or round ended
    if (!loc || submitted) return;

    // else change our pin position
    if (pointFeature !== null) {
        vectorSource.removeFeature(pointFeature);
    }
    if (submitted) return;

    pointFeature = new ol.Feature({
        geometry: new ol.geom.Point(event.coordinate),
    });

    pointFeature.setStyle(
        new ol.style.Style({
            image: new ol.style.Icon({
                src: './pin.svg',
                color: "green",
                anchor: [0.5, 1],
                scale: 0.1,
            }),
        }),
    );

    vectorSource.addFeature(pointFeature);

    const [lng, lat] = ol.proj.toLonLat(event.coordinate);
    locGuessed = { lat, lng };

    document.querySelector("#submit-guess").disabled = false;
});

function latLngToCoordinate(loc) {
    return ol.proj.fromLonLat([loc.lng, loc.lat]);
}

function submitGuess() {
    if (locGuessed === null) {
        console.error("Should call submitGuess when we already selected a location, but locGuessed === null ");
        return;
    }
    if (submitted) {
        console.log("Should call submitGuess only when we did not complete the round yet, but submitted===true");
        return;
    }

    document.querySelector("#submit-guess").disabled = true;
    document.querySelector("#next-round").disabled = false;

    submitted = true;

    console.debug("guess");

    resultPointFeature = new ol.Feature({
        geometry: new ol.geom.Point(latLngToCoordinate(loc)),
    });

    resultPointFeature.setStyle(
        new ol.style.Style({
            image: new ol.style.Icon({
                src: './pin.svg',
                color: "red",
                anchor: [0.5, 1],
                scale: 0.1,
            }),
        }),
    );

    vectorSource.addFeature(resultPointFeature);

    resultLineFeature = new ol.Feature({
        geometry: new ol.geom.LineString([loc, locGuessed].map(latLngToCoordinate)),
    });

    resultLineFeature.setStyle(new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'gray',
            width: 1,
        }),
    }));

    vectorSource.addFeature(resultLineFeature);

    animateToCoordinate(latLngToCoordinate(loc));
}

function nextRound() {
    if (!submitted) {
        console.debug("nextRound: submitted==true"); 
        return;
    }
    if (loading) {
        console.debug("nextRound: loading==true"); 
        return;
    }
    document.querySelector("#submit-guess").disabled = false;
    document.querySelector("#next-round").disabled = true;

    vectorSource.removeFeature(pointFeature);
    vectorSource.removeFeature(resultLineFeature);
    vectorSource.removeFeature(resultPointFeature);

    submitted = false;
    loading = true;

    changeLocation();

    submitted = false;
    loading = false;

    document.querySelector("#map").classList.remove("maximized");
}

function animateToCoordinate(center, done) {
    const zoom = view.getZoom();
    view.animate({
        center,
        zoom: 3,
        duration: 1000,
        easing: t => Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) + 1,
    });
}

document.querySelector("#submit-guess").addEventListener("click", submitGuess);

document.querySelector("#next-round").addEventListener("click", nextRound);

window.addEventListener("keydown", event => {
    switch (event.code) {
        case "Space":
            if (!submitted && locGuessed !== null) submitGuess();
            break;
        case "Enter":
            if (submitted) nextRound();
            break;
    }
}, true);


