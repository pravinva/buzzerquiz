# PWA Icons

The app requires two icon files for Progressive Web App functionality:

- `/public/icon-192.png` - 192x192px icon
- `/public/icon-512.png` - 512x512px icon

## Creating Icons

You can create these icons using any of these methods:

### Option 1: Online Icon Generator
1. Go to [https://www.pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator)
2. Upload a logo or image (minimum 512x512px)
3. Download the generated icons
4. Place `icon-192.png` and `icon-512.png` in the `/public` directory

### Option 2: Design Tool (Figma, Canva, etc.)
1. Create a 512x512px image with your design
2. Export as PNG (512x512)
3. Resize to create 192x192 version
4. Save both files to `/public` directory

### Option 3: Simple Placeholder
For testing, you can use a simple colored square:

```bash
# Using ImageMagick
convert -size 192x192 xc:"#6366f1" public/icon-192.png
convert -size 512x512 xc:"#6366f1" public/icon-512.png
```

## Icon Design Tips

- Use simple, recognizable imagery
- Ensure good contrast
- Avoid fine details (they don't show well at small sizes)
- Test on both light and dark backgrounds
- Consider using a quiz card or "Q" letter as the icon theme
