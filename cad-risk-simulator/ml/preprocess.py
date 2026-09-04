"""
ECG Preprocessing
=================
Prepares raw ECG data for the pretrained CNN using the normalization
parameters supplied with the model (normalisation_params.npz).

Expected input format (from model README):
  - Shape: (1000, 12) — 1000 time-steps × 12 leads
  - Sampling rate: 100 Hz
  - Duration: 10 seconds
  - Units: millivolts (mV)
  - Lead order: standard 12-lead

Normalization method: per-channel z-score
  x_norm = (x - mean) / std
where mean and std are arrays of shape (12,) from the training fold.
"""

import numpy as np


def preprocess_ecg(
    ecg: np.ndarray,
    mean: np.ndarray,
    std: np.ndarray,
) -> np.ndarray:
    """
    Normalize a raw 12-lead ECG signal for CNN input.

    Parameters
    ----------
    ecg : np.ndarray
        Raw ECG signal, shape (1000, 12), float32, in mV.
    mean : np.ndarray
        Per-channel mean from normalisation_params.npz.
        May be shape (12,) or (1, 1, 12).
    std : np.ndarray
        Per-channel std from normalisation_params.npz.
        May be shape (12,) or (1, 1, 12).

    Returns
    -------
    np.ndarray
        Z-score normalized ECG, shape (1000, 12), float32.

    Raises
    ------
    ValueError
        If input shape is not (1000, 12).
    """
    ecg = np.asarray(ecg, dtype=np.float32)

    if ecg.ndim != 2 or ecg.shape != (1000, 12):
        raise ValueError(
            f"Expected ECG shape (1000, 12), got {ecg.shape}.  "
            f"The pretrained CNN requires 10s of 12-lead ECG at 100 Hz."
        )

    # Squeeze mean/std to (12,) if they come as (1, 1, 12)
    mean = np.squeeze(mean).astype(np.float32)
    std = np.squeeze(std).astype(np.float32)

    # Guard against division by zero (shouldn't happen with real params)
    safe_std = np.where(std == 0, 1.0, std)

    normalized = (ecg - mean) / safe_std

    return np.ascontiguousarray(normalized, dtype=np.float32)
