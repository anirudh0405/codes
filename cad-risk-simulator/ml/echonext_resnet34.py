"""
EchoNext 1D ResNet-34 Architecture for 12-Lead ECG Time-Series Data
====================================================================
Adapted from the EchoNext / EchoNext-Mini deep learning architecture
for cardiovascular disease and structural heart disease (SHD) detection
from 12-lead surface electrocardiograms.

Implemented in Keras 3 / TensorFlow (compatible with PyTorch & JAX backends).

Architecture Flow:
  12-Lead ECG (Batch, 1000 samples, 12 channels)
    │
    ▼
  Initial 1D Stem (Conv1D k=15, s=2 -> BN -> ReLU -> MaxPool)
    │
    ▼
  Stage 1: 3x BasicBlock1D (64 filters)    [Lower layers: micro waveform features]
    │
    ▼
  Stage 2: 4x BasicBlock1D (128 filters)   [Morphological patterns: ST, QRS, T]
    │
    ▼
  Stage 3: 6x BasicBlock1D (256 filters)   [Regional ischemia & conduction delays]
    │
    ▼
  Stage 4: 3x BasicBlock1D (512 filters)   [Deeper layers: multi-lead combined patterns]
    │
    ▼
  Global Average Pooling 1D (Patient Embedding)
    │
    ▼
  Multi-Disease Classification Head (NORM, MI, STTC, CD, HYP, Composite SHD)
"""

import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import keras
from keras import layers, Model


# ─── 1D Basic Residual Block ──────────────────────────────────────────────────

def basic_block_1d(
    x: keras.KerasTensor,
    filters: int,
    stride: int = 1,
    kernel_size: int = 15,
    name: str = "block",
) -> keras.KerasTensor:
    """
    1D Residual Block for ECG signals:
    Conv1D(k=15) -> BatchNorm -> ReLU -> Conv1D(k=15) -> BatchNorm + Shortcut -> ReLU
    """
    shortcut = x

    # First Conv1D
    y = layers.Conv1D(
        filters,
        kernel_size=kernel_size,
        strides=stride,
        padding="same",
        use_bias=False,
        name=f"{name}_conv1",
    )(x)
    y = layers.BatchNormalization(name=f"{name}_bn1")(y)
    y = layers.Activation("relu", name=f"{name}_relu1")(y)

    # Second Conv1D
    y = layers.Conv1D(
        filters,
        kernel_size=kernel_size,
        strides=1,
        padding="same",
        use_bias=False,
        name=f"{name}_conv2",
    )(y)
    y = layers.BatchNormalization(name=f"{name}_bn2")(y)

    # Downsample shortcut if dimension or stride changes
    input_filters = x.shape[-1]
    if stride != 1 or input_filters != filters:
        shortcut = layers.Conv1D(
            filters,
            kernel_size=1,
            strides=stride,
            padding="same",
            use_bias=False,
            name=f"{name}_proj_conv",
        )(x)
        shortcut = layers.BatchNormalization(name=f"{name}_proj_bn")(shortcut)

    out = layers.add([y, shortcut], name=f"{name}_add")
    out = layers.Activation("relu", name=f"{name}_out_relu")(out)
    return out


# ─── EchoNext 1D ResNet-34 Full Model Builder ─────────────────────────────────

def build_echonext_resnet34(
    input_shape: tuple = (1000, 12),
    num_classes: int = 6,
    kernel_size: int = 15,
) -> Model:
    """
    Builds the EchoNext 1D ResNet-34 Architecture.
    Stages: [3, 4, 6, 3] residual blocks = 34 total convolutional layers.

    Parameters
    ----------
    input_shape : tuple
        (timesteps, leads) = (1000, 12) for 10s of 12-lead ECG @ 100 Hz.
    num_classes : int
        6 outputs: [NORM, MI, STTC, CD, HYP, SHD_Composite]
    kernel_size : int
        Receptive field width (default: 15 samples).
    """
    ecg_input = layers.Input(shape=input_shape, name="ecg_12lead_input")

    # ── 1. Stem: Lower Layer Feature Identification ───────────────────────────
    # Captures high-frequency micro-features (QRS slopes, sharp onset)
    x = layers.Conv1D(
        64,
        kernel_size=kernel_size,
        strides=2,
        padding="same",
        use_bias=False,
        name="stem_conv",
    )(ecg_input)
    x = layers.BatchNormalization(name="stem_bn")(x)
    x = layers.Activation("relu", name="stem_relu")(x)
    x = layers.MaxPooling1D(pool_size=3, strides=2, padding="same", name="stem_maxpool")(x)

    # ── 2. Stage 1: 3x Blocks (64 filters) ────────────────────────────────────
    # Waveform morphology (P, Q, R, S, T features)
    for i in range(3):
        x = basic_block_1d(x, filters=64, stride=1, kernel_size=kernel_size, name=f"stage1_b{i+1}")

    # ── 3. Stage 2: 4x Blocks (128 filters, downsampled) ──────────────────────
    # Beat-to-beat transitions & rhythm irregularities
    x = basic_block_1d(x, filters=128, stride=2, kernel_size=kernel_size, name="stage2_b1")
    for i in range(1, 4):
        x = basic_block_1d(x, filters=128, stride=1, kernel_size=kernel_size, name=f"stage2_b{i+1}")

    # ── 4. Stage 3: 6x Blocks (256 filters, downsampled) ──────────────────────
    # Regional spatial patterns (Anterior vs Inferior ST elevations, Conduction delay)
    x = basic_block_1d(x, filters=256, stride=2, kernel_size=kernel_size, name="stage3_b1")
    for i in range(1, 6):
        x = basic_block_1d(x, filters=256, stride=1, kernel_size=kernel_size, name=f"stage3_b{i+1}")

    # ── 5. Stage 4: 3x Blocks (512 filters, downsampled) ──────────────────────
    # Deeper layers combine features into multi-lead global disease representations
    x = basic_block_1d(x, filters=512, stride=2, kernel_size=kernel_size, name="stage4_b1")
    for i in range(1, 3):
        x = basic_block_1d(x, filters=512, stride=1, kernel_size=kernel_size, name=f"stage4_b{i+1}")

    # ── 6. Global Pooling & Multi-Disease Classification Head ─────────────────
    pooled = layers.GlobalAveragePooling1D(name="global_avg_pool")(x)
    dropped = layers.Dropout(0.2, name="classifier_dropout")(pooled)
    predictions = layers.Dense(
        num_classes,
        activation="sigmoid",
        name="disease_predictions",
    )(dropped)

    model = Model(inputs=ecg_input, outputs=predictions, name="EchoNext_1D_ResNet34")
    return model


# ─── Self-Test Routine ────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 65)
    print("  EchoNext 1D ResNet-34 Architecture Verification (Keras 3)")
    print("=" * 65)

    model = build_echonext_resnet34(input_shape=(1000, 12), num_classes=6)

    total_params = model.count_params()
    print(f"Total Parameters:    {total_params:,}")
    print(f"Input Shape:         {model.input_shape}")
    print(f"Output Shape:        {model.output_shape}")

    # Test forward pass with synthetic batch of 2 patients
    dummy_input = np.random.randn(2, 1000, 12).astype(np.float32)
    output = model(dummy_input, training=False).numpy()

    print("\n[Forward Pass] Batch Shape (2, 1000, 12) -> Output Shape:", output.shape)
    labels = [
        "NORM (Normal)",
        "MI (Myocardial Infarction)",
        "STTC (ST-T Changes / Ischemia)",
        "CD (Conduction Disturbance)",
        "HYP (Hypertrophy)",
        "SHD (EchoNext Structural Heart Disease Composite)",
    ]
    print("\nSample Probabilities (Patient 1):")
    for lbl, prob in zip(labels, output[0]):
        print(f"  • {lbl:<48}: {prob:.4f}")

    print("\n[SUCCESS] EchoNext 1D ResNet-34 verified.")
