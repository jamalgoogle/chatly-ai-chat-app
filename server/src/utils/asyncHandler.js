// Wrap an async Express handler so a rejected promise is passed to next(err)
// instead of becoming an unhandled rejection that crashes the whole server.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
