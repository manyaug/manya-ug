import os
import json
import pandas as pd
import re
from pathlib import Path
import sys

def detect_topic_from_content(json_data, filename):
    """Detect SST topic from JSON content and filename"""
    topic = json_data.get('topic', '')
    filename_lower = filename.lower()
    
    # Topic map based on your SST Locating Africa structure
    topic_map = {
        # Locating Africa topics
        'world_stage': 'locating_africa_world_stage',
        'quest_1_world_stage': 'locating_africa_world_stage',
        'quest_1': 'locating_africa_world_stage',
        
        'grid_master': 'locating_africa_grid_master',
        'quest_2_grid_master': 'locating_africa_grid_master',
        'quest_2': 'locating_africa_grid_master',
        
        'calculating_time': 'locating_africa_calculating_time',
        'quest_3_calculating_time': 'locating_africa_calculating_time',
        'quest_3': 'locating_africa_calculating_time',
        
        'water_bodies': 'locating_africa_water_bodies',
        'quest_4_water_bodies': 'locating_africa_water_bodies',
        'quest_4': 'locating_africa_water_bodies',
        
        'coastal_features': 'locating_africa_coastal_features',
        'quest_5_coastal_features': 'locating_africa_coastal_features',
        'quest_5': 'locating_africa_coastal_features',
        
        'regional_division_capital_cities': 'locating_africa_regional_division_capital_cities',
        'quest_6_regional_division_capital_cities': 'locating_africa_regional_division_capital_cities',
        'quest_6': 'locating_africa_regional_division_capital_cities',
        
        'landlocked_countries': 'locating_africa_landlocked_countries',
        'quest_7_landlocked_countries': 'locating_africa_landlocked_countries',
        'quest_7': 'locating_africa_landlocked_countries',
        
        # General locating africa
        'locating_africa': 'locating_africa',
        'africa': 'locating_africa',
        'continent': 'locating_africa'
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
    
    # Extract from path if possible (for quest folders)
    if 'quest_' in filename_lower:
        # Try to extract quest number and map to topic
        quest_match = re.search(r'quest_(\d+)_?', filename_lower)
        if quest_match:
            quest_num = quest_match.group(1)
            quest_to_topic = {
                '1': 'locating_africa_world_stage',
                '2': 'locating_africa_grid_master',
                '3': 'locating_africa_calculating_time',
                '4': 'locating_africa_water_bodies',
                '5': 'locating_africa_coastal_features',
                '6': 'locating_africa_regional_division_capital_cities',
                '7': 'locating_africa_landlocked_countries'
            }
            return quest_to_topic.get(quest_num, 'locating_africa')
    
    return 'locating_africa'

def extract_difficulty(filepath):
    """Extract difficulty from path"""
    path_lower = filepath.lower()
    if any(word in path_lower for word in ['easy', 'e_', 'beginner', 'level1']):
        return 'E'
    elif any(word in path_lower for word in ['hard', 'h_', 'advanced', 'level3']):
        return 'H'
    elif any(word in path_lower for word in ['medium', 'm_', 'intermediate', 'level2']):
        return 'M'
    return 'M'  # Default to Medium

def create_q_id(file_path, base_folder):
    """Create unique Q_ID from file path with SST prefix"""
    rel_path = os.path.relpath(file_path, base_folder)
    qid = rel_path.replace(os.sep, '-')
    qid = qid.replace('.json', '').replace(' ', '_')
    qid = re.sub(r'[^a-zA-Z0-9_-]', '', qid)
    if not qid.startswith('SST-'):
        qid = 'SST-' + qid
    return qid[:50]  # Limit length

def extract_subtopic_from_path(filepath):
    """Extract subtopic name from the quest folder"""
    path_parts = Path(filepath).parts
    
    # Look for quest folder pattern
    for part in path_parts:
        if 'quest_' in part:
            # Convert quest_1_world_stage to world_stage
            # or to a cleaner subtopic name
            if '_' in part:
                # Remove quest_X_ prefix if present
                cleaned = re.sub(r'^quest_\d+_', '', part)
                return cleaned.replace('_', ' ')
            return part
    
    # Fallback: use parent folder name
    parent_folder = Path(filepath).parent.name
    return parent_folder.replace('_', ' ')

def crawl_simulations_to_excel(root_folder, output_file="sst_simulations_bank.xlsx"):
    """Main function to crawl SST simulations and create Excel"""
    data = []
    
    for root, dirs, files in os.walk(root_folder):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        sim_data = json.load(f)
                    
                    # Create unique ID
                    q_id = create_q_id(file_path, root_folder)
                    
                    # Extract metadata
                    engine_type = sim_data.get('engineType', 'UNKNOWN')
                    mode = sim_data.get('mode', 'study')
                    variant_title = sim_data.get('variantTitle', '')
                    
                    # Detect topic and subtopic
                    topic = detect_topic_from_content(sim_data, file)
                    subtopic = extract_subtopic_from_path(file_path)
                    
                    # Extract difficulty
                    difficulty = extract_difficulty(file_path)
                    
                    # Format topic name for display
                    display_topic = "Locating Africa – P7 (Uganda PLE)"
                    
                    # Create question text
                    if variant_title:
                        question_text = f"Interactive Study: {variant_title}"
                    else:
                        topic_display = topic.replace('_', ' ').title()
                        question_text = f"Interactive Study: {topic_display}"
                    
                    # Create tags
                    tags = ["P7", "Social Studies", "Uganda PLE", "Locating Africa", topic]
                    if subtopic and subtopic != topic.replace('_', ' '):
                        tags.append(subtopic)
                    
                    # Build image location path
                    image_location = f"/simulations/sst/locating_africa/{topic}/"
                    
                    # Row data with all required columns
                    row_data = {
                        'Q_ID': q_id,
                        'Term': 'T1',
                        'Topic': display_topic,
                        'Sub-Topic': subtopic,
                        'Difficulty': difficulty,
                        'Question_Type': 'SIM',
                        'Parent_ID': 'null',
                        'Order_in_Parent': 'null',
                        'Question_Text': question_text,
                        'Option_A': 'null',
                        'Option_B': 'null',
                        'Option_C': 'null',
                        'Option_D': 'null',
                        'Correct_Answer': 'null',
                        'Hint': 'Interact with the map/diagram to learn more',
                        'Detailed_Solution': json.dumps({"type": "interactive_sst_simulation"}),
                        'Image_Location': image_location,
                        'Tags': json.dumps(tags),
                        'Engine_Type_sim': engine_type,
                        'Mode_sim': mode,
                        'File_Path_sim': file_path,
                        'Filename_sim': file
                    }
                    
                    data.append(row_data)
                    print(f"✓ Processed: {file} -> {topic}")
                    
                except json.JSONDecodeError as e:
                    print(f"✗ JSON error in {file}: {e}")
                except Exception as e:
                    print(f"✗ Error processing {file}: {e}")

    if data:
        # Create DataFrame with specified column order
        columns = [
            'Q_ID', 'Term', 'Topic', 'Sub-Topic', 'Difficulty', 
            'Question_Type', 'Parent_ID', 'Order_in_Parent', 'Question_Text',
            'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Correct_Answer',
            'Hint', 'Detailed_Solution', 'Image_Location', 'Tags',
            'Engine_Type_sim', 'Mode_sim', 'File_Path_sim', 'Filename_sim'
        ]
        
        df = pd.DataFrame(data)
        
        # Ensure all columns exist
        for col in columns:
            if col not in df.columns:
                df[col] = 'null'
        
        # Reorder columns
        df = df[columns]
        
        # Save to Excel
        df.to_excel(output_file, index=False)
        print(f"\n✅ Successfully saved {len(df)} SST simulation records to: {output_file}")
        
        # Print summary
        topic_counts = df['Topic'].value_counts()
        print("\n📊 Summary by Topic:")
        for topic, count in topic_counts.items():
            print(f"  • {topic}: {count} simulations")
    else:
        print("❌ No data found to save")
    
    return data

def test_structure(root_folder):
    """Test function to preview the folder structure"""
    print("📁 Testing folder structure...")
    for root, dirs, files in os.walk(root_folder):
        level = root.replace(root_folder, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f"{indent}📂 {os.path.basename(root)}/")
        subindent = ' ' * 2 * (level + 1)
        for file in files[:3]:  # Show first 3 files only
            if file.endswith('.json'):
                print(f"{subindent}📄 {file}")
        if len(files) > 3:
            print(f"{subindent}... and {len(files)-3} more")

if __name__ == "__main__":
    folder = input("Enter path to SST JSONs folder: ").strip() or "."
    
    if not os.path.exists(folder):
        print(f"❌ Folder not found: {folder}")
        sys.exit(1)
    
    # Optional: Test structure first
    test = input("Preview folder structure? (y/n): ").strip().lower()
    if test == 'y':
        test_structure(folder)
    
    # Run the crawler
    print(f"\n🔍 Crawling for SST simulations in: {folder}")
    crawl_simulations_to_excel(folder)