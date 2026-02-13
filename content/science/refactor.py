import json
import os
import demjson3  # Essential for parsing unquoted keys in your data

def parse_dirty_json(value):
    """
    Parses strings that look like JavaScript objects (unquoted keys).
    Example input: "{engineType: READER_STUDY, ...}"
    """
    if not isinstance(value, str):
        return value
    
    # Clean up whitespace
    value = value.strip()
    
    # If it looks like a dictionary or list, try to parse it
    if (value.startswith('{') and value.endswith('}')) or (value.startswith('[') and value.endswith(']')):
        try:
            # demjson3.decode is powerful enough to handle {key: value} format
            return demjson3.decode(value)
        except Exception:
            # If parsing fails, return original string (or None if it was just "null")
            if value.lower() == "null":
                return None
            return value
            
    # Handle the specific string "null"
    if value.lower() == "null":
        return None
        
    return value

def refactor_question_bank(data):
    refactored_list = []
    
    for item in data:
        # 1. Strip spaces from keys (" Q_ID " -> "Q_ID")
        clean_item = {k.strip(): v for k, v in item.items()}
        
        final_item = {}
        simulation_obj = {}
        options_obj = {}
        
        # 2. Extract and Parse the critical Simulation Data
        # We look specifically for 'Simulation_Data_sim'
        if 'Simulation_Data_sim' in clean_item:
            sim_data_raw = clean_item['Simulation_Data_sim']
            if sim_data_raw and str(sim_data_raw).lower() != 'null':
                # This turns the string string "{engineType: ...}" into a real Object
                simulation_obj = parse_dirty_json(sim_data_raw)
                
                # If parsing failed and returned a string, make it an object structure
                if isinstance(simulation_obj, str):
                     # If it failed to parse, we leave it empty to avoid breaking JSON structure
                     # or you could assign {'raw': simulation_obj}
                     simulation_obj = {} 

        # 3. Process all other keys
        for key, value in clean_item.items():
            # Skip the main data field we already processed
            if key == 'Simulation_Data_sim':
                continue
                
            # Handle "null" strings
            if isinstance(value, str) and value.strip().lower() == 'null':
                value = None

            # Logic: Group Options
            if key.startswith('Option_'):
                # Extract the letter (A, B, C...)
                opt_letter = key.split('_')[-1]
                options_obj[opt_letter] = value
                continue

            # Logic: Merge other _sim fields into the Simulation object
            if key.endswith('_sim'):
                # We keep the key as is, just added to the simulation block
                # OR we can strip the suffix if you prefer cleaner JSON. 
                # Based on your request "no need to change names", we keep the key, 
                # but put it INSIDE the simulation object.
                simulation_obj[key] = value
                continue

            # Logic: Parse Detailed_Solution if it's a stringified object
            if key == 'Detailed_Solution':
                value = parse_dirty_json(value)
            
            # Logic: Parse Tags if it looks like a list string "[A, B]"
            if key == 'Tags' and isinstance(value, str) and value.startswith('['):
                # Remove brackets and split by comma
                clean_tags = value.strip('[]').split(',')
                # Clean whitespace from individual tags
                value = [t.strip() for t in clean_tags]

            # Add to final object
            final_item[key] = value

        # 4. Assemble the final structure
        
        # Add Options block if it has content
        if options_obj:
            final_item['Options'] = options_obj
        else:
            final_item['Options'] = None

        # Add Simulation block if it has content
        if simulation_obj:
            final_item['Simulation'] = simulation_obj
        else:
            final_item['Simulation'] = None

        refactored_list.append(final_item)

    return refactored_list

def main():
    input_filename = 'science_bank.json'
    
    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            original_data = json.load(f)
    except FileNotFoundError:
        print("File not found.")
        return

    print("Refactoring and parsing embedded objects...")
    final_data = refactor_question_bank(original_data)

    output_filename = 'science_bank_refactored.json'
    
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
        
    print(f"Done! Saved to {output_filename}")

if __name__ == "__main__":
    main()