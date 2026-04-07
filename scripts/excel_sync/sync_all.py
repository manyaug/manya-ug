import os
import json
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

COLUMN_MAPPING = {
    "qid": "qid",
    "questionid": "qid",
    "q_id": "qid",
    "term": "term",
    "topic": "topic",
    "subtopic": "subtopic",
    "sub_topic": "subtopic",
    "difficulty": "difficulty",
    "marked_ple": "marked_ple",
    "questiontype": "questiontype",
    "question_type": "questiontype",
    "parentid": "parentid",
    "orderinparent": "orderinparent",
    "questiontext": "questiontext",
    "question_text": "questiontext",
    "question": "questiontext",
    "optiona": "optiona",
    "option_a": "optiona",
    "optionb": "optionb",
    "option_b": "optionb",
    "optionc": "optionc",
    "option_c": "optionc",
    "optiond": "optiond",
    "option_d": "optiond",
    "correctanswer": "correctanswer",
    "correct_answer": "correctanswer",
    "answer": "correctanswer",
    "hint": "hint",
    "detailedsolution": "detailedsolution",
    "detailed_solution": "detailedsolution",
    "explanation": "detailedsolution",
    "imagelocation": "imagelocation",
    "tags": "tags",
    "engine_type": "engine_type",
    "mode": "mode",
    "json_reference_path": "json_reference_path",
    "model_url": "model_url",
    "has_hotspots": "has_hotspots",
    "variant_title": "variant_title",
    "question_count": "question_count",
    "full_json_raw": "full_json_raw",
}

def get_target_table(filename):
    filename = filename.lower()
    if "english" in filename: return "questions_english"
    elif "math" in filename: return "questions_math"
    elif "science" in filename: return "questions_science"
    elif "sst" in filename: return "questions_sst"
    return "questions_english"

def clean_value(val):
    if pd.isna(val) or val == "": return None
    if str(val).lower() == "true": return True
    if str(val).lower() == "false": return False
    return val

def process_file(file_path):
    print(f"\n🚀 Processing: {os.path.basename(file_path)}")
    try:
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return

    for sheet_name in sheet_names:
        print(f"  📄 Reading sheet: [{sheet_name}]...")
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
        except Exception as e:
            print(f"  ❌ Error: {e}")
            continue

        if df.empty: continue

        df.columns = [str(c).lower().strip().replace(" ", "_").replace("-", "_") for c in df.columns]
        mapped_columns = {col: COLUMN_MAPPING[col] for col in df.columns if col in COLUMN_MAPPING}
        df_mapped = df[list(mapped_columns.keys())].rename(columns=mapped_columns)
        
        if 'qid' not in df_mapped.columns:
            df_mapped['qid'] = [f"{os.path.basename(file_path)}_{sheet_name}_{i}" for i in range(len(df_mapped))]

        records = []
        for _, row in df_mapped.iterrows():
            record = row.to_dict()
            clean_record = {k: clean_value(v) for k, v in record.items()}
            if clean_record.get('tags') and isinstance(clean_record['tags'], str):
                clean_record['tags'] = [t.strip() for t in clean_record['tags'].split(',')]
            if clean_record.get('full_json_raw') and isinstance(clean_record['full_json_raw'], str):
                try: clean_record['full_json_raw'] = json.loads(clean_record['full_json_raw'])
                except: pass
            
            clean_record['filename'] = os.path.basename(file_path)
            clean_record['source_sheet'] = sheet_name
            records.append(clean_record)

        table_name = get_target_table(file_path)
        print(f"  ⬆️ Uploading {len(records)} records to {table_name}...")
        
        batch_size = 50
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                supabase.table(table_name).upsert(batch).execute()
            except Exception as e:
                print(f"  ❌ Batch error: {e}")
                
    print(f"✅ Completed: {os.path.basename(file_path)}")

if __name__ == "__main__":
    files = [f for f in os.listdir('.') if f.endswith('.xlsx') and not f.startswith('~$')]
    for file in files:
        process_file(file)
