# Glow website

The public pages for the Glow Mac app, served by GitHub Pages at
https://pmorris24.github.io/glowcamera/

- `index.html`: the product page.
- `privacy.html`: the privacy policy. App Store Connect links to it.
- `support.html`: help and contact. App Store Connect and the app's Help menu link to it.

Change the support email or add the App Store app ID in `_config.yml`, then push.

How it is built:

- `_includes/`: the shared head, navigation, App Store button and footer.
- `assets/site.css` and `assets/site.js`: the design (colors from the app icon), the live gradient
  panels, reveal on scroll, and the interactive app window on the home page. Without JavaScript,
  every page still shows all of its content.
- `assets/fonts/`: Geist, self-hosted under the SIL Open Font License (`OFL.txt`), so pages make
  no requests to font services.
The app's source code is in a separate, private repository. The app's Help menu opens
these URLs, so keep the file names.
