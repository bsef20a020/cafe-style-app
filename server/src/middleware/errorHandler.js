function notFound(req, res) {
  res.status(404).json({ ok: false, error: "not_found" });
}

function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || error.status || 500;
  const publicMessage = status >= 500 ? "server_error" : error.message;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    ok: false,
    error: publicMessage || "server_error",
    ...(error.details ? { details: error.details } : {})
  });
}

module.exports = { notFound, errorHandler };
