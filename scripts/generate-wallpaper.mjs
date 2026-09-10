import sharp from "sharp";

const svg = `
<svg width="160" height="160" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect width="160" height="160" fill="#007b7b"/>
  <path d="M0 108h12v-12h12V84h12V72h12V60h12V48h12V36h12V24h12V12h12V0h54v160H0z" fill="#007272" opacity=".58"/>
  <path d="M0 132h18v-6h18v-6h18v-6h18v-6h18v-6h18v-6h18v-6h18v-6h16v76H0z" fill="#009090" opacity=".46"/>
  <path d="M18 24h18v6h6v18h-6v6H18v-6h-6V30h6z" fill="#e8e8cf" opacity=".22"/>
  <path d="M21 29h12v4h4v12h-4v4H21v-4h-4V33h4z" fill="#d7ffff" opacity=".17"/>
  <path d="M116 116h20v4h4v20h-4v4h-20v-4h-4v-20h4z" fill="#004e59" opacity=".46"/>
  <path d="M120 120h12v4h4v12h-4v4h-12v-4h-4v-12h4z" fill="#a6e0d1" opacity=".19"/>
  <path d="M80 76h4v4h-4zM92 64h4v4h-4zM68 88h4v4h-4zM104 52h4v4h-4zM56 100h4v4h-4z" fill="#b8eeee" opacity=".2"/>
</svg>`;

await sharp(Buffer.from(svg)).png({ palette: true, colours: 24, dither: 0 }).toFile("public/retro-wallpaper.png");

const og = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#008080"/>
  <rect x="138" y="78" width="924" height="488" fill="#c0c0c0" stroke="#111" stroke-width="8"/>
  <path d="M138 78h924v8H146v480h-8z" fill="#fff"/>
  <rect x="158" y="98" width="884" height="58" fill="#000080"/>
  <text x="180" y="137" fill="#fff" font-family="Arial,sans-serif" font-size="28" font-weight="700">Welcome.txt</text>
  <rect x="158" y="174" width="884" height="370" fill="#fff"/>
  <text x="218" y="248" fill="#555" font-family="Courier New,monospace" font-size="20" letter-spacing="4">PERSONAL HOME PAGE</text>
  <text x="218" y="350" fill="#111" font-family="Georgia,serif" font-size="72">My corner of the internet</text>
  <text x="218" y="420" fill="#444" font-family="Georgia,serif" font-size="30">Life updates, photographs, and little notes.</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile("public/og-image.png");
console.log("Generated retro wallpaper and Open Graph image");
