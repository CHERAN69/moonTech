const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();

const checks = [
  "src/app",
  "src/components",
  "src/lib",
  "src/types",
  "public",
  "supabase"
];

console.log("\n=== CLOSEPILOT FEATURE HEALTH CHECK ===\n");

checks.forEach((item) => {
  const fullPath = path.join(projectRoot, item);

  if (fs.existsSync(fullPath)) {
    console.log(`FOUND: ${item}`);
  } else {
    console.log(`MISSING: ${item}`);
  }
});

console.log("\n=== ROUTE FILE CHECK ===\n");

function scanPages(dir) {
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      scanPages(full);
    } else if (item === "page.tsx") {
      console.log(`PAGE: ${full}`);
    }
  });
}

scanPages(path.join(projectRoot, "src"));

console.log("\n=== CHECK COMPLETE ===");

