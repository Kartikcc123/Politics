import 'dart:async';
import 'dart:io' as io;
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Shows an interactive image picker & crop dialog
Future<PlatformFile?> pickAndCropImage(
  BuildContext context, {
  String title = 'फोटो क्रॉप करें',
  bool circular = false,
  double targetAspectRatio = 1.0, // 1.0 for square profile
}) async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.image,
    withData: true,
  );
  if (result == null || result.files.isEmpty) return null;

  final pickedFile = result.files.single;
  Uint8List? rawBytes = pickedFile.bytes;

  if (rawBytes == null && pickedFile.path != null && !kIsWeb) {
    try {
      rawBytes = await io.File(pickedFile.path!).readAsBytes();
    } catch (_) {}
  }

  if (rawBytes == null || rawBytes.isEmpty) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('फोटो लोड नहीं हो सकी।')),
      );
    }
    return null;
  }

  if (!context.mounted) return null;

  final croppedBytes = await showDialog<Uint8List>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => ImageCropDialog(
      imageBytes: rawBytes!,
      title: title,
      circular: circular,
      aspectRatio: targetAspectRatio,
    ),
  );

  if (croppedBytes == null) return null;

  return PlatformFile(
    name: pickedFile.name.replaceAll(RegExp(r'\.[^.]+$'), '') + '_cropped.png',
    size: croppedBytes.length,
    bytes: croppedBytes,
    path: pickedFile.path,
  );
}

class ImageCropDialog extends StatefulWidget {
  const ImageCropDialog({
    super.key,
    required this.imageBytes,
    this.title = 'फोटो क्रॉप करें',
    this.circular = false,
    this.aspectRatio = 1.0,
  });

  final Uint8List imageBytes;
  final String title;
  final bool circular;
  final double aspectRatio;

  @override
  State<ImageCropDialog> createState() => _ImageCropDialogState();
}

class _ImageCropDialogState extends State<ImageCropDialog> {
  ui.Image? _decodedImage;
  bool _loading = true;
  bool _processing = false;
  int _rotationQuarterTurns = 0; // 0, 1, 2, 3

  final TransformationController _transformController =
      TransformationController();

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  @override
  void dispose() {
    _transformController.dispose();
    super.dispose();
  }

  Future<void> _loadImage() async {
    try {
      final codec = await ui.instantiateImageCodec(widget.imageBytes);
      final frame = await codec.getNextFrame();
      if (mounted) {
        setState(() {
          _decodedImage = frame.image;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        Navigator.pop(context);
      }
    }
  }

  void _rotateLeft() {
    setState(() {
      _rotationQuarterTurns = (_rotationQuarterTurns + 3) % 4;
      _transformController.value = Matrix4.identity();
    });
  }

  void _rotateRight() {
    setState(() {
      _rotationQuarterTurns = (_rotationQuarterTurns + 1) % 4;
      _transformController.value = Matrix4.identity();
    });
  }

  void _resetZoom() {
    setState(() {
      _transformController.value = Matrix4.identity();
    });
  }

  Future<void> _cropAndSave(double viewportSize) async {
    if (_decodedImage == null || _processing) return;
    setState(() => _processing = true);

    try {
      final matrix = _transformController.value;
      final scale = matrix.getMaxScaleOnAxis();
      final translation = matrix.getTranslation();

      // Original image dimensions
      final imgW = _decodedImage!.width.toDouble();
      final imgH = _decodedImage!.height.toDouble();

      // Base fitted size inside viewport
      final isRotated90or270 =
          _rotationQuarterTurns == 1 || _rotationQuarterTurns == 3;
      final effectiveW = isRotated90or270 ? imgH : imgW;
      final effectiveH = isRotated90or270 ? imgW : imgH;

      // Calculate how base image was scaled to fit the viewport
      final baseScale = math.max(
        viewportSize / effectiveW,
        viewportSize / effectiveH,
      );

      final totalScale = baseScale * scale;

      // Render onto high-res canvas (e.g. 600x600 px)
      const outputSize = 600.0;
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);

      // Scale up from viewportSize to outputSize
      final outputScaleRatio = outputSize / viewportSize;
      canvas.scale(outputScaleRatio);

      // Clip circle if requested
      if (widget.circular) {
        final path = Path()
          ..addOval(Rect.fromLTWH(0, 0, viewportSize, viewportSize));
        canvas.clipPath(path);
      }

      canvas.save();
      // Apply translation from InteractiveViewer
      canvas.translate(translation.x, translation.y);

      // Apply zoom scale from InteractiveViewer
      canvas.scale(scale);

      // Center the image in base fitted space
      final drawOffsetX = (viewportSize - effectiveW * baseScale) / (2 * scale);
      final drawOffsetY = (viewportSize - effectiveH * baseScale) / (2 * scale);
      canvas.translate(drawOffsetX, drawOffsetY);

      // Apply rotation around center of effective image
      if (_rotationQuarterTurns != 0) {
        canvas.translate(
          (effectiveW * baseScale) / 2,
          (effectiveH * baseScale) / 2,
        );
        canvas.rotate(_rotationQuarterTurns * math.pi / 2);
        canvas.translate(
          -((_rotationQuarterTurns % 2 == 1 ? effectiveH : effectiveW) *
                  baseScale) /
              2,
          -((_rotationQuarterTurns % 2 == 1 ? effectiveW : effectiveH) *
                  baseScale) /
              2,
        );
      }

      // Draw the raw ui.Image
      final srcRect = Rect.fromLTWH(0, 0, imgW, imgH);
      final dstRect = Rect.fromLTWH(0, 0, imgW * baseScale, imgH * baseScale);
      canvas.drawImageRect(
        _decodedImage!,
        srcRect,
        dstRect,
        Paint()..filterQuality = FilterQuality.high,
      );

      canvas.restore();

      final picture = recorder.endRecording();
      final resultImg =
          await picture.toImage(outputSize.toInt(), outputSize.toInt());
      final byteData =
          await resultImg.toByteData(format: ui.ImageByteFormat.png);

      if (byteData != null && mounted) {
        Navigator.pop(context, byteData.buffer.asUint8List());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('क्रॉप करने में त्रुटि: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final cropBoxSize = math.min(screenSize.width - 48, 340.0);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        decoration: BoxDecoration(
          color: const Color(0xff1e293b),
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Colors.black54,
              blurRadius: 20,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
              child: Row(
                children: [
                  const Icon(Icons.crop_rotate_rounded,
                      color: Colors.white, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    icon:
                        const Icon(Icons.close_rounded, color: Colors.white70),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(color: Color(0xff334155), height: 1),

            // Main Crop Area
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: _loading
                  ? const SizedBox(
                      height: 280,
                      child: Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      ),
                    )
                  : Column(
                      children: [
                        // Viewport Container with Crop Mask
                        Center(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(
                              widget.circular ? cropBoxSize / 2 : 16,
                            ),
                            child: Container(
                              width: cropBoxSize,
                              height: cropBoxSize,
                              decoration: BoxDecoration(
                                color: Colors.black,
                                border: Border.all(
                                  color: royalBlue,
                                  width: 2.5,
                                ),
                                borderRadius: BorderRadius.circular(
                                  widget.circular ? cropBoxSize / 2 : 16,
                                ),
                              ),
                              child: Stack(
                                children: [
                                  // Interactive Pan & Zoom
                                  Positioned.fill(
                                    child: InteractiveViewer(
                                      transformationController:
                                          _transformController,
                                      minScale: 0.5,
                                      maxScale: 4.0,
                                      boundaryMargin: EdgeInsets.all(
                                          cropBoxSize * 0.8),
                                      child: Center(
                                        child: RotatedBox(
                                          quarterTurns: _rotationQuarterTurns,
                                          child: RawImage(
                                            image: _decodedImage,
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),

                                  // Rule-of-Thirds Grid Overlay
                                  IgnorePointer(
                                    child: CustomPaint(
                                      size: Size(cropBoxSize, cropBoxSize),
                                      painter: _GridOverlayPainter(
                                          isCircular: widget.circular),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 14),
                        const Text(
                          'ज़ूम और फ़ोटो को फ़्रेम में सेट करने के लिए पिंच या ड्रैग करें',
                          style: TextStyle(
                            color: Colors.white60,
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
            ),

            // Controls Toolbar (Rotate & Reset)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              color: const Color(0xff0f172a),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _toolBtn(
                    icon: Icons.rotate_90_degrees_ccw_rounded,
                    label: 'बाएं घुमाएं',
                    onTap: _rotateLeft,
                  ),
                  _toolBtn(
                    icon: Icons.rotate_90_degrees_cw_rounded,
                    label: 'दाएं घुमाएं',
                    onTap: _rotateRight,
                  ),
                  _toolBtn(
                    icon: Icons.refresh_rounded,
                    label: 'रीसेट',
                    onTap: _resetZoom,
                  ),
                ],
              ),
            ),

            // Bottom Actions (Cancel & Crop & Save)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white70,
                        side: const BorderSide(color: Color(0xff475569)),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('रद्द करें'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: royalBlue,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: _processing
                          ? null
                          : () => _cropAndSave(cropBoxSize),
                      icon: _processing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.check_rounded, size: 20),
                      label: Text(
                        _processing ? 'क्रॉप हो रही है...' : 'क्रॉप करें व सेव करें',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _toolBtn({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white70, size: 20),
            const SizedBox(height: 3),
            Text(
              label,
              style: const TextStyle(color: Colors.white60, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

class _GridOverlayPainter extends CustomPainter {
  const _GridOverlayPainter({required this.isCircular});
  final bool isCircular;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.25)
      ..strokeWidth = 1.0;

    // Draw 3x3 grid lines
    final wThird = size.width / 3;
    final hThird = size.height / 3;

    canvas.drawLine(Offset(wThird, 0), Offset(wThird, size.height), paint);
    canvas.drawLine(
        Offset(wThird * 2, 0), Offset(wThird * 2, size.height), paint);

    canvas.drawLine(Offset(0, hThird), Offset(size.width, hThird), paint);
    canvas.drawLine(
        Offset(0, hThird * 2), Offset(size.width, hThird * 2), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
