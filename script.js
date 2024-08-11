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

let submitted = false;
let loading = true;

let panorama = null;

async function init() {
    const { StreetViewPanorama } = await google.maps.importLibrary("streetView");

    panorama = new StreetViewPanorama(document.getElementById("panorama"), {
        visible: false,
        motionTracking: false,
        motionTrackingControl: false,
        showRoadLabels: false,
        disableDefaultUI: true,
    });

    changeLocation();
    loading = false;
    document.querySelector("#submit-guess").classList.remove("hidden");
}

init();

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// FIXME: there should be a better way.
async function generateRandomLoc() {
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
    center: fromLonLat([0, 0]),
    zoom: 1,
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
    if (!loc || submitted) return;

    if (pointFeature !== null) {
        vectorSource.removeFeature(pointFeature);
    }
    if (submitted) return;

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

    document.querySelector("#submit-guess").classList.remove("hidden");
});

function latLngToCoordinate(loc) {
    return fromLonLat([loc.lng, loc.lat]);
}

function submitGuess() {
    if (loading) {
        console.debug("submitGuess: can't submit because loading == true");
        return;
    }
    if (locGuessed === null) {
        console.debug("submitGuess: can't submit because locGuessed === null");
        return;
    }
    if (submitted) {
        console.debug("submitGuess: can't submit because already submitted === true");
        return;
    }

    submitted = true;

    document.querySelector("#submit-guess").classList.add("hidden");
    document.querySelector("#next-round").classList.remove("hidden");
    document.querySelector("#map").classList.add("maximized");

    console.debug("guess");

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
            color: 'gray',
            width: 1,
        }),
    }));

    vectorSource.addFeature(resultLineFeature);

    setTimeout(() => animateToCoordinate(latLngToCoordinate(loc)), 600);
}

function nextRound() {
    if (!submitted) {
        console.debug("nextRound: submitted==false");
        return;
    }
    if (loading) {
        console.debug("nextRound: loading==true");
        return;
    }

    vectorSource.removeFeature(pointFeature);
    vectorSource.removeFeature(resultLineFeature);
    vectorSource.removeFeature(resultPointFeature);

    submitted = false;
    loading = true;
    document.querySelector("#next-round").classList.add("hidden");

    changeLocation();

    loading = false;

    document.querySelector("#map").classList.remove("maximized");
}

function animateToCoordinate(center) {
    const zoom = view.getZoom();
    view.animate({
        center,
        //zoom: 3,
        duration: 1000,
        easing: t => Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) + 1,
    });
}

document.querySelector("#submit-guess").addEventListener("click", submitGuess);
document.querySelector("#next-round").addEventListener("click", nextRound);
document.querySelector("#toggle-map").addEventListener("click", () => {
    document.querySelector("#map").classList.toggle("maximized");
});

window.addEventListener("keydown", event => {
    switch (event.code) {
        case "Space":
            submitGuess();
            break;
        case "Enter":
            nextRound();
            break;
    }
}, true);
