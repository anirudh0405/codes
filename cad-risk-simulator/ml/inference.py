"""
ECG CNN Inference
=================
End-to-end inference pipeline:
  raw ECG → preprocessing → CNN → threshold application → structured result.

Uses the actual 5 cardiovascular superclasses from the PTB-XL model:
  NORM, MI, STTC, CD, HYP

This module does NOT contain risk score calculations.
CNN output is independent of the existing simulator risk engine.
"""

import numpy as np

from model_loader import get_model, get_norm_params, get_thresholds
from preprocess import preprocess_ecg

# Class order must match the model's output layer order (from README)
CLASS_ORDER = ["NORM", "MI", "STTC", "CD", "HYP"]


def predict_ecg(ecg) -> dict:
    """
    Run full CNN inference on a 12-lead ECG.

    Parameters
    ----------
    ecg : list or np.ndarray
        Raw ECG signal, shape (1000, 12), in mV at 100 Hz.

    Returns
    -------
    dict
        {
            "predictions":    {"NORM": bool, "MI": bool, ...},
            "probabilities":  {"NORM": float, "MI": float, ...},
            "detectedClasses": ["NORM", ...],
            "thresholds":     {"NORM": float, ...},
        }

    Raises
    ------
    ValueError
        If the input shape is not (1000, 12).
    RuntimeError
        If the model fails to load or produce output.
    """
    ecg_array = np.asarray(ecg, dtype=np.float32)

    # Validate shape
    if ecg_array.ndim != 2 or ecg_array.shape != (1000, 12):
        raise ValueError(
            f"Expected ECG shape (1000, 12), got {ecg_array.shape}.  "
            f"Provide 10 seconds of 12-lead ECG at 100 Hz in mV."
        )

    # Load model assets
    model = get_model()
    norm_params = get_norm_params()
    thresholds = get_thresholds()

    # Preprocess
    ecg_norm = preprocess_ecg(ecg_array, norm_params["mean"], norm_params["std"])

    # Add batch dimension: (1000, 12) → (1, 1000, 12)
    ecg_batch = ecg_norm[np.newaxis, ...]

    # CNN inference
    probs_raw = model.predict(ecg_batch, verbose=0)
    probs = probs_raw[0]  # Remove batch dimension

    if len(probs) != len(CLASS_ORDER):
        raise RuntimeError(
            f"Model produced {len(probs)} outputs, expected {len(CLASS_ORDER)}.  "
            f"Output: {probs}"
        )

    # Apply per-class thresholds
    probabilities = {}
    predictions = {}
    detected_classes = []

    for i, class_name in enumerate(CLASS_ORDER):
        prob = float(probs[i])
        threshold = float(thresholds.get(class_name, 0.5))
        is_detected = prob >= threshold

        probabilities[class_name] = round(prob, 6)
        predictions[class_name] = is_detected

        if is_detected:
            detected_classes.append(class_name)

    return {
        "predictions": predictions,
        "probabilities": probabilities,
        "detectedClasses": detected_classes,
        "thresholds": {c: float(thresholds.get(c, 0.5)) for c in CLASS_ORDER},
    }
