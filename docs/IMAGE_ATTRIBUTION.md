# Vehicle listing photos

Primary images are **matched to make and model** using files from **Wikimedia Commons** (`upload.wikimedia.org`), keyed in `data/vehicleImageCatalog.json` by `make|model`. Each file may include a **reference year** parsed from the filename; at patch time we **order** images by closeness to the lot’s **model year** so the gallery tracks **year + make + model** as closely as stock photography allows. The catalog is built with:

```bash
node scripts/build-vehicle-image-catalog.mjs
node scripts/patch-vehicle-images.mjs
```

- **Commons licenses:** files are under various free licenses (often CC BY-SA). See each file’s page under `attribution[].filePage` in the catalog JSON for author and terms.
- **Fallbacks:** if a Y/M/M key has too few Commons hits, `scripts/lib/carImagePool.mjs` fills the rest from **Unsplash** (`images.unsplash.com`).
- **Unsplash license:** [Unsplash License](https://unsplash.com/license).

New datasets from `scripts/generate_vehicles.mjs` use the same selection logic (catalog + Unsplash fallback).
