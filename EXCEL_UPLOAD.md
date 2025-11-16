# Excel Upload Feature

This feature allows you to create quiz sets by uploading Excel files (.xlsx or .xls) with questions and answers.

## How to Use

### 1. Access the Admin Page

Navigate to `/admin.html` on your deployed site or open `public/admin.html` locally.

### 2. Prepare Your Excel File

Create an Excel file with the following format:

| Column A (Question) | Column B (Answer) | Column C (Alternative Answers - Optional) |
|---------------------|-------------------|-------------------------------------------|
| What is the capital of France? | Paris | |
| What is 2 + 2? | 4 | four, Four |
| Who wrote Romeo and Juliet? | William Shakespeare | Shakespeare |

**Format Requirements:**
- **Column A**: Question text (required)
- **Column B**: Correct answer (required)
- **Column C**: Alternative acceptable answers, comma-separated (optional)
- First row can be headers or data (headers will be auto-detected)
- Empty rows will be automatically skipped
- You can have as many questions as needed

### 3. Upload the File

1. Click the "Choose Excel file or drag & drop" area, or drag your Excel file directly onto it
2. Optionally enter a custom quiz title (otherwise the filename will be used)
3. Click "Upload and Convert"

### 4. Download the Quiz JSON

After successful upload, you'll see:
- Quiz title
- Number of questions
- Preview of the generated JSON

You can then:
- **Download JSON**: Save the quiz file to your computer
- **Copy to Clipboard**: Copy the JSON for pasting elsewhere
- **Upload Another**: Create another quiz

### 5. Deploy the Quiz

To make the quiz available in your app:

1. Save the downloaded JSON file to `public/data/quizzes/` directory
2. Update `public/data/quiz-index.json` to include your new quiz:

```json
{
  "quizzes": [
    {
      "name": "Your Quiz Name",
      "file": "/data/quizzes/your-quiz-name.json",
      "description": "1 round, X questions"
    }
  ]
}
```

3. Commit and push the changes to deploy

## Generated Quiz Structure

The Excel file is automatically converted to the ICC Quiz Cards JSON format:

```json
{
  "metadata": {
    "title": "Quiz Title",
    "source": "excel_upload_2025-01-15",
    "date": "2025-01-15",
    "rounds": 1
  },
  "rounds": [
    {
      "round_number": 1,
      "round_name": "Quiz Title",
      "players": [
        {
          "player_number": 1,
          "questions": [
            {
              "question_number": 1,
              "question_text": "What is the capital of France?",
              "answer": "Paris",
              "accept": []
            }
          ]
        }
      ]
    }
  ]
}
```

## API Endpoint

The upload is handled by the `/api/upload-quiz` serverless function.

**Endpoint**: `POST /api/upload-quiz`

**Request**: `multipart/form-data`
- `file`: Excel file (.xlsx or .xls)
- `title`: Optional quiz title

**Response**:
```json
{
  "success": true,
  "quiz": { /* quiz JSON object */ },
  "message": "Quiz parsed successfully"
}
```

## Security Considerations

**Important**: The admin upload page should only be used by trusted administrators. Do not expose this page to untrusted users.

The xlsx library has known vulnerabilities (prototype pollution and ReDoS) that can be exploited with maliciously crafted Excel files. This is acceptable for internal/trusted use but should not be exposed to public users.

**Recommendations**:
- Only use this feature for your own quiz creation
- Do not allow untrusted users to upload files
- Consider adding authentication/authorization if deploying publicly
- Regularly update dependencies

## Example Excel Template

You can create a template file with these columns:

1. Open Excel/Google Sheets
2. Add headers: `Question`, `Answer`, `Alternatives`
3. Fill in your quiz data
4. Save as `.xlsx`
5. Upload to the admin page

## Troubleshooting

**Error: "No file uploaded"**
- Make sure you've selected a file before clicking Upload

**Error: "Failed to process Excel file"**
- Check that your file is a valid .xlsx or .xls file
- Ensure questions and answers are in columns A and B
- Make sure the file isn't corrupted

**Quiz not showing up in app**
- Remember to add the quiz to `quiz-index.json`
- Check that the file is in the correct directory: `public/data/quizzes/`
- Verify the JSON is valid (use a JSON validator)

## Development

To run locally:

```bash
# Install dependencies
npm install

# Run with Vercel CLI (for serverless functions)
vercel dev
```

Then navigate to `http://localhost:3000/admin.html`
