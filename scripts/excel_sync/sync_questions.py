import os
import re
import json
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
from tqdm import tqdm
import math

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define column mapping from common Excel headers to Supabase column names
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
    """Determine the Supabase table name based on the filename."""
    filename = filename.lower()
    if "english" in filename:
        return "questions_english"
    elif "math" in filename:
        return "questions_math"
    elif "science" in filename:
        return "questions_science"
    elif "sst" in filename:
        return "questions_sst"
    else:
        return "questions_english"  # Default

def clean_value(val):
    """Handle NaN and type conversions for Supabase."""
    if pd.isna(val) or val == "":
        return None
    
    # Handle boolean strings
    if str(val).lower() == "true": return True
    if str(val).lower() == "false": return False
    
    return val

def process_file(file_path):
    print(f"\nProcessing: {os.path.basename(file_path)}")
    
    # Load the excel file to see sheet names
    try:
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    # Process each sheet
    for sheet_name in sheet_names:
        print(f"Reading sheet: [{sheet_name}]...")
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
        except Exception as e:
            print(f"Error reading sheet {sheet_name}: {e}")
            continue

        if df.empty:
            print(f"Sheet {sheet_name} is empty. Skipping.")
            continue

        # Normalize column names for mapping
        df.columns = [str(c).lower().strip().replace(" ", "_").replace("-", "_") for c in df.columns]
        
        # Map columns
        mapped_columns = {col: COLUMN_MAPPING[col] for col in df.columns if col in COLUMN_MAPPING}
        df_mapped = df[list(mapped_columns.keys())].rename(columns=mapped_columns)
        
        # Ensure QID exists
        if 'qid' not in df_mapped.columns:
            print(f"Adding generated QIDs to {sheet_name} in {os.path.basename(file_path)}")
            df_mapped['qid'] = [f"{os.path.basename(file_path)}_{sheet_name}_{i}" for i in range(len(df_mapped))]

        # Convert rows to dict and clean
        records = []
        for _, row in df_mapped.iterrows():
            record = row.to_dict()
            clean_record = {k: clean_value(v) for k, v in record.items()}
            
            # Specific formatting for tags (text array)
            if clean_record.get('tags') and isinstance(clean_record['tags'], str):
                clean_record['tags'] = [t.strip() for t in clean_record['tags'].split(',')]
            
            # Specific formatting for full_json_raw (JSONB)
            if clean_record.get('full_json_raw') and isinstance(clean_record['full_json_raw'], str):
                try:
                    clean_record['full_json_raw'] = json.loads(clean_record['full_json_raw'])
                except:
                    pass # Keep as string if not valid JSON

            # Extra metadata from file
            clean_record['filename'] = os.path.basename(file_path)
            clean_record['folder'] = os.path.dirname(file_path)
            clean_record['source_sheet'] = sheet_name
            
            records.append(clean_record)

        # Batch upsert
        table_name = get_target_table(file_path)
        print(f"Uploading {len(records)} records from sheet [{sheet_name}] to {table_name}...")
        
        batch_size = 50
        for i in tqdm(range(0, len(records), batch_size)):
            batch = records[i:i + batch_size]
            try:
                response = supabase.table(table_name).upsert(batch).execute()
            except Exception as e:
                print(f"Error in batch {i//batch_size} of sheet {sheet_name}: {e}")
                
    print(f"Completed: {os.path.basename(file_path)}")

def main():
    # Scan current directory for excel files
    files = [f for f in os.listdir('.') if f.endswith('.xlsx') and not f.startswith('~$')]
    
    if not files:
        print("No .xlsx files found in the current directory.")
        return

    print("\n--- Excel to Supabase Question Sync ---")
    print("Found the following Excel files:")
    for i, file in enumerate(files, 1):
        print(f"{i}. {file}")
    print(f"{len(files) + 1}. [All Files]")
    
    selection = input(f"\nSelect a file number (1-{len(files) + 1}) to upload: ").strip()
    
    try:
        idx = int(selection) - 1
        if idx == len(files):
            # Process ALL files
            print(f"Starting sync for ALL {len(files)} files...")
            for file in files:
                process_file(file)
        elif 0 <= idx < len(files):
            # Process SELECTED file
            process_file(files[idx])
        else:
            print("Invalid selection. Exiting.")
    except ValueError:
        print("Please enter a valid number.")

if __name__ == "__main__":
    main()
