import numpy as np
from fastapi import HTTPException
from PIL import Image
from scipy import ndimage


class LeafImageValidator:
    def __init__(
        self,
        min_green_ratio: float = 0.08,
        min_plant_ratio: float = 0.14,
        max_skin_ratio_without_leaf: float = 0.28,
        min_largest_leaf_ratio: float = 0.08,
        min_edge_ratio: float = 0.010,
        min_saturation_mean: float = 0.10,
    ):
        self.min_green_ratio = min_green_ratio
        self.min_plant_ratio = min_plant_ratio
        self.max_skin_ratio_without_leaf = max_skin_ratio_without_leaf
        self.min_largest_leaf_ratio = min_largest_leaf_ratio
        self.min_edge_ratio = min_edge_ratio
        self.min_saturation_mean = min_saturation_mean

    def validate(self, image):
        stats = self._image_stats(image)

        has_green_leaf_signal = stats["green_ratio"] >= self.min_green_ratio
        has_plant_color_signal = stats["plant_ratio"] >= self.min_plant_ratio
        has_single_dominant_leaf = stats["largest_leaf_ratio"] >= self.min_largest_leaf_ratio

        is_skin_dominated = (
            stats["skin_ratio"] >= self.max_skin_ratio_without_leaf
            and stats["green_ratio"] < self.min_green_ratio * 0.6
        )
        is_low_detail = (
            stats["edge_ratio"] < self.min_edge_ratio
            or stats["saturation_mean"] < self.min_saturation_mean
        )

        passed_checks = sum([
            has_green_leaf_signal,
            has_plant_color_signal,
            has_single_dominant_leaf,
            not is_skin_dominated,
            not is_low_detail,
        ])

        if passed_checks < 5:
            raise HTTPException(
                status_code=422,
                detail=(
                    "This does not look like a clear photo of a single plant leaf. "
                    "Please upload a close-up, well-lit photo of **one** leaf "
                    "that fills most of the frame."
                ),
            )

    def build_plant_mask(self, image):
        rgb = np.array(image.convert("RGB"), dtype=np.float32) / 255.0
        red = rgb[:, :, 0]
        green = rgb[:, :, 1]
        blue = rgb[:, :, 2]

        hsv = self._rgb_to_hsv(rgb)
        hue = hsv[:, :, 0]
        saturation = hsv[:, :, 1]
        value = hsv[:, :, 2]

        green_mask = (
            (hue >= 0.14) & (hue <= 0.48) &
            (saturation >= 0.22) & (value >= 0.15) &
            (green >= red * 0.70) & (green > blue * 0.9)
        )

        yellow_brown_mask = (
            (hue >= 0.06) & (hue < 0.20) &
            (saturation >= 0.25) & (value >= 0.18)
        )

        white_gray_mask = (
            (saturation < 0.15) & (value > 0.50) & (hue <= 0.15)
        )

        return green_mask | yellow_brown_mask | white_gray_mask

    def clean_image(self, image):
        rgb = np.array(image.convert("RGB"), dtype=np.uint8)
        mask = self.build_plant_mask(image)
        mask_3d = np.stack([mask] * 3, axis=-1)
        cleaned = np.where(mask_3d, rgb, np.array([128, 128, 128], dtype=np.uint8))
        return Image.fromarray(cleaned)

    def _image_stats(self, image):
        rgb = np.array(image.convert("RGB"), dtype=np.float32) / 255.0
        red = rgb[:, :, 0]
        green = rgb[:, :, 1]
        blue = rgb[:, :, 2]

        hsv = self._rgb_to_hsv(rgb)
        hue = hsv[:, :, 0]
        saturation = hsv[:, :, 1]
        value = hsv[:, :, 2]

        # Green leaf mask (relaxed red comparison for warm lighting / yellowing)
        green_mask = (
            (hue >= 0.14) & (hue <= 0.48) &
            (saturation >= 0.22) & (value >= 0.15) &
            (green >= red * 0.70) & (green > blue * 0.9)
        )

        # Yellow/brown plant parts
        yellow_brown_plant_mask = (
            (hue >= 0.06) & (hue < 0.20) &
            (saturation >= 0.25) & (value >= 0.18)
        )

        # White/gray mask for fungal symptoms (powdery mildew, rust, spores)
        white_gray_plant_mask = (
            (saturation < 0.15) & (value > 0.50) & (hue <= 0.15)
        )

        # Skin detection
        skin_mask = (
            (hue >= 0.0) & (hue <= 0.13) &
            (saturation >= 0.20) & (saturation <= 0.70) &
            (value >= 0.38) &
            (red > green * 1.05) & (green > blue)
        )

        # Edge detection for sharpness
        gray = 0.299 * red + 0.587 * green + 0.114 * blue
        horizontal_edges = np.abs(np.diff(gray, axis=1))
        vertical_edges = np.abs(np.diff(gray, axis=0))
        edge_ratio = float(
            (np.mean(horizontal_edges > 0.085) + np.mean(vertical_edges > 0.085)) / 2
        )

        # Largest connected green area
        labeled_array, num_features = ndimage.label(green_mask)
        if num_features > 0:
            sizes = np.bincount(labeled_array.ravel())
            largest_blob = sizes[1:].max() if len(sizes) > 1 else 0
            largest_leaf_ratio = largest_blob / green_mask.size
        else:
            largest_leaf_ratio = 0.0

        return {
            "green_ratio": float(np.mean(green_mask)),
            "plant_ratio": float(np.mean(green_mask | yellow_brown_plant_mask | white_gray_plant_mask)),
            "skin_ratio": float(np.mean(skin_mask)),
            "saturation_mean": float(np.mean(saturation)),
            "edge_ratio": edge_ratio,
            "largest_leaf_ratio": float(largest_leaf_ratio),
        }

    def _rgb_to_hsv(self, rgb):
        red = rgb[:, :, 0]
        green = rgb[:, :, 1]
        blue = rgb[:, :, 2]
        max_channel = np.max(rgb, axis=2)
        min_channel = np.min(rgb, axis=2)
        delta = max_channel - min_channel

        hue = np.zeros_like(max_channel)
        nonzero_delta = delta != 0
        red_is_max = (max_channel == red) & nonzero_delta
        green_is_max = (max_channel == green) & nonzero_delta
        blue_is_max = (max_channel == blue) & nonzero_delta

        hue[red_is_max] = ((green[red_is_max] - blue[red_is_max]) / delta[red_is_max]) % 6
        hue[green_is_max] = ((blue[green_is_max] - red[green_is_max]) / delta[green_is_max]) + 2
        hue[blue_is_max] = ((red[blue_is_max] - green[blue_is_max]) / delta[blue_is_max]) + 4
        hue = hue / 6.0

        saturation = np.zeros_like(max_channel)
        nonzero_value = max_channel != 0
        saturation[nonzero_value] = delta[nonzero_value] / max_channel[nonzero_value]

        return np.stack((hue, saturation, max_channel), axis=2)