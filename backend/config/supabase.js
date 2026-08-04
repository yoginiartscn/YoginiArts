const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const path = require('path');

// Render's smaller instances are memory-capped (512 MB on the free tier) and a
// single product save decodes up to two ~4000px phone photos concurrently. Left at
// its defaults libvips spawns one thread per core and holds a decode cache, which
// is enough to OOM the container mid-upload. One thread and no cache costs a little
// latency per image and keeps peak memory predictable.
sharp.concurrency(1);
sharp.cache(false);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase Storage client initialized');
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY not set — image uploads will be disabled.');
}

const PUBLIC_MARKER = '/storage/v1/object/public/';

// ─── Derivative sizes ─────────────────────────────────────────────────────────
// Every size the app needs is generated once, at upload time, and stored as an
// ordinary object. We deliberately do NOT use Supabase's /render/image/ endpoint:
// it bills per *unique origin image per calendar month* (100 included on Pro), so
// one "All Categories" quotation export — which touches every product image —
// bills the entire catalogue in a single request. Plain object reads are just
// egress, which is effectively free at our volume and does not scale with how
// many distinct products get viewed.
//
// Naming convention, derived from the stored URL by string manipulation alone so
// no extra column or lookup is needed:
//   products/<stem>.jpg  ->  products/<stem>-thumb.jpg
//                            products/<stem>-lg.webp
// frontend/src/inventory/utils/inventoryApi.js mirrors this — keep the two in sync.
const VARIANTS = {
  // Grid/table thumbnails, and the images embedded in Excel exports. JPEG rather
  // than WebP because ExcelJS only accepts jpeg/png/gif and Excel itself will not
  // render WebP; at 400px the two encodings are within ~10 KB of each other anyway.
  thumb: {
    suffix: '-thumb',
    ext: '.jpg',
    contentType: 'image/jpeg',
    width: 400,
    encode: (pipeline) => pipeline.jpeg({ quality: 78, mozjpeg: true }),
  },
  // Full-screen preview modal — browser-only, so WebP is safe and ~40% smaller.
  lg: {
    suffix: '-lg',
    ext: '.webp',
    contentType: 'image/webp',
    width: 1600,
    encode: (pipeline) => pipeline.webp({ quality: 80 }),
  },
};

// Cap for the archival copy whose URL is stored in the database. Phone uploads
// arrive at ~3.7 MB / 4000px, and nothing in the app displays above 1600px, so
// 2000px is already generous headroom while cutting per-image storage ~90%.
const ORIGINAL_MAX_WIDTH = 2000;

// Containers we can re-encode without changing the file extension. The extension
// is baked into the URL stored in the database, so re-encoding a .gif or .heic
// into JPEG would leave the bytes disagreeing with the name — those pass through
// untouched instead.
const REENCODABLE = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Storage path of a variant, e.g. products/123.jpg -> products/123-thumb.jpg */
function variantPath(filePath, key) {
  const { suffix, ext } = VARIANTS[key];
  return `${filePath.replace(/\.[^./]+$/, '')}${suffix}${ext}`;
}

/** Public URL of a variant, preserving any query string on the input URL. */
function variantUrl(publicUrl, key) {
  const { suffix, ext } = VARIANTS[key];
  const [base, query] = publicUrl.split('?');
  return `${base.replace(/\.[^./]+$/, '')}${suffix}${ext}${query ? `?${query}` : ''}`;
}

/** Storage path from a public URL, or null if it isn't one of ours. */
function storagePathFromUrl(publicUrl) {
  const marker = `${PUBLIC_MARKER}${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  return idx === -1 ? null : publicUrl.substring(idx + marker.length).split('?')[0];
}

async function putObject(filePath, buffer, contentType, upsert) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType, upsert });
  if (error) throw error;
}

/**
 * Re-encode the archival copy: EXIF-rotated, capped at ORIGINAL_MAX_WIDTH, same
 * container. Returns the source buffer unchanged when re-encoding would not help.
 */
async function encodeOriginal(pipeline, ext, sourceBuffer) {
  if (!REENCODABLE.has(ext)) return sourceBuffer;

  const resized = pipeline.resize({ width: ORIGINAL_MAX_WIDTH, withoutEnlargement: true });
  let out;
  if (ext === '.png') out = await resized.png({ compressionLevel: 9 }).toBuffer();
  else if (ext === '.webp') out = await resized.webp({ quality: 85 }).toBuffer();
  else out = await resized.jpeg({ quality: 85, mozjpeg: true }).toBuffer();

  // Re-encoding an already-small or already-optimised file can make it larger —
  // keep whichever is smaller so passing through here never inflates an upload.
  return out.length < sourceBuffer.length ? out : sourceBuffer;
}

/**
 * Decode once, then produce the archival copy plus every entry in VARIANTS.
 * Returns { original, variants } — `variants` is empty if the source is
 * unreadable, which callers must treat as non-fatal.
 */
async function processImage(fileBuffer, ext) {
  try {
    // .rotate() with no argument applies the EXIF orientation tag. It is required,
    // not cosmetic: re-encoding drops EXIF, so without it every photo taken in
    // portrait on a phone would come out of here rotated 90°.
    const src = sharp(fileBuffer, { failOn: 'none' }).rotate();

    const original = await encodeOriginal(src.clone(), ext, fileBuffer);

    const variants = {};
    for (const [key, v] of Object.entries(VARIANTS)) {
      variants[key] = await v
        .encode(src.clone().resize({ width: v.width, withoutEnlargement: true }))
        .toBuffer();
    }
    return { original, variants };
  } catch (err) {
    // Unreadable or unsupported source. Store the upload untouched and skip the
    // derivatives — the client falls back to the stored URL when a variant 404s,
    // so the product still renders rather than the save failing outright.
    console.warn('[processImage] storing raw upload, no derivatives:', err?.message || err);
    return { original: fileBuffer, variants: {} };
  }
}

/**
 * Upload an image buffer to Supabase Storage, generating every derivative size
 * up front. Returns the public URL of the archival copy — that is what callers
 * persist; the thumbnail and preview URLs are derived from it.
 */
async function uploadImage(fileBuffer, originalName) {
  if (!supabase) throw new Error('Supabase Storage is not configured');

  const ext = path.extname(originalName).toLowerCase();
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = `products/${uniqueName}`;

  const { original, variants } = await processImage(fileBuffer, ext);

  await putObject(filePath, original, getMimeType(ext), false);

  // Derivatives are best-effort. A product whose thumbnail failed to upload still
  // renders via the fallback path, so one bad variant must not fail a product save
  // that has already stored the archival copy successfully.
  await Promise.all(
    Object.entries(variants).map(([key, buffer]) =>
      putObject(variantPath(filePath, key), buffer, VARIANTS[key].contentType, true)
        .catch((err) => console.warn(`[uploadImage] variant "${key}" failed for ${filePath}:`, err?.message || err))
    )
  );

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Delete an image and all of its derivatives from Supabase Storage by public URL.
 */
async function deleteImage(publicUrl) {
  if (!supabase || !publicUrl) return;

  // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/products/filename.jpg
  const filePath = storagePathFromUrl(publicUrl);
  if (!filePath) return; // not a Supabase Storage URL

  await supabase.storage
    .from(BUCKET)
    .remove([filePath, ...Object.keys(VARIANTS).map((key) => variantPath(filePath, key))]);
}

const IMAGE_DOWNLOAD_TIMEOUT_MS = 10000;

// Races a promise against a timeout so a stalled network call can never hang its
// caller forever — used by bulk exports (e.g. quotations with 1000+ products) where
// a single stuck image would otherwise block the whole request indefinitely.
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Image download timed out')), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function downloadImageOnce(publicUrl) {
  try {
    // Prefer the pre-generated thumbnail: ~30 KB against a multi-MB archival copy,
    // which is the difference between a 1000+ product "All Categories" export
    // finishing in about a minute and it timing out. Every embed site in reports.js
    // caps images at <=180px, so the 400px variant is still retina headroom.
    // Falls through to the archival copy below when the variant is missing —
    // images uploaded before the derivative backfill won't have one.
    if (publicUrl.includes(PUBLIC_MARKER)) {
      const thumbUrl = variantUrl(publicUrl, 'thumb');
      try {
        const thumbRes = await fetch(thumbUrl, { signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS) });
        if (thumbRes.ok) return Buffer.from(await thumbRes.arrayBuffer());
      } catch (err) {
        console.warn(`[downloadImage] thumbnail fetch failed, falling back to original (${publicUrl}):`, err?.message || err);
      }
    }

    // For Supabase URLs, use the storage API (authenticated, full size)
    if (supabase && publicUrl.includes('supabase')) {
      const filePath = storagePathFromUrl(publicUrl);
      if (filePath) {
        const { data, error } = await withTimeout(supabase.storage.from(BUCKET).download(filePath), IMAGE_DOWNLOAD_TIMEOUT_MS);
        if (error || !data) {
          if (error) console.warn(`[downloadImage] Supabase storage download failed (${publicUrl}):`, error.message || error);
          return null;
        }
        return Buffer.from(await data.arrayBuffer());
      }
    }

    // Fallback: fetch any http(s) URL
    if (publicUrl.startsWith('http')) {
      const response = await fetch(publicUrl, { signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS) });
      if (!response.ok) {
        console.warn(`[downloadImage] fetch failed with status ${response.status} (${publicUrl})`);
        return null;
      }
      return Buffer.from(await response.arrayBuffer());
    }

    // Legacy: local /uploads/ path — read from disk if file exists
    if (publicUrl.startsWith('/uploads/')) {
      const fs = require('fs');
      const localPath = path.join(__dirname, '..', publicUrl);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
      console.warn(`[downloadImage] legacy local file not found on disk (${publicUrl}) — likely lost on redeploy`);
    }
  } catch (err) {
    console.warn(`[downloadImage] unexpected error (${publicUrl}):`, err?.message || err);
    return null;
  }

  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download an image by its URL and return the buffer.
 * Handles: Supabase storage URLs (preferring a downscaled rendition), any http(s)
 * URL, and legacy local /uploads/ paths. Retries once after a short delay on
 * failure — most failures here are transient (timeouts / cold starts under
 * concurrent export load), not permanent, so a lot of images that would otherwise
 * silently end up blank in the exported Excel file recover on the second attempt.
 */
async function downloadImage(publicUrl) {
  if (!publicUrl) return null;
  const first = await downloadImageOnce(publicUrl);
  if (first) return first;
  await delay(300);
  return downloadImageOnce(publicUrl);
}

function getMimeType(ext) {
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.avif': 'image/avif',
  };
  return types[ext] || 'application/octet-stream';
}

module.exports = {
  uploadImage,
  deleteImage,
  downloadImage,
  BUCKET,
  // Exported for scripts/backfill-image-variants.js, which regenerates derivatives
  // for images uploaded before this scheme existed.
  VARIANTS,
  ORIGINAL_MAX_WIDTH,
  REENCODABLE,
  variantPath,
  variantUrl,
  storagePathFromUrl,
};
