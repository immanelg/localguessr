let panorama = null;
let loc = { lat: null, lng: null };

async function changeLocation() {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function initPanoramaElement() {
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("panorama"),
        {
            //position: { lat: 42.345573, lng: -71.098326 },
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
    window.panorama = panorama;

    changeLocation();
}

window.initPanoramaElement = initPanoramaElement;
