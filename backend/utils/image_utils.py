import base64
import io

import numpy as np
from PIL import Image, ImageFilter


class HeatmapImageBuilder:
    def build_visual_fallback(self, image):
        edges = image.convert("L").filter(ImageFilter.FIND_EDGES)
        edge_array = np.array(edges, dtype=np.float32)
        max_edge = edge_array.max()
        if max_edge == 0:
            return None
        return self.build_overlay_from_heatmap(image, edge_array / max_edge)

    def build_overlay_from_heatmap(self, image, heatmap_values):
        heatmap_image = Image.fromarray(np.uint8(255 * heatmap_values)).resize(
            image.size,
            Image.Resampling.BILINEAR,
        )
        heatmap_array = np.array(heatmap_image, dtype=np.float32) / 255.0

        original = np.array(image, dtype=np.float32)
        overlay = original.copy()
        overlay[:, :, 0] = np.clip(overlay[:, :, 0] + heatmap_array * 130, 0, 255)
        overlay[:, :, 1] = np.clip(overlay[:, :, 1] * (1 - heatmap_array * 0.35), 0, 255)
        overlay[:, :, 2] = np.clip(overlay[:, :, 2] * (1 - heatmap_array * 0.45), 0, 255)

        blended = Image.blend(image, Image.fromarray(np.uint8(overlay)), alpha=0.45)
        buffer = io.BytesIO()
        blended.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

