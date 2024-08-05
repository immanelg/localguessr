let panorama = null;
let loc = { lat: null, lng: null };

window.init = async function init() {
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("panorama"),
        {
            position: { lat: 42.345573, lng: -71.098326 },
            pov: {
                heading: 34,
                pitch: 10,
            },
            motionTracking: false,
            motionTrackingControl: false,
            showRoadLabels: false,
            disableDefaultUI: true,
        },
    );

    changeLocation();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function changeLocation() {
    if (true) return;
    const service = new google.maps.StreetViewService();

    let latLng, pano;

    let found = false;

    let randomLocation;

    while (!found) {
        randomLocation = {
            lat: Math.random() * 180 - 90,
            lng: Math.random() * 360 - 180,
        };
        console.debug(`randomLocation ${JSON.stringify(randomLocation)}`);

        const { data, status } = await new Promise((resolve) => {
            service.getPanorama(
                {
                    location: randomLocation,
                    preference: google.maps.StreetViewPreference.BEST,
                    radius: 50000,
                    sources: [google.maps.StreetViewSource.OUTDOOR],
                },
                (data, status) => {
                    resolve({ data, status });
                },
            );
        });

        switch (status) {
            case google.maps.StreetViewStatus.ZERO_RESULTS:
                console.debug("zero results");
                break;
            case google.maps.StreetViewStatus.UNKNOWN_ERROR:
                console.error("google api unknown error", status);
                break;
            case google.maps.StreetViewStatus.OK:
                ({
                    location: { latLng, pano },
                } = data);
                console.debug(`found ${latLng}`);
                found = true;
                break;
            default:
                console.error(`unexpected status ${status}`);
        }

        await sleep(300);
    }

    loc.lat = latLng.lat();
    loc.lng = latLng.lng();
    console.debug(`changed loc ${JSON.stringify(loc)}`);

    panorama.setPano(pano);
    panorama.setVisible(true);
}

const point = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat([12.5, 41.9])),
});

point.setStyle(
  new ol.style.Style({
    image: new ol.style.Icon({
      color: '#BADA55',
      crossOrigin: 'anonymous',
      src: './favicon.ico',
    }),
  }),
);


const vectorSource = new ol.source.Vector({
  features: [point],
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


