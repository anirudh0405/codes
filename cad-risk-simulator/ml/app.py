"""
ECG ML Service — FastAPI Application
=====================================
Isolated Python backend for CNN inference on 12-lead ECG data.

Endpoints
---------
  POST /api/ecg/predict   — Run CNN inference on a (1000, 12) ECG signal
  GET  /api/ecg/health    — Health check & model load status

This service is independent of the existing simulator.
It does NOT modify any existing risk calculations, sensor generators,
or frontend logic.

Usage
-----
  cd ml/
  uvicorn app:app --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import model_loader
from inference import predict_ecg


# ── Lifespan: load model on startup ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model assets when the server starts."""
    print("[app] Loading ECG CNN model on startup...")
    try:
        model_loader.load_all()
        print("[app] Model loaded successfully.")
    except Exception as e:
        print(f"[app] WARNING: Model failed to load on startup: {e}")
        print("[app] The /api/ecg/predict endpoint will attempt to load on first call.")
    yield


app = FastAPI(
    title="ECG CNN Inference Service",
    description="Isolated ML service for pretrained ECG cardiovascular classification (PTB-XL).",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS so the Vite frontend can call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ────────────────────────────────────────────────

class ECGPredictRequest(BaseModel):
    """
    Request body for POST /api/ecg/predict.

    ecg: 2D array of shape (1000, 12) — 10 seconds of 12-lead ECG at 100 Hz, in mV.
    """
    ecg: list[list[float]]


class ECGPredictResponse(BaseModel):
    """Structured CNN prediction result."""
    predictions: dict[str, bool]
    probabilities: dict[str, float]
    detectedClasses: list[str]
    thresholds: dict[str, float]


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/ecg/predict", response_model=ECGPredictResponse)
async def predict(request: ECGPredictRequest) -> dict[str, Any]:
    """
    Run CNN inference on a 12-lead ECG signal.

    Input: {"ecg": [[lead1_t0, lead2_t0, ...], ...]}
           Shape must be (1000, 12).

    Returns structured prediction with probabilities, binary predictions,
    detected classes, and the thresholds used.
    """
    try:
        ecg_array = np.array(request.ecg, dtype=np.float32)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid ECG data format: {e}",
        )

    if ecg_array.shape != (1000, 12):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Expected ECG shape (1000, 12), got {ecg_array.shape}.  "
                f"Provide 10 seconds of 12-lead ECG at 100 Hz."
            ),
        )

    try:
        result = predict_ecg(ecg_array)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {e}",
        )

    return result


@app.get("/api/ecg/health")
async def health() -> dict[str, Any]:
    """Health check — reports model load status and basic info."""
    loaded = model_loader.is_loaded()

    info: dict[str, Any] = {
        "status": "ok" if loaded else "model_not_loaded",
        "model_loaded": loaded,
    }

    if loaded:
        model = model_loader.get_model()
        thresholds = model_loader.get_thresholds()
        norm_params = model_loader.get_norm_params()
        info.update({
            "model_input_shape": str(model.input_shape),
            "classes": list(thresholds.keys()),
            "thresholds": thresholds,
            "norm_mean_shape": str(norm_params["mean"].shape),
            "norm_std_shape": str(norm_params["std"].shape),
        })

    return info
