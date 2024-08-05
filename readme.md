# localguessr

A game about guessing your location based on Google Street View API.

-   Client-only: runs purely inside a browser, doesn't require a stateful server other than for serving static pages.
-   Doesn't have ads.
-   Doesn't need account registration.
-   Doesn't have a paywall.

# Run

1. If you want to host localguessr, you need to get [API key](https://developers.google.com/maps/documentation/javascript/get-api-key) and put it in [index.html](./index.html) `<script>` tag that loads Google APIs; note that it works without API key.
2. Serve `index.html` page:

```
python -m http.server 3000
chromium http://localhost:3000
```

# Acknowledgements

-   [WorldGuessr](https://github.com/codergautam/worldguessr) (MIT license)
