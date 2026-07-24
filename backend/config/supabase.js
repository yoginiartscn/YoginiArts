const { createClient } = require('@supabase/supabase-js');
const path = require('path');

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

/**
 * Upload an image buffer to Supabase Storage.
 * Returns the public URL on success, or null on failure.
 */
async function uploadImage(fileBuffer, originalName) {
  if (!supabase) throw new Error('Supabase Storage is not configured');

  const ext = path.extname(originalName).toLowerCase();
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = `products/${uniqueName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: getMimeType(ext),
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Delete an image from Supabase Storage by its public URL.
 */
async function deleteImage(publicUrl) {
  if (!supabase || !publicUrl) return;

  // Extract the storage path from the public URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/products/filename.jpg
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return; // not a Supabase Storage URL

  const filePath = publicUrl.substring(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([filePath]);
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

// Max width requested from Supabase's on-the-fly image render endpoint when
// downloading for Excel export. Every embed site in reports.js caps images at
// <=180px — 220px is still headroom for retina, while keeping each rendition
// small enough that a 1000+ product "All Categories" export (up to ~2
// images/product, ~2800 images total) finishes in about a minute, not several.
const RENDER_MAX_WIDTH = 220;

async function downloadImageOnce(publicUrl) {
  try {
    // Prefer Supabase's resized rendition — far smaller/faster than the original,
    // which matters a lot across a 1000+ row export. Falls through below if the
    // render endpoint isn't available (free-plan projects don't support on-the-fly
    // transforms) or errors out.
    if (publicUrl.includes('/storage/v1/object/public/')) {
      const renderUrl = `${publicUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=${RENDER_MAX_WIDTH}&quality=65&resize=contain`;
      try {
        const renderRes = await fetch(renderUrl, { signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS) });
        if (renderRes.ok) return Buffer.from(await renderRes.arrayBuffer());
      } catch (err) {
        console.warn(`[downloadImage] render endpoint failed, falling back to original (${publicUrl}):`, err?.message || err);
      }
    }

    // For Supabase URLs, use the storage API (authenticated, full size)
    if (supabase && publicUrl.includes('supabase')) {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = publicUrl.indexOf(marker);
      if (idx !== -1) {
        const filePath = publicUrl.substring(idx + marker.length);
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

module.exports = { uploadImage, deleteImage, downloadImage, BUCKET };
