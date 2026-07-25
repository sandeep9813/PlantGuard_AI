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
    def __init__(self, confidence_threshold: float = 80.0, entropy_threshold: float = 1.0, feature_norm_threshold: float = 0.15):
        self.confidence_threshold = confidence_threshold
        self.entropy_threshold = entropy_threshold
        self.feature_norm_threshold = feature_norm_threshold
        self.feature_extractor = None

    def predict(self, model, image, img_array):
        predictions = model.predict(img_array)[0]
        top_indices = np.argsort(predictions)[::-1]
        primary_index = int(top_indices[0])
        confidence = float(predictions[primary_index] * 100)

        entropy = self._compute_entropy(predictions)
        feature_norm = self._extract_feature_norm(model, img_array)
        is_ood = entropy > self.entropy_threshold or feature_norm < self.feature_norm_threshold

        return {
            "prediction": CLASS_NAMES[primary_index],
            "confidence": confidence,
            "top_3": self._top_predictions(predictions, top_indices),
            "is_uncertain": confidence < self.confidence_threshold,
            "confidence_message": self._confidence_message(confidence),
            "is_ood": is_ood,
            "ood_message": self._ood_message(is_ood),
            "entropy": round(entropy, 3),
            "feature_norm": round(float(feature_norm), 3),
            "heatmap": self._safe_heatmap(model, image, img_array, primary_index),
        }

    def _build_feature_extractor(self, model):
        for layer in reversed(model.layers):
            if isinstance(layer, tf.keras.layers.GlobalAveragePooling2D):
                self.feature_extractor = tf.keras.Model(
                    inputs=model.inputs,
                    outputs=layer.output,
                )
                return
        self.feature_extractor = tf.keras.Model(
            inputs=model.inputs,
            outputs=model.layers[-2].output,
        )

    def _extract_feature_norm(self, model, img_array):
        if self.feature_extractor is None:
            self._build_feature_extractor(model)
        features = self.feature_extractor.predict(img_array, verbose=0)
        flat = features.reshape(features.shape[0], -1)
        return float(np.linalg.norm(flat, axis=1)[0] / np.sqrt(flat.shape[1]))

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

    @staticmethod
    def _compute_entropy(predictions):
        eps = 1e-12
        return float(-np.sum(predictions * np.log(predictions + eps)))

    def _ood_message(self, is_ood):
        if is_ood:
            return (
                "This image does not appear to be a plant leaf. "
                "The prediction distribution is too spread out or the feature representation is abnormal. "
                "Please upload a clear close-up photo of a single plant leaf."
            )
        return ""

    def _safe_heatmap(self, model, image, img_array, class_index):
        try:
            return HeatmapGenerator(model).generate(image, img_array, class_index)
        except Exception as heatmap_error:
            print(f"Heatmap warning: {str(heatmap_error)}")
            return None
