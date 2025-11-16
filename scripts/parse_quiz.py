#!/usr/bin/env python3
"""
Quiz Parser - Converts quiz text from PDF to structured JSON format
"""

import re
import json
from datetime import date
from typing import Dict, List, Any
import argparse


class QuizParser:
    def __init__(self, text: str):
        self.text = text
        self.current_round = 1
        self.data = {
            "metadata": {
                "title": "",
                "source": "",
                "date": str(date.today()),
                "rounds": 0
            },
            "rounds": []
        }

    def parse(self) -> Dict[str, Any]:
        """Main parsing function"""
        lines = self.text.split('\n')

        current_round = None
        current_player = None
        current_question = None
        current_question_text = []
        collecting_question = False
        collecting_translations = False

        for i, line in enumerate(lines):
            line = line.strip()

            # Skip empty lines
            if not line:
                continue

            # Detect round headers
            round_match = re.match(r'ROUND\s+(\w+)', line, re.IGNORECASE)
            if round_match:
                round_num_str = round_match.group(1)
                # Convert word numbers to integers
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
                    current_question["question_text"] = ' '.join(current_question_text)
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
                        current_question["question_text"] = ' '.join(current_question_text)
                        current_question_text = []

                    answer_text = answer_match.group(1).strip()

                    # Extract accept alternatives
                    accept_match = re.match(r'(.+?)\s*\(accept\s+(.+?)\)', answer_text, re.IGNORECASE)
                    if accept_match:
                        current_question["answer"] = accept_match.group(1).strip()
                        accept_list = accept_match.group(2).split(',')
                        current_question["accept"] = [a.strip() for a in accept_list]
                    else:
                        # Check for "or" alternatives
                        or_match = re.match(r'(.+?)\s+or\s+(.+)', answer_text)
                        if or_match:
                            current_question["answer"] = or_match.group(1).strip()
                            current_question["accept"] = [or_match.group(2).strip()]
                        else:
                            current_question["answer"] = answer_text

                    collecting_question = False
                    collecting_translations = True
                continue

            # Detect translations
            if collecting_translations and ':' in line:
                # Common language patterns
                lang_match = re.match(r'(Danish|Dutch|French|German|Norwegian|Polish|Romanian|Swedish|Mandarin):\s*(.+)', line)
                if lang_match:
                    lang = lang_match.group(1).lower()
                    translation = lang_match.group(2).strip()
                    # Handle "accept" in translations
                    translation = re.sub(r'accept\s+', '', translation)
                    if current_question:
                        current_question["translations"][lang] = translation
                    continue

            # Collect question text
            if collecting_question and current_question:
                # Skip tiebreaker headers and spare headers
                if not re.match(r'(TIEBREAKER|SPARE|NEAREST)', line, re.IGNORECASE):
                    current_question_text.append(line)

        # Save last question
        if current_question and current_question_text:
            current_question["question_text"] = ' '.join(current_question_text)

        # Update metadata
        self.data["metadata"]["rounds"] = len(self.data["rounds"])

        # Clean up empty translations and accept lists
        self._cleanup_data()

        return self.data

    def _word_to_number(self, word: str) -> int:
        """Convert word numbers (ONE, TWO, etc.) to integers"""
        word_map = {
            'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5,
            'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10
        }
        return word_map.get(word.upper(), 1)

    def _cleanup_data(self):
        """Remove empty fields from the data structure"""
        for round_data in self.data["rounds"]:
            for player in round_data["players"]:
                for question in player["questions"]:
                    if not question.get("translations"):
                        question.pop("translations", None)
                    if not question.get("accept"):
                        question.pop("accept", None)


def main():
    parser = argparse.ArgumentParser(
        description='Parse quiz text from PDF and convert to JSON'
    )
    parser.add_argument(
        'input_file',
        help='Input text file (extracted from PDF)'
    )
    parser.add_argument(
        '-o', '--output',
        help='Output JSON file (default: output.json)',
        default='output.json'
    )
    parser.add_argument(
        '-t', '--title',
        help='Quiz title',
        default='ICC Quiz'
    )
    parser.add_argument(
        '-s', '--source',
        help='Source PDF name',
        default=''
    )

    args = parser.parse_args()

    # Read input file
    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            text = f.read()
    except FileNotFoundError:
        print(f"Error: File '{args.input_file}' not found")
        return
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    # Parse the quiz
    quiz_parser = QuizParser(text)
    data = quiz_parser.parse()

    # Update metadata
    data["metadata"]["title"] = args.title
    data["metadata"]["source"] = args.source or args.input_file

    # Write output
    try:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully parsed quiz to {args.output}")
        print(f"Total rounds: {data['metadata']['rounds']}")
        total_questions = sum(
            len(q["questions"])
            for r in data["rounds"]
            for q in r["players"]
        )
        print(f"Total questions: {total_questions}")
    except Exception as e:
        print(f"Error writing output file: {e}")


if __name__ == "__main__":
    main()
