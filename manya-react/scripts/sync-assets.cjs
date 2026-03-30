const fs = require('fs');
const path = require('path');

/**
 * MANYA ASSET SYNC SCRIPT
 * -----------------------
 * This script scans all quest JSON files in /public/content and replaces
 * local asset paths with their Supabase Storage CDN equivalents.
 * 
 * Usage: npm run sync-assets
 */

const SUPABASE_PROJECT_ID = 'pmgdfuhqgwysequaopts';
const BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/manya-assets/public/assets`;

// Mapping specific GLB files to their full mirrored path in cloud
const GLB_FILES = [
  { name: 'upper-limb-arm-muscles.glb', folder: 'science/musklo-skeletal-system/quest_11_muscle_action_antagonistic_pairs' },
  { name: 'human_teeth.glb', folder: 'science/musklo-skeletal-system/quest_12_posture_and_teeth' },
  { name: 'inside_my_tooth.glb', folder: 'science/musklo-skeletal-system/quest_12_posture_and_teeth' },
  { name: 'male_skeleton.glb', folder: 'science/musklo-skeletal-system/quest_2_human_skeleton' },
  { name: 'female_skeleton.glb', folder: 'science/musklo-skeletal-system/quest_2_human_skeleton' },
  { name: 'manya-skull.glb', folder: 'science/musklo-skeletal-system/quest_3_axial_skull_spine' },
  { name: 'spine.glb', folder: 'science/musklo-skeletal-system/quest_3_axial_skull_spine' },
  { name: 'the_human_spinal_column.glb', folder: 'science/musklo-skeletal-system/quest_3_axial_skull_spine' },
  { name: 'rib-cage-heart.glb', folder: 'science/musklo-skeletal-system/quest_4_axial_rib_cage' },
  { name: 'thoracic__abdominal_skeleton_based_on_ct_data.glb', folder: 'science/musklo-skeletal-system/quest_4_axial_rib_cage' },
  { name: 'Lower_limb.glb', folder: 'science/musklo-skeletal-system/quest_5_appendicular_limbs' },
  { name: 'skeleton_arm.glb', folder: 'science/musklo-skeletal-system/quest_5_appendicular_limbs' },
  { name: 'bone_structure.glb', folder: 'science/musklo-skeletal-system/quest_6_bone_structure' },
  { name: 'joint_structure.glb', folder: 'science/musklo-skeletal-system/quest_7_joints_structure' },
  { name: 'elbow_joint.glb', folder: 'science/musklo-skeletal-system/quest_8_hinge_ball-and-socket' },
  { name: 'hip_joint.glb', folder: 'science/musklo-skeletal-system/quest_8_hinge_ball-and-socket' },
  { name: 'ankle.glb', folder: 'science/musklo-skeletal-system/quest_9_pivot_and_gliding' },
  { name: 'pivot_joint_neck.glb', folder: 'science/musklo-skeletal-system/quest_9_pivot_and_gliding' },
  { name: 'wrist.glb', folder: 'science/musklo-skeletal-system/quest_9_pivot_and_gliding' },
];

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return [];
  fs.readdirSync(dir).forEach((f) => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(walkDir(full));
    } else if (f.endsWith('.json')) {
      results.push(full);
    }
  });
  return results;
}

// Resolve content directory relative to this script
const contentDir = path.join(__dirname, '..', 'public', 'content');
console.log(`[Manya Sync] Scanning: ${contentDir}`);

const files = walkDir(contentDir);
let updatedCount = 0;

files.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  GLB_FILES.forEach((glb) => {
    const escapedName = glb.name.replace(/\./g, '\\.').replace(/\-/g, '\\-');
    
    // Pattern 1: Local Path (assets/science/...)
    const localRegex = new RegExp(`assets/${glb.folder}/${escapedName}`, 'g');
    
    // Pattern 2: Old Flattened Supabase Path (.../science/glb/file.glb)
    const oldSupabaseRegex = new RegExp(`${SUPABASE_PROJECT_ID}\\.supabase\\.co/storage/v1/object/public/manya-assets/science/glb/${escapedName}`, 'g');

    if (localRegex.test(content)) {
      content = content.replace(localRegex, `${BASE}/${glb.folder}/${glb.name}`);
      changed = true;
    } else if (oldSupabaseRegex.test(content)) {
      content = content.replace(oldSupabaseRegex, `pmgdfuhqgwysequaopts.supabase.co/storage/v1/object/public/manya-assets/public/assets/${glb.folder}/${glb.name}`);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log(`  Updated: ${path.basename(filePath)}`);
  }
});

console.log(`\n✅ Done. Updated ${updatedCount} JSON files to use Supabase CDN URLs.`);
