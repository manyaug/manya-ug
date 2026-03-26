import os
import json
import pandas as pd
import re
from pathlib import Path
import sys

def detect_topic_from_content(json_data, filename):
    """Detect science topic from JSON content and filename"""
    topic = json_data.get('topic', '')
    filename_lower = filename.lower()
    
    # Updated topic map based on your 14 Science Topics
    topic_map = {
        # Topic 1: Skeleton Types
        'exo': 'skeleton_types', 'endo': 'skeleton_types', 'hydrostatic': 'skeleton_types',
        # Topic 2: Overview
        'overview': 'overview', 'intro': 'overview', 'framework': 'overview',
        # Topic 3: Skull & Spine
        'skull': 'skull_and_spine', 'spine': 'skull_and_spine', 'vertebral': 'skull_and_spine', 'axial': 'skull_and_spine',
        # Topic 4: Rib Cage
        'rib': 'rib_cage', 'sternum': 'rib_cage', 'chest': 'rib_cage',
        # Topic 5: Limbs
        'limb': 'limbs', 'arm': 'limbs', 'leg': 'limbs', 'appendicular': 'limbs',
        # Topic 6: Bone Structure
        'marrow': 'bone_structure', 'cartilage': 'bone_structure', 'anatomy': 'bone_structure',
        # Topic 7: Joints
        'joint': 'joints', 'synovial': 'joints',
        # Topic 8: Hinge/Ball and Socket
        'hinge': 'elbow_and_hip_joints', 'socket': 'elbow_and_hip_joints', 'ball': 'elbow_and_hip_joints',
        # Topic 9: Pivot & Gliding
        'pivot': 'pivot_and_gliding', 'gliding': 'pivot_and_gliding', 'neck': 'pivot_and_gliding',
        # Topic 10: Muscle Types
        'voluntary': 'muscle_types', 'involuntary': 'muscle_types', 'cardiac': 'muscle_types',
        # Topic 11: Muscle Action
        'antagonistic': 'muscle_action', 'contract': 'muscle_action', 'relax': 'muscle_action',
        # Topic 12: Maintenance & Teeth
        'posture': 'maintenance_and_teeth', 'teeth': 'maintenance_and_teeth', 'dental': 'maintenance_and_teeth',
        # Topic 13: Disorders & First Aid
        'fracture': 'disorders_and_first_aid', 'aid': 'disorders_and_first_aid', 'sprain': 'disorders_and_first_aid',
        # Topic 14: Bone Diseases
        'disease': 'bone_diseases', 'polio': 'bone_diseases', 'rickets': 'bone_diseases', 'arthritis': 'bone_diseases'
    }
    
    # Check topic from JSON
    if topic:
        topic_lower = topic.lower()
        for keyword, mapped_topic in topic_map.items():
            if keyword in topic_lower:
                return mapped_topic
    
    # Check filename
    for keyword, mapped_topic in topic_map.items():
        if keyword in filename_lower:
            return mapped_topic
    
    return 'general_musculo_skeletal'

def extract_difficulty(filepath):
    """Extract difficulty from path"""
    path_lower = filepath.lower()
    if any(word in path_lower for word in ['easy', 'e_', 'beginner', 'level1']):
        return 'E'
    elif any(word in path_lower for word in ['hard', 'h_', 'advanced', 'level3']):
        return 'H'
    elif any(word in path_lower for word in ['medium', 'm_', 'intermediate', 'level2']):
        return 'M'
    return 'M'

def create_q_id(file_path, base_folder):
    """Create unique Q_ID from file path"""
    rel_path = os.path.relpath(file_path, base_folder)
    qid = rel_path.replace(os.sep, '-')
    qid = qid.replace('.json', '').replace(' ', '_')
    qid = re.sub(r'[^a-zA-Z0-9_-]', '', qid)
    if not qid.startswith('SCI-'): # Changed prefix to SCI for Science
        qid = 'SCI-' + qid
    return qid[:50]

def crawl_simulations_to_excel(root_folder, output_file="science_simulations_bank.xlsx"):
    data = []
    
    for root, dirs, files in os.walk(root_folder):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        sim_data = json.load(f)
                    
                    q_id = create_q_id(file_path, root_folder)
                    engine_type = sim_data.get('engineType', 'UNKNOWN')
                    topic = detect_topic_from_content(sim_data, file)
                    difficulty = extract_difficulty(file_path)
                    
                    # Row data customized for Science
                    row_data = {
                        'Q_ID': q_id,
                        'Term': 'T1',
                        'Topic': "Musculo-Skeletal System – P7 (Uganda PLE)",
                        'Difficulty': difficulty,
                        'Question_Type': 'SIM',
                        'Question_Text': f"Interactive Study: {topic.replace('_', ' ').title()}",
                        'Hint': 'Interact with the diagram/model to learn more',
                        'Detailed_Solution': json.dumps({"type": "interactive_science_simulation"}),
                        'Engine_Type': engine_type,
                        'Mode': sim_data.get('mode', 'study'),
                        'Simulation_Data': json.dumps(sim_data, ensure_ascii=False),
                        'Image_Location': f"/simulations/science/{topic}/",
                        'Tags': json.dumps(["P7", "Science", "Uganda PLE", "Musculo-Skeletal", topic]),
                        'Topics': topic,
                        'Subject': 'SCIENCE', # Default changed to Science
                        'Variant_Title': sim_data.get('variantTitle', ''),
                        'File_Path': file_path,
                        'Filename': file
                    }
                    data.append(row_data)
                except Exception as e:
                    print(f"✗ Error processing {file}: {e}")

    if data:
        df = pd.DataFrame(data)
        df.to_excel(output_file, index=False)
        print(f"✅ Successfully saved {len(df)} science records to: {output_file}")
    return data

if __name__ == "__main__":
    folder = input("Enter path to Science JSONs folder: ").strip() or "."
    crawl_simulations_to_excel(folder)