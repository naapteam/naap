// Day-1 seed per architecture doc §10: one mill, two users, seven species
// with recovery bands, ten bays, twenty size presets.
// Run with: pnpm db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./client";
import {
  org,
  mill,
  appUser,
  species,
  location,
  sizePreset,
  party,
} from "./schema";

const INCH_MM = 25.4;
const FOOT_MM = 304.8;
const inch = (n: number) => Math.round(n * INCH_MM);
const foot = (n: number) => Math.round(n * FOOT_MM);

async function main() {
  const existing = await db.select().from(org).limit(1);
  if (existing.length > 0) {
    console.log("Already seeded — org table is non-empty. Skipping.");
    return;
  }

  const [demoOrg] = await db
    .insert(org)
    .values({ name: "Naap Pilot" })
    .returning();

  const [demoMill] = await db
    .insert(mill)
    .values({
      orgId: demoOrg.id,
      name: "Naap Pilot Mill",
      defaultLocale: "hi",
      settings: {},
    })
    .returning();

  const pinHash = await bcrypt.hash("1234", 10);

  await db.insert(appUser).values([
    {
      orgId: demoOrg.id,
      millId: demoMill.id,
      name: "Owner",
      phone: "9000000001",
      role: "owner",
      pinHash,
      locale: "hi",
    },
    {
      orgId: demoOrg.id,
      millId: demoMill.id,
      name: "Munshi",
      phone: "9000000002",
      role: "manager",
      pinHash,
      locale: "hi",
    },
  ]);

  // Trade-name translations below are a starting point for the pilot demo,
  // NOT signed off — per UI spec §4 a trade person per language must sign
  // off the glossary before launch.
  await db.insert(species).values([
    {
      millId: demoMill.id,
      nameEn: "Teak",
      code: "TK",
      nameHi: "सागवान",
      nameMr: "सागवान",
      nameGu: "સાગ",
      colourHex: "#8B5E34",
      recoveryLow: "52",
      recoveryHigh: "62",
      byproductPct: "16",
      sortOrder: 1,
    },
    {
      millId: demoMill.id,
      nameEn: "Sal",
      code: "SA",
      nameHi: "साल",
      nameMr: "साल",
      nameGu: "સાલ",
      colourHex: "#C9A227",
      recoveryLow: "50",
      recoveryHigh: "58",
      byproductPct: "18",
      sortOrder: 2,
    },
    {
      millId: demoMill.id,
      nameEn: "Babul",
      code: "BB",
      nameHi: "बबूल",
      nameMr: "बाभूळ",
      nameGu: "બાવળ",
      colourHex: "#6B8E23",
      recoveryLow: "42",
      recoveryHigh: "52",
      byproductPct: "22",
      sortOrder: 3,
    },
    {
      millId: demoMill.id,
      nameEn: "Neem",
      code: "NM",
      nameHi: "नीम",
      nameMr: "कडुनिंब",
      nameGu: "લીમડો",
      colourHex: "#2E7D32",
      recoveryLow: "45",
      recoveryHigh: "55",
      byproductPct: "20",
      sortOrder: 4,
    },
    {
      millId: demoMill.id,
      nameEn: "Mango",
      code: "MG",
      nameHi: "आम",
      nameMr: "आंबा",
      nameGu: "કેરી",
      colourHex: "#E07A29",
      recoveryLow: "45",
      recoveryHigh: "55",
      byproductPct: "20",
      sortOrder: 5,
    },
    {
      millId: demoMill.id,
      nameEn: "Eucalyptus",
      code: "EU",
      nameHi: "नीलगिरी",
      nameMr: "निलगिरी",
      nameGu: "નીલગિરી",
      colourHex: "#4FA8A0",
      recoveryLow: "40",
      recoveryHigh: "50",
      byproductPct: "24",
      sortOrder: 6,
    },
    {
      millId: demoMill.id,
      nameEn: "Imported hardwood",
      code: "IH",
      nameHi: "आयातित सागवान",
      nameMr: "आयातित लाकूड",
      nameGu: "આયાતી લાકડું",
      colourHex: "#6C63A6",
      recoveryLow: "50",
      recoveryHigh: "60",
      byproductPct: "18",
      sortOrder: 7,
    },
  ]);

  const bayCodes = [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5",
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
  ];
  await db.insert(location).values(
    bayCodes.map((code) => ({
      millId: demoMill.id,
      code,
      kind: "yard",
    })),
  );

  // Twenty common sawn-timber sizes (inches -> mm), ranked later by use_count.
  const presetsInches: [number, number, number][] = [
    [1, 2, 8],
    [1, 3, 8],
    [1, 4, 8],
    [1, 4, 10],
    [1, 4, 12],
    [1, 5, 10],
    [1, 6, 10],
    [1, 6, 12],
    [1, 8, 10],
    [1, 8, 12],
    [1, 10, 12],
    [2, 3, 10],
    [2, 4, 10],
    [2, 4, 12],
    [2, 5, 12],
    [2, 6, 12],
    [2, 8, 12],
    [3, 4, 12],
    [3, 6, 12],
    [4, 4, 12],
  ];
  await db.insert(sizePreset).values(
    presetsInches.map(([t, w, l]) => ({
      millId: demoMill.id,
      thicknessMm: inch(t),
      widthMm: inch(w),
      lengthMm: foot(l),
      label: `${t}×${w}×${l}ft`,
    })),
  );

  await db.insert(party).values([
    { millId: demoMill.id, kind: "supplier", name: "Rane Timber Traders", place: "Nashik" },
    { millId: demoMill.id, kind: "supplier", name: "Deshmukh Logs", place: "Kolhapur" },
    { millId: demoMill.id, kind: "both", name: "Patil Wood Depot", place: "Pune" },
    { millId: demoMill.id, kind: "customer", name: "Sunrise Furniture", place: "Mumbai" },
    {
      millId: demoMill.id,
      kind: "broker",
      name: "Kadam Associates",
      place: "Pune",
      commissionPct: "2",
    },
  ]);

  console.log("Seed complete:");
  console.log(`  org:  ${demoOrg.name} (${demoOrg.id})`);
  console.log(`  mill: ${demoMill.name} (${demoMill.id})`);
  console.log("  users: Owner 9000000001 / Munshi 9000000002, PIN 1234");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
