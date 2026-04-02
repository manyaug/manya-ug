import os

def generate_file_tree(start_path, output_file):
    """
    Generates a file tree structure starting from 'start_path'
    and writes it to 'output_file'.
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"File tree for: {start_path}\n\n")
        for root, dirs, files in os.walk(start_path):
            level = root.replace(start_path, '').count(os.sep)
            indent = '    ' * level
            f.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = '    ' * (level + 1)
            for file in files:
                f.write(f"{subindent}{file}\n")

if __name__ == "__main__":
    # You can change '.' to any path you want to scan,
    # e.g., 'C:/Users/YourUser/Documents' or '/home/youruser/my_project'
    # By default, it scans the directory where the script is run.
    target_directory = "."
    output_filename = "filetree.txt"

    print(f"Scanning '{os.path.abspath(target_directory)}'...")
    generate_file_tree(target_directory, output_filename)
    print(f"File tree successfully written to '{output_filename}'")