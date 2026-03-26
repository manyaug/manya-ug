import os
from pathlib import Path
from datetime import datetime

def get_folder_structure(current_path, prefix="", is_last=True, exclude_dirs=None):
    """
    Recursive function to generate the tree structure strings.
    """
    if exclude_dirs is None:
        exclude_dirs = ['.git', '__pycache__', 'venv', 'node_modules', '.idea', '.vscode']
    
    structure = []
    
    # Determine the name to display
    display_name = f"📁 {current_path.name}/" if current_path.is_dir() else f"📄 {current_path.name}"
    
    # If this is the root folder (prefix is empty), just add the name
    if prefix == "":
        structure.append(display_name)
    else:
        # Add branch character
        branch = "└── " if is_last else "├── "
        structure.append(f"{prefix}{branch}{display_name}")
    
    # If it's a file, we are done with this branch
    if not current_path.is_dir():
        return structure

    # If it's a directory, process its children
    # Prepare the prefix for children
    if prefix == "":
        new_prefix = "    " if is_last else "│   "
    else:
        new_prefix = prefix + ("    " if is_last else "│   ")
    
    try:
        # Get all items, sorted by Type (Folder first) then Name
        # lambda x: (is_file, name) -> creates tuple (False, 'a') for folder, (True, 'a') for file
        # False comes before True, so Folders come first
        items = sorted(list(current_path.iterdir()), key=lambda x: (not x.is_dir(), x.name.lower()))
        
        # Filter out excluded directories
        items = [item for item in items if not (item.is_dir() and item.name in exclude_dirs)]
        
        count = len(items)
        for i, item in enumerate(items):
            is_last_item = (i == count - 1)
            # Recursively add children
            structure.extend(get_folder_structure(item, new_prefix, is_last_item, exclude_dirs))
                
    except PermissionError:
        structure.append(f"{new_prefix}└── ⚠️ Permission denied")
    except Exception as e:
        structure.append(f"{new_prefix}└── ⚠️ Error: {e}")
    
    return structure

def generate_tree_map():
    print("\n" + "="*60)
    print("🌳 FOLDER TREE GENERATOR")
    print("="*60)
    
    # 1. Get Folder Path
    while True:
        folder_input = input("\nEnter the folder path to map: ").strip()
        folder_input = folder_input.strip('"').strip("'") # Remove quotes
        folder_path = Path(os.path.expanduser(folder_input)).resolve()
        
        if not folder_path.exists():
            print("❌ Path does not exist.")
        elif not folder_path.is_dir():
            print("❌ Input is a file, not a folder.")
        else:
            break

    # 2. Get Exclusions
    default_excludes = ['.git', '__pycache__', 'venv', 'node_modules', '.idea', '.vscode', 'dist', 'build']
    print(f"\nDefault ignored folders: {', '.join(default_excludes)}")
    exclude_input = input("Add more folders to ignore (comma separated) or press Enter: ").strip()
    
    exclude_dirs = default_excludes
    if exclude_input:
        extras = [x.strip() for x in exclude_input.split(',')]
        exclude_dirs.extend(extras)

    # 3. Output Filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    default_output = f"tree_{folder_path.name}_{timestamp}.txt"
    output_file = input(f"\nOutput filename [default: {default_output}]: ").strip()
    if not output_file:
        output_file = default_output

    print(f"\n🔍 Generating tree for: {folder_path}...")

    try:
        # Generate the lines
        tree_lines = get_folder_structure(folder_path, exclude_dirs=exclude_dirs)
        
        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"Directory Tree for: {folder_path}\n")
            f.write(f"Generated on: {datetime.now()}\n")
            f.write("="*50 + "\n\n")
            
            for line in tree_lines:
                f.write(line + "\n")
                print(line) # Optional: Print to console as well so you see it working

        print("\n" + "="*60)
        print(f"✅ Tree saved to: {os.path.abspath(output_file)}")
        print("="*60)

    except Exception as e:
        print(f"\n❌ An error occurred: {e}")

if __name__ == "__main__":
    try:
        generate_tree_map()
    except KeyboardInterrupt:
        print("\nstopped.")