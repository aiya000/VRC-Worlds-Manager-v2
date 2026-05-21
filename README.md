# VRChat Worlds Manager Web

[![Tests](https://github.com/aiya000/VRC-Worlds-Manager-v2/actions/workflows/test.yml/badge.svg)](https://github.com/aiya000/VRC-Worlds-Manager-v2/actions/workflows/test.yml)

[日本語はこちら / 日本語のREADMEはREADME_JP.mdを参照してください。](./README_JP.md)

VRChat Worlds Manager Web is a web application (PWA) that helps VRChat users organize and store their favorite worlds. Based on the original [VRC Worlds Manager v2](https://github.com/Raifa21/VRC-Worlds-Manager-v2) desktop application.

---

## Features

- Add Favourite Worlds
  - Automatically fetch worlds marked as Favourites on VRChat using the API and save them in the app.
  - Once saved, the worlds will remain in the app even if removed from your VRChat Favourites.
  - You can also add worlds directly using their URL links.

- Organize Worlds into Folders
  - Organize saved worlds into folders.
  - A single world can be assigned to multiple folders.

- View World Details
  - Check the details of a world from within the app.
  - You can also attach notes to each world.

- Search Function
  - Search through saved worlds in the app.
  - Supports searching by world creator, tags, and folders.

- Discover Worlds
  - Retrieve a list of recently visited worlds.
  - Search for worlds using tags, text, exclusion tags, and more.

- Create Instances
  - Generate instances directly from the app. Group instances can also be created.
  - When an instance is created, an invite will be sent, just like on the official VRChat website.

- Share Folders
  - Share folders and generate a UUID valid for 30 days.
  - Folders can also be viewed on the web.

---

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Service Layer**: Effect-TS
- **Data Storage**: IndexedDB (Dexie.js) + localStorage
- **API Proxy**: Cloudflare Worker (CORS proxy)
- **Package Manager**: Bun
- **Deployment**: Static Generation (PWA)

---

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Type check
bun run typecheck

# Build for production
bun run build
```

---

## Contributing

Contributions are welcome!
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Some components are licensed under [CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) and are for non-commercial use only. See the [LICENSE_ADDITIONAL](LICENSE_ADDITIONAL) file for details.

---

## Credits

- Original application: [VRC Worlds Manager v2](https://github.com/Raifa21/VRC-Worlds-Manager-v2) by Raifa and siloneco
- Special thanks to VRChat and the VRChat API Community for providing API documentation.
- VRChat-like sidebar icons provided by 黒音キト, licensed under CC-BY-NC-4.0.
- Application icon uses Ciel-chan, with thanks to ArmoireLepus for approval to use.
