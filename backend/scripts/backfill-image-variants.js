/**
 * Generate the -thumb / -lg derivatives for product images uploaded before
 * config/supabase.js started producing them at upload time.
 *
 * Until an image has its derivatives, the UI 404s on the variant and falls back to
 * the multi-MB archival copy — correct, but it means a 50-row products table pulls
 * ~185 MB. This backfill is what turns that into ~1 MB.
 *
 * Safe to interrupt and re-run: it lists what already exists and skips it, and it
 * never writes to the database — the stored URLs keep pointing at the archival
 * copies, and variants are derived from them by naming convention.
 *
 * Usage:
 *   node backend/scripts/backfill-image-variants.js [options]
 *
 *   --dry-run          report what would be generated, write nothing
 *   --limit N          process at most N images (use for a first pass)
 *   --concurrency N    images in flight at once (default 6)
 *   --force            regenerate variants even when they already exist
 *   --prefix PATH      storage folder to walk (default "products")
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const dns = require('dns');

const { BUCKET, VARIANTS, variantPath } = require('../config/supabase');

dns.setDefaultResultOrder('verbatim');

// ─── options ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { dryRun: false, limit: Infinity, concurrency: 6, force: false, prefix: 'products' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--limit') opts.limit = parseInt(argv[++i], 10);
    else if (arg === '--concurrency') opts.concurrency = parseInt(argv[++i], 10);
    else if (arg === '--prefix') opts.prefix = argv[++i];
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  if (!Number.isFinite(opts.concurrency) || opts.concurrency < 1) {
    console.error('--concurrency must be a positive integer');
    process.exit(1);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── storage listing ──────────────────────────────────────────────────────────

const VARIANT_SUFFIXES = Object.values(VARIANTS).map((v) => v.suffix);

/** True for objects this script produced, so re-runs don't derive from derivatives. */
function isVariant(name) {
  const stem = name.replace(/\.[^./]+$/, '');
  return VARIANT_SUFFIXES.some((suffix) => stem.endsWith(suffix));
}

async function listAll(prefix) {
  const objects = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list ${prefix} failed: ${error.message}`);
    if (!data || data.length === 0) break;
    // Supabase returns a null id for the folder placeholder rows.
    objects.push(...data.filter((f) => f.id !== null));
    if (data.length < PAGE) break;
  }
  return objects;
}

// ─── per-image work ───────────────────────────────────────────────────────────

async function download(filePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);
  if (error || !data) throw new Error(error?.message || 'download returned no data');
  return Buffer.from(await data.arrayBuffer());
}

async function upload(filePath, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
}

/**
 * Build every missing derivative for one source object.
 *
 * Deliberately does not touch the archival copy: shrinking it in place would
 * rewrite the exact bytes every stored URL already points at, and there is no
 * undo. Existing originals stay as they are and only new uploads get capped at
 * ORIGINAL_MAX_WIDTH; see --prune-originals guidance in the runbook if you later
 * want to reclaim that space deliberately.
 */
async function backfillOne(object, existingNames) {
  const filePath = `${opts.prefix}/${object.name}`;

  // existingNames holds bare object names, so probe with the unprefixed path.
  const wanted = Object.keys(VARIANTS).filter((key) => {
    const target = variantPath(object.name, key);
    return opts.force || !existingNames.has(target);
  });

  if (wanted.length === 0) return { status: 'skipped', bytesIn: 0, bytesOut: 0 };
  if (opts.dryRun) return { status: 'would-generate', variants: wanted, bytesIn: 0, bytesOut: 0 };

  const source = await download(filePath);

  // failOn:'none' keeps partially-truncated uploads usable; .rotate() applies EXIF
  // orientation, which re-encoding would otherwise discard and leave phone photos
  // sideways in the thumbnails.
  const src = sharp(source, { failOn: 'none' }).rotate();

  let bytesOut = 0;
  for (const key of wanted) {
    const v = VARIANTS[key];
    const buffer = await v
      .encode(src.clone().resize({ width: v.width, withoutEnlargement: true }))
      .toBuffer();
    await upload(variantPath(filePath, key), buffer, v.contentType);
    bytesOut += buffer.length;
  }

  return { status: 'generated', variants: wanted, bytesIn: source.length, bytesOut };
}

// ─── driver ───────────────────────────────────────────────────────────────────

async function mapWithConcurrency(items, mapper, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  console.log(`Bucket "${BUCKET}", prefix "${opts.prefix}"${opts.dryRun ? '  [DRY RUN]' : ''}`);
  console.log(`Variants: ${Object.entries(VARIANTS).map(([k, v]) => `${k}=${v.width}px${v.ext}`).join(', ')}\n`);

  const objects = await listAll(opts.prefix);
  const existingNames = new Set(objects.map((o) => o.name));

  const sources = objects.filter((o) => !isVariant(o.name));
  const targets = Number.isFinite(opts.limit) ? sources.slice(0, opts.limit) : sources;

  const totalBytes = sources.reduce((sum, o) => sum + (o.metadata?.size || 0), 0);
  console.log(`${objects.length} objects, ${sources.length} sources (${mb(totalBytes)}), ${objects.length - sources.length} existing variants`);
  console.log(`Processing ${targets.length} at concurrency ${opts.concurrency}\n`);

  const counts = { generated: 0, skipped: 0, 'would-generate': 0, failed: 0 };
  let bytesIn = 0;
  let bytesOut = 0;
  let done = 0;
  const failures = [];

  await mapWithConcurrency(targets, async (object) => {
    try {
      const r = await backfillOne(object, existingNames);
      counts[r.status]++;
      bytesIn += r.bytesIn;
      bytesOut += r.bytesOut;
    } catch (err) {
      counts.failed++;
      failures.push(`${object.name}: ${err.message}`);
    }
    done++;
    if (done % 25 === 0 || done === targets.length) {
      console.log(`  ${done}/${targets.length}  generated=${counts.generated} skipped=${counts.skipped} failed=${counts.failed}`);
    }
  }, opts.concurrency);

  console.log('\n─── summary ───');
  if (opts.dryRun) {
    console.log(`would generate variants for ${counts['would-generate']} image(s), ${counts.skipped} already complete`);
  } else {
    console.log(`generated : ${counts.generated}`);
    console.log(`skipped   : ${counts.skipped} (variants already present)`);
    console.log(`failed    : ${counts.failed}`);
    console.log(`downloaded: ${mb(bytesIn)}   uploaded: ${mb(bytesOut)}`);
  }
  if (failures.length) {
    console.log('\nfailures:');
    failures.slice(0, 40).forEach((f) => console.log(`  ${f}`));
    if (failures.length > 40) console.log(`  ...and ${failures.length - 40} more`);
    console.log('\nRe-run the script to retry only the failures — completed images are skipped.');
  }

  // Non-zero exit on failure so a CI/cron invocation surfaces it.
  if (counts.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
