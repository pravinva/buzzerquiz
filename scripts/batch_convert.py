#!/usr/bin/env python3
"""
Batch PDF Converter - Converts all PDF quizzes to JSON format
"""

import os
import json
import sys
from pathlib import Path
from extract_pdf import PDFQuizExtractor


def batch_convert_pdfs(pdf_directory='.', output_directory='./data/quizzes'):
    """
    Convert all PDF files in a directory to JSON format

    Args:
        pdf_directory: Directory containing PDF files (default: current directory)
        output_directory: Directory to save JSON files (default: ./data/quizzes)
    """
    # Create output directory if it doesn't exist
    output_path = Path(output_directory)
    output_path.mkdir(parents=True, exist_ok=True)

    # Find all PDF files
    pdf_path = Path(pdf_directory)
    pdf_files = list(pdf_path.glob('*.pdf'))

    if not pdf_files:
        print(f"No PDF files found in {pdf_directory}")
        return

    print(f"Found {len(pdf_files)} PDF file(s)\n")

    quizzes = []
    successful = 0
    failed = 0

    for pdf_file in pdf_files:
        try:
            print(f"Processing: {pdf_file.name}")

            # Extract and parse
            extractor = PDFQuizExtractor(str(pdf_file))
            data = extractor.parse()

            # Set title from filename
            data["metadata"]["title"] = pdf_file.stem

            # Output filename
            output_file = output_path / f"{pdf_file.stem}.json"

            # Save JSON
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            total_questions = sum(
                len(player["questions"])
                for round_data in data["rounds"]
                for player in round_data["players"]
            )

            print(f"  ✓ Saved to: {output_file}")
            print(f"  ✓ Rounds: {data['metadata']['rounds']}, Questions: {total_questions}\n")

            # Add to index
            quizzes.append({
                "name": data["metadata"]["title"],
                "file": f"/data/quizzes/{output_file.name}",
                "description": f"{data['metadata']['rounds']} rounds, {total_questions} questions"
            })

            successful += 1

        except Exception as e:
            print(f"  ✗ Error: {e}\n")
            failed += 1

    # Create quiz index
    if quizzes:
        index_file = Path('./data/quiz-index.json')
        index_data = {"quizzes": quizzes}

        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)

        print(f"\n{'='*60}")
        print(f"Quiz index created: {index_file}")
        print(f"Total quizzes: {len(quizzes)}")
        print(f"Successful: {successful}")
        print(f"Failed: {failed}")
        print(f"{'='*60}")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description='Batch convert PDF quiz files to JSON'
    )
    parser.add_argument(
        '-i', '--input',
        help='Input directory containing PDF files (default: current directory)',
        default='.'
    )
    parser.add_argument(
        '-o', '--output',
        help='Output directory for JSON files (default: ./data/quizzes)',
        default='./data/quizzes'
    )

    args = parser.parse_args()

    batch_convert_pdfs(args.input, args.output)


if __name__ == "__main__":
    main()
