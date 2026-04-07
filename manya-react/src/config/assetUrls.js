/**
 * MANYA ASSET URL SYSTEM - v2.3 (GitHub + jsDelivr CDN - Production Ready)
 * =====================================================================
 * Central registry for all remotely-hosted heavy assets.
 */

const BASE_CDN_URL = 'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@main/'

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
 * Automatically flips .png/.jpg to .webp for consistency with migrated assets.
 */
export function assetUrl(path) {
  if (!path) return '';
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Flip extension to webp for common image types (except SVGs/models)
  if (cleanPath.match(/\.(png|jpg|jpeg)$/i)) {
    cleanPath = cleanPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  }
  
  return `${BASE_CDN_URL}${cleanPath}`;
}

/**
 * INTERCEPTOR: Detects and rewrites legacy Supabase URLs to the new CDN.
 */
export function resolveRemoteUrl(url) {
  if (!url) return '';
  
  // 1. If it's a legacy Supabase URL, strip it down to the relative path
  if (url.includes('supabase.co')) {
    // Extract path after "public/assets/" or "manya-assets/"
    const match = url.match(/public\/assets\/(.+)$/);
    const fallbackMatch = url.match(/manya-assets\/(.+)$/);
    
    let relativePath = match ? match[1] : (fallbackMatch ? fallbackMatch[1] : '');
    
    if (relativePath) {
        // Special case: scientific models need the _compressed suffix
        if (relativePath.endsWith('.glb') && !relativePath.includes('_compressed')) {
            relativePath = relativePath.replace(/\.glb$/, '_compressed.glb');
        }
        return assetUrl(relativePath);
    }
  }

  // 2. Clear handling for "assets/" prefixed paths (common in quest JSONs)
  if (url.startsWith('assets/')) {
    return assetUrl(url.replace(/^assets\//, ''));
  }

  // 3. If it's already a clean local-style path or filename
  return url;
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
  day:   assetUrl('shared/audios/day.mp3'),
  night: assetUrl('shared/audios/night.mp3'),
  rain:  assetUrl('shared/audios/rain.mp3'),
  shine: assetUrl('shared/audios/shine.mp3'),
}

export const SFX = {
  correct:         assetUrl('shared/audios/collect-points.mp3'),
  wrong:           assetUrl('shared/audios/error-mistake.mp3'),
  applause:        assetUrl('shared/audios/applause.mp3'),
  click:           assetUrl('shared/audios/ui-click.mp3'),
  whoosh:          assetUrl('shared/audios/whoosh.mp3'),
}

// ---------------------------------------------------------------------------
// 🦴 3D MODELS
// ---------------------------------------------------------------------------
const GLB_BASE = 'science/musklo-skeletal-system'

function resolveCompressedGlb(path) {
  if (!path) return '';
  let clean = path.replace(/\.glb$/, '');
  if (!clean.endsWith('_compressed')) {
    clean = `${clean}_compressed`;
  }
  return assetUrl(`${clean}.glb`);
}

export const GLB = {
  male_skeleton:    resolveCompressedGlb(`${GLB_BASE}/quest_2_human_skeleton/male_skeleton`),
  female_skeleton:  resolveCompressedGlb(`${GLB_BASE}/quest_2_human_skeleton/female_skeleton`),
  skull:            resolveCompressedGlb(`${GLB_BASE}/quest_3_axial_skull_spine/manya-skull`),
  spine:            resolveCompressedGlb(`${GLB_BASE}/quest_3_axial_skull_spine/spine`),
  spinal_column:    resolveCompressedGlb(`${GLB_BASE}/quest_3_axial_skull_spine/the_human_spinal_column`),
  rib_cage:         resolveCompressedGlb(`${GLB_BASE}/quest_4_axial_rib_cage/rib-cage-heart`),
  thoracic:         resolveCompressedGlb(`${GLB_BASE}/quest_4_axial_rib_cage/thoracic__abdominal_skeleton_based_on_ct_data`),
  lower_limb:       resolveCompressedGlb(`${GLB_BASE}/quest_5_appendicular_limbs/Lower_limb`),
  skeleton_arm:     resolveCompressedGlb(`${GLB_BASE}/quest_5_appendicular_limbs/skeleton_arm`),
  bone_structure:   resolveCompressedGlb(`${GLB_BASE}/quest_6_bone_structure/bone_structure`),
  joint_structure:  resolveCompressedGlb(`${GLB_BASE}/quest_7_joints_structure/joint_structure`),
  elbow_joint:      resolveCompressedGlb(`${GLB_BASE}/quest_8_hinge_ball-and-socket/elbow_joint`),
  hip_joint:        resolveCompressedGlb(`${GLB_BASE}/quest_8_hinge_ball-and-socket/hip_joint`),
  ankle:            resolveCompressedGlb(`${GLB_BASE}/quest_9_pivot_and_gliding/ankle`),
  pivot_neck:       resolveCompressedGlb(`${GLB_BASE}/quest_9_pivot_and_gliding/pivot_joint_neck`),
  wrist:            resolveCompressedGlb(`${GLB_BASE}/quest_9_pivot_and_gliding/wrist`),
  upper_limb_muscles: resolveCompressedGlb(`${GLB_BASE}/quest_11_muscle_action_antagonistic_pairs/upper-limb-arm-muscles`),
  human_teeth:      resolveCompressedGlb(`${GLB_BASE}/quest_12_posture_and_teeth/human_teeth`),
  inside_tooth:     resolveCompressedGlb(`${GLB_BASE}/quest_12_posture_and_teeth/inside_my_tooth`),
}

// ---------------------------------------------------------------------------
// 🖼️ UI IMAGES
// ---------------------------------------------------------------------------
export const IMAGES = {
  math_gem:    assetUrl('images/gems/math_gem.svg'),
  science_gem: assetUrl('images/gems/science_svg.svg'),
  sst_gem:     assetUrl('images/gems/sst_gem.svg'),
  english_gem: assetUrl('images/gems/english_gem.svg'),
  master_gem:  assetUrl('images/gems/master_gem.svg'),
  manya_icon:  uiImage('manya_icon'),
  polly_icon:  uiImage('polly_icon'),
  kiki_icon:   uiImage('kiki_icon'),
  splash:      uiImage('splash'),
  kiki_full:   uiImage('kiki'),
  polly_full:  uiImage('polly'),
  math_island:    uiImage('math_island'),
  science_island: uiImage('science_island'),
  sst_island:     uiImage('sst_island'),
  english_island: uiImage('english_island'),
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
  const file = fileName.toLowerCase();
  if (file.includes('math')) return IMAGES.math_gem;
  if (file.includes('science')) return IMAGES.science_gem;
  if (file.includes('sst')) return IMAGES.sst_gem;
  if (file.includes('english')) return IMAGES.english_gem;
  if (file.includes('master')) return IMAGES.master_gem;
  return assetUrl(`images/gems/${fileName}`);
}

export function getGlb(key) {
  return GLB[key] || resolveRemoteUrl(key);
}

export function getSfx(name) {
  return SFX[name] ?? assetUrl('shared/audios/' + (name.endsWith('.mp3') ? name : name + '.mp3'));
}
