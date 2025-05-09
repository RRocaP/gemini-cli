#!/usr/bin/env python3
"""
Gemini CLI Proxy Server

This FastAPI server acts as a proxy between the CLI client and Google's Gemini API.
It handles authentication, request formatting, and response streaming.
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the FastAPI app
app = FastAPI(title="Gemini CLI Proxy")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini API with the API key
try:
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY environment variable not set")
    else:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini API initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Gemini API: {e}")

# Model configurations
GEMINI_MODELS = {
    "gemini-pro": "gemini-pro",
    "gemini-pro-vision": "gemini-pro-vision",
    "gemini-flash": "gemini-flash",
    "gemini-2.5-pro-preview-05-06": "gemini-2.5-pro-preview-05-06"
}

# --- Models for request/response formatting ---

class Message(BaseModel):
    role: str
    content: str | List[Dict[str, Any]]
    
class GeminiRequest(BaseModel):
    model: str
    messages: List[Message]
    stream: bool = False
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    tools: Optional[List[Dict[str, Any]]] = None

# --- Helper functions ---

def format_gemini_request(request_data: dict) -> dict:
    """Format request data for Gemini API"""
    gemini_request = {
        "model": GEMINI_MODELS.get(request_data.get("model", "gemini-pro"), "gemini-pro"),
        "contents": []
    }

    # Convert messages to Gemini format
    for message in request_data.get("messages", []):
        role = "user" if message.get("role") == "user" else "model"
        content = message.get("content", "")

        # Handle different content formats (string or array of content parts)
        if isinstance(content, str):
            gemini_message = {
                "role": role,
                "parts": [{"text": content}]
            }
        elif isinstance(content, list):
            parts = []
            for part in content:
                if part.get("type") == "text":
                    parts.append({"text": part.get("text", "")})
                elif part.get("type") == "image":
                    # Handle image mime types
                    parts.append({
                        "inline_data": {
                            "mime_type": part.get("image", {}).get("mime_type", "image/jpeg"),
                            "data": part.get("image", {}).get("data", "")
                        }
                    })

            gemini_message = {
                "role": role,
                "parts": parts
            }
        else:
            # Default fallback
            gemini_message = {
                "role": role,
                "parts": [{"text": str(content)}]
            }

        gemini_request["contents"].append(gemini_message)

    # Add generation config
    if "temperature" in request_data:
        gemini_request["generationConfig"] = gemini_request.get("generationConfig", {})
        gemini_request["generationConfig"]["temperature"] = request_data["temperature"]

    if "top_p" in request_data:
        gemini_request["generationConfig"] = gemini_request.get("generationConfig", {})
        gemini_request["generationConfig"]["topP"] = request_data["top_p"]

    if "max_tokens" in request_data:
        gemini_request["generationConfig"] = gemini_request.get("generationConfig", {})
        gemini_request["generationConfig"]["maxOutputTokens"] = request_data["max_tokens"]

    # Add tool definitions if present
    if "tools" in request_data and request_data["tools"]:
        gemini_request["tools"] = []

        for tool in request_data["tools"]:
            if tool.get("type") == "function":
                function_def = tool.get("function", {})

                gemini_tool = {
                    "function_declarations": [{
                        "name": function_def.get("name", ""),
                        "description": function_def.get("description", ""),
                        "parameters": function_def.get("parameters", {})
                    }]
                }

                gemini_request["tools"].append(gemini_tool)

    return gemini_request

def format_gemini_response(gemini_response: Any) -> dict:
    """Format Gemini API response to match the expected CLI format"""
    try:
        if hasattr(gemini_response, "candidates") and gemini_response.candidates:
            candidate = gemini_response.candidates[0]
            content = ""

            # Check for function calls in the response
            function_call = None
            if hasattr(candidate, "content") and candidate.content:
                # Extract text content
                if candidate.content.parts and hasattr(candidate.content.parts[0], "text"):
                    content = candidate.content.parts[0].text

                # Check for function calls
                if hasattr(candidate, "function_call") or hasattr(candidate.content, "function_call"):
                    func_call = getattr(candidate, "function_call", None) or getattr(candidate.content, "function_call", None)
                    if func_call:
                        function_call = {
                            "name": getattr(func_call, "name", ""),
                            "arguments": getattr(func_call, "args", {})
                        }

            response_data = {
                "id": "resp_" + os.urandom(4).hex(),
                "model": GEMINI_MODELS.get("gemini-pro"),
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": content
                        },
                        "finish_reason": "stop"
                    }
                ],
                "usage": {
                    "prompt_tokens": 0,  # Not available in Gemini response
                    "completion_tokens": 0,  # Not available in Gemini response
                    "total_tokens": 0  # Not available in Gemini response
                }
            }

            # Add function_call to the response if it exists
            if function_call:
                response_data["choices"][0]["message"]["function_call"] = function_call

            return response_data
        else:
            raise ValueError("Invalid Gemini response format")
    except Exception as e:
        logger.error(f"Error formatting Gemini response: {e}")
        raise HTTPException(status_code=500, detail=f"Error formatting response: {str(e)}")

# --- API endpoints ---

@app.post("/v1/chat/completions")
async def create_chat_completion(request: Request):
    """
    Handle chat completion requests and proxy them to Gemini API
    """
    try:
        # Parse request data
        request_data = await request.json()
        logger.debug(f"Received request: {request_data}")
        
        # Check if stream is enabled
        stream = request_data.get("stream", False)
        
        # Format request for Gemini
        gemini_request = format_gemini_request(request_data)
        logger.debug(f"Formatted Gemini request: {gemini_request}")
        
        # Create the model
        model_name = gemini_request["model"]
        model = genai.GenerativeModel(model_name)
        
        # Handle streaming response
        if stream:
            async def response_stream():
                try:
                    generation_config = gemini_request.get("generationConfig", {})
                    response = model.generate_content(
                        gemini_request["contents"],
                        generation_config=generation_config,
                        stream=True
                    )
                    
                    for chunk in response:
                        text = ""
                        if hasattr(chunk, "text"):
                            text = chunk.text
                        elif hasattr(chunk, "parts") and chunk.parts:
                            text = chunk.parts[0].text
                        
                        # Format the chunk as an SSE event
                        chunk_data = {
                            "id": "chunk_" + os.urandom(4).hex(),
                            "choices": [{
                                "delta": {"content": text},
                                "index": 0
                            }]
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                    
                    # Send the [DONE] message
                    yield "data: [DONE]\n\n"
                
                except Exception as e:
                    logger.error(f"Streaming error: {e}")
                    error_data = {"error": str(e)}
                    yield f"data: {json.dumps(error_data)}\n\n"
            
            return StreamingResponse(
                response_stream(),
                media_type="text/event-stream"
            )
        
        # Handle non-streaming response
        else:
            generation_config = gemini_request.get("generationConfig", {})
            response = model.generate_content(
                gemini_request["contents"],
                generation_config=generation_config
            )
            
            # Format and return the response
            formatted_response = format_gemini_response(response)
            logger.debug(f"Formatted response: {formatted_response}")
            return formatted_response
    
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "api_initialized": bool(GEMINI_API_KEY)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)