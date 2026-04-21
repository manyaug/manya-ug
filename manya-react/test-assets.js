import { assetUrl, resolveRemoteUrl } from './src/config/assetUrls.js';

console.log("Testing assetUrl:");
console.log("shared/audios/night.mp3 ->", assetUrl('shared/audios/night.mp3'));
console.log("science/musklo-skeletal-system/... ->", assetUrl('science/musklo-skeletal-system/quest_2_human_skeleton/male_skeleton_compressed.glb'));

console.log("\nTesting resolveRemoteUrl:");
console.log("science/... ->", resolveRemoteUrl('science/musklo-skeletal-system/quest_2_human_skeleton/male_skeleton_compressed.glb'));
