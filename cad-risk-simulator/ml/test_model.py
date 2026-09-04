"""
ECG CNN -- Standalone Verification Test
=======================================
Verifies the entire pipeline without needing the FastAPI server running:

  1. Hugging Face download works
  2. ecg_cnn_final.keras exists on disk
  3. normalisation_params.npz exists on disk
  4. thresholds.json exists on disk
  5. Keras model loads successfully
  6. Normalization parameters load (mean + std arrays)
  7. Thresholds load (all 5 class keys present)
  8. Model accepts (1, 1000, 12) shaped input
  9. Model produces 5 output probabilities
 10. End-to-end inference with synthetic test data completes

Reports ACTUAL errors -- does NOT silently fall back to fake data.

WARNING: The synthetic test ECG used here is NOT clinically valid.
         It is random noise shaped to (1000, 12) for pipeline verification only.

Usage
-----
  cd ml/
  python test_model.py
"""

import sys
import traceback
from pathlib import Path

import numpy as np


def separator(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def test_step(step_num: int, description: str):
    print(f"\n[{step_num}/10] {description}")


def main() -> None:
    passed = 0
    failed = 0
    errors: list[str] = []

    separator("ECG CNN Verification Test")

    # -- 1. HF Download ---------------------------------------------------
    test_step(1, "Downloading model files from Hugging Face...")
    try:
        from model_loader import _ensure_downloaded, _LOCAL_CACHE_DIR

        paths = _ensure_downloaded()
        print(f"  [PASS] Downloaded/cached {len(paths)} files")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] Download FAILED: {e}")
        traceback.print_exc()
        errors.append(f"Step 1 (Download): {e}")
        failed += 1
        print("\n[STOP] Cannot continue without downloaded files. Aborting.")
        sys.exit(1)

    # -- 2. ecg_cnn_final.keras exists ------------------------------------
    test_step(2, "Checking ecg_cnn_final.keras exists...")
    model_path = _LOCAL_CACHE_DIR / "ecg_cnn_final.keras"
    if model_path.exists():
        size_mb = model_path.stat().st_size / (1024 * 1024)
        print(f"  [PASS] Found: {model_path} ({size_mb:.2f} MB)")
        passed += 1
    else:
        print(f"  [FAIL] NOT FOUND: {model_path}")
        errors.append(f"Step 2: ecg_cnn_final.keras not found at {model_path}")
        failed += 1

    # -- 3. normalisation_params.npz exists --------------------------------
    test_step(3, "Checking normalisation_params.npz exists...")
    norm_path = _LOCAL_CACHE_DIR / "normalisation_params.npz"
    if norm_path.exists():
        size_kb = norm_path.stat().st_size / 1024
        print(f"  [PASS] Found: {norm_path} ({size_kb:.2f} KB)")
        passed += 1
    else:
        print(f"  [FAIL] NOT FOUND: {norm_path}")
        errors.append(f"Step 3: normalisation_params.npz not found at {norm_path}")
        failed += 1

    # -- 4. thresholds.json exists -----------------------------------------
    test_step(4, "Checking thresholds.json exists...")
    thresh_path = _LOCAL_CACHE_DIR / "thresholds.json"
    if thresh_path.exists():
        size_b = thresh_path.stat().st_size
        print(f"  [PASS] Found: {thresh_path} ({size_b} bytes)")
        passed += 1
    else:
        print(f"  [FAIL] NOT FOUND: {thresh_path}")
        errors.append(f"Step 4: thresholds.json not found at {thresh_path}")
        failed += 1

    # -- 5. Keras model loads ----------------------------------------------
    test_step(5, "Loading Keras model...")
    try:
        from model_loader import load_all, get_model

        load_all()
        model = get_model()
        print(f"  [PASS] Model loaded. Input shape: {model.input_shape}")
        print(f"     Output shape: {model.output_shape}")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] Model load FAILED: {e}")
        traceback.print_exc()
        errors.append(f"Step 5 (Keras load): {e}")
        failed += 1
        print("\n[STOP] Cannot continue without loaded model. Aborting.")
        sys.exit(1)

    # -- 6. Normalization parameters load ----------------------------------
    test_step(6, "Checking normalization parameters...")
    try:
        from model_loader import get_norm_params

        norm_params = get_norm_params()
        mean = norm_params["mean"]
        std = norm_params["std"]
        print(f"  [PASS] mean shape: {mean.shape}, dtype: {mean.dtype}")
        print(f"     std shape:  {std.shape}, dtype: {std.dtype}")
        print(f"     mean values (first 4): {mean.flatten()[:4]}")
        print(f"     std values (first 4):  {std.flatten()[:4]}")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] Norm params FAILED: {e}")
        traceback.print_exc()
        errors.append(f"Step 6 (Norm params): {e}")
        failed += 1

    # -- 7. Thresholds load ------------------------------------------------
    test_step(7, "Checking thresholds...")
    try:
        from model_loader import get_thresholds

        thresholds = get_thresholds()
        expected_classes = {"NORM", "MI", "STTC", "CD", "HYP"}
        actual_classes = set(thresholds.keys())
        print(f"  Thresholds: {thresholds}")

        if expected_classes.issubset(actual_classes):
            print(f"  [PASS] All 5 expected classes present: {expected_classes}")
            passed += 1
        else:
            missing = expected_classes - actual_classes
            print(f"  [FAIL] Missing classes: {missing}")
            errors.append(f"Step 7: Missing threshold classes: {missing}")
            failed += 1
    except Exception as e:
        print(f"  [FAIL] Thresholds FAILED: {e}")
        traceback.print_exc()
        errors.append(f"Step 7 (Thresholds): {e}")
        failed += 1

    # -- 8. Model accepts (1, 1000, 12) input ------------------------------
    test_step(8, "Testing model with (1, 1000, 12) shaped input...")
    try:
        # Create synthetic test input (random noise -- NOT clinically valid)
        test_input = np.random.randn(1, 1000, 12).astype(np.float32)
        output = model.predict(test_input, verbose=0)
        print(f"  [PASS] Model accepted input shape (1, 1000, 12)")
        print(f"     Output shape: {output.shape}")
        print(f"     Output values: {output[0]}")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] Model prediction FAILED: {e}")
        traceback.print_exc()
        errors.append(f"Step 8 (Model predict): {e}")
        failed += 1

    # -- 9. Model produces 5 outputs --------------------------------------
    test_step(9, "Verifying model produces 5 output probabilities...")
    try:
        if output.shape[-1] == 5:
            print(f"  [PASS] Model produces 5 outputs (matches NORM, MI, STTC, CD, HYP)")
            passed += 1
        else:
            print(f"  [FAIL] Expected 5 outputs, got {output.shape[-1]}")
            errors.append(f"Step 9: Expected 5 outputs, got {output.shape[-1]}")
            failed += 1
    except NameError:
        print(f"  [FAIL] Skipped -- no output from step 8")
        errors.append("Step 9: Skipped due to step 8 failure")
        failed += 1

    # -- 10. End-to-end inference ------------------------------------------
    test_step(10, "Running end-to-end inference with synthetic test ECG...")
    try:
        from inference import predict_ecg

        # Synthetic 12-lead ECG -- random noise, NOT clinically valid
        synthetic_ecg = np.random.randn(1000, 12).astype(np.float32) * 0.5
        result = predict_ecg(synthetic_ecg)

        print(f"  [PASS] End-to-end inference succeeded!")
        print(f"     Probabilities: {result['probabilities']}")
        print(f"     Predictions:   {result['predictions']}")
        print(f"     Detected:      {result['detectedClasses']}")
        print(f"     Thresholds:    {result['thresholds']}")
        print()
        print(f"  [WARN] NOTE: These results are from SYNTHETIC random noise.")
        print(f"     They are NOT clinically valid and should NOT be interpreted")
        print(f"     as real diagnostic output.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] End-to-end inference FAILED: {e}")
        traceback.print_exc()
        errors.append(f"Step 10 (E2E inference): {e}")
        failed += 1

    # -- Summary -----------------------------------------------------------
    separator("Test Summary")
    print(f"  Passed: {passed}/10")
    print(f"  Failed: {failed}/10")

    if errors:
        print(f"\n  Errors:")
        for err in errors:
            print(f"    - {err}")

    if failed == 0:
        print(f"\n  ALL TESTS PASSED! The ECG CNN pipeline is operational.")
    else:
        print(f"\n  WARNING: {failed} test(s) failed. See errors above.")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
