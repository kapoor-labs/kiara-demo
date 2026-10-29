export function makeCatalog(n) {
  let seed = 20261027;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const categories = {
    laptop: { types: ["ultrabook", "gaming laptop", "chromebook", "workstation laptop"], low: 280, high: 2400 },
    headphones: { types: ["wireless headphones", "noise cancelling headphones", "wireless earbuds", "studio headphones"], low: 25, high: 450 },
    monitor: { types: ["4k monitor", "curved monitor", "portable monitor", "gaming monitor"], low: 120, high: 1100 },
    keyboard: { types: ["mechanical keyboard", "wireless keyboard", "ergonomic keyboard"], low: 30, high: 260 },
    camera: { types: ["mirrorless camera", "action camera", "webcam"], low: 45, high: 2200 },
    speaker: { types: ["bluetooth speaker", "smart speaker", "soundbar"], low: 35, high: 700 },
  };
  const brands = ["Nordline", "Voltera", "Quanta", "Altair", "Brightway", "Kestrel", "Orion", "Pixelforge"];
  const colors = ["black", "silver", "white", "blue", "red", "green"];
  const tags = ["bluetooth", "usb-c", "rgb", "waterproof", "portable", "refurbished", "eco", "wireless-charging"];
  const series = ["Pro", "Max", "Lite", "Air", "Ultra", "Go"];
  const names = Object.keys(categories);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const category = pick(names);
    const spec = categories[category];
    const brand = pick(brands);
    const rowTags = new Set();
    const tagCount = 1 + Math.floor(rand() * 3);
    while (rowTags.size < tagCount) rowTags.add(pick(tags));
    rows.push({
      category,
      brand,
      color: pick(colors),
      rating: Math.round((2.5 + rand() * 2.5) * 10) / 10,
      price: Math.round(spec.low + rand() * (spec.high - spec.low)),
      tags: [...rowTags].join(", "),
      name: `${brand} ${pick(spec.types)} ${pick(series)} ${2 + Math.floor(rand() * 15)}`,
      sku: "KD-" + String(10000 + i),
    });
  }
  return rows;
}
