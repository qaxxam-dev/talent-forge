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
        """
        client = self.get_client()
        start_time = time.time()
        selected_model = model or config.GEMINI_MODEL

        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=selected_model,
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
                raise CustomException("Gemini returned empty response")

            parsed = json.loads(response.text)
            meta = {
                "model": selected_model,
                "latency_ms": latency_ms,
            }
            return parsed, meta
        except asyncio.TimeoutError:
            raise CustomException("Gemini API call timed out after 35s")
        except json.JSONDecodeError as e:
            raise CustomException(f"Invalid JSON returned from model: {str(e)}")
        except Exception as e:
            if isinstance(e, CustomException):
                raise e
            raise CustomException(f"Gemini API error: {str(e)}")


llm_service = LLMService()
