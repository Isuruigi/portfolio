"""
Gemini Live voice calls for Axon.

The browser never sees the API key. It asks /voice/token for a single-use
ephemeral token, and the model, voice, system prompt and tools are locked
into that token here, so a token can only ever run Axon.
"""

import datetime
import os
from pathlib import Path
from time import time

from google import genai

VOICE_MODEL = os.getenv("VOICE_MODEL", "gemini-3.8-live")
VOICE_NAME = os.getenv("VOICE_NAME", "Aoede")
# "en" for English-only calls; "en,si" lets Axon answer callers in Sinhala too
VOICE_LANGUAGES = [code.strip() for code in os.getenv("VOICE_LANGUAGES", "en").split(",") if code.strip()]
MAX_CALL_SECONDS = int(os.getenv("VOICE_MAX_SECONDS", "180"))
DAILY_CALL_CAP = int(os.getenv("VOICE_DAILY_CAP", "150"))

PROFILE = (Path(__file__).parent / "agent_profile.md").read_text(encoding="utf-8")

# Page targets Axon can scroll to; ids match the portfolio's section and project anchors
SECTIONS = ["hero", "work", "personaplex", "nexus", "fraud", "career", "teaching", "about", "blog", "contact"]
DOORS = ["hire", "build", "learn"]

TOOLS = [
    {
        "function_declarations": [
            {
                "name": "navigate_to_section",
                "description": "Scroll the visitor's page to a part of Isuru's portfolio so they can see what you're talking about.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {"section": {"type": "STRING", "enum": SECTIONS}},
                    "required": ["section"],
                },
            },
            {
                "name": "open_contact",
                "description": "Open the contact form with the right subject when the visitor wants to hire Isuru, build something with him, or learn from him.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {"door": {"type": "STRING", "enum": DOORS}},
                    "required": ["door"],
                },
            },
            {
                "name": "end_call",
                "description": "End the call after the visitor says goodbye or clearly wants to stop.",
                "parameters": {"type": "OBJECT", "properties": {}},
            },
        ]
    }
]


def _language_rule() -> str:
    if "si" in VOICE_LANGUAGES:
        return (
            "Speak English by default. If the caller speaks Sinhala, reply in natural, everyday spoken Sinhala "
            "and keep using it until they switch back."
        )
    return (
        "Speak English. If the caller uses another language, say briefly, in English, that voice calls are "
        "English-only for now and that they can type in Sinhala or Tamil in the chat instead."
    )


def system_instruction() -> str:
    return f"""You are Axon, the voice of Isuru Chathuranga's portfolio website. A visitor has started a live voice call with you from the site.

How you sound:
- Warm, confident and natural, like a sharp colleague introducing Isuru's work.
- Short turns: one to three sentences, then let the caller talk. No lists, no markdown, no emojis.
- {_language_rule()}

What you know:
- Use only the profile below. Never invent numbers, dates, clients, salaries, rates or availability.
- If something isn't in the profile, say you don't know and offer to pass a message to Isuru through the contact form.
- Speak about Isuru in the third person ("he built", "his work").

What you can do on the page:
- When the caller wants to see something, call navigate_to_section and say what they're looking at.
- When they want to hire Isuru, build something with him, or learn from him, call open_contact with the matching door.
- When they say goodbye, say a short goodbye and call end_call.

When the call starts, greet them in one sentence: say you're Axon, Isuru's AI agent, and ask what they'd like to know.
If asked what you run on: Google's Gemini Live API, set up by Isuru.

Profile:
{PROFILE}"""


_client: genai.Client | None = None
_calls_today = {"day": "", "count": 0}


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise RuntimeError("GOOGLE_API_KEY is not set")
        _client = genai.Client(api_key=key, http_options={"api_version": "v1alpha"})
    return _client


def daily_cap_reached() -> bool:
    today = datetime.date.today().isoformat()
    if _calls_today["day"] != today:
        _calls_today.update(day=today, count=0)
    return _calls_today["count"] >= DAILY_CALL_CAP


def create_voice_token() -> dict:
    """Mint a single-use token that can only open a Axon call."""
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    token = _get_client().auth_tokens.create(
        config={
            "uses": 1,
            "expire_time": now + datetime.timedelta(seconds=MAX_CALL_SECONDS + 120),
            "new_session_expire_time": now + datetime.timedelta(minutes=1),
            "live_connect_constraints": {
                "model": VOICE_MODEL,
                "config": {
                    "response_modalities": ["AUDIO"],
                    "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": VOICE_NAME}}},
                    "system_instruction": system_instruction(),
                    "tools": TOOLS,
                    "input_audio_transcription": {},
                    "output_audio_transcription": {},
                },
            },
        }
    )
    _calls_today["count"] += 1
    return {
        "token": token.name,
        "model": VOICE_MODEL,
        "max_seconds": MAX_CALL_SECONDS,
        "issued_at": int(time()),
    }
