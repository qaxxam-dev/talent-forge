import asyncio
import json
import time
from typing import Any, Dict, Optional, Type
from pydantic import BaseModel
from google import genai
from google.genai import types

from core.config import config
from core.exceptions import BadRequestException, CustomException


class LLMService:
    def __init__(self):
        self._client: Optional[genai.Client] = None

    def get_client(self) -> genai.Client:
        if not config.GEMINI_API_KEY:
            raise BadRequestException("GEMINI_API_KEY is not configured in backend/.env")
        if self._client is None:
            self._client = genai.Client(api_key=config.GEMINI_API_KEY)
        return self._client

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Type[BaseModel],
        model: Optional[str] = None,
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Calls Gemini with structured schema using async client.aio.models.generate_content and returns (parsed_dict, meta_dict).
        Automatically falls back to gemini-2.5-flash-lite if the primary model hits rate limits or capacity spikes.
        """
        client = self.get_client()
        start_time = time.time()
        primary_model = model or config.GEMINI_MODEL
        models_to_try = [primary_model]
        for fallback_candidate in ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"]:
            if fallback_candidate not in models_to_try:
                models_to_try.append(fallback_candidate)

        last_exception: Optional[Exception] = None

        for current_model in models_to_try:
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=current_model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type="application/json",
                            response_schema=response_schema,
                            temperature=0.2,
                        ),
                    ),
                    timeout=35.0,
                )
                latency_ms = int((time.time() - start_time) * 1000)

                if not response.text:
                    raise CustomException(f"Gemini model {current_model} returned empty response")

                parsed = json.loads(response.text)
                meta = {
                    "model": current_model,
                    "latency_ms": latency_ms,
                }
                return parsed, meta
            except asyncio.TimeoutError:
                last_exception = CustomException(f"Gemini API call timed out after 35s on {current_model}")
                continue
            except json.JSONDecodeError as e:
                last_exception = CustomException(f"Invalid JSON returned from model {current_model}: {str(e)}")
                continue
            except Exception as e:
                err_msg = str(e)
                last_exception = CustomException(f"Gemini API error ({current_model}): {err_msg}")
                # If auth error (e.g. invalid API key), fail fast instead of cycling models
                if "API_KEY_INVALID" in err_msg or "PERMISSION_DENIED" in err_msg or "401" in err_msg:
                    raise last_exception
                continue

        if last_exception:
            raise last_exception
        raise CustomException("Failed to generate structured response from Gemini")


llm_service = LLMService()
