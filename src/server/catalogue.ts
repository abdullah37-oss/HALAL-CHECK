import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { Product } from '../models/productModel';
import { barcodeIdentity, isRetailBarcode, sameBarcode } from '../lib/barcode';
import { mapOpenFoodFacts, safeProductImage, record } from '../services/openFoodFacts';

export const CATALOGUE_SCHEMA = 1;
export { isRetailBarcode, sameBarcode };
export const FRESH_DAYS = 90;
export type VerificationState = 'VERIFIED' | 'REVIEW_REQUIRED' | 'INCOMPLETE' | 'REJECTED';
export interface SourceBatch { retailer: string; url: string; retrievedAt: string; licence: string; sha256: string; body: { products: Record<string, unknown>[] } }
export interface Review {
    barcode: string; ingredientHash: string; identityHash: string; sourceVersion: string;
    reviewId: string; reviewedAt: string; method: 'packaging-review';
    exactIdentityConfirmed: boolean; fullLabel: boolean; originalTextMatches: boolean;
    barcodePhoto: { url: string; sha256: string }; ingredientPhoto: { url: string; sha256: string };
}
export interface Candidate {
    barcode: string; identity: string; product: Product; category: string; quantity: string;
    original: string; ingredientHash: string; identityHash: string; sourceVersion: string;
    sourceId: string; retailer: string; status: VerificationState; reason: string;
    retrievedAt: string; sourceUpdatedAt: number; verifiedAt: string | null;
}
export const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const sha = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const clean = (v: unknown, max = 10000) => typeof v === 'string' ? v.trim().slice(0, max) : '';
function validateBatch(batch: SourceBatch, now: number) {
    const permittedSource = batch.url.startsWith('https://world.openfoodfacts.org/api/v2/search?') || batch.url === 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';
    if (!['conad', 'lidl', 'eurospin', 'md', 'todis', 'ins'].includes(batch.retailer) || !permittedSource || !sha(batch.sha256) || batch.sha256 !== hash(JSON.stringify(batch.body)) || !batch.licence.startsWith('ODbL-1.0') || !Number.isFinite(Date.parse(batch.retrievedAt)) || Date.parse(batch.retrievedAt) > now) throw Error('Unlicensed or invalid source batch');
}
export function reviewValid(review: Review | undefined, c: Candidate, now: number): boolean {
    if (!review || review.method !== 'packaging-review' || review.barcode !== c.barcode || review.ingredientHash !== c.ingredientHash || review.identityHash !== c.identityHash || review.sourceVersion !== c.sourceVersion || !review.exactIdentityConfirmed || !review.fullLabel || !review.originalTextMatches || !/^[a-zA-Z0-9_-]{3,100}$/.test(review.reviewId)) return false;
    const at = Date.parse(review.reviewedAt);
    return Number.isFinite(at) && at <= now && now - at < FRESH_DAYS * 86400000 && review.barcodePhoto?.url !== review.ingredientPhoto?.url && [review.barcodePhoto, review.ingredientPhoto].every(p => record(p) && !!safeProductImage(p.url) && sameBarcode(new URL(p.url).pathname.match(/\/images\/products\/([\d/]+)\//)?.[1]?.replaceAll('/', '') || '', c.barcode) && sha(p.sha256));
}
export function candidate(raw: Record<string, unknown>, batch: SourceBatch, review?: Review, now = Date.now()): Candidate | null {
    if (typeof raw.code !== 'string' || !isRetailBarcode(raw.code) || !Array.isArray(raw.countries_tags) || !raw.countries_tags.includes('en:italy')) return null;
    // A brand name alone never establishes a retailer association.
    if (!Array.isArray(raw.stores_tags) || !raw.stores_tags.some(t => typeof t === 'string' && t.toLowerCase() === batch.retailer)) return null;
    validateBatch(batch, now);
    const mapped = mapOpenFoodFacts({ status: 1, product: raw }, raw.code, clean(raw.lang, 2) || 'it', Date.parse(batch.retrievedAt));
    if (mapped.status !== 'verified') return null;
    const product = mapped.product;
    const original = product.ingredientsRaw;
    const c: Candidate = { barcode: raw.code, identity: barcodeIdentity(raw.code), product,
        category: Array.isArray(raw.categories_tags) ? raw.categories_tags.filter(v => typeof v === 'string').join(',').slice(0, 4000) : '', quantity: clean(raw.quantity, 100), original,
        ingredientHash: hash(original), identityHash: hash(JSON.stringify([product.productName, product.brand, clean(raw.quantity, 100)])),
        sourceVersion: clean(String(raw.rev || raw.last_modified_t || ''), 100), sourceId: hash(batch.url + batch.sha256), retailer: batch.retailer,
        status: 'INCOMPLETE', reason: 'Required identity or ingredient evidence missing', retrievedAt: batch.retrievedAt,
        sourceUpdatedAt: typeof raw.last_modified_t === 'number' ? raw.last_modified_t : 0, verifiedAt: null };
    if (!product.productName || !product.brand || !original || !c.quantity || !c.category) return c;
    c.status = 'REVIEW_REQUIRED'; c.reason = 'Community label has not been corroborated against exact packaging';
    if (raw.obsolete === true || raw.obsolete === 'on' || product.ingredientEvidence?.state === 'conflicting') { c.status = 'REJECTED'; c.reason = 'Obsolete or conflicting source'; return c; }
    // Full source text is retained. Truncation, HTML/OCR artefacts and warnings cannot be promoted.
    const errors = [...(Array.isArray(raw.data_quality_errors_tags) ? raw.data_quality_errors_tags : []), ...(Array.isArray(raw.data_quality_warnings_tags) ? raw.data_quality_warnings_tags : [])];
    if (product.ingredientEvidence?.state !== 'complete' || /<[^>]+>|&(?:[a-z]+|#\d+);|\uFFFD|[|]{2}|\.{3}|\u2026/.test(original) || errors.some(v => typeof v === 'string' && /ingredients/.test(v) && !/environmental/.test(v)) || original.length < 3) { c.reason = 'Ingredient completeness or quality needs review'; return c; }
    if (reviewValid(review, c, now)) { c.status = 'VERIFIED'; c.reason = 'Exact packaging and complete original label reviewed'; c.verifiedAt = review!.reviewedAt; }
    return c;
}

export interface Assessment { classification: string; explanation: string; findings: unknown[] }
export function importCatalogue(db: DatabaseSync, batches: SourceBatch[], reviews: Review[], policyVersion: string, analyze: (text: string, complete: boolean) => Assessment, now = Date.now(), recordedAt = now) {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS product_sources(source_id TEXT PRIMARY KEY,source_name TEXT NOT NULL,source_url TEXT NOT NULL,licence TEXT NOT NULL,attribution TEXT NOT NULL,retrieved_at TEXT NOT NULL,source_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS products(identity TEXT PRIMARY KEY,barcode TEXT UNIQUE NOT NULL,product_name TEXT NOT NULL,brand TEXT NOT NULL,category TEXT NOT NULL,quantity TEXT NOT NULL,ingredients_original TEXT NOT NULL,ingredient_language TEXT,ingredients_complete INTEGER NOT NULL,verification_status TEXT NOT NULL CHECK(verification_status IN ('VERIFIED','REVIEW_REQUIRED','INCOMPLETE','REJECTED')),reason TEXT NOT NULL,ingredient_hash TEXT NOT NULL,identity_hash TEXT NOT NULL,source_version TEXT NOT NULL,source_id TEXT NOT NULL REFERENCES product_sources(source_id),source_updated_at INTEGER NOT NULL,verified_at TEXT,product_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS product_retailers(identity TEXT NOT NULL REFERENCES products(identity) ON DELETE CASCADE,retailer_id TEXT NOT NULL,PRIMARY KEY(identity,retailer_id));
      CREATE TABLE IF NOT EXISTS product_assessments(identity TEXT PRIMARY KEY REFERENCES products(identity) ON DELETE CASCADE,policy_version TEXT NOT NULL,ingredient_hash TEXT NOT NULL,classification TEXT NOT NULL,reason TEXT NOT NULL,ingredient_findings TEXT NOT NULL,assessed_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS import_runs(run_id TEXT PRIMARY KEY,imported_at TEXT NOT NULL,summary TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS products_status_idx ON products(verification_status);
      CREATE INDEX IF NOT EXISTS retailer_lookup_idx ON product_retailers(retailer_id,identity);`);
    const summary = { discovered: 0, invalidOrOutOfScope: 0, duplicates: 0, conflicts: 0, changed: 0, imported: 0, verified: 0, reviewRequired: 0, incomplete: 0, rejected: 0, images: 0, halal: 0, haram: 0, needsChecking: 0 };
    const grouped = new Map<string, Candidate[]>();
    const reviewMap = new Map(reviews.map(r => [r.barcode, r]));
    if (reviewMap.size !== reviews.length || !/^\d{4}\.\d{2}\.\d{2}$/.test(policyVersion)) throw Error('Duplicate reviews or invalid policy version');
    for (const batch of batches) { validateBatch(batch, now); for (const raw of batch.body.products) {
        summary.discovered++;
        const c = candidate(raw, batch, reviewMap.get(String(raw.code)), now);
        if (!c) { summary.invalidOrOutOfScope++; continue; }
        const group = grouped.get(c.identity) || []; group.push(c); grouped.set(c.identity, group);
    } }
    db.exec('BEGIN IMMEDIATE');
    try {
        for (const batch of batches) db.prepare('INSERT OR IGNORE INTO product_sources VALUES(?,?,?,?,?,?,?)').run(hash(batch.url + batch.sha256), 'Open Food Facts contributors', batch.url, batch.licence, 'Open Food Facts contributors — ODbL 1.0; contents DbCL 1.0; photos CC BY-SA 3.0', batch.retrievedAt, batch.sha256);
        for (const group of grouped.values()) {
            summary.duplicates += group.length - 1;
            group.sort((a, b) => b.sourceUpdatedAt - a.sourceUpdatedAt || b.sourceVersion.localeCompare(a.sourceVersion));
            const c = group[0];
            const conflict = group.some(v => v.identityHash !== c.identityHash || v.ingredientHash !== c.ingredientHash);
            if (conflict) { c.status = 'REJECTED'; c.verifiedAt = null; c.reason = 'Contradictory barcode records: no formulation merged'; summary.conflicts++; }
            const old = db.prepare('SELECT ingredient_hash,identity_hash,source_updated_at,verification_status FROM products WHERE identity=?').get(c.identity);
            if (old && Number(old.source_updated_at) > c.sourceUpdatedAt) continue; // Do not overwrite newer evidence.
            if (old && (old.ingredient_hash !== c.ingredientHash || old.identity_hash !== c.identityHash)) summary.changed++;
            if (old?.verification_status === 'VERIFIED' && c.status === 'REVIEW_REQUIRED' && c.reason === 'Community label has not been corroborated against exact packaging' && old.ingredient_hash === c.ingredientHash && old.identity_hash === c.identityHash) continue; // Retain stronger evidence without renewing its age.
            const verified = c.status === 'VERIFIED';
            const assessment = analyze(verified ? c.original : '', verified);
            const retailers = db.prepare('SELECT retailer_id FROM product_retailers WHERE identity=?').all(c.identity).map(v => String(v.retailer_id));
            db.prepare('INSERT OR REPLACE INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(c.identity, c.barcode, c.product.productName, c.product.brand, c.category, c.quantity, c.original, c.product.ingredientEvidence?.language || null, Number(verified), c.status, c.reason, c.ingredientHash, c.identityHash, c.sourceVersion, c.sourceId, c.sourceUpdatedAt, c.verifiedAt, JSON.stringify(c.product));
            for (const retailer of new Set(group.map(v => v.retailer))) db.prepare('INSERT OR IGNORE INTO product_retailers VALUES(?,?)').run(c.identity, retailer);
            for (const retailer of retailers) db.prepare('INSERT OR IGNORE INTO product_retailers VALUES(?,?)').run(c.identity, retailer);
            db.prepare('INSERT OR REPLACE INTO product_assessments VALUES(?,?,?,?,?,?,?)').run(c.identity, policyVersion, c.ingredientHash, assessment.classification, assessment.explanation, JSON.stringify(assessment.findings), new Date(recordedAt).toISOString());
        }
        // Reassess all retained records, including ones protected against a downgrade.
        for (const row of db.prepare('SELECT * FROM products').all()) {
            const complete = row.verification_status === 'VERIFIED' && !!row.verified_at && now - Date.parse(String(row.verified_at)) < FRESH_DAYS * 86400000;
            const a = analyze(complete ? String(row.ingredients_original) : '', complete);
            db.prepare('INSERT OR REPLACE INTO product_assessments VALUES(?,?,?,?,?,?,?)').run(row.identity, policyVersion, row.ingredient_hash, a.classification, a.explanation, JSON.stringify(a.findings), new Date(recordedAt).toISOString());
        }
        for (const [key, value] of Object.entries({ schema: String(CATALOGUE_SCHEMA), policyVersion, builtAt: new Date(recordedAt).toISOString() })) db.prepare('INSERT OR REPLACE INTO metadata VALUES(?,?)').run(key, value);
        const rows = db.prepare('SELECT verification_status,product_json FROM products').all();
        summary.imported = rows.length;
        for (const row of rows) {
            const key = ({ VERIFIED: 'verified', REVIEW_REQUIRED: 'reviewRequired', INCOMPLETE: 'incomplete', REJECTED: 'rejected' } as const)[row.verification_status as VerificationState]; summary[key]++;
            if (JSON.parse(String(row.product_json)).imageUrl) summary.images++;
        }
        for (const row of db.prepare('SELECT classification FROM product_assessments').all()) summary[row.classification === 'likely-halal' ? 'halal' : row.classification === 'not-halal' ? 'haram' : 'needsChecking']++;
        const runId = hash(JSON.stringify(batches.map(b => b.sha256).sort()) + JSON.stringify(reviews) + policyVersion);
        db.prepare('INSERT OR IGNORE INTO import_runs VALUES(?,?,?)').run(runId, new Date(recordedAt).toISOString(), JSON.stringify(summary));
        db.exec('COMMIT');
        return summary;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function createCatalogueLookup(path = resolve('data/italy/catalogue.sqlite'), now = Date.now) {
    let db: DatabaseSync | undefined;
    return (barcode: string): Product | null => {
        if (!isRetailBarcode(barcode)) return null;
        db ||= new DatabaseSync(path, { readOnly: true });
        const row = db.prepare('SELECT * FROM products WHERE identity=?').get(barcodeIdentity(barcode));
        if (!row) return null;
        const product = JSON.parse(String(row.product_json)) as Product;
        const stale = !row.verified_at || now() - Date.parse(String(row.verified_at)) >= FRESH_DAYS * 86400000;
        const verified = row.verification_status === 'VERIFIED' && !stale;
        const status = row.verification_status as VerificationState;
        return { ...product, scannedBarcode: barcode, lastUpdated: new Date(now()).toISOString(), certification: 'not-verified',
            ingredientsRaw: verified ? product.ingredientsRaw : '', ingredients: verified ? product.ingredients : [],
            ingredientEvidence: verified ? product.ingredientEvidence : { state: status === 'REJECTED' ? 'conflicting' : 'missing', kind: 'none', language: product.ingredientEvidence?.language || null },
            catalogue: { status, stale: row.verification_status === 'VERIFIED' && stale, ingredientHash: String(row.ingredient_hash), policyVersion: String(db.prepare("SELECT value FROM metadata WHERE key='policyVersion'").get()?.value || '') } };
    };
}
