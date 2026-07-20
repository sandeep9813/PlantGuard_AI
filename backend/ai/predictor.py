import numpy as np
import tensorflow as tf

from ai.class_names import CLASS_NAMES
from utils.image_utils import HeatmapImageBuilder


class HeatmapGenerator:
    def __init__(self, model):
        self.model = model
        self.image_builder = HeatmapImageBuilder()

    def generate(self, image, img_array, class_index):
        conv_layers = [layer for layer in self.model.layers if isinstance(layer, tf.keras.layers.Conv2D)]
        if not conv_layers:
            return self.image_builder.build_visual_fallback(image)

        last_conv_layer = conv_layers[-1]
        grad_model = tf.keras.models.Model(
            self.model.inputs,
            [last_conv_layer.output, self.model.outputs[0]],
        )

        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_array)
            class_channel = predictions[:, class_index]

        grads = tape.gradient(class_channel, conv_outputs)
        if grads is None:
            return self.image_builder.build_visual_fallback(image)

        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_outputs = conv_outputs[0]
        heatmap = tf.reduce_sum(conv_outputs * pooled_grads, axis=-1)
        heatmap = tf.maximum(heatmap, 0)
        max_value = tf.reduce_max(heatmap)
        if float(max_value) == 0.0:
            return self.image_builder.build_visual_fallback(image)

        return self.image_builder.build_overlay_from_heatmap(image, (heatmap / max_value).numpy())


class PlantDiseasePredictor:
    def __init__(self, confidence_threshold: float = 60.0):
        self.confidence_threshold = confidence_threshold

    def predict(self, model, image, img_array):
        predictions = model.predict(img_array)[0]
        top_indices = np.argsort(predictions)[::-1]
        primary_index = int(top_indices[0])
        confidence = float(predictions[primary_index] * 100)

        return {
            "prediction": CLASS_NAMES[primary_index],
            "confidence": confidence,
            "top_3": self._top_predictions(predictions, top_indices),
            "is_uncertain": confidence < self.confidence_threshold,
            "confidence_message": self._confidence_message(confidence),
            "heatmap": self._safe_heatmap(model, image, img_array, primary_index),
        }

    def _top_predictions(self, predictions, top_indices):
        return [
            {
                "class_name": CLASS_NAMES[int(index)],
                "confidence": float(predictions[int(index)] * 100),
            }
            for index in top_indices[:3]
        ]

    def _confidence_message(self, confidence):
        if confidence < self.confidence_threshold:
            return (
                "The model is not very confident. Try another clear leaf photo with good lighting, "
                "or use the top predictions as possibilities instead of a final diagnosis."
            )
        return "The model has enough confidence for a primary diagnosis."

    def _safe_heatmap(self, model, image, img_array, class_index):
        try:
            return HeatmapGenerator(model).generate(image, img_array, class_index)
        except Exception as heatmap_error:
            print(f"Heatmap warning: {str(heatmap_error)}")
            return None
