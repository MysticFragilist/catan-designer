# Catan Designer

A free, open-source board designer for Catan and its expansions. Build custom maps with a visual drag-and-drop editor, export them as images, and share with your group.

**Live app → [catan.montydev.ca](https://catan.montydev.ca)**

![Catan Designer Screenshot](https://catan.montydev.ca/og.png)

---

## Features

- **Visual hex grid editor** — place, move, and delete tiles with a click
- **Multiple expansions supported**
  - Base Catan
  - Seafarers
  - Cities & Knights
  - 5–6 Player variants
- **Tile palette** — full set of terrain, port, and sea tiles per expansion
- **Number tokens** — assign and randomize production numbers
- **Lock mode** — lock the board layout to prevent accidental edits
- **Export** — save your map as a PNG image
- **Persistent storage** — your board is saved in the browser automatically

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+

### Install & Run

```bash
git clone https://github.com/smontambault/catan-designer.git
cd catan-designer
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) — frontend framework
- [Vite](https://vitejs.dev/) — build tool
- [`@sveltejs/adapter-static`](https://github.com/sveltejs/kit/tree/main/packages/adapter-static) — static site output
- [Vercel](https://vercel.com/) — hosting

---

## Project Structure

```
src/
├── lib/
│   ├── components/     # UI components (HexGrid, Toolbar, TilePalette, …)
│   ├── core/           # Board logic and data models
│   ├── plugins/        # Expansion packs (base, seafarers, cities-and-knights, 5-6player)
│   └── stores/         # Svelte stores for shared state
└── routes/             # SvelteKit pages
```

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a pull request

---

## License

MIT — free to use, modify, and distribute.
