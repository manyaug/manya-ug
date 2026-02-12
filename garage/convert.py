import pandas as pd
import json
import os

# 1. Setup the paths to your files
base_path = r"C:/Users/HP/OneDrive/Desktop/Manya-p7/manya_app/content"

files_to_convert = [
    {"in": "sst/sst_p7_question_bank.xlsx", "out": "sst/sst_bank.json"},
    {"in": "english/english-p7-question-bank.xlsx", "out": "english/english_bank.json"},
    {"in": "math/math_p7_question_bank.xlsx", "out": "math/math_bank.json"},
    {"in": "science/science-p7-question-bank.xlsx", "out": "science/science_bank.json"}
]

def clean_json_string(val):
    """Helper to check if a string is valid JSON and return it as an object"""
    if pd.isna(val) or val == "":
        return None
    if isinstance(val, str) and (val.startswith('{') or val.startswith('[')):
        try:
            return json.loads(val)
        except:
            return val
    return val

def convert():
    for file in files_to_convert:
        input_path = os.path.join(base_path, file["in"])
        output_path = os.path.join(base_path, file["out"])
        
        print(f"Reading {file['in']}...")
        
        if not os.path.exists(input_path):
            print(f"❌ File not found: {input_path}")
            continue

        # 2. Read Excel
        df = pd.read_excel(input_path)

        # 3. Process each row into the "Manya Format"
        bank = []
        for _, row in df.iterrows():
            question = {
                "id": str(row.get('Q_ID', '')),
                "topic": str(row.get('Topic', '')),
                "sub_topic": str(row.get('sub_topic', '')),
                "difficulty": str(row.get('Difficulty', 'E')),
                "type": str(row.get('Question_Type', 'MCQ')),
                "text": str(row.get('Question_Text', '')),
                "options": [
                    str(row.get('Option_A', '')),
                    str(row.get('Option_B', '')),
                    str(row.get('Option_C', '')),
                    str(row.get('Option_D', ''))
                ],
                "answer": str(row.get('Correct_Answer', '')),
                "hint": str(row.get('Hint', '')),
                "engine": str(row.get('Engine_Type_sim', '')),
                "mode": str(row.get('Mode_sim', '')),
                "simData": clean_json_string(row.get('Simulation_Data_sim', ''))
            }
            bank.append(question)

        # 4. Save to JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(bank, f, indent=2, ensure_ascii=False)
            
        print(f"✅ Successfully created {file['out']} ({len(bank)} rows)")

if __name__ == "__main__":
    convert()