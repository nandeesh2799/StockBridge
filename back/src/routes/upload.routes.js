import express from "express";
import ImageKit from "imagekit";

const router = express.Router();

router.get("/auth", (req, res) => {
  try {
    const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } =
      process.env;

    if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
      return res.status(503).json({
        success: false,
        message:
          "Upload service is not configured on server. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in backend env.",
      });
    }

    const imagekit = new ImageKit({
      publicKey: IMAGEKIT_PUBLIC_KEY,
      privateKey: IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: IMAGEKIT_URL_ENDPOINT,
    });

    const result = imagekit.getAuthenticationParameters();
    return res.status(200).json({
      ...result,
      publicKey: IMAGEKIT_PUBLIC_KEY,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate upload auth parameters.",
    });
  }
});

export default router;
