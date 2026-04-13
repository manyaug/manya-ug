import os
import json
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ==============================================================================
#  Manya Unified Vault - Robust Bulk Importer
# ==============================================================================

# 1. SETUP SUPABASE CREDENTIALS
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. CONFIGURATION
MAIN_BANK_DIR = r"D:\manya_app\manya-react\public\content\main_bank"
DEFAULT_GRADE_LEVEL = "7" 

# Robust Column Mapping
COLUMN_MAP = {
    'qid': 'qid', 'q_id': 'qid',
    'term': 'term',
    'topic': 'topic',
    'subtopic': 'subtopic', 'sub_topic': 'subtopic',
    'difficulty': 'difficulty',
    'marked_ple': 'marked_ple', 'marked_p': 'marked_ple',
    'questiontype': 'item_type', 'question_type': 'item_type', 'questiont': 'item_type',
    'parentid': 'parent_id', 'parent_id': 'parent_id',
    'orderinparent': 'order_in_parent', 'order_in_parent': 'order_in_parent', 'orderinpa': 'order_in_parent',
    'questiontext': 'question_text', 'question_text': 'question_text', 'question': 'question_text',
    'optiona': 'option_a', 'option_a': 'option_a',
    'optionb': 'option_b', 'option_b': 'option_b',
    'optionc': 'option_c', 'option_c': 'option_c',
    'optiond': 'option_d', 'option_d': 'option_d',
    'correctanswer': 'correct_answer', 'correct_answer': 'correct_answer', 'correctans': 'correct_answer',
    'detailedsolution': 'explanation', 'detailed_solution': 'explanation', 'explanation': 'explanation', 'detailed_s': 'explanation',
    'hint': 'hint',
    'imagelocation': 'image_location', 'image_location': 'image_location', 'imageloca': 'image_location',
    'tags': 'tags',
}

ASSET_VERSION = "v2.0.1"

def generate_cdn_url(local_json_path, subject):
    if pd.isna(local_json_path) or not str(local_json_path).strip():
        return None
    clean_path = str(local_json_path).replace("\\", "/").strip()
    if not clean_path.startswith("content/"):
        if clean_path.startswith(f"{subject.lower()}/"):
            clean_path = f"content/{clean_path}"
        else:
            clean_path = f"content/{subject.lower()}/{clean_path}"
    clean_path = clean_path.lstrip("/")
    return f"https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@{ASSET_VERSION}/{clean_path}"

def get_subject_from_filename(filename):
    f = filename.lower()
    if 'math' in f: return 'MATH'
    if 'science' in f: return 'SCIENCE'
    if 'sst' in f: return 'SST'
    if 'english' in f: return 'ENGLISH'
    return 'UNCATEGORIZED'

def normalize_headers(df):
    # Strip spaces, lowercase, and replace - with _ for better mapping
    df.columns = [str(c).lower().strip().replace(" ", "").replace("-", "_") for c in df.columns]
    return df

def process_dataframe(df, subject, is_rephrased=False, master_uuid_map=None):
    if master_uuid_map is None: master_uuid_map = {}
    records = []
    
    df = normalize_headers(df)
    
    for _, row in df.iterrows():
        # Get QID using normalized mapping
        qid_raw = row.get('qid', row.get('q_id'))
        qid = str(qid_raw).strip() if pd.notna(qid_raw) else None
        
        if not qid or qid.lower() == 'nan':
            continue
            
        topic = str(row.get('topic', 'Uncategorized')).strip()
        
        # Variants Linking
        parent_id = None
        master_qid = qid.split('-V')[0] if '-V' in qid else None
        if master_qid and master_qid != qid:
            if master_qid in master_uuid_map:
                parent_id = master_uuid_map[master_qid]
            else:
                try:
                    res = supabase.table('manya_vault').select('id').eq('qid', master_qid).eq('subject', subject).execute()
                    if res.data:
                        parent_id = res.data[0]['id']
                        master_uuid_map[master_qid] = parent_id
                except: pass

        # Map options and other fields using the COLUMN_MAP
        def get_val(key):
            # Try to find a match in the normalized row
            for col in df.columns:
                if COLUMN_MAP.get(col) == key:
                    return row[col]
            return None

        metadata = {
            'tags': str(row.get('tags', '')).split(',') if pd.notna(row.get('tags')) else [],
            'is_ple': True if str(get_val('marked_ple')).lower() == 'yes' else False,
            'term': str(row.get('term', '')).strip() if pd.notna(row.get('term')) else None
        }

        # Interaction / CDN Logic
        json_path_col = next((c for c in ['json_reference_path', 'json_path', 'filepathsim', 'file_path_sim'] if c in df.columns), None)
        raw_json_path = row.get(json_path_col) if json_path_col else None
        
        interaction_config = {}
        cdn_url = generate_cdn_url(raw_json_path, subject)
        if cdn_url: interaction_config['cdn_url'] = cdn_url
            
        engine_col = next((c for c in ['engine_type', 'enginetypesim', 'engine_type_sim'] if c in df.columns), None)
        if engine_col and pd.notna(row.get(engine_col)):
            interaction_config['engine_type'] = str(row[engine_col])

        # NEW: Holistic Interaction Config Support
        config_col = next((c for c in ['interaction_config', 'interactionconfig', 'config'] if c in df.columns), None)
        if config_col and pd.notna(row.get(config_col)):
            try:
                # Merge existing (CDN/Engine) with the detailed JSON from Excel
                ext_config = json.loads(str(row[config_col]))
                interaction_config.update(ext_config)
            except Exception as e:
                print(f"      Warning: Failed to parse interaction_config for {qid}: {e}")

        record = {
            'subject': subject,
            'grade_level': str(row.get('grade_level', DEFAULT_GRADE_LEVEL)).strip(),
            'qid': qid,
            'item_type': str(get_val('item_type') or 'MCQ').upper(),
            'unit_id': str(row.get('unit_id', '')).strip() if pd.notna(row.get('unit_id')) else None,
            'quest_id': str(row.get('quest_id', '')).strip() if pd.notna(row.get('quest_id')) else None,
            'topic': topic,
            'subtopic': str(get_val('subtopic') or '').strip() or None,
            'difficulty': str(row.get('difficulty', 'E')).strip()[0].upper() if pd.notna(row.get('difficulty')) else 'E',
            'question_text': str(get_val('question_text') or "[Interactive Simulation]").strip(),
            'option_a': str(get_val('option_a')) if pd.notna(get_val('option_a')) else None,
            'option_b': str(get_val('option_b')) if pd.notna(get_val('option_b')) else None,
            'option_c': str(get_val('option_c')) if pd.notna(get_val('option_c')) else None,
            'option_d': str(get_val('option_d')) if pd.notna(get_val('option_d')) else None,
            'correct_answer': str(get_val('correct_answer') or '').strip(),
            'explanation': str(get_val('explanation') or '').strip(),
            'hint': str(row.get('hint', '')).strip(),
            'metadata': metadata,
            'interaction_config': interaction_config,
            'parent_id': parent_id
        }
        
        # Cleanup "nan" strings
        for k, v in record.items():
            if isinstance(v, str) and (v.lower() == 'nan' or v.strip() == ''): record[k] = None

        records.append(record)
    return records

def sync_file(file_path):
    filename = os.path.basename(file_path)
    subject = get_subject_from_filename(filename)
    print(f"\n--- SYNCING: {filename} ({subject}) ---")
    
    try:
        xl = pd.ExcelFile(file_path)
    except Exception as e:
        print(f"Error: {e}")
        return

    raw_sheet = next((s for s in xl.sheet_names if s.upper() == 'RAW'), None)
    rephrased_sheet = next((s for s in xl.sheet_names if s.upper() in ['REPHRASED', 'REPHARASED']), None)
    quests_sheet = next((s for s in xl.sheet_names if 'QUESTS' in s.upper() or 'GRAMMAR' in s.upper()), None)
    
    master_uuid_map = {}

    if raw_sheet:
        print(f"  Reading Sheet: {raw_sheet}")
        df_raw = xl.parse(raw_sheet)
        records = process_dataframe(df_raw, subject, is_rephrased=False, master_uuid_map=master_uuid_map)
        if records:
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i:i+batch_size]
                try:
                    resp = supabase.table('manya_vault').upsert(batch, on_conflict="subject,grade_level,qid").execute()
                    print(f"    Master Batch Success: {i} to {i+len(batch)}")
                    if resp.data:
                        for item in resp.data: master_uuid_map[item['qid']] = item['id']
                except Exception as e:
                    print(f"    Error in Master Batch {i}: {e}")

    if quests_sheet:
        print(f"  Reading Sheet: {quests_sheet}")
        df_quests = xl.parse(quests_sheet)
        records = process_dataframe(df_quests, subject, is_rephrased=False, master_uuid_map=master_uuid_map)
        if records:
            batch_size = 50 # Smaller batch for potentially larger config data
            for i in range(0, len(records), batch_size):
                batch = records[i:i+batch_size]
                try:
                    supabase.table('manya_vault').upsert(batch, on_conflict="subject,grade_level,qid").execute()
                    print(f"    Quest Batch Success: {i} to {i+len(batch)}")
                except Exception as e:
                    print(f"    Error in Quest Batch {i}: {e}")
    
    if rephrased_sheet:
        print(f"  Reading Sheet: {rephrased_sheet}")
        df_variants = xl.parse(rephrased_sheet)
        records = process_dataframe(df_variants, subject, is_rephrased=True, master_uuid_map=master_uuid_map)
        if records:
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i:i+batch_size]
                try:
                    supabase.table('manya_vault').upsert(batch, on_conflict="subject,grade_level,qid").execute()
                    print(f"    Variant Batch Success: {i} to {i+len(batch)}")
                except Exception as e:
                    print(f"    Error in Variant Batch {i}: {e}")

def main():
    print("Manya Robust Bulk Sync Pipeline Starting...")
    files = [f for f in os.listdir(MAIN_BANK_DIR) if f.endswith('.xlsx')]
    print(f"Found {len(files)} bank files.")
    
    for f in files:
        sync_file(os.path.join(MAIN_BANK_DIR, f))
    
    print("\nALL SYNC OPERATIONS COMPLETE.")

if __name__ == "__main__":
    main()
