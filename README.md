# Space Probe Game - Next.js Version

This project is a space probe game built using React and Next.js, leveraging Three.js for rendering 3D graphics. The game simulates a space probe navigating through the solar system, allowing players to control the probe and perform slingshot maneuvers around planets.

## Project Structure

```
space-probe-game-next
├── src
│   ├── app
│   │   ├── layout.tsx        # Layout component for the application
│   │   ├── page.tsx          # Main entry point for the application
│   │   └── globals.css       # Global CSS styles
│   ├── components
│   │   ├── GameCanvas.tsx    # Component for rendering the game canvas
│   │   ├── HUD.tsx           # Component for displaying the HUD
│   │   └── Controls.tsx      # Component for game controls
│   ├── lib
│   │   └── threeSetup.ts     # Three.js setup logic
│   └── types
│       └── index.d.ts        # TypeScript types and interfaces
├── public
│   └── robots.txt            # Robots.txt for search engine indexing
├── package.json               # npm configuration file
├── next.config.js            # Next.js configuration settings
├── tsconfig.json             # TypeScript configuration file
├── .eslintrc.json            # ESLint configuration file
├── .gitignore                 # Git ignore file
└── README.md                  # Project documentation
```

## Getting Started

To get started with the project, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd space-probe-game-next
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

## Features

- **3D Graphics:** Utilizes Three.js for rendering the game environment and objects.
- **Interactive Controls:** Players can control the probe using keyboard inputs.
- **Dynamic HUD:** Displays real-time information about the probe's status, velocity, distance, and fuel.
- **Slingshot Mechanics:** Players can perform slingshot maneuvers around planets to gain speed and distance.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.