#!/usr/bin/env python3
"""
PDF Quiz Extractor - Extracts quiz questions from ICC PDF files
"""

import re
import json
import argparse
from datetime import date
from pathlib import Path
from typing import Dict, List, Any

try:
    import PyPDF2
except ImportError:
    print("PyPDF2 not installed. Install it with: pip install PyPDF2")
    exit(1)


class PDFQuizExtractor:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.text = ""
        self.data = {
            "metadata": {
                "title": "",
                "source": Path(pdf_path).name,
                "date": str(date.today()),
                "rounds": 0
            },
            "rounds": []
        }

    def extract_text(self) -> str:
        """Extract text from PDF file"""
        try:
            with open(self.pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_parts = []

                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text_parts.append(page.extract_text())

                self.text = '\n'.join(text_parts)
                return self.text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""

    def parse(self) -> Dict[str, Any]:
        """Parse quiz questions from extracted text"""
        if not self.text:
            self.extract_text()

        lines = self.text.split('\n')
        current_round = None
        current_player = None
        current_question = None
        current_question_text = []
        collecting_question = False
        collecting_translations = False

        for line in lines:
            line = line.strip()

            # Skip empty lines
            if not line:
                continue

            # Detect round headers (ROUND TWO, ROUND THREE, etc.)
            round_match = re.match(r'ROUND\s+(\w+)', line, re.IGNORECASE)
            if round_match:
                round_num_str = round_match.group(1)
                round_num = self._word_to_number(round_num_str)
                current_round = {
                    "round_number": round_num,
                    "round_name": f"Round {round_num}",
                    "players": []
                }
                self.data["rounds"].append(current_round)
                continue

            # Detect player headers
            player_match = re.match(r'PLAYER\s+(\w+)', line, re.IGNORECASE)
            if player_match:
                player_num_str = player_match.group(1)
                player_num = self._word_to_number(player_num_str)

                # Initialize first round if not exists
                if not current_round:
                    current_round = {
                        "round_number": 1,
                        "round_name": "Round 1",
                        "players": []
                    }
                    self.data["rounds"].append(current_round)

                current_player = {
                    "player_number": player_num,
                    "questions": []
                }
                current_round["players"].append(current_player)
                continue

            # Detect question headers
            question_match = re.match(r'QUESTION\s+(\w+)', line, re.IGNORECASE)
            if question_match:
                # Save previous question if exists
                if current_question and current_question_text:
                    current_question["question_text"] = ' '.join(current_question_text).strip()
                    current_question_text = []

                question_num_str = question_match.group(1)
                question_num = self._word_to_number(question_num_str)

                current_question = {
                    "question_number": question_num,
                    "question_text": "",
                    "answer": "",
                    "translations": {},
                    "accept": []
                }

                if current_player:
                    current_player["questions"].append(current_question)

                collecting_question = True
                collecting_translations = False
                continue

            # Detect answers
            answer_match = re.match(r'ANS:\s*(.+)', line, re.IGNORECASE)
            if answer_match:
                if current_question:
                    # Save question text
                    if current_question_text:
                        current_question["question_text"] = ' '.join(current_question_text).strip()
                        current_question_text = []

                    answer_text = answer_match.group(1).strip()

                    # Extract accept alternatives in parentheses
                    accept_match = re.match(r'(.+?)\s*\(accept\s+(.+?)\)', answer_text, re.IGNORECASE)
                    if accept_match:
                        current_question["answer"] = accept_match.group(1).strip()
                        accept_list = [a.strip() for a in accept_match.group(2).split(',')]
                        current_question["accept"] = accept_list
                    else:
                        # Check for "or" alternatives
                        or_parts = re.split(r'\s+or\s+', answer_text)
                        if len(or_parts) > 1:
                            current_question["answer"] = or_parts[0].strip()
                            current_question["accept"] = [p.strip() for p in or_parts[1:]]
                        else:
                            current_question["answer"] = answer_text

                    collecting_question = False
                    collecting_translations = True
                continue

            # Detect translations
            if collecting_translations and ':' in line:
                lang_match = re.match(
                    r'(Danish|Dutch|French|German|Norwegian|Polish|Romanian|Swedish|Mandarin):\s*(.+)',
                    line,
                    re.IGNORECASE
                )
                if lang_match:
                    lang = lang_match.group(1).lower()
                    translation = lang_match.group(2).strip()
                    translation = re.sub(r'accept\s+', '', translation)
                    if current_question:
                        current_question["translations"][lang] = translation
                    continue

            # Collect question text
            if collecting_question and current_question:
                # Skip tiebreaker, spare, and other headers
                if not re.match(r'(TIEBREAKER|SPARE|NEAREST)', line, re.IGNORECASE):
                    current_question_text.append(line)

        # Save last question
        if current_question and current_question_text:
            current_question["question_text"] = ' '.join(current_question_text).strip()

        # Update metadata
        self.data["metadata"]["rounds"] = len(self.data["rounds"])

        # Clean up empty fields
        self._cleanup_data()

        return self.data

    def _word_to_number(self, word: str) -> int:
        """Convert word numbers to integers"""
        word_map = {
            'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5,
            'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10
        }
        # Try to convert directly if it's already a number
        try:
            return int(word)
        except ValueError:
            return word_map.get(word.upper(), 1)

    def _cleanup_data(self):
        """Remove empty fields"""
        for round_data in self.data["rounds"]:
            for player in round_data["players"]:
                for question in player["questions"]:
                    if not question.get("translations"):
                        question.pop("translations", None)
                    if not question.get("accept"):
                        question.pop("accept", None)


def main():
    parser = argparse.ArgumentParser(
        description='Extract quiz questions from ICC PDF files'
    )
    parser.add_argument(
        'pdf_file',
        help='Input PDF file'
    )
    parser.add_argument(
        '-o', '--output',
        help='Output JSON file (default: same name as PDF with .json extension)',
        default=None
    )
    parser.add_argument(
        '-t', '--title',
        help='Quiz title (default: extracted from filename)',
        default=None
    )

    args = parser.parse_args()

    # Set output filename
    if args.output is None:
        pdf_path = Path(args.pdf_file)
        args.output = str(pdf_path.with_suffix('.json'))

    # Set title from filename if not provided
    if args.title is None:
        args.title = Path(args.pdf_file).stem

    # Extract and parse
    print(f"Extracting text from {args.pdf_file}...")
    extractor = PDFQuizExtractor(args.pdf_file)
    data = extractor.parse()

    # Update metadata
    data["metadata"]["title"] = args.title

    # Write output
    try:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\n✓ Successfully extracted quiz to {args.output}")
        print(f"  Total rounds: {data['metadata']['rounds']}")

        total_questions = sum(
            len(player["questions"])
            for round_data in data["rounds"]
            for player in round_data["players"]
        )
        print(f"  Total questions: {total_questions}")

    except Exception as e:
        print(f"Error writing output file: {e}")


if __name__ == "__main__":
    main()
