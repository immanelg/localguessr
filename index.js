
// initialized once by google apis
let panorama = null;

// Randomly picked location
let loc = null;

// null if we have not clicked a point on the map yet
let locGuessed = null;

// If we ended the round by submitting out guess
let submitted = false;

window.init = async function init() {
    panorama = new google.maps.StreetViewPanorama(document.getElementById("panorama"), {
        visible: false,
        motionTracking: false,
        motionTrackingControl: false,
        showRoadLabels: false,
        disableDefaultUI: true,
    });

    changeLocation();
};

function sleep(ms) { 
    return new Promise((r) => setTimeout(r, ms));
}

// FIXME: this is dumb as fuck
// at least pick a location on land, roughly estimated?
async function generateRandomLoc() {
    if (true) return {lat: 67.00050991712676, lng: 79.15437858657035};
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
    view: new ol.View({
        center: [0, 0],
        zoom: 2,
    }),
});

map.on('click', event => {
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
                crossOrigin: 'anonymous',
                src: './pin.png',
                scale: 0.3,
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
                crossOrigin: 'anonymous',
                src: './pin.png',
                scale: 0.3,
            }),
        }),
    );

    vectorSource.addFeature(resultPointFeature);

    resultLineFeature = new ol.Feature({
        geometry: new ol.geom.LineString([loc, locGuessed].map(latLngToCoordinate)),
    });

    resultLineFeature.setStyle(new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'green',
            width: 4,
        }),
    }));

    vectorSource.addFeature(resultLineFeature);
}

function nextRound() {
    document.querySelector("#submit-guess").disabled = false;
    document.querySelector("#next-round").disabled = true;

    if (pointFeature !== null) {
        vectorSource.removeFeature(pointFeature);
    }
    if (resultLineFeature !== null) {
        vectorSource.removeFeature(resultLineFeature);
    }
    if (resultPointFeature !== null) {
        vectorSource.removeFeature(resultPointFeature);
    }

    submitted = false;

    changeLocation();
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


