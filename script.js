import './style.css';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { fromLonLat, toLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';

// Randomly picked location
let loc = null;

// Our guess
let locGuessed = null;

/** @type ("initializing" | "guessable" | "submitted" | "reloadingRound") */
let roundState = "initializing";

let panorama = null;

const elem = {
    submitGuessBtn: document.querySelector("#submit-guess"),
    nextRoundBtn: document.querySelector("#next-round"),
    map: document.querySelector("#map"),
    toggleMap: document.querySelector("#toggle-map"),
};


async function init() {
    const { StreetViewPanorama } = await google.maps.importLibrary("streetView");

    panorama = new StreetViewPanorama(document.getElementById("panorama"), {
        visible: false,
        motionTracking: false,
        motionTrackingControl: false,
        showRoadLabels: false,
        disableDefaultUI: true,
    });

    loadRound();
    roundState = "guessable";
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// FIXME: there should be a better way.
async function generateRandomLoc() {
    if (true) return {lat: 67.00050991712676, lng: 79.15437858657035};

    const service = new google.maps.StreetViewService();
    let latLng;
    let found = false;

    while (!found) {
        const randomLocation = {
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
    panorama.setVisible(false);
    loc = await generateRandomLoc();
    console.debug(`changed loc ${JSON.stringify(loc)}`);

    panorama.setPosition(loc);
    panorama.setVisible(true);
}

let pointFeature = null;
let resultPointFeature = null;
let resultLineFeature = null;

const vectorSource = new VectorSource({
    features: [],
});

const vectorLayer = new VectorLayer({
    source: vectorSource,
});

const view = new View({
    center: [0, 0],
    zoom: 2,
});

const map = new Map({
    target: "map",
    layers: [
        new TileLayer({
            source: new OSM(),
        }),
        vectorLayer,
    ],
    view,
});

map.on('click', event => {
    //if (!elem.map.classList.contains("maximized")) {
    //    toggleMaximizedMap();
    //    return;
    //}
    if (roundState !== "guessable") {
        console.debug(`map click: roundState===${roundState}`);
        return;
    }
    vectorSource.removeFeature(pointFeature);

    pointFeature = new Feature({
        geometry: new Point(event.coordinate),
    });

    pointFeature.setStyle(
        new Style({
            image: new Icon({
                src: './pin.svg',
                color: "green",
                anchor: [0.5, 1],
                scale: 0.5,
            }),
        }),
    );

    vectorSource.addFeature(pointFeature);

    const [lng, lat] = toLonLat(event.coordinate);
    locGuessed = { lat, lng };

    elem.submitGuessBtn.classList.remove("hidden");
});

function latLngToCoordinate(loc) {
    return fromLonLat([loc.lng, loc.lat]);
}

function submitGuess() {
    if (roundState !== "guessable") {
        console.debug(`map click: roundState===${roundState}`);
        return;
    }

    if (locGuessed === null) {
        console.debug("submitGuess: locGuessed === null");
        return;
    }

    roundState = "submitted";

    elem.submitGuessBtn.classList.add("hidden");
    elem.nextRoundBtn.classList.remove("hidden");
    elem.map.classList.add("maximize-pin");

    resultPointFeature = new Feature({
        geometry: new Point(latLngToCoordinate(loc)),
    });

    resultPointFeature.setStyle(
        new Style({
            image: new Icon({
                src: './pin.svg',
                color: "red",
                anchor: [0.5, 1],
                scale: 0.5,
            }),
        }),
    );

    vectorSource.addFeature(resultPointFeature);

    resultLineFeature = new Feature({
        geometry: new LineString([loc, locGuessed].map(latLngToCoordinate)),
    });

    resultLineFeature.setStyle(new Style({
        stroke: new Stroke({
            color: 'red',
            width: 2,
        }),
    }));

    vectorSource.addFeature(resultLineFeature);

    setTimeout(() => animateToCoordinate(latLngToCoordinate(loc)), 100);

    locGuessed = null;
}

function nextRound() {
    if (roundState !== "submitted") {
        console.debug(`nextRound: roundState===${roundState}`);
        return;
    }

    roundState = "reloadingRound";

    vectorSource?.removeFeature(pointFeature);
    vectorSource?.removeFeature(resultLineFeature);
    vectorSource?.removeFeature(resultPointFeature);

    loadRound();

    roundState = "guessable";
}

function loadRound() {
    elem.nextRoundBtn.classList.add("hidden");
    elem.map.classList.remove("maximize-pin");

    changeLocation();
}

function animateToCoordinate(center) {
    const zoom = view.getZoom();
    view.animate({
        center,
        zoom: 4,
        duration: 300,
    });
}

function toggleMaximizedMap() {
    elem.map.classList.toggle("maximize-pin");
}

elem.submitGuessBtn.addEventListener("click", submitGuess);
elem.nextRoundBtn.addEventListener("click", nextRound);
elem.toggleMap.addEventListener("click", toggleMaximizedMap);

window.addEventListener("keydown", event => {
    switch (event.code) {
        case "Space":
            submitGuess();
            break;
        case "Enter":
            nextRound();
            break;
        case "Escape":
            toggleMaximizedMap();
            break;
    }
}, true);

await init();
