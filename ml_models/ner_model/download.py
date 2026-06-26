"""
One-time downloader for the spaCy transformer NER pipeline used by
`backend/app/ai/script_review.py` (and shared by the character-tracking step
in the upload pipeline).

Run this once before starting the backend for the first time:

    python ml_models/ner_model/download.py

`en_core_web_trf` is spaCy's transformer-based English pipeline. It's
installed as a regular pip package (spaCy model packages are just wheels),
so "downloading" here means pip-installing the model package itself —
there's no separate cache step the way HuggingFace's `from_pretrained` works.
"""
import subprocess
import sys

MODEL_NAME = "en_core_web_trf"


def main() -> None:
    print(f"Installing spaCy pipeline '{MODEL_NAME}' ...")
    subprocess.check_call([sys.executable, "-m", "spacy", "download", MODEL_NAME])
    print("Done. Verifying it loads...")

    import spacy

    nlp = spacy.load(MODEL_NAME)
    doc = nlp("MAYA walked into the warehouse and found DEREK waiting.")
    print("Sample entities:", [(ent.text, ent.label_) for ent in doc.ents])


if __name__ == "__main__":
    main()
