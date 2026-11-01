# Uploaded Roblox detection model

Original filename: ROBLOX FFlag ESP by Themida.onnx
Input: images, float32 RGB NCHW [1, 3, 640, 640], values normalized to [0, 1].
Output: output0, float32 [1, 5, 8400], YOLOv8 center-x, center-y, width, height, class confidence.
Class metadata: 0 = Enemy. This is a model label, not a verified team identity.
Producer metadata: Ultralytics 8.1.9, opset 17, 2024-02-18.
Model license metadata: AGPL-3.0, https://ultralytics.com/license

SHA-256: ad36ce542e1bfc185c9ebe763197719678b8176a1aabb2c942d6146c1f4d0bb1

The app uses letterboxing, confidence filtering, and non-maximum suppression. Model structure and CPU inference were validated; detection accuracy on actual gameplay remains unverified.
