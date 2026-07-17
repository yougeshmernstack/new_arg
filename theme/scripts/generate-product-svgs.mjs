import fs from "fs";
import path from "path";

const dir = "public/images/products";

const juices = [
  { file: "berry-immunity", label: "BERRY IMMUNITY", sub: "Immunity Boost", color: "#8B1E2D", accent: "#C4426A", bg: "#FCEEF0" },
  { file: "detox-cleanse", label: "DETOX CLEANSE", sub: "Green Detox", color: "#1F8A56", accent: "#33B978", bg: "#EEF7E8" },
  { file: "radiant-glow", label: "RADIANT GLOW", sub: "Berry Radiance", color: "#C4426A", accent: "#E07B9A", bg: "#FDF0F4" },
  { file: "energy-boost", label: "ENERGY BOOST", sub: "Natural Energy", color: "#E07B24", accent: "#F5A623", bg: "#FFF5E8" },
  { file: "antioxidant-power", label: "ANTIOXIDANT", sub: "Berry Power", color: "#5B2D82", accent: "#8B3F7A", bg: "#F3ECF8" },
  { file: "berry-boost", label: "BERRY BOOST", sub: "Pure Wellness", color: "#6B1E4A", accent: "#9B3A6E", bg: "#F8ECF2" },
  { file: "citrus-immune", label: "CITRUS IMMUNE", sub: "Immunity Support", color: "#D97706", accent: "#F59E0B", bg: "#FFF7ED" },
  { file: "green-glow", label: "GREEN GLOW", sub: "Daily Detox", color: "#15803D", accent: "#22C55E", bg: "#ECFDF5" },
  { file: "mixed-berry-immunity", label: "MIXED BERRY", sub: "Immunity Juice", color: "#4C1D95", accent: "#7C3AED", bg: "#F5F3FF" }
];

const wellness = [
  { file: "greens-superfood-powder", label: "GREENS POWDER", sub: "Superfood Blend", color: "#166534", accent: "#22C55E", bg: "#ECFDF5" },
  { file: "plant-protein", label: "PLANT PROTEIN", sub: "Chocolate Flavor", color: "#78350F", accent: "#A16207", bg: "#FEF3C7" },
  { file: "wellness-gummies", label: "WELLNESS GUMMIES", sub: "Mixed Berry", color: "#BE185D", accent: "#EC4899", bg: "#FDF2F8" },
  { file: "plant-multivitamin", label: "MULTIVITAMIN", sub: "Plant Based", color: "#1E40AF", accent: "#3B82F6", bg: "#EFF6FF" },
  { file: "wellness-herbal-tea", label: "HERBAL TEA", sub: "Wellness Blend", color: "#065F46", accent: "#10B981", bg: "#ECFDF5" }
];

function juiceSvg({ label, sub, color, accent, bg }) {
  const parts = label.split(" ");
  const line1 = parts[0];
  const line2 = parts.slice(1).join(" ") || "JUICE";

  return `<svg width="900" height="900" viewBox="0 0 900 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="900" rx="64" fill="${bg}"/>
  <circle cx="690" cy="184" r="150" fill="${accent}" fill-opacity="0.25"/>
  <circle cx="214" cy="714" r="190" fill="${accent}" fill-opacity="0.18"/>
  <g filter="url(#shadow)">
    <path d="M386 195H514V273H386V195Z" fill="#1A1A1A"/>
    <path d="M403 148H497C510 148 521 159 521 172V204H379V172C379 159 390 148 403 148Z" fill="#333"/>
    <rect x="312" y="248" width="276" height="468" rx="66" fill="url(#bottle)"/>
    <rect x="344" y="318" width="212" height="258" rx="34" fill="${color}"/>
    <text x="450" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="white">${line1}</text>
    <text x="450" y="410" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="white">${line2}</text>
    <text x="450" y="460" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffffcc">${sub}</text>
    <text x="450" y="510" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#ffffffaa">AROGYA GREENLIFE</text>
    <rect x="372" y="604" width="156" height="42" rx="21" fill="#ffffffcc"/>
    <text x="450" y="631" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="${color}">500 ML</text>
  </g>
  <text x="450" y="820" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="700" fill="${color}">Arogya Greenlife</text>
  <defs>
    <filter id="shadow" x="232" y="108" width="436" height="688" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#18301F" flood-opacity="0.22"/>
    </filter>
    <linearGradient id="bottle" x1="312" y1="248" x2="596" y2="712" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/><stop offset="0.42" stop-color="#F7FFF4"/><stop offset="1" stop-color="#CDEEC8"/>
    </linearGradient>
  </defs>
</svg>`;
}

function packageSvg({ label, sub, color, accent, bg }) {
  return `<svg width="900" height="700" viewBox="0 0 900 700" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="700" rx="48" fill="${bg}"/>
  <rect x="80" y="120" width="160" height="380" rx="40" fill="url(#b1)" stroke="${color}" stroke-width="4"/>
  <rect x="100" y="200" width="120" height="180" rx="20" fill="${color}"/>
  <rect x="260" y="120" width="160" height="380" rx="40" fill="url(#b2)" stroke="${accent}" stroke-width="4"/>
  <rect x="280" y="200" width="120" height="180" rx="20" fill="${accent}"/>
  <rect x="440" y="120" width="160" height="380" rx="40" fill="url(#b3)" stroke="${color}" stroke-width="4"/>
  <rect x="460" y="200" width="120" height="180" rx="20" fill="${color}"/>
  <text x="450" y="580" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="700" fill="${color}">${label}</text>
  <text x="450" y="620" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#667366">${sub}</text>
  <defs>
    <linearGradient id="b1" x1="80" y1="120" x2="240" y2="500"><stop stop-color="#fff"/><stop offset="1" stop-color="#f0f0f0"/></linearGradient>
    <linearGradient id="b2" x1="260" y1="120" x2="420" y2="500"><stop stop-color="#fff"/><stop offset="1" stop-color="#f0f0f0"/></linearGradient>
    <linearGradient id="b3" x1="440" y1="120" x2="600" y2="500"><stop stop-color="#fff"/><stop offset="1" stop-color="#f0f0f0"/></linearGradient>
  </defs>
</svg>`;
}

const packs = [
  { file: "wellness-juice-starter", label: "Wellness Juice Starter", sub: "3 Cold-Pressed Juices", color: "#1F8A56", accent: "#8B1E2D", bg: "#EEF7E8" },
  { file: "immunity-bundle", label: "Immunity Bundle", sub: "Juices + Greens Powder", color: "#8B1E2D", accent: "#166534", bg: "#FCEEF0" },
  { file: "detox-glow-package", label: "Detox & Glow Package", sub: "Cleanse + Radiance", color: "#1F8A56", accent: "#C4426A", bg: "#ECFDF5" },
  { file: "complete-wellness-bundle", label: "Complete Wellness Bundle", sub: "5 Juices + Gummies", color: "#5B2D82", accent: "#E07B24", bg: "#F3ECF8" }
];

fs.mkdirSync(dir, { recursive: true });
[...juices, ...wellness].forEach((product) => {
  fs.writeFileSync(path.join(dir, `${product.file}.svg`), juiceSvg(product));
});
packs.forEach((pack) => {
  fs.writeFileSync(path.join(dir, `${pack.file}.svg`), packageSvg(pack));
});

console.log(`Created ${juices.length + wellness.length + packs.length} SVG files`);
