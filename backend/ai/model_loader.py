from pathlib import Path
from typing import Any

import tensorflow as tf

from ai.class_names import CLASS_NAMES


class ModelLoader:
    def __init__(self, model_path: Path):
        self.model_path = model_path
        self.model: Any | None = None

    def load(self):
        if not self.model_path.exists():
            print(f"Warning: Model file not found at {self.model_path}.")
            return None

        print(f"Loading Keras model from {self.model_path}...")
        self.model = tf.keras.models.load_model(self.model_path)
        output_classes = self.model.output_shape[-1]
        if output_classes != len(CLASS_NAMES):
            raise RuntimeError(
                f"Model outputs {output_classes} classes, but CLASS_NAMES has {len(CLASS_NAMES)} labels."
            )
        print("Model loaded successfully.")
        return self.model

    @property
    def is_loaded(self):
        return self.model is not None

