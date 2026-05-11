function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "validation_error",
        details: parsed.error.flatten().fieldErrors
      });
    }

    req.body = parsed.data;
    return next();
  };
}

module.exports = validateBody;
