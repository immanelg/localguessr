
let panorama = null;

async function randomizeLocation() {
	const resp = await fetch("https://api.3geonames.org/.json?random=yes", {});
	const json = await resp.json();
	const { inlatt, inlongt } = json["nearest"];
	console.log(inlatt, inlongt);
	loc = { lat: inlatt, long: inlongt };
}

async function changeLocation() {
	const service = new google.maps.StreetViewService();

	let randomLocation;
	let latLng, pano;

	let found = false;

	while (!found) {
		randomLocation = { lat: Math.random() * 180 - 90, lng: Math.random() * 360 - 180 };
		console.debug(`randomLocation ${JSON.stringify(randomLocation)}`);

		const panoramaData = await new Promise(resolve => {
			service.getPanorama({
				location: randomLocation,
				preference: google.maps.StreetViewPreference.BEST,
				radius: 50000,
				sources: [google.maps.StreetViewSource.OUTDOOR],
			}, (data, status) => {
					console.debug(data, status);
					resolve({ data, status });
				});
		});

		const { data, status } = panoramaData;

		switch (status) {
			case google.maps.StreetViewStatus.ZERO_RESULTS:
				console.debug("zero results");
				break;
			case google.maps.StreetViewStatus.UNKNOWN_ERROR:
				console.error("google api unknown error", status);
				break;
			case google.maps.StreetViewStatus.OK:
				({ location: { latLng, pano } } = data);
				console.debug(`found ${latLng} ${pano}`);
				found = true;
				break; 
			default:
				console.error(`unexpected status ${status}`);
		}

		await sleep(300);
	}

	panorama.setPano(pano);
	panorama.setVisible(true);

}

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
		},
	);
	window.panorama = panorama;
	
	changeLocation();

	console.log(panorama);
}

window.initPanoramaElement = initPanoramaElement;

