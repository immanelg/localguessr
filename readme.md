# localguessr

A game about guessing your location based on Google Street View API.

-   Client-only: runs purely inside a browser, doesn't require a stateful server other than for serving static pages.
-   Doesn't have ads.
-   Doesn't need account registration.
-   Doesn't have a paywall.

# Run

We use Vite for building. (Even though we use vanilla HTML, CSS and JavaScript, this is necessary to optimize OpenLayers library which is not supposed to be used with cdns). So you will need npm or whatever.

Install JS dependencies:
```sh
npm install
```

Start development server:
```sh
npm run dev
```
or 
```sh
vite
```

If you want to host localguessr, you need to get the [Google API key](https://developers.google.com/maps/documentation/javascript/get-api-key) and put it in [`<script>` tag that loads Google APIs](./index.html). But to start development server, you don't need an API key.

Build for production:
```sh
npm run build
```
or 
```sh
vite build
```
This will create the `dist/` directory.

# Acknowledgements

- Some code is copied from [WorldGuessr](https://github.com/codergautam/worldguessr) (MIT license)
