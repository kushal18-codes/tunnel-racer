# Tunnel Racer

A small browser game made with Astro. You're a glowing ball stuck to the wall of a tunnel. Red walls fly at you, and you have to line up with the gap to get through.

## How to play

- Go to `/play` and click to start.
- Move your mouse (or finger) around the middle of the screen. The ball follows the angle of your cursor.
- Steer into the gap in each red wall.
- The tunnel gets faster over time and the gaps get smaller.
- If you hit a wall you crash. Click to try again. Your best score is saved in your browser.

## Run it

You need Node 22.12 or newer.

```sh
npm install
npm run dev
```

Then open http://localhost:4321 for the home page, or http://localhost:4321/play to play straight away.

## What's in it

- **Canvas** for the tunnel: rings, spokes, a glow, and a bend that gets bigger the further away it is. It looks 3D but it's just 2D drawing with perspective maths.
- **Web Audio** for sound: a drone that gets higher as you speed up, a blip when you pass a wall, and a low thud when you crash.

## Project layout

```text
src/
├── components/Tunnel.astro   the canvas, loads the game
├── lib/tunnel.js             all the game code
├── layouts/Layout.astro      basic page wrapper
└── pages/
    ├── index.astro           home page with the copy-paste link
    └── play.astro            the game
```

## The home page

The home page (`/`) gives you the whole game as one `data:` link. Hit Copy, paste it into your browser's address bar, and the game runs on its own with no server. Some browsers block opening `data:` links like this, so it might not work everywhere.

## Commands

| Command           | What it does                      |
| :---------------- | :-------------------------------- |
| `npm run dev`     | Starts the dev server             |
| `npm run build`   | Builds the site into `dist/`      |
| `npm run preview` | Previews the built site           |
