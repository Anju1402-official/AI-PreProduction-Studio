"""
Regex-based screenplay structural parser.

Detects scene headings (INT./EXT./INT-EXT./I-E.), ALL-CAPS character cue
lines, dialogue blocks, and action lines from raw screenplay text. This is
the same parsing approach as the original backend — it's a solid, fast
first pass for well-formatted screenplays. Its main blind spot is
characters who are only ever mentioned in action-line prose rather than
given a dialogue cue; app/ai/ner.py's spaCy pass over action lines fills
that gap during the pipeline (see app/services/pipeline_service.py).
"""
import re
from typing import List, Dict


def parse_screenplay(text: str) -> List[Dict]:
    scenes = []
    current_scene = None
    scene_number = 0

    lines = text.split("\n")

    for line in lines:
        line = line.strip()

        if not line:
            continue

        # Detect scene heading (INT. or EXT.)
        if re.match(r"^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)", line, re.IGNORECASE):
            if current_scene:
                scenes.append(current_scene)

            scene_number += 1

            # Extract location and time of day
            parts = line.split("-")
            location = parts[0].strip() if parts else line
            time_of_day = parts[1].strip() if len(parts) > 1 else "DAY"

            current_scene = {
                "scene_number": scene_number,
                "heading": line,
                "location": location,
                "time_of_day": time_of_day,
                "action_lines": "",
                "characters": [],
                "dialogues": [],
            }

        # Detect character name (ALL CAPS line)
        elif line.isupper() and len(line.split()) <= 5 and current_scene:
            current_character = line
            if current_character not in current_scene["characters"]:
                current_scene["characters"].append(current_character)

        # Detect dialogue (comes after character name)
        elif current_scene and current_scene["characters"]:
            last_character = current_scene["characters"][-1]

            if not re.match(r"^(INT\.|EXT\.)", line, re.IGNORECASE):
                existing_dialogue = next(
                    (d for d in current_scene["dialogues"] if d["character_name"] == last_character),
                    None,
                )

                if existing_dialogue:
                    existing_dialogue["dialogue_text"] += " " + line
                    existing_dialogue["word_count"] = len(existing_dialogue["dialogue_text"].split())
                else:
                    current_scene["dialogues"].append(
                        {
                            "character_name": last_character,
                            "dialogue_text": line,
                            "word_count": len(line.split()),
                        }
                    )

        # Action lines
        elif current_scene:
            current_scene["action_lines"] += " " + line

    # Add the last scene
    if current_scene:
        scenes.append(current_scene)

    return scenes


def extract_text_from_txt(file_content: bytes) -> str:
    return file_content.decode("utf-8", errors="ignore")


def extract_text_from_pdf(file_content: bytes) -> str:
    try:
        import PyPDF2
        import io

        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += (page.extract_text() or "") + "\n"
        return text
    except Exception:
        return ""
