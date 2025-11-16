// Vercel Serverless Function for Excel Quiz Upload
// Parses Excel files and converts them to quiz JSON format

import formidable from 'formidable';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Disable body parser to handle multipart form data
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Parse the multipart form data
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB max
            allowEmptyFiles: false,
        });

        const [fields, files] = await form.parse(req);

        // Get the uploaded file
        const uploadedFile = files.file?.[0];
        if (!uploadedFile) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Read the Excel file
        const workbook = XLSX.readFile(uploadedFile.filepath);

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Get quiz title from fields or use filename
        const quizTitle = fields.title?.[0] || uploadedFile.originalFilename?.replace(/\.(xlsx?|csv)$/i, '') || 'Untitled Quiz';

        // Convert Excel data to quiz format
        const quizData = convertExcelToQuiz(data, quizTitle);

        // Return the quiz data
        res.status(200).json({
            success: true,
            quiz: quizData,
            message: 'Quiz parsed successfully'
        });

    } catch (error) {
        console.error('Error processing Excel file:', error);
        res.status(500).json({
            error: 'Failed to process Excel file',
            message: error.message
        });
    }
}

/**
 * Convert Excel data to quiz JSON format
 * Expected Excel format:
 * - Column A: Questions
 * - Column B: Answers
 * - Optional: Column C for alternative answers (comma-separated)
 */
function convertExcelToQuiz(data, title) {
    // Remove header row if it exists (check if first row looks like headers)
    let startIndex = 0;
    if (data.length > 0) {
        const firstRow = data[0];
        const hasHeaders = firstRow.some(cell =>
            typeof cell === 'string' &&
            /^(question|answer|q|a)/i.test(cell.trim())
        );
        if (hasHeaders) {
            startIndex = 1;
        }
    }

    // Parse questions and answers
    const questions = [];
    for (let i = startIndex; i < data.length; i++) {
        const row = data[i];

        // Skip empty rows
        if (!row || row.length === 0 || (!row[0] && !row[1])) {
            continue;
        }

        const questionText = row[0]?.toString().trim();
        const answerText = row[1]?.toString().trim();

        // Skip if either question or answer is missing
        if (!questionText || !answerText) {
            continue;
        }

        const question = {
            question_number: questions.length + 1,
            question_text: questionText,
            answer: answerText
        };

        // Add alternative answers if provided in column C
        if (row[2]) {
            const alternatives = row[2].toString()
                .split(',')
                .map(alt => alt.trim())
                .filter(alt => alt.length > 0);

            if (alternatives.length > 0) {
                question.accept = alternatives;
            }
        }

        questions.push(question);
    }

    // Create quiz structure following the schema
    const quiz = {
        metadata: {
            title: title,
            source: `excel_upload_${new Date().toISOString().split('T')[0]}`,
            date: new Date().toISOString().split('T')[0],
            rounds: 1
        },
        rounds: [
            {
                round_number: 1,
                round_name: title,
                players: [
                    {
                        player_number: 1,
                        questions: questions
                    }
                ]
            }
        ]
    };

    return quiz;
}
