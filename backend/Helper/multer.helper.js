import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";

/**
 * Configure multer storage (dynamic folder creation inside alpine-uploads/)
*/
const BASE_UPLOAD_DIR = "/var/www/";
const storage = multer.diskStorage({
  // destination: (req, file, cb) => {
  //   const folder = req.uploadFolder || "alpine-uploads/others";
  //   const fullFolder = folder.startsWith("alpine-uploads") ? folder : path.join("alpine-uploads", folder);
  //   const uploadDir = path.join(process.cwd(), fullFolder);
  //   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  //   cb(null, uploadDir);
  // },

destination: (req, file, cb) => {
    const folder = req.uploadFolder || "others";

    // Every module gets its own folder inside permanent path
    const uploadDir = path.join(BASE_UPLOAD_DIR, folder);

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    cb(null, uploadDir);
},
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const fileName = `${file.fieldname}_${Date.now()}_${baseName}${ext}`;
    cb(null, fileName);
  },
});

/**
 * Common file filter for all uploaders (accepts all image types)
 * Accepts any file with MIME type starting with "image/" or image file extensions (case-insensitive)
 */
const fileFilter = (req, file, cb) => {
  // Check MIME type (case-insensitive)
  const mime = (file.mimetype || "").toLowerCase();
  
  // Check file extension (case-insensitive)
  const ext = path.extname(file.originalname || "").toLowerCase();
  
  // Common image extensions (case-insensitive check)
  const imageExtensions = [
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".tiff", ".tif",
    ".ico", ".heic", ".heif", ".avif", ".raw", ".cr2", ".nef", ".orf", ".sr2",
    ".psd", ".ai", ".eps", ".pdf", ".dng", ".arw", ".rw2", ".raf", ".x3f"
  ];
  
  // Accept if:
  // 1. MIME type starts with "image/" (covers all standard image types)
  // 2. OR file extension is a known image extension (handles case variations)
  if (mime.startsWith("image/") || imageExtensions.includes(ext)) {
    cb(null, true);
  } else {
    return cb(new Error(`Unsupported file type: ${file.mimetype || "unknown"} (extension: ${ext}). Only image files are allowed.`));
  }
};


/**
 * Internal utility to iteratively compress an image to <= maxKB as WebP.
 *
 * Strategy: try decreasing quality and width until size threshold is met.
 *
 * This mirrors community-recommended approach for size-constrained output.
 */
const compressToWebpUnderKB = async (
  inputPath,
  {
    maxKB = 100,
    startQuality = 80,
    minQuality = 10,
    qualityStep = 15,
    startWidth = 1200,
    minWidth = 500,
    widthStep = 200,
    effort = 6,
  } = {}
) => {
  const ext = path.extname(inputPath).toLowerCase();
  const base = inputPath.slice(0, -ext.length);
  let quality = startQuality;
  let width = startWidth;
  let finalOutput = "";
  let lastAttemptPath = "";

  while (quality >= minQuality) {
    const attemptPath = `${base}_q${quality}.webp`;

    await sharp(inputPath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort })
      .toFile(attemptPath);

    const sizeKB = Math.round(fs.statSync(attemptPath).size / 1024);
    if (sizeKB <= maxKB) {
      finalOutput = attemptPath;
      break;
    }
    lastAttemptPath = attemptPath;
    quality -= qualityStep;
    width = Math.max(minWidth, width - widthStep);
  }

  if (!finalOutput) finalOutput = lastAttemptPath;

  // Remove the original file
  if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

  // Cleanup temp attempts except final
  const dir = path.dirname(base);
  const baseName = path.basename(base);
  fs.readdirSync(dir)
    .filter((f) => f.startsWith(baseName) && f.endsWith(".webp") && path.join(dir, f) !== finalOutput)
    .forEach((f) => fs.unlinkSync(path.join(dir, f)));

  return finalOutput;
};

/**
 * General compress/convert for products and categories
 */
export const compressAndConvertImage = async (filePath) => {
  try {
    // Always convert to .webp if not already, and ensure <= 100KB
    return await compressToWebpUnderKB(filePath, {
      maxKB: 100,
      startQuality: 80,
      minQuality: 10,
      qualityStep: 15,
      startWidth: 1200,
      minWidth: 500,
      widthStep: 200,
      effort: 6,
    });
  } catch (err) {
    console.error("Compression failed:", err);
    return filePath;
  }
};

/**
 * Fast single-pass (max 2 passes) compression for product uploads.
 * Keeps create-product under typical frontend timeout (e.g. 15s) when multiple images are uploaded.
 */
const compressProductImageFast = async (inputPath) => {
  const ext = path.extname(inputPath).toLowerCase();
  const base = inputPath.slice(0, -ext.length);
  const outputPath = `${base}_fast.webp`;
  await sharp(inputPath)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toFile(outputPath);
  if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
  const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);
  if (sizeKB <= 280) return outputPath;
  const smallerPath = `${base}_fast_q50.webp`;
  await sharp(outputPath)
    .webp({ quality: 50, effort: 3 })
    .toFile(smallerPath);
  fs.unlinkSync(outputPath);
  return smallerPath;
};

/**
 * Separate compress/convert for banners (isolated for future tuning)
 *
 * Currently uses same thresholds (<= 100KB) but you can raise widths or quality later if banners need higher fidelity.
 */
export const compressAndConvertBannerImage = async (filePath) => {
  try {
    return await compressToWebpUnderKB(filePath, {
      maxKB: 100,
      startQuality: 85,
      minQuality: 10,
      qualityStep: 15,
      startWidth: 1600,
      minWidth: 600,
      widthStep: 200,
      effort: 6,
    });
  } catch (err) {
    console.error("Banner compression failed:", err);
    return filePath;
  }
};

/**
 * Multer uploaders
 */
export const uploadBanner = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024, fieldSize: 2 * 1024 * 1024 * 1024 }, // 2GB limit
  fileFilter,
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024, fieldSize: 2 * 1024 * 1024 * 1024 }, // 2GB limit for product images
  fileFilter,
});

export const uploadCategory = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024, fieldSize: 2 * 1024 * 1024 * 1024 }, // 2GB limit
  fileFilter,
});

/**
 * Middleware to compress uploaded image (single)
 */
export const compressUploadedImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const originalPath = req.file.path;
    const compressedPath = await compressAndConvertImage(originalPath);

    req.file.path = compressedPath;
    req.file.filename = path.basename(compressedPath);
    req.body.imagePath = compressedPath;

    next();
  } catch (err) {
    console.error("Image compression error:", err);
    next();
  }
};

/**
 * Middleware to compress uploaded banner image (single, separate params)
 */
export const compressUploadedBannerImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const originalPath = req.file.path;
    const compressedPath = await compressAndConvertBannerImage(originalPath);

    req.file.path = compressedPath;
    req.file.filename = path.basename(compressedPath);
    req.body.imagePath = compressedPath;

    next();
  } catch (err) {
    console.error("Banner image compression error:", err);
    next();
  }
};

/**
 * Middleware to compress multiple images (parallel + fast path to avoid request timeout).
 */
export const compressMultipleImages = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      console.log("ℹ️ No files to compress");
      return next();
    }

    console.log(`🖼️ Compressing ${files.length} image(s) (parallel, fast path)...`);
    await Promise.all(
      files.map(async (file, i) => {
        if (!file?.path) return;
        try {
          const compressedPath = await compressProductImageFast(file.path);
          file.path = compressedPath;
          file.filename = path.basename(compressedPath);
          console.log(`✅ Compressed image ${i + 1}/${files.length}: ${file.filename}`);
        } catch (compressErr) {
          console.error(`❌ Error compressing image ${i + 1}:`, compressErr?.message || compressErr);
        }
      })
    );

    if (!req.files && files.length > 0) req.files = files;
    next();
  } catch (err) {
    console.error("❌ Error in compressMultipleImages:", err);
    next();
  }
};

/**
 * Convert image path to base64
 */
/* -------------------------------------------------------------------------- */
/*                  UPDATED: convertImageToBase64 (LOCAL + VPS)               */
/* -------------------------------------------------------------------------- */
const LOCAL_ROOT = "D:/var/www/";   
const VPS_ROOT = "/var/www/";

export const convertImageToBase64 = (filePath) => {
  try {
    if (!filePath) return null;

    // Extract relative path after /var/www/
    let relativePath = filePath.replace("/var/www/", "").replace("\\var\\www\\", "");

    let finalPath = "";

    if (process.platform === "win32") {
      finalPath = path.join(LOCAL_ROOT, relativePath);
    } else {
      finalPath = path.join(VPS_ROOT, relativePath);
    }

    if (!fs.existsSync(finalPath)) {
      console.log("❌ Image not found:", finalPath);
      return null;
    }

    const buffer = fs.readFileSync(finalPath);
    let ext = path.extname(finalPath).substring(1).toLowerCase();
    if (ext === "jpg") ext = "jpeg";

    return `data:image/${ext};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("Base64 convert error:", err);
    return null;
  }
};

/**
 * Convert image to compressed thumbnail base64 (optimized for search results)
 * Resizes to max 200x200 and converts to WebP for smaller size
 */
export const convertImageToThumbnailBase64 = async (filePath) => {
  try {
    if (!filePath) return null;

    // Extract relative path after /var/www/
    let relativePath = filePath.replace("/var/www/", "").replace("\\var\\www\\", "");

    let finalPath = "";

    if (process.platform === "win32") {
      finalPath = path.join(LOCAL_ROOT, relativePath);
    } else {
      finalPath = path.join(VPS_ROOT, relativePath);
    }

    if (!fs.existsSync(finalPath)) {
      console.log("❌ Image not found for thumbnail:", finalPath);
      return null;
    }

    // Use sharp to resize and convert to WebP for compression
    const thumbnailBuffer = await sharp(finalPath)
      .resize(200, 200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();

    return `data:image/webp;base64,${thumbnailBuffer.toString("base64")}`;
  } catch (err) {
    console.error("Thumbnail base64 convert error:", err);
    // Fallback to regular base64 if sharp fails
    return convertImageToBase64(filePath);
  }
};


/**
 * Delete file safely
 */
export const deleteFileSafe = (filePath) => {
  try {
    if (!filePath) return;
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch (err) {
    console.error("Error deleting file:", err);
  }
};

export { storage, fileFilter };
