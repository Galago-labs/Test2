FIVE MORE MINUTES - COMPLETE LOCAL IMAGE PACK

Open catalog.html to see all 51 images without internet or a server.
manifest.json lists every file.

nap-room.jpg  Original approved Momo and bedroom illustration (unchanged).
rewards/      Six collectible gift illustrations, shown in My Little Room.
trophies/     Six unique achievement illustrations, shown in Dream Journal.
game/         Clouds, moon, alarm, pillow, firefly, leaf, and brand moon.
ui/           All interface icons, favicon, and the paper texture.

SVG files are actual editable vector images. They do not refer to external
images, fonts, scripts, or servers. They can be opened directly in a browser,
Inkscape, Illustrator, or other SVG-compatible tools.

The game imports exactly these SVG files as strings at build time. They are
drawn inline in the game, without network requests. The JPEG and fonts are
also embedded in the production HTML. No artwork is generated or downloaded
at runtime. No separate character redesign is used.

DOWNLOAD ONE ARCHIVE:
Open Settings in a standalone game and choose Download all images (ZIP).
The archive is assembled locally from the same embedded assets, even offline.

YANDEX SDK:
The production game still loads /sdk.js and calls YaGames.init() by default.
Game Ready, gameplay events, pauses, language detection, and fullscreen remain
integrated. The local image pack does not disable or replace any platform
service. There is no separate SDK-free game export.

These images and the catalog can be opened without a network. Yandex platform
services are a separate integration and may require a network connection.

Image source files remain in public/images/ in the project and are copied to
dist/images/ during the build. They are included for editing, reuse, and review;
the built game does not require separate image requests to these paths.