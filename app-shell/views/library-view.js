export const renderLibrary = (mount) => {
    // 1. STATE MANAGEMENT (Default to Math)
    let activeSubject = 'math';

    const makeId = (topicPrefix, num) => {
    // Adds leading zeros so length is always 3 (e.g., 1 -> 001, 10 -> 010)
    const paddedNum = String(num).padStart(3, '0'); 
    return `${topicPrefix}-${paddedNum}`;
};

    // 2. THE CONTENT DATA (Converted from your Sidebar)
    const libraryData = {
        math: {
            theme: '#db2777',
            topics: [
                {
                    title: "Topic 1: Finite vs Infinite Sets",
                    study: [
                        { label: "Study Finite & Infinite", action: "ManyaRouter.load('math/set_theory', 'quest_01_finite_infinite_sets', 'study_finite_infinite', this)" }
                    ],
                    practice: Array.from({length: 10}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_01_finite_infinite_sets', '01-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 2: Set Notation & Regions",
                    study: [
                        { label: "🎨 Study Relations", action: "ManyaRouter.load('math/set_theory', 'quest_02_set_notation_regions', 'study_relation', this)" },
                        { label: "🎨 Study Operations", action: "ManyaRouter.load('math/set_theory', 'quest_02_set_notation_regions', 'study_operations_1', this)" }
                    ],
                    practice: Array.from({length: 20}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_02_set_notation_regions', '02-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 3: Calculating Subsets",
                    study: [{ label: "Study Subsets", action: "ManyaRouter.load('math/set_theory', 'quest_03_calculating_subsets', 'study_subsets', this)" }],
                    practice: Array.from({length: 10}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_03_calculating_subsets', '03-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 4: Calculating Proper Subsets",
                    study: [{ label: "Study Proper Subsets", action: "ManyaRouter.load('math/set_theory', 'quest_04_calculating_proper_subsets', 'study_proper_subsets', this)" }],
                    practice: Array.from({length: 10}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_04_calculating_proper_subsets', '04-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 5: Working Backwards",
                    study: [{ label: "Study Reverse Subsets", action: "ManyaRouter.load('math/set_theory', 'quest_05_working_backwards', 'study_reverse_subsets', this)" }],
                    practice: Array.from({length: 20}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_05_working_backwards', '05-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 6: Venn Diagrams",
                    study: [
                        { label: "Study Placing Info", action: "ManyaRouter.load('math/set_theory', 'quest_06_placing_info_on_venn_diagrams', 'study_placing_info', this)" },
                        { label: "Study Venn Logic", action: "ManyaRouter.load('math/set_theory', 'quest_06_placing_info_on_venn_diagrams', 'study_venn_logic', this)" },
                        { label: "Sim Practice", action: "ManyaRouter.load('math/set_theory', 'quest_06_placing_info_on_venn_diagrams', '06-sim_1', this)" }
                    ],
                    practice: Array.from({length: 30}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_06_placing_info_on_venn_diagrams', '06-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 7: Solving for Unknowns",
                    study: [
                        { label: "Study Unknowns", action: "ManyaRouter.load('math/set_theory', 'quest_07_solving_for_unknowns', 'study_finding_unknowns', this)" },
                        { label: "Complex Algebra", action: "ManyaRouter.load('math/set_theory', 'quest_07_solving_for_unknowns', 'study_complex_algebra', this)" }
                    ],
                    practice: Array.from({length: 29}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_07_solving_for_unknowns', '07-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 8: Application of Sets",
                    study: [{ label: "Study Applications", action: "ManyaRouter.load('math/set_theory', 'quest_08_application_of_sets', 'study_applications', this)" }],
                    practice: Array.from({length: 24}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_08_application_of_sets', '08-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 9: Difference & Complements",
                    study: [{ label: "Study Complements", action: "ManyaRouter.load('math/set_theory', 'quest_09_difference_of_sets_complements', 'study_complements', this)" }],
                    practice: Array.from({length: 29}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_09_difference_of_sets_complements', '09-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                },
                {
                    title: "Topic 10: Probability",
                    study: [{ label: "Study Probabilities", action: "ManyaRouter.load('math/set_theory', 'quest_10_probability_using_venn_diagrams', 'study_probabilities', this)" }],
                    practice: Array.from({length: 36}, (_, i) => ({ label: `Q ${i+1}`, action: `ManyaRouter.load('math/set_theory', 'quest_10_probability_using_venn_diagrams', '10-00${i+1 < 10 ? '0'+(i+1) : i+1}', this)` }))
                }
            ]
        },
        science: {
            theme: '#16a34a',
            topics: [
                {
                    title: "Topic 1: Skeleton Types",
                    study: [{ label: "Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_1_types_of_skeletons', 'recap_quest_1', this)" }],
                    practice: [{ label: "🐛 Types Quiz", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_1_types_of_skeletons', 'sc7_musklo-skeletal_q1', this)" }]
                },
                {
                    title: "Topic 2: Overview",
                    study: [
                        { label: "📖 Learn Overview", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_2_human_skeleton', 'study_sim', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_2_human_skeleton', 'recap_quest_2', this)" }
                    ],
                    practice: [
                        { label: "🧩 ID I", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_2_human_skeleton', 'labeling_v1', this)" },
                        { label: "🧩 ID II", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_2_human_skeleton', 'labeling_v2', this)" },
                        { label: "🧩 ID III", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_2_human_skeleton', 'labeling_v3', this)" }
                    ]
                },
                {
                    title: "Topic 3: Skull & Spine",
                    study: [
                        { label: "💀 Learn Skull", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_3_axial_skull_spine', 'skull_study', this)" },
                        { label: "🦴 Learn Spine", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_3_axial_skull_spine', 'spine_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_3_axial_skull_spine', 'recap_quest_3', this)" }
                    ],
                    practice: [
                        { label: "🧩 Skull Quiz I", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_3_axial_skull_spine', 'labeling_skull_v1', this)" },
                        { label: "🧩 Skull Quiz II", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_3_axial_skull_spine', 'labeling_skull_v2', this)" },
                        { label: "🧩 Spine Quiz I", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_3_axial_skull_spine', 'labeling_spine_v1', this)" },
                        { label: "🧩 Spine Quiz II", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_3_axial_skull_spine', 'labeling_spine_v2', this)" }
                    ]
                },
                {
                    title: "Topic 4: Rib Cage",
                    study: [
                        { label: "🫁 Learn Rib Cage", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_4_axial_rib_cage', 'rib_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_4_axial_rib_cage', 'recap_quest_4', this)" }
                    ],
                    practice: [
                        { label: "🧩 Ribs Quiz I", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_4_axial_rib_cage', 'labeling_v1', this)" },
                        { label: "🧩 Ribs Quiz II", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_4_axial_rib_cage', 'labeling_v2', this)" },
                        { label: "🧩 Ribs Quiz III", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_4_axial_rib_cage', 'labeling_v3', this)" }
                    ]
                },
                {
                    title: "Topic 5: Limbs",
                    study: [
                        { label: "💪 Learn Arm", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_5_appendicular_limbs', 'arm_study', this)" },
                        { label: "🦵 Learn Leg", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_5_appendicular_limbs', 'leg_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_5_appendicular_limbs', 'recap_quest_5', this)" }
                    ],
                    practice: [
                        { label: "🧩 Arm Quiz I", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_5_appendicular_limbs', 'labeling_arm_v1', this)" },
                        { label: "🧩 Arm Quiz II", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_5_appendicular_limbs', 'labeling_arm_v2', this)" },
                        { label: "🧩 Leg Quiz I", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_5_appendicular_limbs', 'labeling_leg_v1', this)" },
                        { label: "🧩 Leg Quiz II", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_5_appendicular_limbs', 'labeling_leg_v2', this)" }
                    ]
                },
                {
                    title: "Topic 6: Bone Structure",
                    study: [
                        { label: "🏭 Learn Structure", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_6_bone_structure', 'bone_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_6_bone_structure', 'recap_quest_6', this)" }
                    ],
                    practice: [
                        { label: "🧩 Quiz I", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_6_bone_structure', 'labeling_bone_v1', this)" },
                        { label: "🧩 Quiz II", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_6_bone_structure', 'labeling_bone_v2', this)" },
                        { label: "🧩 Quiz III", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_6_bone_structure', 'labeling_bone_v3', this)" },
                        { label: "🧩 Quiz IV", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_6_bone_structure', 'labeling_bone_v4', this)" }
                    ]
                },
                {
                    title: "Topic 7: Joints",
                    study: [
                        { label: "🦵 Knee 3D", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'knee_study_3d', this)" },
                        { label: "📖 Joints Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'joints_study', this)" },
                        { label: "📖 Synovial Learn", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'synovial_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'recap_quest_7', this)" }
                    ],
                    practice: [
                        { label: "🧩 Joints 1", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'labeling_knee_joints_v1', this)" },
                        { label: "🧩 Joints 2", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'labeling_knee_joints_v2', this)" },
                        { label: "🧩 Joints 3", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'labeling_knee_joints_v3', this)" },
                        { label: "🧩 Synovial 1", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'labeling_synovial_v1', this)" },
                        { label: "🧩 Synovial 2", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_7_joints_structure', 'labeling_synovial_v2', this)" }
                    ]
                },
                {
                    title: "Topic 8: Elbow & Hip",
                    study: [
                        { label: "📖 Elbow 3D", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'elbow_3d_study', this)" },
                        { label: "🖼️ Elbow 2D", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'elbow_2d_study', this)" },
                        { label: "📖 Hip 3D", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'hip_3d_study', this)" },
                        { label: "🖼️ Hip 2D", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'hip_2d_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'recap_quest_8', this)" }
                    ],
                    practice: [
                        { label: "🧩 Elbow 3D Quiz", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'labeling_elbow_3d_v1', this)" },
                        { label: "🖼️ Elbow 2D Quiz", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'labeling_elbow_2d_v1', this)" },
                        { label: "🧩 Hip 3D Quiz", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'labeling_hip_3d_v1', this)" },
                        { label: "🖼️ Hip 2D Quiz", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_8_hinge_ball-and-socket', 'labeling_hip_2d_v1', this)" }
                    ]
                },
                {
                    title: "Topic 9: Pivot & Gliding",
                    study: [
                        { label: "📖 Learn Neck", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_9_pivot_and_gliding', 'neck_pivot_study', this)" },
                        { label: "📖 Learn Wrist", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_9_pivot_and_gliding', 'wrist_gliding_study', this)" },
                        { label: "📖 Learn Ankle", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_9_pivot_and_gliding', 'ankle_gliding_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_9_pivot_and_gliding', 'recap_quest_9', this)" }
                    ],
                    practice: [
                        { label: "🧩 Quiz Neck", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_9_pivot_and_gliding', 'labeling_neck_pivot_v1', this)" },
                        { label: "🧩 Quiz Wrist", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_9_pivot_and_gliding', 'labeling_wrist_gliding_v1', this)" },
                        { label: "🧩 Quiz Ankle", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_9_pivot_and_gliding', 'labeling_ankle_gliding_v1', this)" }
                    ]
                },
                {
                    title: "Topic 10: Muscle Types",
                    study: [
                        { label: "🖼️ Learn 3 Types", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_10_muscular_system_types', 'muscle_types_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_10_muscular_system_types', 'recap_quest_10', this)" }
                    ],
                    practice: [{ label: "🧩 Quiz 3 Types", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_10_muscular_system_types', 'labeling_muscle_types_V1', this)" }]
                },
                {
                    title: "Topic 11: Muscle Action",
                    study: [
                        { label: "💪 Skeletal 3D", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_11_muscle_action_antagonistic_pairs', 'skeletal_muscle_study', this)" },
                        { label: "📖 Action 2D", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_11_muscle_action_antagonistic_pairs', 'muscle_action_study', this)" },
                        { label: "💪 Canvas Sim", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_11_muscle_action_antagonistic_pairs', 'muscle_action_procedural', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_11_muscle_action_antagonistic_pairs', 'recap_quest_11', this)" }
                    ],
                    practice: [
                        { label: "🧩 Arm Anatomy", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_11_muscle_action_antagonistic_pairs', 'labeling_arm_muscles', this)" },
                        { label: "🧩 Quiz States", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_11_muscle_action_antagonistic_pairs', 'labeling_muscle_states_v1', this)" },
                        { label: "🧩 Connections", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_11_muscle_action_antagonistic_pairs', 'labeling_bone_muscle_connection_v1', this)" },
                        { label: "🧩 Flex/Ext", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_11_muscle_action_antagonistic_pairs', 'labeling_flexor_extensor_v1', this)" }
                    ]
                },
                {
                    title: "Topic 12: Teeth & Posture",
                    study: [
                        { label: "🦷 Tooth Inside", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_12_posture_and_teeth', 'tooth_anatomy_study', this)" },
                        { label: "🦷 Teeth Types", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_12_posture_and_teeth', 'teeth_types_study', this)" },
                        { label: "🦷 Learn Posture", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_12_posture_and_teeth', 'posture_maintenance_study', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_12_posture_and_teeth', 'recap_quest_12', this)" }
                    ],
                    practice: [
                        { label: "🧩 Tooth Parts", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_12_posture_and_teeth', 'tooth_anatomy_quiz_v1', this)" },
                        { label: "🧩 Full Set", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_12_posture_and_teeth', 'teeth_types_quiz_v1', this)" }
                    ]
                },
                {
                    title: "Topic 13: Disorders & First Aid",
                    study: [
                        { label: "🦷 Learn Disorders", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_13_disorders_and_first_aid', 'study_disorders', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_13_disorders_and_first_aid', 'recap_quest_13', this)" }
                    ],
                    practice: []
                },
                {
                    title: "Topic 14: Bone Diseases",
                    study: [
                        { label: "📖 Learn Diseases", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_14_bone_diseases', 'study_diseases', this)" },
                        { label: "📖 Recap Notes", action: "ManyaRouter.load('science/musklo-skeletal-system', 'quest_14_bone_diseases', 'recap_quest_14', this)" }
                    ],
                    practice: []
                }
            ]
        },
        sst: {
            theme: '#0ea5e9',
            topics: [
                {
                    title: "Topic 1: The World Stage",
                    study: [
                        { label: "Study Continents", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'study_continents', this)" },
                        { label: "Study Africa", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'study_africa', this)" },
                        { label: "Water Bodies", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'study_water_bodies', this)" },
                        { label: "Study Landlocked", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'study_landlocked', this)" },
                        { label: "Recap: Facts", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'recap_afrcan_facts', this)" },
                        { label: "Recap: Continents", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'recap_continents', this)" },
                        { label: "Recap: Location", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'recap_locating_africa', this)" }
                    ],
                    practice: [
                        { label: "Extremes Game", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'extremes_of_africa', this)" },
                        { label: "Project Genesis", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'project_genesis', this)" },
                        { label: "🧩 Puzzle Regions", action: "ManyaRouter.load('sst/locating_africa', 'quest_1_world_stage', 'puzzle_regions', this)" }
                    ]
                },
                {
                    title: "Topic 2: Grid Master (Latitudes)",
                    study: [
                        { label: "Study Grid", action: "ManyaRouter.load('sst/locating_africa', 'quest_2_grid_master', 'study_grid', this)" },
                        { label: "Study Tropics", action: "ManyaRouter.load('sst/locating_africa', 'quest_2_grid_master', 'study_tropics', this)" },
                        { label: "Study Polar", action: "ManyaRouter.load('sst/locating_africa', 'quest_2_grid_master', 'study_polar', this)" },
                        { label: "Recap: Africa", action: "ManyaRouter.load('sst/locating_africa', 'quest_2_grid_master', 'recap_afrca_grid', this)" },
                        { label: "Recap: Global", action: "ManyaRouter.load('sst/locating_africa', 'quest_2_grid_master', 'recap_global_grid', this)" }
                    ],
                    practice: Array.from({length: 7}, (_, i) => ({ label: `Grid Quiz ${i+1}`, action: `ManyaRouter.load('sst/locating_africa', 'quest_2_grid_master', 'grid_quiz${i===0 ? '' : '_'+(i+1)}', this)` }))
                },
                {
                    title: "Topic 3: Time Traveller",
                    study: [
                        { label: "Calc Time 1", action: "ManyaRouter.load('sst/locating_africa', 'quest_3_calculating_time', 'study_calculating_time', this)" },
                        { label: "Calc Time 2", action: "ManyaRouter.load('sst/locating_africa', 'quest_3_calculating_time', 'study_calc_time_2', this)" },
                        { label: "Recap: Calc", action: "ManyaRouter.load('sst/locating_africa', 'quest_3_calculating_time', 'recap_time_calc', this)" }
                    ],
                    practice: Array.from({length: 8}, (_, i) => ({ label: `Time Quiz ${i+1}`, action: `ManyaRouter.load('sst/locating_africa', 'quest_3_calculating_time', 'time_quiz_${i+1}', this)` }))
                },
                {
                    title: "Topic 4: Water Borders",
                    study: [
                        { label: "Study Oceans", action: "ManyaRouter.load('sst/locating_africa', 'quest_4_water_bodies', 'study_oceans', this)" },
                        { label: "African Waters", action: "ManyaRouter.load('sst/locating_africa', 'quest_4_water_bodies', 'study_african_waters', this)" },
                        { label: "Recap: Waters", action: "ManyaRouter.load('sst/locating_africa', 'quest_4_water_bodies', 'recap_water_bodies_africa', this)" }
                    ],
                    practice: [
                        { label: "African Quiz", action: "ManyaRouter.load('sst/locating_africa', 'quest_4_water_bodies', 'quiz_african_waters', this)" },
                        { label: "Ocean Quiz", action: "ManyaRouter.load('sst/locating_africa', 'quest_4_water_bodies', 'quiz_oceans', this)" }
                    ]
                },
                {
                    title: "Topic 5: Coastal Features",
                    study: [
                        { label: "Study Features", action: "ManyaRouter.load('sst/locating_africa', 'quest_5_coastal_features', 'study_coastal_features', this)" },
                        { label: "Recap: Coast", action: "ManyaRouter.load('sst/locating_africa', 'quest_5_coastal_features', 'recap_coastal_feat_africa', this)" }
                    ],
                    practice: Array.from({length: 4}, (_, i) => ({ label: `Coastal Quiz ${i+1}`, action: `ManyaRouter.load('sst/locating_africa', 'quest_5_coastal_features', 'coastal_quiz_${i+1}', this)` }))
                },
                {
                    title: "Topic 6: Regions & Capitals",
                    study: [
                        { label: "Study Regions", action: "ManyaRouter.load('sst/locating_africa', 'quest_6_regional_division_capital_cities', 'study_regions', this)" },
                        { label: "Study Capitals", action: "ManyaRouter.load('sst/locating_africa', 'quest_6_regional_division_capital_cities', 'study_capitals', this)" },
                        { label: "Recap: Regions", action: "ManyaRouter.load('sst/locating_africa', 'quest_6_regional_division_capital_cities', 'recap_regions_capitals', this)" }
                    ],
                    practice: [
                        { label: "Capitals Quiz", action: "ManyaRouter.load('sst/locating_africa', 'quest_6_regional_division_capital_cities', 'capitals_quiz', this)" },
                        { label: "Regions Quiz", action: "ManyaRouter.load('sst/locating_africa', 'quest_6_regional_division_capital_cities', 'regions_quiz', this)" }
                    ]
                },
                {
                    title: "Topic 7: Landlocked Challenge",
                    study: [
                        { label: "Study Countries", action: "ManyaRouter.load('sst/locating_africa', 'quest_7_landlocked_countries', 'study_landlocked', this)" },
                        { label: "Recap: Landlocked", action: "ManyaRouter.load('sst/locating_africa', 'quest_7_landlocked_countries', 'recap_landlocked', this)" }
                    ],
                    practice: []
                }
            ]
        },
        english: {
            theme: '#7c3aed',
            topics: [
                {
                    title: "Chapter 1: School Holidays",
                    study: [],
                    practice: [
                        { label: "🚌 Journey to Village", action: "ManyaRouter.load('english/holidays', 'quest_1', 'holiday_1', this)" },
                        { label: "🏡 Enjoying Holiday", action: "ManyaRouter.load('english/holidays', 'quest_1', 'holiday_2', this)" },
                        { label: "🗣️ Reported Speech", action: "ManyaRouter.load('english/holidays', 'quest_1', 'reported_speech_game', this)" }
                    ]
                }
            ]
        }
    };

    // 3. RENDER FUNCTION
    const render = () => {
        const data = libraryData[activeSubject];
        
        mount.innerHTML = `
            <div class="library-view animate-in">
                
                <!-- TOP HEADER -->
                <div class="library-header sticky">
                    <div class="header-row">
                        <h3 class="lib-title">Self-Study Library</h3>
                        <div></div>
                    </div>
                    
                    <!-- SUBJECT TABS -->
                    <div class="lib-tabs">
                        <button class="lib-tab ${activeSubject==='math'?'active':''}" onclick="window.switchLib('math')">MATH</button>
                        <button class="lib-tab ${activeSubject==='science'?'active':''}" onclick="window.switchLib('science')">SCI</button>
                        <button class="lib-tab ${activeSubject==='sst'?'active':''}" onclick="window.switchLib('sst')">SST</button>
                        <button class="lib-tab ${activeSubject==='english'?'active':''}" onclick="window.switchLib('english')">ENG</button>
                    </div>
                </div>

                <!-- CONTENT LIST -->
                <div class="library-content" style="--theme:${data.theme}">
                    <div class="search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" placeholder="Search topics in ${activeSubject}..." class="search-input">
                    </div>

                    ${data.topics.map((topic, i) => `
                        <div class="lib-topic-card">
                            <div class="topic-header" onclick="this.parentElement.classList.toggle('open')">
                                <span class="topic-num">${i + 1}</span>
                                <h4 class="topic-name">${topic.title}</h4>
                                <span class="chevron">▼</span>
                            </div>
                            
                            <div class="topic-body">
                                ${topic.study.length > 0 ? `
                                    <div class="resource-section">
                                        <h5 class="sec-label">STUDY & RECAP</h5>
                                        <div class="resource-grid">
                                            ${topic.study.map(s => `
                                                <button class="res-chip study" onclick="${s.action}">
                                                    ${s.label}
                                                </button>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}

                                ${topic.practice.length > 0 ? `
                                    <div class="resource-section">
                                        <h5 class="sec-label">PRACTICE & QUIZZES</h5>
                                        <div class="resource-grid">
                                            ${topic.practice.map(p => `
                                                <button class="res-chip practice" onclick="${p.action}">
                                                    ${p.label}
                                                </button>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div style="height: 100px"></div>
                </div>
            </div>
        `;
    };

    // Helper to switch tabs
    window.switchLib = (sub) => {
        activeSubject = sub;
        render();
    };

    render();
};