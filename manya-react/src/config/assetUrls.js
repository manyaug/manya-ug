/**
 * MANYA ASSET URL SYSTEM
 * =====================
 * Central registry for all remotely-hosted heavy assets.
 * Base URL: Supabase Storage (manya-assets bucket, public CDN)
 *
 * HOW TO ADD NEW ASSETS:
 *  1. Upload the file to Supabase Storage under the correct folder.
 *  2. Add the key here under the correct category.
 *  3. Import and use in your component: import { AUDIO } from '@/config/assetUrls'
 *
 * FOLDER STRUCTURE IN SUPABASE STORAGE (manya-assets bucket):
 *   audios/         → Ambient tracks (rain.mp3, night.mp3, etc.)
 *   sfx/            → Short sound effects (correct.mp3, wrong.mp3, etc.)
 *   science/glb/    → 3D .glb model files
 *   images/         → Large images not suitable for repo
 */

const SUPABASE_URL = 'https://pmgdfuhqgwysequaopts.supabase.co'
const BUCKET = 'manya-assets'

/**
 * Builds a full Supabase Storage CDN URL for a given path.
 * The user uploaded mirroring the local public/assets folder.
 */
export function assetUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/public/assets/${path}`
}

// ---------------------------------------------------------------------------
// 🎵 AMBIENT AUDIO — Long looping background tracks
// ---------------------------------------------------------------------------
export const AUDIO = {
  day:   assetUrl('shared/audios/day.mp3'),
  night: assetUrl('shared/audios/night.mp3'),
  rain:  assetUrl('shared/audios/rain.mp3'),
  shine: assetUrl('shared/audios/shine.mp3'),
}

// ---------------------------------------------------------------------------
// 🔊 SOUND EFFECTS — Short one-shot triggers
// ---------------------------------------------------------------------------
export const SFX = {
  correct:         assetUrl('shared/audios/collect-points.mp3'),
  wrong:           assetUrl('shared/audios/error-mistake.mp3'),
  applause:        assetUrl('shared/audios/applause.mp3'),
  click:           assetUrl('shared/audios/ui-click.mp3'),
  whoosh:          assetUrl('shared/audios/whoosh.mp3'),
}

// ---------------------------------------------------------------------------
// 🦴 3D MODELS — Skeletal & Science GLB files
// ---------------------------------------------------------------------------
const GLB_BASE = 'science/musklo-skeletal-system'
export const GLB = {
  // Quest 2: Human Skeleton
  male_skeleton:    assetUrl(`${GLB_BASE}/quest_2_human_skeleton/male_skeleton.glb`),
  female_skeleton:  assetUrl(`${GLB_BASE}/quest_2_human_skeleton/female_skeleton.glb`),

  // Quest 3: Axial — Skull & Spine
  skull:            assetUrl(`${GLB_BASE}/quest_3_axial_skull_spine/manya-skull.glb`),
  spine:            assetUrl(`${GLB_BASE}/quest_3_axial_skull_spine/spine.glb`),
  spinal_column:    assetUrl(`${GLB_BASE}/quest_3_axial_skull_spine/the_human_spinal_column.glb`),

  // Quest 4: Rib Cage
  rib_cage:         assetUrl(`${GLB_BASE}/quest_4_axial_rib_cage/rib-cage-heart.glb`),
  thoracic:         assetUrl(`${GLB_BASE}/quest_4_axial_rib_cage/thoracic__abdominal_skeleton_based_on_ct_data.glb`),

  // Quest 5: Appendicular
  lower_limb:       assetUrl(`${GLB_BASE}/quest_5_appendicular_limbs/Lower_limb.glb`),
  skeleton_arm:     assetUrl(`${GLB_BASE}/quest_5_appendicular_limbs/skeleton_arm.glb`),

  // Quest 6: Bone Structure
  bone_structure:   assetUrl(`${GLB_BASE}/quest_6_bone_structure/bone_structure.glb`),

  // Quest 7: Joints
  joint_structure:  assetUrl(`${GLB_BASE}/quest_7_joints_structure/joint_structure.glb`),

  // Quest 8: Hinge & Ball-Socket
  elbow_joint:      assetUrl(`${GLB_BASE}/quest_8_hinge_ball-and-socket/elbow_joint.glb`),
  hip_joint:        assetUrl(`${GLB_BASE}/quest_8_hinge_ball-and-socket/hip_joint.glb`),

  // Quest 9: Pivot & Gliding
  ankle:            assetUrl(`${GLB_BASE}/quest_9_pivot_and_gliding/ankle.glb`),
  pivot_neck:       assetUrl(`${GLB_BASE}/quest_9_pivot_and_gliding/pivot_joint_neck.glb`),
  wrist:            assetUrl(`${GLB_BASE}/quest_9_pivot_and_gliding/wrist.glb`),

  // Quest 11: Muscle Action
  upper_limb_muscles: assetUrl(`${GLB_BASE}/quest_11_muscle_action_antagonistic_pairs/upper-limb-arm-muscles.glb`),

  // Quest 12: Posture & Teeth
  human_teeth:      assetUrl(`${GLB_BASE}/quest_12_posture_and_teeth/human_teeth.glb`),
  inside_tooth:     assetUrl(`${GLB_BASE}/quest_12_posture_and_teeth/inside_my_tooth.glb`),
}

// ---------------------------------------------------------------------------
// 🖼️ IMAGES — Backgrounds, Gems, and Static Graphics
// ---------------------------------------------------------------------------
export const IMAGES = {
  // Gems (manya-assets/public/assets/images/gems/*.svg)
  math_gem:    assetUrl('images/gems/math_gem.svg'),
  science_gem: assetUrl('images/gems/science_svg.svg'),
  sst_gem:     assetUrl('images/gems/sst_gem.svg'),
  english_gem: assetUrl('images/gems/english_gem.svg'),
  master_gem:  assetUrl('images/gems/master_gem.svg'),

  // UI Icons
  manya_icon:  assetUrl('images/manya_icon.png'),
  polly_icon:  assetUrl('images/polly_icon.png'),
  kiki_icon:   assetUrl('images/kiki_icon.png'),
  
  // Characters & Splash
  splash:      assetUrl('images/splash.png'),
  kiki_full:   assetUrl('images/kiki.png'),
  polly_full:  assetUrl('images/polly.jpeg'),

  // Islands
  math_island:    assetUrl('images/math_island.png'),
  science_island: assetUrl('images/science_island.png'),
  sst_island:     assetUrl('images/sst_island.png'),
  english_island: assetUrl('images/english_island.png'),
}

/**
 * Resolves subject-specific path images (for SpiralView/LevelView)
 */
export function getPathImage(folder, fileName) {
  return assetUrl(`images/${folder}/${fileName}`)
}

export function getIsland(subject) {
  const sub = subject.toLowerCase()
  if (sub === 'math' || sub === 'mathematics') return IMAGES.math_island
  if (sub === 'science') return IMAGES.science_island
  if (sub === 'sst') return IMAGES.sst_island
  if (sub === 'english') return IMAGES.english_island
  return IMAGES.manya_icon
}

export function getGem(fileName) {
  const file = fileName.toLowerCase()
  if (file.includes('math')) return IMAGES.math_gem;
  if (file.includes('science')) return IMAGES.science_gem;
  if (file.includes('sst')) return IMAGES.sst_gem;
  if (file.includes('english')) return IMAGES.english_gem;
  if (file.includes('master')) return IMAGES.master_gem;
  return assetUrl(`images/gems/${fileName}`);
}

// ---------------------------------------------------------------------------
// Convenience: resolve a model by any key (for engines using dynamic keys)
// Usage: getGlb('male_skeleton') → full CDN URL
// ---------------------------------------------------------------------------
export function getGlb(key) {
  if (GLB[key]) return GLB[key]
  // Fallback: if key looks like a filename, build URL directly
  if (key?.endsWith('.glb')) return assetUrl(`science/musklo-skeletal-system/quest_2_human_skeleton/${key}`) // Most common folder fallback
  console.warn(`[Manya Assets] Unknown GLB key: "${key}"`)
  return null
}

export function getSfx(name) {
  return SFX[name] ?? assetUrl(`shared/audios/${name}.mp3`)
}
