import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const moreProducts = [
  // Cameras
  { name: "Sony A7 IV", brand: "Sony", category: "Cameras", price: 229999, originalPrice: 249999, description: "The Sony A7 IV is a full-frame mirrorless camera with 33MP sensor, 4K 60fps video, and real-time Eye AF. A true hybrid powerhouse for photographers and videographers.", specs: { sensor: "33MP Full-Frame BSI CMOS", video: "4K 60fps", battery: "580 shots", mount: "Sony E-Mount", stabilization: "5-axis IBIS", af: "Real-time Eye AF" }, rating: 4.8, reviewCount: 1432, inStock: true, isFeatured: true, tags: ["mirrorless", "full-frame", "4k", "photography", "sony"], aiScore: 94 },
  { name: "Canon EOS R6 Mark II", brand: "Canon", category: "Cameras", price: 219999, originalPrice: 239999, description: "The EOS R6 Mark II offers 40fps burst shooting, 4K 60fps Uncropped video, and Canon's legendary Dual Pixel AF. Built for action and wildlife photographers.", specs: { sensor: "24.2MP Full-Frame CMOS", video: "4K 60fps uncropped", battery: "760 shots", mount: "Canon RF", burst: "40fps", af: "Dual Pixel CMOS AF II" }, rating: 4.7, reviewCount: 987, inStock: true, isFeatured: true, tags: ["mirrorless", "action", "wildlife", "4k", "canon"], aiScore: 92 },
  { name: "Fujifilm X-T5", brand: "Fujifilm", category: "Cameras", price: 169999, originalPrice: 189999, description: "40MP APS-C sensor in a retro compact body. The X-T5 is built for stills photographers who want uncompromising image quality with Fujifilm film simulations.", specs: { sensor: "40.2MP X-Trans CMOS 5 HR", video: "6.2K 30fps", battery: "740 shots", mount: "Fujifilm X Mount", weight: "557g", stabilization: "7-stop IBIS" }, rating: 4.9, reviewCount: 743, inStock: true, isFeatured: false, tags: ["mirrorless", "aps-c", "retro", "40mp", "fujifilm"], aiScore: 96 },

  // Audio / Speakers
  { name: "Sonos Era 300", brand: "Sonos", category: "Audio", price: 44999, originalPrice: 49999, description: "The Era 300 is Sonos' spatial audio speaker with Dolby Atmos support, six drivers in four directions, and Trueplay room tuning. The best home wireless speaker.", specs: { drivers: "6 (tweeter, mid, woofer × 4 directions)", connectivity: "Wi-Fi, Bluetooth, Line-in USB-C", spatial_audio: "Dolby Atmos", weight: "4.47 kg", finish: "Black / White" }, rating: 4.7, reviewCount: 1234, inStock: true, isFeatured: true, tags: ["speaker", "spatial-audio", "dolby-atmos", "wireless", "sonos"], aiScore: 93 },
  { name: "Bose SoundLink Max", brand: "Bose", category: "Audio", price: 29999, originalPrice: 34999, description: "Bose SoundLink Max brings premium sound in a portable package with IP67 rating, 20-hour battery, and Party Mode for connecting multiple speakers.", specs: { battery: "20 hours", waterproof: "IP67", connectivity: "Bluetooth 5.3", charging: "USB-C", party_mode: "Yes" }, rating: 4.6, reviewCount: 892, inStock: true, isFeatured: false, tags: ["portable", "waterproof", "bass", "outdoor", "bose"], aiScore: 88 },
  { name: "JBL Charge 5", brand: "JBL", category: "Audio", price: 16999, originalPrice: 19999, description: "The JBL Charge 5 features powerful stereo sound, IP67 waterproofing, and 20h battery. It can even charge your phone as a power bank.", specs: { battery: "20 hours", waterproof: "IP67", connectivity: "Bluetooth 5.1", powerbank: "Yes", weight: "960g" }, rating: 4.5, reviewCount: 5678, inStock: true, isFeatured: false, tags: ["portable", "waterproof", "powerbank", "outdoor", "jbl"], aiScore: 85 },

  // More Headphones
  { name: "Bose QuietComfort 45", brand: "Bose", category: "Headphones", price: 24999, originalPrice: 32999, description: "The QuietComfort 45 delivers legendary Bose ANC with a 24-hour battery, high-fidelity audio, and ultra-plush ear cushions for all-day comfort.", specs: { type: "Over-ear", battery: "24 hours", connectivity: "Bluetooth 5.1", anc: "Quiet Mode + Aware Mode", weight: "238g" }, rating: 4.6, reviewCount: 3421, inStock: true, isFeatured: false, tags: ["anc", "comfort", "premium", "wireless", "bose"], aiScore: 88 },
  { name: "Sennheiser Momentum 4", brand: "Sennheiser", category: "Headphones", price: 22999, originalPrice: 27999, description: "60-hour battery, adaptive ANC, and audiophile-grade sound from 42mm transducers. The Momentum 4 is the endurance champion of premium headphones.", specs: { type: "Over-ear", battery: "60 hours", connectivity: "Bluetooth 5.2", anc: "Adaptive ANC", driver: "42mm" }, rating: 4.7, reviewCount: 1987, inStock: true, isFeatured: true, tags: ["60hr-battery", "audiophile", "anc", "wireless", "sennheiser"], aiScore: 91 },

  // More Smartphones
  { name: "Google Pixel 8 Pro", brand: "Google", category: "Smartphones", price: 99999, originalPrice: 109999, description: "The Pixel 8 Pro is Google's most advanced camera phone with a 50MP triple camera, Tensor G3 chip, and 7 years of OS updates — plus AI features like Magic Eraser and Best Take.", specs: { os: "Android 14", chip: "Google Tensor G3", camera: "50MP + 48MP + 48MP", display: "6.7-inch LTPO OLED 120Hz", battery: "5050mAh", charging: "30W wired + 23W wireless", updates: "7 years" }, rating: 4.6, reviewCount: 2145, inStock: true, isFeatured: true, tags: ["google", "pixel", "ai-camera", "7-year-support", "android"], aiScore: 90 },
  { name: "Nothing Phone (2)", brand: "Nothing", category: "Smartphones", price: 59999, originalPrice: 69999, description: "The Nothing Phone (2) features a unique transparent Glyph Interface with customisable light patterns, Snapdragon 8+ Gen 1, and a clean stock-like Android experience.", specs: { os: "Nothing OS 2.0", processor: "Snapdragon 8+ Gen 1", display: "6.7-inch OLED 120Hz", camera: "50MP + 50MP", battery: "4700mAh", charging: "45W wired + 15W wireless", glyph: "Yes" }, rating: 4.4, reviewCount: 1654, inStock: true, isFeatured: false, tags: ["unique-design", "glyph", "nothing", "transparent", "android"], aiScore: 83 },

  // More Laptops
  { name: "Microsoft Surface Pro 9", brand: "Microsoft", category: "Laptops", price: 109999, originalPrice: 124999, description: "The Surface Pro 9 is the ultimate 2-in-1 PC with Intel Core i7, a stunning 13-inch PixelSense display, and up to 19-hour battery. Tablet flexibility meets laptop power.", specs: { processor: "Intel Core i7-1255U", display: "13-inch PixelSense 2880×1920 120Hz", ram: "16GB", storage: "256GB SSD", battery: "19 hours", weight: "879g" }, rating: 4.4, reviewCount: 1123, inStock: true, isFeatured: false, tags: ["2-in-1", "surface", "microsoft", "portable", "tablet-mode"], aiScore: 83 },
  { name: "Razer Blade 16", brand: "Razer", category: "Laptops", price: 249999, originalPrice: 279999, description: "The Razer Blade 16 packs RTX 4090 + i9 into the world's thinnest gaming laptop. A dual-mode display switches between 4K 60fps and FHD 240fps.", specs: { processor: "Intel Core i9-13980HX", gpu: "NVIDIA RTX 4090", display: "16-inch Dual-mode Mini-LED 4K/240Hz", ram: "32GB DDR5", storage: "2TB NVMe", weight: "2.14 kg" }, rating: 4.5, reviewCount: 678, inStock: true, isFeatured: true, tags: ["gaming", "rtx4090", "premium", "thingest", "razer"], aiScore: 89 },

  // Gaming
  { name: "Xbox Series X", brand: "Microsoft", category: "Gaming", price: 49999, originalPrice: 54999, description: "The Xbox Series X is the world's most powerful console with 12 teraflops GPU, 4K 120fps gaming, 1TB NVMe SSD, and Quick Resume for instant game switching.", specs: { cpu: "AMD Zen 2 8-core", gpu: "AMD RDNA 2 12 TFLOPS", ram: "16GB GDDR6", storage: "1TB NVMe SSD", resolution: "4K 120fps", backward_compat: "Yes" }, rating: 4.7, reviewCount: 4321, inStock: true, isFeatured: true, tags: ["console", "4k", "microsoft", "gamepass", "quick-resume"], aiScore: 93 },
  { name: "ASUS ROG Ally", brand: "ASUS", category: "Gaming", price: 59999, originalPrice: 69999, description: "The ROG Ally is a Windows 11 handheld gaming PC with AMD Ryzen Z1 Extreme, a 1080p 120Hz display, and support for your entire PC game library.", specs: { processor: "AMD Ryzen Z1 Extreme", display: "7-inch FHD 120Hz", ram: "16GB LPDDR5", storage: "512GB NVMe", battery: "40Wh", os: "Windows 11" }, rating: 4.4, reviewCount: 2156, inStock: true, isFeatured: true, tags: ["handheld", "gaming-pc", "windows", "portable", "asus"], aiScore: 87 },
  { name: "Nintendo Switch OLED", brand: "Nintendo", category: "Gaming", price: 34999, originalPrice: 37999, description: "The Nintendo Switch OLED model features a vibrant 7-inch OLED screen, enhanced audio, 64GB storage, and a wide adjustable stand — gaming anywhere just got better.", specs: { display: "7-inch OLED", storage: "64GB", battery: "4.5-9 hours", dock: "Wired LAN port", stand: "Wide adjustable" }, rating: 4.8, reviewCount: 8765, inStock: true, isFeatured: false, tags: ["handheld", "family", "casual", "oled", "nintendo"], aiScore: 91 },

  // More Smartwatches
  { name: "Garmin Fenix 7X Solar", brand: "Garmin", category: "Smartwatches", price: 89999, originalPrice: 99999, description: "The Fenix 7X Solar is built for extreme athletes with solar charging, 28-day battery, multi-band GPS, and advanced health metrics including VO2 max and recovery advisor.", specs: { display: "1.4-inch MIP", gps: "Multi-band", solar: "Yes", battery: "28 days", waterproof: "100m", health: "VO2 max, SpO2, HRV" }, rating: 4.8, reviewCount: 1543, inStock: true, isFeatured: true, tags: ["gps", "solar", "triathlon", "adventure", "garmin"], aiScore: 95 },
  { name: "Samsung Galaxy Watch 6 Classic", brand: "Samsung", category: "Smartwatches", price: 39999, originalPrice: 44999, description: "The Galaxy Watch 6 Classic brings back the iconic rotating bezel with advanced health tracking including blood pressure monitoring, ECG, sleep coaching, and WearOS.", specs: { display: "1.47-inch Super AMOLED", os: "WearOS + One UI", battery: "40 hours", sensors: "BIA, ECG, blood pressure", water_resistance: "5ATM + IP68" }, rating: 4.5, reviewCount: 1876, inStock: true, isFeatured: false, tags: ["rotating-bezel", "ecg", "samsung", "wearos", "health"], aiScore: 86 },

  // More Tablets
  { name: "Lenovo Tab Extreme", brand: "Lenovo", category: "Tablets", price: 79999, originalPrice: 89999, description: "The Lenovo Tab Extreme features a stunning 14.5-inch 3K OLED display, Dimensity 9000 processor, and an 18-hour battery — the Android tablet for media enthusiasts.", specs: { display: "14.5-inch 3K OLED 120Hz", processor: "Dimensity 9000", ram: "12GB", storage: "256GB", battery: "12300mAh", stylus: "Optional" }, rating: 4.4, reviewCount: 654, inStock: true, isFeatured: false, tags: ["oled", "large-screen", "media", "android", "lenovo"], aiScore: 84 },
];

async function seedMoreProducts() {
  console.log("Seeding more products...");

  let inserted = 0;
  let skipped = 0;

  for (const product of moreProducts) {
    try {
      const existing = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(eq(productsTable.name, product.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  Skipping (exists): ${product.name}`);
        skipped++;
        continue;
      }

      await db.insert(productsTable).values({
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: String(product.price),
        originalPrice: product.originalPrice ? String(product.originalPrice) : null,
        description: product.description,
        specs: product.specs,
        rating: String(product.rating),
        reviewCount: product.reviewCount,
        inStock: product.inStock,
        isFeatured: product.isFeatured,
        tags: product.tags,
        aiScore: product.aiScore,
        imageUrl: null,
      });
      console.log(`  ✓ Inserted: ${product.name}`);
      inserted++;
    } catch (err) {
      console.error(`  ✗ Failed ${product.name}:`, err);
    }
  }

  // Update category product counts
  const cats = await db.select().from(categoriesTable);
  for (const cat of cats) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(eq(productsTable.category, cat.name));
    await db.update(categoriesTable)
      .set({ productCount: count })
      .where(eq(categoriesTable.id, cat.id));
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
  process.exit(0);
}

seedMoreProducts().catch(err => { console.error(err); process.exit(1); });
