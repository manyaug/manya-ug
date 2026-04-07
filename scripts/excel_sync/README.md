# Question Bank Sync Tool (Excel to Supabase)

This tool allows you to synchronize MCQ questions from Excel files directly into your Supabase tables.

## Setup Instructions

1.  **Move the tool**: Copy the `excel_sync` folder to the directory where your `.xlsx` files are located.
2.  **Install Dependencies**:
    Open your terminal in that folder and run:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Configure `.env`**:
    -   Create a file named `.env` in the folder.
    -   Copy the content from `.env.template` into `.env`.
    -   (I have pre-filled the TEMPLATE with your Supabase credentials found in the app).

## How to Run

Simply run the script:
```bash
python sync_questions.py
```
The program will now list all found Excel files and ask you to select a file number to upload (or "All Files").

## Features

-   **Multi-Sheet Support**: The script automatically processes ALL sheets in an Excel file. This is perfect for files where the first sheet is "Raw" questions and the second sheet contains "Rephrased" variants.
-   **Automatic Table Mapping**:
    -   Files with `math` in the name go to `questions_math`.
    -   Files with `science` go to `questions_science`.
    -   Files with `english` go to `questions_english`.
    -   Files with `sst` go to `questions_sst`.
-   **Smart Column Mapping**: Supports various column names (e.g., `Question Text`, `QuestionText`, `questiontext`).
-   **Data Cleaning**: Handles missing values (NaN) and formats lists (tags) and JSON correctly.
-   **Batch Upload**: Efficiently uploads records in batches of 50 to avoid timeouts.
-   **Primary Key (QID)**: If a `qid` is missing in your Excel, the script will generate one based on the filename and row number to ensure unique records.

## Supported Columns

The script looks for these headers in your Excel:
- `qid` (Primary Key)
- `term`, `topic`, `subtopic`, `difficulty`, `marked_ple`
- `questiontext`, `optiona`, `optionb`, `optionc`, `optiond`, `correctanswer`
- `hint`, `detailedsolution`, `imagelocation`, `tags`, `engine_type`, `mode`
- `json_reference_path`, `model_url`, `has_hotspots`, `variant_title`, `question_count`
- `full_json_raw`
