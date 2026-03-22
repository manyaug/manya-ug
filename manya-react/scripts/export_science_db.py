import os
import json
import pandas as pd
import re
from pathlib import Path
import sys

def format_topic_name(folder_name):
    clean_name = re.sub(r'^quest_\d+_', '', folder_name)
    return clean_name.replace('_', ' ').title()

def create_q_id(file_path, base_folder):
    rel_path = os.path.relpath(file_path, base_folder)
    # Safely handle both Windows and Mac slashes
    qid = rel_path.replace('\\', '-').replace('/', '-').replace('.json', '').upper()
    qid = re.sub(r'[^A-Z0-9_-]', '', qid)
    if not qid.startswith('SCI-'):
        qid = 'SCI-' + qid
    return qid

def process_science_jsons(root_folder, output_file="science_db_export.xlsx"):
    data_list = []
    base_path = Path(root_folder).resolve()
    print(f"Scanning folder: {base_path}")
    
    if not base_path.exists():
        print(f"Error: Folder does not exist: {base_path}")
        return

    for root, dirs, files in os.walk(base_path):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                parent_folder = os.path.basename(root)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = json.load(f)
                    
                    if 'engineType' not in content:
                        continue

                    topic = 'Musculo-Skeletal System'
                    sub_topic = format_topic_name(parent_folder)
                    tags = json.dumps(["P7", "Science", topic, sub_topic])
                    
                    parts = Path(file_path).parts
                    try:
                        content_index = parts.index('content')
                        db_reference_path = "/" + "/".join(parts[content_index:])
                    except ValueError:
                        # Fallback to posix path (forward slashes) so web URLs don't break
                        db_reference_path = "/" + Path(file_path).as_posix()

                    row = {
                        'qid': create_q_id(file_path, root_folder),
                        'term': 'T1',
                        'topic': topic,
                        'subtopic': sub_topic,
                        'difficulty': 'E',
                        'questiontype': 'Simulation',
                        'parentid': None,
                        'orderinparent': None,
                        'questiontext': content.get('variantTitle', file.replace('.json', '').title()),
                        'optiona': None,
                        'optionb': None,
                        'optionc': None,
                        'optiond': None,
                        'correctanswer': None,
                        'hint': None,
                        'detailedsolution': None,
                        'imagelocation': None,
                        'tags': tags,
                        'engine_type': content.get('engineType', 'N/A'),
                        'mode': content.get('mode', 'study'),
                        'json_reference_path': db_reference_path,
                        'model_url': content.get('modelUrl', ''),
                        'has_hotspots': 'Yes' if 'hotspots' in content else 'No',
                        'wordbank_count': len(content.get('wordBank') or []),
                        'question_count': len(content.get('questions') or []),
                        'full_json_raw': json.dumps(content, ensure_ascii=False),
                        'filename': file,
                        'folder': parent_folder
                    }
                    data_list.append(row)
                    print(f"✓ Processed: {file}")

                except Exception as e:
                    print(f"✗ Error processing {file}: {e}")

    if data_list:
        df = pd.DataFrame(data_list)
        # Reorder to make sure specified columns come first, and everything else follows
        cols = [
            'qid', 'term', 'topic', 'subtopic', 'difficulty', 'questiontype', 
            'parentid', 'orderinparent', 'questiontext', 'optiona', 'optionb', 
            'optionc', 'optiond', 'correctanswer', 'hint', 'detailedsolution', 
            'imagelocation', 'tags', 'engine_type', 'mode', 'json_reference_path', 
            'model_url', 'has_hotspots', 'wordbank_count', 'question_count'
        ]
        remaining = [c for c in df.columns if c not in cols]
        df = df[cols + remaining]
        
        df.to_excel(output_file, index=False)
        print(f"\n✅ Success! Saved {len(df)} records to {output_file}")
    else:
        print("\n⚠ No valid JSON simulation files found.")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Default to public/content/science if no argument given
    default_target = os.path.join(script_dir, "..", "public", "content", "science")
    output_path = os.path.join(script_dir, "..", "science_db_export_new.xlsx")
    
    target_folder = sys.argv[1] if len(sys.argv) > 1 else default_target
    
    process_science_jsons(target_folder, output_file=output_path)
