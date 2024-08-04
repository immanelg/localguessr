
function randomizeLocation() {
	const resp = fetch("https://api.3geonames.org/.json?random=yes", {})
	.then(resp => resp.json())
	.then(json => {
		const {inlatt: lat, inlongt: long} = json["nearest"];
		console.log(`{ lat: ${lat}, lng: ${long} }`);
		//console.assert(lat !== undefined);
		//console.assert(long !== undefined);
		//location = {lat, long};
	});
}

randomizeLocation();
