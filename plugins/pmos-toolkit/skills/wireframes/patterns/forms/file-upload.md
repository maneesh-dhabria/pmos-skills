# File Upload

## When to use
- User uploads files (documents, images, attachments)
- Single or multiple files

## When NOT to use
- Pasting/typing content → text input or textarea
- Capturing photo on mobile → use camera capture pattern with `accept="image/*" capture="environment"`

## Anatomy
1. Drop zone with prompt ("Drop files or click to browse")
2. File picker trigger (hidden `<input type="file">`)
3. File list / thumbnails of selected files
4. Per-file: name, size, remove button, progress bar (during upload)
5. Constraints displayed: accepted types, max size, max count
6. Error slot

## Required states
- default (empty drop zone)
- drag-over (highlighted)
- with-files (list of selected)
- uploading (progress bar per file)
- upload-complete
- upload-failed (with retry)
- rejected-file (wrong type/too big)

## Best practices
1. Always show constraints upfront: "PNG or JPG, up to 10 MB each" (N5, N1)
2. Drop zone responds to dragover with clear visual change (N1)
3. Allow both drop AND click — click is fallback for non-mouse users (N7)
4. Per-file progress bar, not just an overall spinner (N1)
5. Selected files removable BEFORE upload (N3)
6. After upload: thumbnail preview for images, filename + icon for others (N6)
7. Reject invalid files with specific error: "PDF.exe is not allowed (only PNG, JPG)" (N9)
8. Mobile: use native picker; expose camera/gallery options
9. Drop zone has aria-label and the input is properly labeled

## Common mistakes
- No constraints shown until rejection → user wastes time uploading the wrong file (N5)
- Single overall spinner during multi-file upload → can't tell which file is stuck (N1)
- No per-file remove → user has to start over (N3)
- Drop zone too small → hard to drop accurately (F1)
- No fallback click trigger → broken without drag

## Device variants
- **mobile-web/native**: prefer system file picker; offer camera capture for image uploads
- **desktop**: drag-and-drop primary, click as fallback

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="dropzone" transform="translate(24,24)">
    <title>Drop zone (empty)</title>
    <desc>A dashed drop target that also accepts a click, with the accepted-type and size constraints shown upfront.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Attachments</text>
    <rect x="0" y="24" width="544" height="160" fill="#fff" stroke="#e6e6e6" stroke-dasharray="4 4"/>
    <text x="16" y="88" font-size="14" fill="#000" stroke="none">Drop files here, or click to browse</text>
    <text x="16" y="112" font-size="12" fill="#666" stroke="none">PNG, JPG, PDF - up to 10 MB each</text>
  </g>
  <g data-region="filelist" transform="translate(24,216)">
    <title>Selected files</title>
    <desc>Per-file rows: one uploaded and removable, one uploading with its own progress bar.</desc>
    <rect x="0" y="0" width="544" height="64" fill="#fff" stroke="#e6e6e6"/>
    <text x="16" y="24" font-size="14" fill="#000" stroke="none">release-notes.pdf</text>
    <text x="16" y="48" font-size="12" fill="#666" stroke="none">2.3 MB - uploaded</text>
    <text x="520" y="40" font-size="14" fill="#000" stroke="none">x</text>
    <rect x="0" y="72" width="544" height="64" fill="#fff" stroke="#e6e6e6"/>
    <text x="16" y="96" font-size="14" fill="#000" stroke="none">screenshot.png</text>
    <rect x="16" y="112" width="320" height="8" fill="#e6e6e6"/>
    <rect x="16" y="112" width="192" height="8" fill="#000"/>
    <text x="520" y="120" font-size="12" fill="#666" stroke="none">62%</text>
  </g>
</svg>
```
