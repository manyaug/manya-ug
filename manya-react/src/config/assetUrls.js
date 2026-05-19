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
  'english': 'english',
  'math': 'math',
  'science': 'science',
  'sst': 'sst'
};

/**
 * Builds a full jsDelivr CDN URL for a given path.
 * Smartly prefixes paths with 'assets/' based on the subject and file type.
 */
export function assetUrl(path) {
  if (!path) return '';

  // 1. Clean and normalize the path (Preserve casing for case-sensitive CDNs!)
  let clean = path.trim().replace(/^\/+/, '');

  // 1.1 Local Bypass for Chests (Premium)
  if (clean.toLowerCase().startsWith('chests/')) {
    return `/images/${clean.replace(/\.png$/i, '_compressed.png')}`;
  }

  // 2. Flip extensions for webp consistency (Skip SVGs)
  if (clean.match(/\.(png|jpg|jpeg)$/i) && !clean.includes('.svg')) {
    clean = clean.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  }

  // 3. Smart Prefixing Logic
  const subjects = ['english', 'math', 'science', 'sst', 'shared'];

  const firstSeg = clean.split('/')[0].toLowerCase();

  // If it's a subject or shared, and does not have assets/ prefix, add it.
  if (subjects.includes(firstSeg) && !clean.toLowerCase().startsWith('assets/')) {
    clean = `assets/${clean}`;
  }

  // 5. Final Encoding
  const encoded = clean.split('/').map(seg => encodeURIComponent(seg)).join('/');

  return `${BASE_CDN_URL}${encoded}`;
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
  if (clean.includes('cdn.jsdelivr.net/') || clean.includes('raw.githubusercontent.com/')) {
    clean = clean.replace(/^https?:\/\//, '');
    clean = clean.replace(/^cdn\.jsdelivr\.net\/gh\/manyaug\/manya-react-assets(@[^/]+)?\//, '');
    clean = clean.replace(/^raw\.githubusercontent\.com\/manyaug\/manya-react-assets\/[^/]+\//, '');
  }

  // Early return for full external URLs
  if (clean.startsWith('http') && !clean.includes('supabase.co')) return clean;

  // 2. Registry Lookup
  if (GLB[clean]) return GLB[clean];
  if (AUDIO[clean]) return AUDIO[clean];
  if (SFX[clean]) return SFX[clean];

  // 3. Handle Subject Context Relative Paths
  const isBinary = clean.match(/\.(glb|mp3|wav|ogg)$/i);

  if (!isBinary && contextUrl && (clean.startsWith('.') || !clean.includes('/'))) {
    const resolved = joinUrls(contextUrl, clean);
    return resolved;
  }

  // 3. Handle Legacy Supabase URLs
  if (clean.includes('supabase.co')) {
    const match = clean.match(/public\/assets\/(.+)$/);
    const fallbackMatch = clean.match(/manya-assets\/(.+)$/);
    let relativePath = match ? match[1] : (fallbackMatch ? fallbackMatch[1] : '');

    if (relativePath.startsWith('assets/')) {
      relativePath = relativePath.replace(/^assets\//, '');
    }

    if (relativePath) return assetUrl(relativePath);
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
    if (base.startsWith('http')) {
      return new URL(relative, base).href;
    }
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
 * UI Image Helper - Points to CDN images/
 */
export const uiImage = (name) => {
  if (!name) return "";
  if (name.startsWith('http')) return name;

  // v9.9: Support compressed suffix for icons and islands
  let fileName = name;
  const needsCompression = name.includes('_island') || name.includes('_icon');
  if (needsCompression && !name.endsWith('_compressed')) {
    fileName = `${name}_compressed`;
  }

  return assetUrl(`images/${fileName}.png`);
};

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
  correct: assetUrl('audios/collect-points.mp3'),
  mistake: assetUrl('audios/error-mistake.mp3'),
  wrong: assetUrl('audios/error-mistake2.mp3'),
  applause: assetUrl('audios/fanfare-trumpets.mp3'),
  click: assetUrl('audios/ui-click.mp3'),
  tap: assetUrl('audios/ui-click.mp3'),
  whoosh: assetUrl('audios/whoosh.mp3'),
  pop: assetUrl('audios/twin-sparkle.mp3'),
  victory: assetUrl('audios/fanfare-trumpets.mp3'),
  bonus: assetUrl('audios/game-bonus.mp3'),
  levelup: assetUrl('audios/level-up.mp3'),
  drumroll: assetUrl('audios/drum-roll.mp3'),
  tick: assetUrl('audios/tick.mp3'),
  rumble: assetUrl('audios/challenge_complete/bass_drop.mp3'),
  magic_positive: assetUrl('audios/magic-positive.mp3'),
  riser: assetUrl('audios/challenge_complete/riser.mp3'),
  riser2: assetUrl('audios/challenge_complete/riser2.mp3'),
  bass_drop: assetUrl('audios/challenge_complete/bass_drop.mp3'),
  challenge_win: assetUrl('audios/challenge_complete/complete.mp3'),
  challenge_woosh: assetUrl('audios/challenge_complete/whoosh.mp3'),
  challenge_click: assetUrl('audios/challenge_complete/click.mp3'),
  'coin-drop': assetUrl('audios/dropping-coin.mp3'),
  'coin_drop': assetUrl('audios/dropping-coin.mp3'),
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
  rib_cage: assetUrl(`${GLB_BASE}/quest_4_ax
    
    ial_rib_cage/rib-cage-heart_compressed.glb`),
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
  zany_icon: uiImage('zany_icon'),
  splash: uiImage('splash'),
  kiki_full: uiImage('kiki'),
  polly_full: uiImage('polly'),
  zany_full: uiImage('zany'),
  math_island: uiImage('math_island'),
  science_island: uiImage('science_island'),
  sst_island: uiImage('sst_island'),
  english_island: uiImage('english_island'),
  avatars: {
    Manya: uiImage('manya_icon'),
    Polly: uiImage('polly_icon'),
    Kiki: uiImage('kiki_icon'),
    Zanny: uiImage('zany_icon'),
  }
}

export function getPathImage(subject, fileName) {
  const sub = subject?.toLowerCase().replace('_path', '');
  const folder = `${sub}_path`;
  let finalFile = fileName.replace(/\.[^/.]+$/, "");
  if (sub !== 'english' && !finalFile.endsWith('_compressed')) {
    finalFile = `${finalFile}_compressed`;
  }
  return assetUrl(`images/${folder}/${finalFile}.webp`);
}

export function getIsland(subject) {
  const sub = subject.toLowerCase();
  if (sub === 'math' || sub === 'mathematics') return IMAGES.math_island;
  if (sub === 'science' || sub === 'sci') return IMAGES.science_island;
  if (sub === 'sst' || sub === 'social') return IMAGES.sst_island;
  if (sub === 'english' || sub === 'eng') return IMAGES.english_island;
  return IMAGES.manya_icon;
}

export function getGem(fileName) {
  if (!fileName) return IMAGES.master_gem;
  const file = fileName.toLowerCase().replace(/\s+/g, '_');
  if (file.includes('math')) return IMAGES.math_gem;
  if (file.includes('science') || file.includes('sci')) return IMAGES.science_gem;
  if (file.includes('sst') || file.includes('social')) return IMAGES.sst_gem;
  if (file.includes('english') || file.includes('eng')) return IMAGES.english_gem;
  if (file.includes('coin') || file.includes('gems')) return IMAGES.coin_gem;
  return IMAGES.master_gem;
}

export function getGlb(key) {
  return GLB[key] || resolveRemoteUrl(key);
}

export function getSfx(name) {
  const cleanName = String(name || '');
  const lowerName = cleanName.toLowerCase();
  if (SFX[lowerName]) {
    return SFX[lowerName];
  }
  const filePart = cleanName.endsWith('.mp3') ? cleanName : cleanName + '.mp3';
  return assetUrl('audios/' + filePart);
}
