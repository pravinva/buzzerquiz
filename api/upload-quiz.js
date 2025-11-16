// Vercel Serverless Function for Excel Quiz Upload
// Parses Excel files and converts them to quiz JSON format

import formidable from 'formidable';
import * as XLSX from 'xlsx';
import { Octokit } from '@octokit/rest';

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

        // Try to save to repository if GitHub token is configured
        let saved = false;
        let quizFilePath = null;

        if (process.env.GITHUB_TOKEN) {
            try {
                const saveResult = await saveQuizToRepo(quizData, quizTitle);
                saved = true;
                quizFilePath = saveResult.quizPath;
            } catch (saveError) {
                console.error('Error saving to repository:', saveError);
                // Continue without saving - return quiz data for manual download
            }
        }

        // Return the quiz data
        res.status(200).json({
            success: true,
            quiz: quizData,
            saved: saved,
            quizPath: quizFilePath,
            message: saved
                ? 'Quiz saved to repository successfully'
                : 'Quiz parsed successfully (download to save manually)'
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

/**
 * Save quiz to GitHub repository and update quiz index
 */
async function saveQuizToRepo(quizData, quizTitle) {
    // Initialize Octokit
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    // Get repository info from environment variables or use defaults
    const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
    const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!owner || !repo) {
        throw new Error('GitHub repository not configured. Set GITHUB_OWNER and GITHUB_REPO environment variables.');
    }

    // Create filename from quiz title
    const filename = quizTitle
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
    const quizPath = `public/data/quizzes/${filename}.json`;

    // Get current branch reference
    const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
    });

    const currentCommitSha = refData.object.sha;

    // Get current commit to get the tree
    const { data: commitData } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha
    });

    const currentTreeSha = commitData.tree.sha;

    // Get current quiz-index.json
    let quizIndex;
    try {
        const { data: indexFile } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'public/data/quiz-index.json',
            ref: branch
        });

        const indexContent = Buffer.from(indexFile.content, 'base64').toString('utf-8');
        quizIndex = JSON.parse(indexContent);
    } catch (error) {
        // If file doesn't exist, create new index
        quizIndex = { quizzes: [] };
    }

    // Count questions
    const totalQuestions = quizData.rounds.reduce((total, round) => {
        return total + round.players.reduce((roundTotal, player) => {
            return roundTotal + player.questions.length;
        }, 0);
    }, 0);

    // Add new quiz to index (or update if exists)
    const existingIndex = quizIndex.quizzes.findIndex(q => q.file === `/data/quizzes/${filename}.json`);
    const newEntry = {
        name: quizTitle,
        file: `/data/quizzes/${filename}.json`,
        description: `1 round, ${totalQuestions} questions`
    };

    if (existingIndex >= 0) {
        quizIndex.quizzes[existingIndex] = newEntry;
    } else {
        quizIndex.quizzes.push(newEntry);
    }

    // Create blobs for both files
    const [quizBlob, indexBlob] = await Promise.all([
        octokit.git.createBlob({
            owner,
            repo,
            content: Buffer.from(JSON.stringify(quizData, null, 2)).toString('base64'),
            encoding: 'base64'
        }),
        octokit.git.createBlob({
            owner,
            repo,
            content: Buffer.from(JSON.stringify(quizIndex, null, 2)).toString('base64'),
            encoding: 'base64'
        })
    ]);

    // Create new tree with both files
    const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree: [
            {
                path: quizPath,
                mode: '100644',
                type: 'blob',
                sha: quizBlob.data.sha
            },
            {
                path: 'public/data/quiz-index.json',
                mode: '100644',
                type: 'blob',
                sha: indexBlob.data.sha
            }
        ]
    });

    // Create commit
    const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: `Add quiz: ${quizTitle}`,
        tree: newTree.sha,
        parents: [currentCommitSha]
    });

    // Update branch reference
    await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha
    });

    return {
        quizPath,
        commitSha: newCommit.sha,
        quizUrl: `/data/quizzes/${filename}.json`
    };
}
