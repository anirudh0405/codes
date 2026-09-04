"""
Model Loader — Download & Load ECG CNN Assets from Hugging Face
================================================================
Downloads ecg_cnn_final.keras, normalisation_params.npz, and thresholds.json
from Steenslid/ecg-ptbxl-classification on first call.  Subsequent calls
return the cached/loaded objects immediately.

This module is responsible ONLY for acquiring and loading model assets.
No risk calculations or preprocessing logic belongs here.
"""

import json
import os
import shutil
from pathlib import Path

import numpy as np
from huggingface_hub import hf_hub_download

# ── Constants ────────────────────────────────────────────────────────────────

HF_REPO_ID = "Steenslid/ecg-ptbxl-classification"

MODEL_FILES = {
    "model": "ecg_cnn_final.keras",
    "norm_params": "normalisation_params.npz",
    "thresholds": "thresholds.json",
}

# Local cache directory (relative to this file)
_LOCAL_CACHE_DIR = Path(__file__).resolve().parent / "models" / "ecg"

# ── Singleton State ──────────────────────────────────────────────────────────

_model = None
_norm_params = None  # dict with "mean" and "std" arrays
_thresholds = None   # dict mapping class name → threshold float
_loaded = False


# ── Download Helpers ─────────────────────────────────────────────────────────

def _ensure_downloaded() -> dict[str, Path]:
    """
    Download all model files from Hugging Face if not already present locally.
    Returns a dict mapping logical name → local file path.
    """
    _LOCAL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    local_paths: dict[str, Path] = {}

    for key, filename in MODEL_FILES.items():
        local_path = _LOCAL_CACHE_DIR / filename

        if local_path.exists():
            print(f"[model_loader] Using cached: {local_path}")
            local_paths[key] = local_path
            continue

        print(f"[model_loader] Downloading {filename} from {HF_REPO_ID} ...")
        hf_path = hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=filename,
        )

        # Copy from HF cache to our local directory for visibility
        shutil.copy2(hf_path, local_path)
        print(f"[model_loader] Saved to: {local_path}")
        local_paths[key] = local_path

    return local_paths


# ── Loading ──────────────────────────────────────────────────────────────────

def load_all() -> None:
    """
    Download (if needed) and load model, normalization params, and thresholds.
    Safe to call multiple times — only loads once.
    """
    global _model, _norm_params, _thresholds, _loaded

    if _loaded:
        return

    paths = _ensure_downloaded()

    # 1. Load Keras model
    # Import keras here to avoid slow import at module level
    import keras  # type: ignore

    # Register the custom loss function used during training.
    # The model was compiled with 'binary_focal_loss' which is not a built-in
    # Keras loss.  We register it so Keras can deserialize the saved model.
    # Since we only use the model for inference (not training), the exact loss
    # implementation doesn't affect predictions — but it must exist for loading.
    @keras.saving.register_keras_serializable(name="binary_focal_loss")
    def binary_focal_loss(y_true, y_pred, alpha=0.25, gamma=2.0):
        """Binary focal cross-entropy loss (Lin et al., 2017)."""
        import tensorflow as tf  # type: ignore

        y_pred = tf.clip_by_value(y_pred, 1e-7, 1.0 - 1e-7)
        bce = -(y_true * tf.math.log(y_pred) + (1 - y_true) * tf.math.log(1 - y_pred))
        p_t = y_true * y_pred + (1 - y_true) * (1 - y_pred)
        focal_weight = alpha * (1 - p_t) ** gamma
        return tf.reduce_mean(focal_weight * bce)

    print(f"[model_loader] Loading Keras model: {paths['model']}")
    _model = keras.saving.load_model(str(paths["model"]))
    print(f"[model_loader] Model loaded.  Input shape: {_model.input_shape}")

    # 2. Load normalization parameters
    print(f"[model_loader] Loading normalization params: {paths['norm_params']}")
    npz = np.load(str(paths["norm_params"]))
    _norm_params = {"mean": npz["mean"], "std": npz["std"]}
    print(
        f"[model_loader] Norm params loaded.  "
        f"mean shape: {_norm_params['mean'].shape}, "
        f"std shape: {_norm_params['std'].shape}"
    )

    # 3. Load thresholds
    print(f"[model_loader] Loading thresholds: {paths['thresholds']}")
    with open(paths["thresholds"], "r") as f:
        _thresholds = json.load(f)
    print(f"[model_loader] Thresholds loaded: {_thresholds}")

    _loaded = True
    print("[model_loader] All assets loaded successfully.")


# ── Accessors ────────────────────────────────────────────────────────────────

def get_model():
    """Return the loaded Keras model.  Calls load_all() if not yet loaded."""
    if not _loaded:
        load_all()
    return _model


def get_norm_params() -> dict[str, np.ndarray]:
    """Return {"mean": ndarray, "std": ndarray} from normalisation_params.npz."""
    if not _loaded:
        load_all()
    return _norm_params  # type: ignore[return-value]


def get_thresholds() -> dict[str, float]:
    """Return per-class thresholds from thresholds.json."""
    if not _loaded:
        load_all()
    return _thresholds  # type: ignore[return-value]


def is_loaded() -> bool:
    """Check whether all assets have been loaded."""
    return _loaded
