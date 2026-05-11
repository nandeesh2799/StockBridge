export const languageMiddleware = (req, res, next) => {
  const language = req.headers["x-language"] || "en";
  req.language = ["en", "hi", "kn"].includes(language) ? language : "en";
  next();
};
