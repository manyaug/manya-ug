/**
 * MANYA ASSET URL SYSTEM - v2.3 (GitHub + jsDelivr CDN - Production Ready)
 * =====================================================================
 * Central registry for all remotely-hosted heavy assets.
 */

import { CDN_BASE } from './constants';

const BASE_CDN_URL = CDN_BASE;

/**
 * Maps subject keys to GitHub folder names (matching repo casing)
 */
const SUBJECT_MAP = {
  'english': 'English',
  'math': 'Math',
  'science': 'science',
  'sst': 'sst'
};

/**
 * Builds a full jsDelivr CDN URL for a given path.
 * Smartly prefixes paths with 'assets/' based on the subject and file type.
 */
export function assetUrl(path) {
  if (!path) return '';

  // 1. Clean the path
  let clean = path.trim().replace(/^\/+/, '');

  // 2. Flip extensions for webp consistency
  if (clean.match(/\.(png|jpg|jpeg)$/i)) {
    clean = clean.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  }

  // 3. Smart Prefixing Logic
  // - images/, data/, shared/, and content/ are at the ROOT of the repo.
  // - english/, math/, science/, and sst/ folder binaries are under /assets/.
  const subjects = ['english', 'math', 'science', 'sst', 'shared'];
  const rootFolders = ['images', 'data', 'content', 'assets', 'audios'];

  const firstSeg = clean.split('/')[0].toLowerCase();

  // If it's a subject or shared, and does not have assets/ prefix, add it.
  if (subjects.includes(firstSeg) && !clean.startsWith('assets/')) {
    clean = `assets/${clean}`;
  }

  // 4. Normalize Binary Paths (audio vs audios)
  // NOTE: The repo uses 'audios/' at root — do NOT rewrite to 'audio/'

  return `${BASE_CDN_URL}${clean}`;
}

/**
 * INTERCEPTOR: Differentiates between Curriculum Logic (content/) 
 * and Binary Assets (assets/).
 */
export function resolveRemoteUrl(url, contextUrl = null) {
  if (!url) return '';
  
  const originalUrl = url;

  // 1. Pre-clean & SANITIZE (Emergency Failsafe for Database-Hardcoded URLs)
  let clean = url.trim().replace(/^\/+/, '');

  // Normalize any absolute jsDelivr or GitHub Raw links into a relative path
  // so they can be re-resolved against our current frozen version.
  if (clean.includes('cdn.jsdelivr.net/') || clean.includes('raw.githubusercontent.com/')) {
    clean = clean.replace(/^https?:\/\//, '');
    clean = clean.replace(/^cdn\.jsdelivr\.net\/gh\/manyaug\/manya-react-assets(@[^/]+)?\//, '');
    clean = clean.replace(/^raw\.githubusercontent\.com\/manyaug\/manya-react-assets\/[^/]+\//, '');
  }

  // Early return for full external URLs (only if they aren't legacy links we just cleaned)
  if (clean.startsWith('http') && !clean.includes('supabase.co')) return clean;

  // 2. Registry Lookup (Try to resolve pre-defined keys first)
  if (GLB[clean]) return GLB[clean];
  if (AUDIO[clean]) return AUDIO[clean];
  if (SFX[clean]) return SFX[clean];

  // 3. Handle Subject Context Relative Paths (../../)
  // CRITICAL: Binaries (glb, mp3) should almost always resolve to /assets/ root, not relative to content/
  const isBinary = clean.match(/\.(glb|mp3|wav|ogg)$/i);

  if (!isBinary && contextUrl && (clean.startsWith('.') || !clean.includes('/'))) {
    const resolved = joinUrls(contextUrl, clean);
    return resolved;
  }

  // 3. Handle Legacy Supabase URLs by extracting the filename
  if (clean.includes('supabase.co')) {
    const match = clean.match(/public\/assets\/(.+)$/);
    const fallbackMatch = clean.match(/manya-assets\/(.+)$/);
    let relativePath = match ? match[1] : (fallbackMatch ? fallbackMatch[1] : '');
    
    // Safety: if the extracted path already has 'assets/', strip it before calling assetUrl
    // since assetUrl will re-add it or manage it.
    if (relativePath.startsWith('assets/')) {
        relativePath = relativePath.replace(/^assets\//, '');
    }
    
    if (relativePath) return assetUrl(relativePath);
  }

  // 4. Case-Specific science/ fix: If it matches a known GLB and is just a filename
  // this catches cases where the JSON just says "spine.glb"
  if (isBinary && !clean.includes('/')) {
    // Find which quest it might belong to? 
    // Actually, assetUrl will handle prefixing science/ -> assets/science/
    // but we need the subfolder. For now, we prefer full paths in JSON.
  }

  // 5. Default Resolution
  const resolved = assetUrl(clean);
  console.debug(`[AssetResolver] ${originalUrl} -> ${resolved}`);
  return resolved;
}

/**
 * Robustly joins a base URL and a relative path, handling "../" correctly.
 */
function joinUrls(base, relative) {
  try {
    // If base is a full URL, use the browser's URL constructor for smart joining
    if (base.startsWith('http')) {
      return new URL(relative, base).href;
    }
    // Fallback for local-ish paths
    const baseParts = base.split('/').filter(p => p && !p.endsWith('.json'));
    const relParts = relative.split('/');

    for (const part of relParts) {
      if (part === '..') baseParts.pop();
      else if (part !== '.') baseParts.push(part);
    }
    return (base.startsWith('/') ? '/' : '') + baseParts.join('/');
  } catch (e) {
    return relative;
  }
}

/**
 * Resolves a UI image URL with the industry-standard _compressed naming.
 * e.g., 'math_island' -> 'math_island_compressed.webp'
 */
function uiImage(name, ext = 'webp') {
  if (!name) return '';
  let clean = name.replace(new RegExp(`\\.${ext}$`), '');
  if (!clean.endsWith('_compressed')) {
    clean = `${clean}_compressed`;
  }
  return assetUrl(`images/${clean}.${ext}`);
}

// ---------------------------------------------------------------------------
// 🎵 AMBIENT AUDIO
// ---------------------------------------------------------------------------
export const AUDIO = {
  day: assetUrl('audios/day.mp3'),
  night: assetUrl('audios/night.mp3'),
  rain: assetUrl('audios/rain.mp3'),
  shine: assetUrl('audios/shine.mp3'),
}



export const SFX = {
  correct:  assetUrl('audios/collect-points.mp3'),  // ✅ exists
  mistake:  assetUrl('audios/error-mistake.mp3'),    // ✅ exists
  wrong:    assetUrl('audios/error-mistake.mp3'),    // alias
  applause: assetUrl('audios/applause.mp3'),          // ✅ exists
  click:    assetUrl('audios/ui-click.mp3'),          // ✅ exists
  tap:      assetUrl('audios/ui-click.mp3'),          // ✅ exists (tap→ui-click)
  whoosh:   assetUrl('audios/whoosh.mp3'),            // ✅ exists
  pop:      assetUrl('audios/twin-sparkle.mp3'),      // ✅ exists (pop→twin-sparkle)
  victory:  assetUrl('audios/fanfare-trumpets.mp3'),  // ✅ exists
  bonus:    assetUrl('audios/game-bonus.mp3'),        // ✅ exists
  levelup:  assetUrl('audios/level-up.mp3'),          // ✅ exists
  drumroll: assetUrl('audios/drum-roll.mp3'),         // ✅ exists
}

// ---------------------------------------------------------------------------
// 🦴 3D MODELS
// ---------------------------------------------------------------------------
const GLB_BASE = 'science/musklo-skeletal-system'

export const GLB = {
  male_skeleton: assetUrl(`${GLB_BASE}/quest_2_human_skeleton/male_skeleton_compressed.glb`),
  female_skeleton: assetUrl(`${GLB_BASE}/quest_2_human_skeleton/female_skeleton_compressed.glb`),
  skull: assetUrl(`${GLB_BASE}/quest_3_axial_skull_spine/manya-skull_compressed.glb`),
  spine: assetUrl(`${GLB_BASE}/quest_3_axial_skull_spine/spine_compressed.glb`),
  spinal_column: assetUrl(`${GLB_BASE}/quest_3_axial_skull_spine/the_human_spinal_column_compressed.glb`),
  rib_cage: assetUrl(`${GLB_BASE}/quest_4_axial_rib_cage/rib-cage-heart_compressed.glb`),
  thoracic: assetUrl(`${GLB_BASE}/quest_4_axial_rib_cage/thoracic_compressed.glb`),
  lower_limb: assetUrl(`${GLB_BASE}/quest_5_appendicular_limbs/Lower_limb_compressed.glb`),
  skeleton_arm: assetUrl(`${GLB_BASE}/quest_5_appendicular_limbs/skeleton_arm.glb`),
  bone_structure: assetUrl(`${GLB_BASE}/quest_6_bone_structure/bone_structure_compressed.glb`),
  joint_structure: assetUrl(`${GLB_BASE}/quest_7_joints_structure/joint_structure_compressed.glb`),
  elbow_joint: assetUrl(`${GLB_BASE}/quest_8_hinge_ball-and-socket/elbow_joint_compressed.glb`),
  hip_joint: assetUrl(`${GLB_BASE}/quest_8_hinge_ball-and-socket/hip_joint_compressed.glb`),
  ankle: assetUrl(`${GLB_BASE}/quest_9_pivot_and_gliding/ankle_compressed.glb`),
  pivot_neck: assetUrl(`${GLB_BASE}/quest_9_pivot_and_gliding/pivot_joint_neck_compressed.glb`),
  wrist: assetUrl(`${GLB_BASE}/quest_9_pivot_and_gliding/wrist.glb`),
  upper_limb_muscles: assetUrl(`${GLB_BASE}/quest_11_muscle_action_antagonistic_pairs/upper-limb-arm-muscles_compressed.glb`),
  human_teeth: assetUrl(`${GLB_BASE}/quest_12_posture_and_teeth/human_teeth_compressed.glb`),
  inside_tooth: assetUrl(`${GLB_BASE}/quest_12_posture_and_teeth/inside_my_tooth_compressed.glb`),
}

// ---------------------------------------------------------------------------
// 🖼️ UI IMAGES
// ---------------------------------------------------------------------------
export const IMAGES = {
  math_gem: assetUrl('images/gems/math_gem.svg'),
  science_gem: assetUrl('images/gems/science_svg.svg'),
  sst_gem: assetUrl('images/gems/sst_gem.svg'),
  english_gem: assetUrl('images/gems/english_gem.svg'),
  master_gem: assetUrl('images/gems/master_gem.svg'),
  coin_gem: assetUrl('images/gems/coin.svg'),
  manya_icon: uiImage('manya_icon'),
  polly_icon: uiImage('polly_icon'),
  kiki_icon: uiImage('kiki_icon'),
  splash: uiImage('splash'),
  kiki_full: uiImage('kiki'),
  polly_full: uiImage('polly'),
  math_island: uiImage('math_island'),
  science_island: uiImage('science_island'),
  sst_island: uiImage('sst_island'),
  english_island: uiImage('english_island'),
  avatars: {
    Manya: uiImage('manya_icon'),
    Polly: uiImage('polly_icon'),
    Kiki: uiImage('kiki_icon'),
  }
}

/**
 * Resolves path tiles (the world map road).
 * NOTE: English uses raw names (way-1.webp), others use _compressed (way-1_compressed.webp).
 */
export function getPathImage(subject, fileName) {
  const sub = subject?.toLowerCase().replace('_path', ''); // handle safe subject key
  const folder = `${sub}_path`;

  let finalFile = fileName.replace(/\.[^/.]+$/, ""); // strip ext

  // Apply _compressed suffix only if NOT english (per repo structure)
  if (sub !== 'english' && !finalFile.endsWith('_compressed')) {
    finalFile = `${finalFile}_compressed`;
  }

  return assetUrl(`images/${folder}/${finalFile}.webp`);
}

export function getIsland(subject) {
  const sub = subject.toLowerCase();
  if (sub === 'math' || sub === 'mathematics') return IMAGES.math_island;
  if (sub === 'science') return IMAGES.science_island;
  if (sub === 'sst') return IMAGES.sst_island;
  if (sub === 'english') return IMAGES.english_island;
  return IMAGES.manya_icon;
}

export function getGem(fileName) {
  if (!fileName) return "";
  const file = fileName.toLowerCase().replace(/\s+/g, '_'); // Fix space bug (manya council -> manya_council)
  if (file.includes('math')) return IMAGES.math_gem;
  if (file.includes('science')) return IMAGES.science_gem;
  if (file.includes('sst')) return IMAGES.sst_gem;
  if (file.includes('english')) return IMAGES.english_gem;
  if (file.includes('master')) return IMAGES.master_gem;
  return assetUrl(`images/gems/${file}`);
}

export function getGlb(key) {
  return GLB[key] || resolveRemoteUrl(key);
}

export function getSfx(name) {
  const filePart = name.endsWith('.mp3') ? name : name + '.mp3';
  return SFX[name] ?? assetUrl('audios/' + filePart);
}
